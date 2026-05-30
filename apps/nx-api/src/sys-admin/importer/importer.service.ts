// apps/nx-api/src/sys-admin/importer/importer.service.ts
// v1.2 對齊軌 C + C-FU：Excel 範本生成 + 上傳解析 + 確認匯入
//
// FU-import-07：preview 時 cache 檔案、confirm 用 batchId 拉
// FU-import-01~05：5 個 importer 寫主檔 / 歷史

import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import { cacheFile, clearCachedFile, getCachedFile } from './import-cache';
import { ALL_TEMPLATES, TemplateSpec } from './import-templates';
import { importEmployees } from './handlers/employee.handler';
import { importPartners } from './handlers/partner.handler';
import { importProducts } from './handlers/product.handler';
import { importPurchaseHistory } from './handlers/purchase-history.handler';
import { importSaleHistory } from './handlers/sale-history.handler';
import { importWarehouses } from './handlers/warehouse.handler';
import { extractDataRows } from './handlers/base';

export interface PreviewRowError {
  rowNo: number;
  reason: string;
}

export interface PreviewResult {
  importType: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: PreviewRowError[];
  batchId: string;
  sampleData: Record<string, unknown>[];
}

@Injectable()
export class ImporterService {
  constructor(private readonly prisma: PrismaService) {}

  private getTemplate(importType: string): TemplateSpec {
    const spec = ALL_TEMPLATES[importType];
    if (!spec) throw new BadRequestException(`Unknown importType: ${importType}`);
    return spec;
  }

  generateTemplate(importType: string): { fileName: string; buffer: Buffer } {
    const spec = this.getTemplate(importType);
    const wb = XLSX.utils.book_new();
    const headers = spec.columns.map((c) => c.header);
    const helpers = spec.columns.map((c) => {
      const parts: string[] = [];
      if (c.required) parts.push('🟢 必填');
      else parts.push('⚪ 選填');
      if (c.hint) parts.push(c.hint);
      return parts.join(' · ');
    });
    const examples = spec.columns.map((c) => c.example ?? '');
    const empty = spec.columns.map(() => '');
    const sheet = XLSX.utils.aoa_to_sheet([headers, helpers, examples, empty]);
    XLSX.utils.book_append_sheet(wb, sheet, spec.sheetName);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return {
      fileName: `NEXORA_${spec.importType}_範本.xlsx`,
      buffer,
    };
  }

  async preview(
    user: RequestUser,
    importType: string,
    fileName: string,
    fileBuffer: Buffer,
  ): Promise<PreviewResult> {
    const tenantId = requireTenantId(user);
    const spec = this.getTemplate(importType);

    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      defval: '',
      header: 1,
    }) as unknown[][];

    const dataRows = extractDataRows(rows, spec.columns.map((c) => c.field));
    const errors: PreviewRowError[] = [];

    // preview 階段做 column-level 必填驗證
    dataRows.forEach(({ rowNo, data }) => {
      spec.columns.forEach((c) => {
        if (c.required && !data[c.field]) {
          errors.push({ rowNo, reason: `${c.header}（必填）為空` });
        }
      });
    });

    const totalRows = dataRows.length;
    const failedRowNos = new Set(errors.map((e) => e.rowNo));
    const successRows = dataRows.filter((r) => !failedRowNos.has(r.rowNo)).length;
    const failedRows = failedRowNos.size;

    const batch = await this.prisma.nx01ImportBatch.create({
      data: {
        tenantId,
        uploadedBy: user.sub,
        importType,
        fileName,
        totalRows,
        successRows,
        failedRows,
        failureDetail: errors as unknown as object,
        status: 'previewing',
      },
    });

    // FU-import-07：cache 檔案、confirm 用 batchId 拉、不用 client 再上傳
    cacheFile(batch.id, fileName, fileBuffer);

    return {
      importType,
      fileName,
      totalRows,
      successRows,
      failedRows,
      errors,
      batchId: batch.id,
      sampleData: dataRows.slice(0, 10).map((r) => r.data),
    };
  }

  /// 確認匯入：從 cache 拉檔案、依 importType dispatch 對應 handler
  async confirmImport(user: RequestUser, batchId: string) {
    const tenantId = requireTenantId(user);
    const batch = await this.prisma.nx01ImportBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new BadRequestException('Batch not found');
    if (batch.status !== 'previewing') {
      throw new BadRequestException(`Batch status is ${batch.status}, not previewing`);
    }

    const cached = getCachedFile(batchId);
    if (!cached) {
      throw new BadRequestException(
        'Cached file 過期或不存在（1 小時 TTL）、請重新上傳預覽',
      );
    }

    const spec = this.getTemplate(batch.importType);
    const wb = XLSX.read(cached.buffer, { type: 'buffer' });
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      defval: '',
      header: 1,
    }) as unknown[][];
    const dataRows = extractDataRows(rows, spec.columns.map((c) => c.field));

    // 拿 tenant 的 dataStartDate（給 history importer 用）
    const tenant = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { dataStartDate: true },
    });

    const ctx = {
      tenantId,
      userId: user.sub,
      prisma: this.prisma,
      dataStartDate: tenant?.dataStartDate ?? null,
    };

    let result: {
      imported: number;
      historicalCount?: number;
      errors: { rowNo: number; reason: string }[];
      historicalRows?: unknown[];
    };

    switch (batch.importType) {
      case 'employee':
        result = await importEmployees(ctx, dataRows);
        break;
      case 'partner':
        result = await importPartners(ctx, dataRows);
        break;
      case 'warehouse':
        result = await importWarehouses(ctx, dataRows);
        break;
      case 'product':
        result = await importProducts(ctx, dataRows);
        break;
      case 'purchase-history':
        result = await importPurchaseHistory(ctx, dataRows);
        break;
      case 'sale-history':
        result = await importSaleHistory(ctx, dataRows);
        break;
      case 'voucher':
        // FU-import-06：等 NX05 voucher model
        result = {
          imported: 0,
          errors: [{ rowNo: 0, reason: 'voucher importer 屬 NX05 範圍、暫未實作' }],
        };
        break;
      default:
        throw new BadRequestException(`Unknown importType: ${batch.importType}`);
    }

    await this.prisma.nx01ImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'imported',
        importedAt: new Date(),
        successRows: result.imported,
        failedRows: result.errors.length,
        failureDetail: {
          errors: result.errors,
          historicalCount: result.historicalCount ?? 0,
          historicalRows: (result.historicalRows ?? []).slice(0, 100),
        } as unknown as object,
      },
    });

    clearCachedFile(batchId);

    return {
      ok: true as const,
      imported: result.imported,
      historicalCount: result.historicalCount ?? 0,
      errors: result.errors.slice(0, 50),
    };
  }
}
