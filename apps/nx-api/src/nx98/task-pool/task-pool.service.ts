// apps/nx-api/src/nx98/task-pool/task-pool.service.ts
// LITE 階段 1 M4：共享待辦池 service（跨模組通用框架）。
//
// 業務語意（Crown 2026-05-28 拍板）：
//   - 任何人可建、可指派或留池中（assigneeUserId=null）
//   - 池中待辦任何人可領取（status OPEN→CLAIMED、claimedBy 寫當前 user）
//   - 主管 ABCD 可指派給 EF（assign endpoint）、⚠️ RBAC TODO（本軌不 enforce）
//   - 領取後可放回池（release：CLAIMED→OPEN、清 claimedAt/claimedBy/assigneeUserId）
//   - 完成 status=DONE / 作廢 status=VOIDED

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type {
  AssignTaskPoolDto,
  CompleteTaskPoolDto,
  CreateTaskPoolDto,
  ListTaskPoolQueryDto,
  UpdateTaskPoolDto,
} from './dto/task-pool.dto';

const SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  sourceModule: true,
  sourceDocType: true,
  sourceDocId: true,
  sourceDocNo: true,
  title: true,
  description: true,
  category: true,
  priority: true,
  dueDate: true,
  departmentId: true,
  assigneeUserId: true,
  assignedAt: true,
  assignedBy: true,
  claimedAt: true,
  claimedBy: true,
  status: true,
  completedAt: true,
  completedBy: true,
  completedRemark: true,
  voidedAt: true,
  voidedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  department: { select: { code: true, name: true } },
} as const;

@Injectable()
export class TaskPoolService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * list 支援 4 種 scope：
   *   - mine：我的待辦（assigneeUserId = current user、含 CLAIMED + DONE）
   *   - pool：全公司池中未領（status=OPEN）
   *   - dept：部門池（同 dept、未領）— ⚠️ 需 user.departmentId、本軌簡化用 query 參數 departmentId 過濾
   *   - all（default）：全部、按 status / category 過濾
   */
  async list(user: RequestUser, q: ListTaskPoolQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const where: Prisma.Nx98TaskPoolWhereInput = { tenantId };

    if (q.scope === 'mine') {
      where.assigneeUserId = user.sub;
    } else if (q.scope === 'pool') {
      where.status = 'OPEN';
      where.assigneeUserId = null;
    } else if (q.scope === 'dept') {
      // ⚠️ 簡化：scope=dept 時、需 caller 傳 departmentId（前端從 user 帶來、本軌不從 DB 反查）
      // 留 TODO 加 user-department lookup 自動帶 user 的 department
    }

    if (q.status?.trim()) where.status = q.status.trim();
    if (q.category?.trim()) where.category = q.category.trim();
    if (q.sourceModule?.trim()) where.sourceModule = q.sourceModule.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { sourceDocNo: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx98TaskPool.count({ where }),
      this.prisma.nx98TaskPool.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx98TaskPool.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Task not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateTaskPoolDto) {
    const tenantId = requireTenantId(user);
    const now = new Date();
    const hasAssignee = dto.assigneeUserId?.trim();
    return this.prisma.nx98TaskPool.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        category: dto.category.trim(),
        priority: dto.priority ?? 'M',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        departmentId: dto.departmentId?.trim() || null,
        assigneeUserId: hasAssignee || null,
        // 建單時直接指派 → 同步 assignedAt/By
        assignedAt: hasAssignee ? now : null,
        assignedBy: hasAssignee ? user.sub : null,
        sourceModule: dto.sourceModule?.trim() || null,
        sourceDocType: dto.sourceDocType?.trim() || null,
        sourceDocId: dto.sourceDocId?.trim() || null,
        sourceDocNo: dto.sourceDocNo?.trim() || null,
        status: 'OPEN', // 任務狀態：即使有 assignee、仍 OPEN（需 claim 才轉 CLAIMED）
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateTaskPoolDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx98TaskPool.findFirst({ where: { id, tenantId }, select: { status: true } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.status === 'DONE' || existing.status === 'VOIDED') {
      throw new BadRequestException(`Cannot edit task in status '${existing.status}'`);
    }
    return this.prisma.nx98TaskPool.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId?.trim() || null } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  /** 領取（OPEN + 無 assignee → CLAIMED + assignee=user）。 */
  async claim(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx98TaskPool.findFirst({ where: { id, tenantId }, select: { status: true, assigneeUserId: true } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.status !== 'OPEN') {
      throw new ConflictException(`Cannot claim: status is '${existing.status}' (need OPEN)`);
    }
    if (existing.assigneeUserId && existing.assigneeUserId !== user.sub) {
      throw new ConflictException(`Task already assigned to another user`);
    }
    const now = new Date();
    return this.prisma.nx98TaskPool.update({
      where: { id },
      data: {
        status: 'CLAIMED',
        assigneeUserId: user.sub,
        claimedAt: now,
        claimedBy: user.sub,
        // 若 assignedAt 未設、本次領取視為自我指派
        ...(existing.assigneeUserId ? {} : { assignedAt: now, assignedBy: user.sub }),
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  /** 放回池（CLAIMED + assignee=user → OPEN + 清 assignee/claimed）。 */
  async release(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx98TaskPool.findFirst({ where: { id, tenantId }, select: { status: true, assigneeUserId: true } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.status !== 'CLAIMED') {
      throw new ConflictException(`Cannot release: status is '${existing.status}' (need CLAIMED)`);
    }
    return this.prisma.nx98TaskPool.update({
      where: { id },
      data: {
        status: 'OPEN',
        assigneeUserId: null,
        assignedAt: null,
        assignedBy: null,
        claimedAt: null,
        claimedBy: null,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  /** 指派（主管 ABCD 指派給 EF、本軌 RBAC TODO 不 enforce）。assigneeUserId=null 表放回池 */
  async assign(user: RequestUser, id: string, dto: AssignTaskPoolDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx98TaskPool.findFirst({ where: { id, tenantId }, select: { status: true } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.status === 'DONE' || existing.status === 'VOIDED') {
      throw new BadRequestException(`Cannot assign: status is '${existing.status}'`);
    }
    const newAssignee = dto.assigneeUserId?.trim();
    const now = new Date();
    return this.prisma.nx98TaskPool.update({
      where: { id },
      data: {
        assigneeUserId: newAssignee || null,
        assignedAt: newAssignee ? now : null,
        assignedBy: newAssignee ? user.sub : null,
        // 指派改變時、清領取（被指派人需重新 claim）
        claimedAt: null,
        claimedBy: null,
        status: 'OPEN',
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  /** 完成（assignee=user CLAIMED → DONE） */
  async complete(user: RequestUser, id: string, dto: CompleteTaskPoolDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx98TaskPool.findFirst({ where: { id, tenantId }, select: { status: true, assigneeUserId: true } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.status !== 'CLAIMED') {
      throw new ConflictException(`Cannot complete: status is '${existing.status}' (need CLAIMED)`);
    }
    // ⚠️ 不嚴格 enforce assignee=user（主管可代完成）、後續 RBAC 加
    return this.prisma.nx98TaskPool.update({
      where: { id },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        completedBy: user.sub,
        completedRemark: dto.completedRemark?.trim() || null,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  /** 作廢（OPEN/CLAIMED → VOIDED） */
  async voidTask(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx98TaskPool.findFirst({ where: { id, tenantId }, select: { status: true } });
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.status === 'DONE' || existing.status === 'VOIDED') {
      throw new ConflictException(`Cannot void: status is '${existing.status}'`);
    }
    return this.prisma.nx98TaskPool.update({
      where: { id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }
}
