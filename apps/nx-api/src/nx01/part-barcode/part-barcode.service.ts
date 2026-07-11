// apps/nx-api/src/nx01/part-barcode/part-barcode.service.ts
// 偉盟 P2 2.6 2026-07-11：零件條碼對照 service（一料多條碼＋預設旗標、同租戶條碼唯一）
// 範式對齊 part-photo（sub-resource CRUD）＋ resolve（掃碼工作站 條碼→料號）

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { CreatePartBarcodeDto, UpdatePartBarcodeDto } from './dto/part-barcode.dto';

const SEL = {
  id: true,
  tenantId: true,
  partId: true,
  barcode: true,
  isDefault: true,
  remark: true,
  createdAt: true,
  createdBy: true,
} as const;

@Injectable()
export class PartBarcodeService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPart(tenantId: string, partId: string) {
    const p = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { id: true, code: true, name: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return p;
  }

  async list(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const part = await this.assertPart(tenantId, partId);
    const rows = await this.prisma.nx01PartBarcode.findMany({
      where: { tenantId, partId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: SEL,
    });
    // Step 2 標籤列印：附料號品名快照（標籤內容用、省前端再查一次 part）
    return { part: { partNo: part.code, partName: part.name }, rows };
  }

  async create(user: RequestUser, partId: string, dto: CreatePartBarcodeDto) {
    const tenantId = requireTenantId(user);
    await this.assertPart(tenantId, partId);
    const code = dto.barcode.trim();
    if (!code) throw new BadRequestException('barcode 不可為空');

    // 同租戶條碼唯一（掃碼反查料號的前提）；先查給可讀錯誤、DB unique 當保險絲
    const dup = await this.prisma.nx01PartBarcode.findFirst({
      where: { tenantId, barcode: code },
      select: { partId: true, part: { select: { code: true } } },
    });
    if (dup) {
      throw new ConflictException(`條碼 ${code} 已掛在料號 ${dup.part?.code ?? dup.partId}、同租戶條碼不可重複`);
    }

    // 該 part 第一條自動設預設；明示 isDefault=true 則搶預設（其餘清掉）
    const count = await this.prisma.nx01PartBarcode.count({ where: { tenantId, partId } });
    const isDefault = dto.isDefault ?? count === 0;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault && count > 0) {
        await tx.nx01PartBarcode.updateMany({ where: { tenantId, partId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.nx01PartBarcode.create({
        data: {
          tenantId,
          partId,
          barcode: code,
          isDefault,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
        },
        select: SEL,
      });
    });
  }

  async update(user: RequestUser, partId: string, barcodeId: string, dto: UpdatePartBarcodeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartBarcode.findFirst({
      where: { id: barcodeId, tenantId, partId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Barcode not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true && !existing.isDefault) {
        await tx.nx01PartBarcode.updateMany({ where: { tenantId, partId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.nx01PartBarcode.update({
        where: { id: barcodeId },
        data: {
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
        },
        select: SEL,
      });
    });
  }

  async remove(user: RequestUser, partId: string, barcodeId: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01PartBarcode.findFirst({
      where: { id: barcodeId, tenantId, partId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Barcode not found');
    await this.prisma.nx01PartBarcode.delete({ where: { id: barcodeId } });
    return { ok: true };
  }

  /**
   * 掃碼解析：條碼 → 料號（掃碼工作站用、任何登入者可呼）。
   * 對照表命中 → 回 part；未命中回 found=false（前端 fallback 料號直比、行為不破壞既有）。
   */
  async resolve(user: RequestUser, code: string) {
    const tenantId = requireTenantId(user);
    const c = code.trim();
    if (!c) return { found: false as const };
    const row = await this.prisma.nx01PartBarcode.findFirst({
      where: { tenantId, barcode: c },
      select: { partId: true, part: { select: { code: true, name: true } } },
    });
    if (!row) return { found: false as const };
    return {
      found: true as const,
      partId: row.partId,
      partNo: row.part.code,
      partName: row.part.name,
    };
  }

  /**
   * Step 2 標籤列印：批量取預設條碼（例：進貨單全明細印標）。
   * 無對照的料不回列、前端 fallback 用料號當條碼內容（掃回來料號直比本來就通）。
   */
  async defaults(user: RequestUser, partIds: string[]) {
    const tenantId = requireTenantId(user);
    const ids = [...new Set(partIds.map((s) => s.trim()).filter(Boolean))].slice(0, 500);
    if (!ids.length) return { rows: [] };
    const rows = await this.prisma.nx01PartBarcode.findMany({
      where: { tenantId, partId: { in: ids }, isDefault: true },
      select: { partId: true, barcode: true },
    });
    return { rows };
  }
}
