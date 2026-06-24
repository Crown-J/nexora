import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { isSysadmin, SYSADMIN_ROLE_CODE } from '../../shared/nx01/is-sysadmin';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateRoleDto, ListRoleQueryDto, UpdateRoleDto } from './dto/role.dto';

const SEL = {
  id: true,
  tenantId: true,
  code: true,
  name: true,
  description: true,
  // 02 第三批 T1 2026-06-07：職務層級 + 隸屬部門
  level: true,
  departmentId: true,
  // 2026-06-24：職務硬綁組別（業務職務必填、isSystem 系統角色可空）
  teamId: true,
  isSystem: true,
  isActive: true,
  sortNo: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  department: { select: { code: true, name: true } },
  team: { select: { code: true, name: true, departmentId: true } },
} as const;

type Row = Prisma.Nx01RoleGetPayload<{ select: typeof SEL }>;

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: ListRoleQueryDto): Prisma.Nx01RoleWhereInput {
    const where: Prisma.Nx01RoleWhereInput = { tenantId };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.isActive !== undefined) where.isActive = q.isActive;
    // 2026-06-24：teamId / departmentId 過濾（OrgStructurePage 四欄 cascade 用）
    if (q.teamId) where.teamId = q.teamId;
    if (q.departmentId) where.departmentId = q.departmentId;
    return where;
  }

  /** 2026-06-24：業務職務 teamId 必填 + team.departmentId 必須一致；isSystem 系統角色豁免 */
  private async validateTeam(
    tenantId: string,
    isSystem: boolean,
    teamId: string | null | undefined,
    departmentId: string | null | undefined,
  ): Promise<{ teamId: string | null; departmentId: string | null }> {
    if (isSystem) {
      return { teamId: teamId ?? null, departmentId: departmentId ?? null };
    }
    if (!teamId) {
      throw new ForbiddenException('業務職務必須指定隸屬組別（teamId 必填）');
    }
    const team = await this.prisma.nx01Team.findFirst({
      where: { id: teamId, tenantId, isActive: true },
      select: { id: true, departmentId: true },
    });
    if (!team) throw new NotFoundException('指定的組別不存在或已停用');
    // departmentId 從 team 自動帶入（保持冗餘衍生欄一致）
    return { teamId: team.id, departmentId: team.departmentId };
  }

  async list(user: RequestUser, q: ListRoleQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    // SYSADMIN 鎖定：一般用戶看不到系統管理員職務（伊諾瓦後台角色）
    if (!isSysadmin(user)) {
      where.NOT = { code: { equals: SYSADMIN_ROLE_CODE, mode: 'insensitive' } };
    }
    const [total, rows] = await Promise.all([
      this.prisma.nx01Role.count({ where }),
      this.prisma.nx01Role.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapRow(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01Role.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Role not found');
    // SYSADMIN 鎖定：一般用戶看不到 → 裝作不存在
    if (!isSysadmin(user) && String(row.code).trim().toUpperCase() === SYSADMIN_ROLE_CODE) {
      throw new NotFoundException('Role not found');
    }
    return this.mapRow(row);
  }

  async create(user: RequestUser, dto: CreateRoleDto) {
    const tenantId = requireTenantId(user);
    const code = dto.code.trim().toUpperCase();
    const dup = await this.prisma.nx01Role.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Role code already exists');
    // 2026-06-24：業務職務 teamId 必填、departmentId 由 team 衍生
    const validated = await this.validateTeam(
      tenantId,
      false,
      dto.teamId?.trim() || null,
      dto.departmentId?.trim() || null,
    );
    const row = await this.prisma.nx01Role.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        // 02 第三批 T1 2026-06-07：職務層級 + 隸屬部門
        level: dto.level?.trim() || null,
        departmentId: validated.departmentId,
        teamId: validated.teamId,
        sortNo: dto.sortNo ?? 0,
        isSystem: false,
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
      entityTable: 'nx01_role',
      entityId: row.id,
      entityCode: row.code,
      summary: '建立職務',
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateRoleDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Role.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) {
      throw new ForbiddenException('Cannot modify system role');
    }
    // 2026-06-24：teamId / departmentId 改動需重新 validate（業務職務 teamId 必填、dep 由 team 衍生）
    let teamPatch: { teamId?: string | null; departmentId?: string | null } = {};
    if (dto.teamId !== undefined || dto.departmentId !== undefined) {
      const nextTeamId =
        dto.teamId !== undefined ? (dto.teamId?.trim() || null) : existing.teamId;
      const nextDepId =
        dto.departmentId !== undefined ? (dto.departmentId?.trim() || null) : existing.departmentId;
      const validated = await this.validateTeam(tenantId, existing.isSystem, nextTeamId, nextDepId);
      teamPatch = { teamId: validated.teamId, departmentId: validated.departmentId };
    }
    const row = await this.prisma.nx01Role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        // 02 第三批 T1 2026-06-07
        ...(dto.level !== undefined ? { level: dto.level?.trim() || null } : {}),
        ...teamPatch,
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
      entityTable: 'nx01_role',
      entityId: id,
      entityCode: row.code,
      summary: '修改職務',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01Role.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) {
      throw new ForbiddenException('Cannot deactivate system role');
    }
    const row = await this.prisma.nx01Role.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_role',
      entityId: id,
      entityCode: row.code,
      summary: '軟刪除職務',
      beforeData: existing as object,
      afterData: row as object,
    });
    return this.mapRow(row);
  }

  private mapRow(row: Row) {
    const { department, team, ...rest } = row;
    return {
      ...rest,
      departmentCode: department?.code ?? null,
      departmentName: department?.name ?? null,
      // 2026-06-24：team 衛星顯示用
      teamCode: team?.code ?? null,
      teamName: team?.name ?? null,
    };
  }
}
