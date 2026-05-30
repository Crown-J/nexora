// apps/nx-api/src/sys-admin/importer/importer.service.ts
// v1.2 對齊軌 C3：Excel 範本生成 + 上傳解析 + 確認匯入
//
// 套件選型：xlsx (SheetJS)
// 理由：
//   - 同時支援讀寫 Excel / CSV
//   - 純 JS、無原生依賴、跨環境穩定
//   - 廣為使用、社群活躍
//   - 已知 CVE 主要在 ReDoS、本軌只服務 SYSADMIN / OWNER 受信任 user、可接受

import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import { ALL_TEMPLATES, TemplateSpec } from './import-templates';

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
  /// 預覽用 sample（前 10 筆解析後資料）
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

  /// 產 Excel 範本檔（Buffer）
  generateTemplate(importType: string): { fileName: string; buffer: Buffer } {
    const spec = this.getTemplate(importType);
    const wb = XLSX.utils.book_new();

    // Row 1: 中文 header
    const headers = spec.columns.map((c) => c.header);
    // Row 2: 說明（required + hint）
    const helpers = spec.columns.map((c) => {
      const parts: string[] = [];
      if (c.required) parts.push('🟢 必填');
      else parts.push('⚪ 選填');
      if (c.hint) parts.push(c.hint);
      return parts.join(' · ');
    });
    // Row 3: 範例
    const examples = spec.columns.map((c) => c.example ?? '');
    // Row 4: 空白（讓用戶從這開始填）
    const empty = spec.columns.map(() => '');

    const sheet = XLSX.utils.aoa_to_sheet([headers, helpers, examples, empty]);
    XLSX.utils.book_append_sheet(wb, sheet, spec.sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return {
      fileName: `NEXORA_${spec.importType}_範本.xlsx`,
      buffer,
    };
  }

  /// 上傳並預覽（不寫入 DB、只 parse + validate、寫 nx01_import_batch）
  async preview(
    user: RequestUser,
    importType: string,
    fileName: string,
    fileBuffer: Buffer,
  ): Promise<PreviewResult> {
    const tenantId = requireTenantId(user);
    const spec = this.getTemplate(importType);

    // 解析 Excel
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      header: 1,
    });

    // rows[0] = headers, rows[1] = helpers, rows[2] = examples, rows[3+] = data
    const dataRows = (rows as unknown as unknown[][]).slice(3);

    const errors: PreviewRowError[] = [];
    const parsed: Record<string, unknown>[] = [];

    dataRows.forEach((row, i) => {
      const rowNo = i + 4; // 1-based Excel row、含 header 3 列
      const allEmpty = (row as unknown[]).every((v) => v == null || String(v).trim() === '');
      if (allEmpty) return;

      const obj: Record<string, unknown> = {};
      let hasError = false;
      spec.columns.forEach((c, j) => {
        const raw = (row as unknown[])[j];
        const val = raw == null ? '' : String(raw).trim();
        if (c.required && !val) {
          errors.push({ rowNo, reason: `${c.header}（必填）為空` });
          hasError = true;
        }
        obj[c.field] = val;
      });
      if (!hasError) parsed.push(obj);
    });

    const totalRows = dataRows.filter(
      (r) => !(r as unknown[]).every((v) => v == null || String(v).trim() === ''),
    ).length;
    const successRows = parsed.length;
    const failedRows = errors.length;

    // 寫 batch（status='previewing'、import 時再改 'imported'）
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

    return {
      importType,
      fileName,
      totalRows,
      successRows,
      failedRows,
      errors,
      batchId: batch.id,
      sampleData: parsed.slice(0, 10),
    };
  }

  /// 確認匯入：把預覽通過的 batch 實際寫入主檔
  /// MVP：只實作 employee importer、其他類型回 not-implemented
  async confirmImport(user: RequestUser, batchId: string, fileBuffer: Buffer): Promise<{ ok: true; imported: number }> {
    const tenantId = requireTenantId(user);
    const batch = await this.prisma.nx01ImportBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new BadRequestException('Batch not found');
    if (batch.status !== 'previewing') {
      throw new BadRequestException(`Batch status is ${batch.status}, not previewing`);
    }

    const spec = this.getTemplate(batch.importType);
    if (batch.importType !== 'employee') {
      // 其他類型先標 imported 但實際不寫入主檔（C3 MVP、列 FU）
      await this.prisma.nx01ImportBatch.update({
        where: { id: batchId },
        data: { status: 'imported', importedAt: new Date() },
      });
      return { ok: true, imported: 0 };
    }

    // employee importer 實作（其他類型屬 FU、列 handoff）
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      header: 1,
    });
    const dataRows = (rows as unknown as unknown[][]).slice(3);

    let imported = 0;
    const bcrypt = await import('bcryptjs');
    const tempPassword = await bcrypt.hash('Temp123!', 10);

    for (const row of dataRows) {
      const allEmpty = (row as unknown[]).every((v) => v == null || String(v).trim() === '');
      if (allEmpty) continue;

      const obj: Record<string, string> = {};
      let hasErr = false;
      spec.columns.forEach((c, j) => {
        const val = String((row as unknown[])[j] ?? '').trim();
        if (c.required && !val) hasErr = true;
        obj[c.field] = val;
      });
      if (hasErr) continue;

      // 檢 email 唯一
      const existing = await this.prisma.nx01User.findFirst({
        where: { userAccount: obj.email },
        select: { id: true },
      });
      if (existing) continue;

      await this.prisma.nx01User.create({
        data: {
          tenantId,
          userAccount: obj.email,
          passwordHash: tempPassword,
          userName: obj.userName,
          email: obj.email,
          phone: obj.phone || null,
          isActive: obj.isActive !== '否',
          mustChangePassword: true,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });
      imported++;
    }

    await this.prisma.nx01ImportBatch.update({
      where: { id: batchId },
      data: { status: 'imported', importedAt: new Date() },
    });

    return { ok: true, imported };
  }
}
