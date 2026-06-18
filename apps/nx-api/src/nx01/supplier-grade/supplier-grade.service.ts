// apps/nx-api/src/nx01/supplier-grade/supplier-grade.service.ts
// LITE 階段 1 M2-c：供應商分級 service（CRUD）。
// 05 批 T4 2026-06-07：半開放升級 — 開放 Create、A/B/C/D 內建 lock（不可刪、name/desc/sort/active 可改）。
//   守住 partner.recalcSupplierGradeByPaymentTerm 依賴的自動分級邏輯（hard-code 映射到 A/B/C/D）。
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateSupplierGradeDto,
  ListSupplierGradeQueryDto,
  UpdateSupplierGradeDto,
} from './dto/supplier-grade.dto';

/** 內建鎖定 code（partner.recalcSupplierGradeByPaymentTerm 依賴、不可刪）。 */
const BUILTIN_SUPPLIER_GRADE_CODES = new Set(['A', 'B', 'C', 'D']);

export function isBuiltinSupplierGradeCode(code: string | null | undefined): boolean {
  return BUILTIN_SUPPLIER_GRADE_CODES.has(String(code ?? '').trim().toUpperCase());
}

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  description: true,
  sortNo: true,
  isActive: true,
  isBuiltin: true, // 執行長 2026-06-18 拍板:改用 schema 欄、不再用 code 白名單
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Row = Prisma.Nx01SupplierGradeGetPayload<{ select: typeof SEL }>;

/** 對外 row（schema isBuiltin 已含、本 helper 留兼容、無實際 transform）*/
function withIsBuiltin<T>(row: T): T {
  return row;
}

@Injectable()
export class SupplierGradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(
    tenantId: string,
    q: ListSupplierGradeQueryDto,
  ): Prisma.Nx01SupplierGradeWhereInput {
    const where: Prisma.Nx01SupplierGradeWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  async list(user: RequestUser, q: ListSupplierGradeQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 100;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01SupplierGrade.count({ where }),
      this.prisma.nx01SupplierGrade.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map(withIsBuiltin) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01SupplierGrade.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!row) throw new NotFoundException('Supplier grade not found');
    return withIsBuiltin(row);
  }

  /**
   * 05 批 T4 2026-06-07：開放客戶新增自訂等級（例：VIP / 列管）。
   * - code 大寫 + tenant 內唯一（service 自防、schema 無 unique 限制）
   * - 內建 A/B/C/D 與自訂等級平起平坐、純評等用、無加成率參數
   */
  async create(user: RequestUser, dto: CreateSupplierGradeDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01SupplierGrade.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('分級代碼已存在、請改用其他代碼');
    const row = await this.prisma.nx01SupplierGrade.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        sortNo: dto.sortNo ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_supplier_grade',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立供應商分級',
      afterData: row as object,
    });
    return withIsBuiltin(row);
  }

  /**
   * 05 批 T4 2026-06-07：軟刪除（停用）。
   * - A/B/C/D 內建鎖：拋 403（保 partner.recalcSupplierGradeByPaymentTerm 依賴）
   * - 自訂等級可停用（保留紀錄、partner.supplierGradeId 既有指派不動）
   */
  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01SupplierGrade.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Supplier grade not found');
    // 執行長 2026-06-18 B:內建分級不允許停用（schema isBuiltin 欄為主）
    if (existing.isBuiltin) {
      throw new ForbiddenException(
        `供應商分級「${existing.code}」為系統內建、不允許停用（保自動分級規則 partner.recalcSupplierGradeByPaymentTerm 依賴）`,
      );
    }
    const row = await this.prisma.nx01SupplierGrade.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_supplier_grade',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除供應商分級（自訂等級）',
      beforeData: existing as object,
      afterData: row as object,
    });
    return withIsBuiltin(row);
  }

  /**
   * M2-c：OWNER 可改 name / description / sortNo / isActive。
   * code 鎖（A/B/C/D 4 級固定、DTO 層已 whitelist 過濾）。
   */
  async update(user: RequestUser, id: string, dto: UpdateSupplierGradeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01SupplierGrade.findFirst({
      where: { id, tenantId },
      select: SEL,
    });
    if (!existing) throw new NotFoundException('Supplier grade not found');
    const row = await this.prisma.nx01SupplierGrade.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sortNo !== undefined ? { sortNo: dto.sortNo } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_supplier_grade',
      entityId: id,
      entityCode: row.code,
      summary: '修改供應商分級（name/description/sortNo/isActive）',
      beforeData: existing as object,
      afterData: row as object,
    });
    return withIsBuiltin(row);
  }
}
