/**
 * File: apps/nx-api/src/nx02/auto-replenish/auto-replenish.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-SVC-001：自動補貨規則 CRUD、啟用切換
 *
 * @FUNCTION_CODE NX02-AURE-SVC-001-F01
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import type {
  CreateAutoReplenishBodyDto,
  PatchAutoReplenishActiveBodyDto,
  PatchAutoReplenishBodyDto,
} from './dto/auto-replenish.dto';

@Injectable()
export class AutoReplenishService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @FUNCTION_CODE NX02-AURE-SVC-001-F01
   */
  async list(tenantId: string) {
    const rows = await this.prisma.nx02AutoReplenish.findMany({
      where: { tenantId },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
      include: {
        fromWarehouse: { select: { code: true, name: true } },
        toWarehouse: { select: { code: true, name: true } },
      },
    });
    return {
      rows: rows.map((r) => ({
        id: r.id,
        fromWarehouseId: r.fromWarehouseId,
        fromWarehouseName: r.fromWarehouse.name,
        toWarehouseId: r.toWarehouseId,
        toWarehouseName: r.toWarehouse.name,
        priority: r.priority,
        isActive: r.isActive,
        remark: r.remark,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX02-AURE-SVC-001-F02
   */
  async getById(tenantId: string, id: string) {
    const r = await this.prisma.nx02AutoReplenish.findFirst({
      where: { id, tenantId },
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
      },
    });
    if (!r) throw new NotFoundException('規則不存在');
    return {
      id: r.id,
      fromWarehouseId: r.fromWarehouseId,
      fromWarehouseName: r.fromWarehouse.name,
      toWarehouseId: r.toWarehouseId,
      toWarehouseName: r.toWarehouse.name,
      priority: r.priority,
      isActive: r.isActive,
      remark: r.remark,
    };
  }

  /**
   * @FUNCTION_CODE NX02-AURE-SVC-001-F03
   */
  async create(tenantId: string, userId: string | undefined, body: CreateAutoReplenishBodyDto) {
    const fromId = body.fromWarehouseId?.trim();
    const toId = body.toWarehouseId?.trim();
    if (!fromId || !toId) throw new BadRequestException('來源倉與目標倉必填');
    if (fromId === toId) throw new BadRequestException('來源倉與目標倉不可相同');
    const priority = body.priority != null ? Math.floor(Number(body.priority)) : 1;
    if (!Number.isFinite(priority) || priority < 0) {
      throw new BadRequestException('優先順序須為非負整數');
    }

    try {
      const r = await this.prisma.nx02AutoReplenish.create({
        data: {
          tenantId,
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          priority,
          isActive: body.isActive !== false,
          remark: body.remark ?? '',
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        },
        include: {
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
        },
      });
      return {
        id: r.id,
        fromWarehouseId: r.fromWarehouseId,
        fromWarehouseName: r.fromWarehouse.name,
        toWarehouseId: r.toWarehouseId,
        toWarehouseName: r.toWarehouse.name,
        priority: r.priority,
        isActive: r.isActive,
        remark: r.remark,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('相同來源倉與目標倉的規則已存在');
      }
      throw e;
    }
  }

  /**
   * @FUNCTION_CODE NX02-AURE-SVC-001-F04
   */
  async patch(tenantId: string, userId: string | undefined, id: string, body: PatchAutoReplenishBodyDto) {
    const cur = await this.prisma.nx02AutoReplenish.findFirst({ where: { id, tenantId } });
    if (!cur) throw new NotFoundException('規則不存在');

    const fromId = body.fromWarehouseId?.trim() ?? cur.fromWarehouseId;
    const toId = body.toWarehouseId?.trim() ?? cur.toWarehouseId;
    if (fromId === toId) throw new BadRequestException('來源倉與目標倉不可相同');

    let priority = cur.priority;
    if (body.priority != null) {
      priority = Math.floor(Number(body.priority));
      if (!Number.isFinite(priority) || priority < 0) {
        throw new BadRequestException('優先順序須為非負整數');
      }
    }

    try {
      const r = await this.prisma.nx02AutoReplenish.update({
        where: { id },
        data: {
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          priority,
          remark: body.remark !== undefined ? body.remark ?? '' : undefined,
          updatedBy: userId ?? null,
        },
        include: {
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
        },
      });
      return {
        id: r.id,
        fromWarehouseId: r.fromWarehouseId,
        fromWarehouseName: r.fromWarehouse.name,
        toWarehouseId: r.toWarehouseId,
        toWarehouseName: r.toWarehouse.name,
        priority: r.priority,
        isActive: r.isActive,
        remark: r.remark,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('相同來源倉與目標倉的規則已存在');
      }
      throw e;
    }
  }

  /**
   * @FUNCTION_CODE NX02-AURE-SVC-001-F05
   */
  async setActive(
    tenantId: string,
    userId: string | undefined,
    id: string,
    body: PatchAutoReplenishActiveBodyDto,
  ) {
    const cur = await this.prisma.nx02AutoReplenish.findFirst({ where: { id, tenantId } });
    if (!cur) throw new NotFoundException('規則不存在');
    await this.prisma.nx02AutoReplenish.update({
      where: { id },
      data: { isActive: Boolean(body.isActive), updatedBy: userId ?? null },
    });
    return { ok: true };
  }

  /**
   * @FUNCTION_CODE NX02-AURE-SVC-001-F06
   */
  async remove(tenantId: string, id: string) {
    const cur = await this.prisma.nx02AutoReplenish.findFirst({ where: { id, tenantId } });
    if (!cur) throw new NotFoundException('規則不存在');
    await this.prisma.nx02AutoReplenish.delete({ where: { id } });
    return { ok: true };
  }
}
