/**
 * File: apps/nx-api/src/nx00/parts/parts.service.ts
 * Purpose: NX00-API-002 Parts Service (CRUD + Query)
 * Notes:
 * - PrismaService 注入方式對齊 users.service.ts
 * - include brand/functionGroup/status 方便 UI 列表直接顯示
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreatePartBody, ListPartsArgs, SetPartActiveBody, UpdatePartBody } from '../dto/parts.dto';

@Injectable()
export class Nx00PartsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @CODE nxapi_nx00_parts_list_svc_001
   */
  async list(args: ListPartsArgs) {
    const keyword = args.keyword?.trim();
    const skip = (args.page - 1) * args.pageSize;
    const take = args.pageSize;

    const where: any = {
      ...(args.brandId ? { brandId: args.brandId } : {}),
      ...(args.functionGroupId ? { functionGroupId: args.functionGroupId } : {}),
      ...(args.statusId ? { statusId: args.statusId } : {}),
      ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
      ...(keyword
        ? {
            OR: [
              { partNo: { contains: keyword, mode: 'insensitive' } },
              { oldPartNo: { contains: keyword, mode: 'insensitive' } },
              { displayNo: { contains: keyword, mode: 'insensitive' } },
              { nameZh: { contains: keyword, mode: 'insensitive' } },
              { nameEn: { contains: keyword, mode: 'insensitive' } },
              { barcode: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderByMap: Record<string, any> = {
      partNo: { partNo: args.sortDir ?? 'asc' },
      nameZh: { nameZh: args.sortDir ?? 'asc' },
      createdAt: { createdAt: args.sortDir ?? 'asc' },
    };

    const orderBy = orderByMap[args.sortBy ?? 'partNo'] ?? orderByMap.partNo;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.nx00Part.count({ where }),
      this.prisma.nx00Part.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          brand: true,
          functionGroup: true,
          status: true,
        },
      }),
    ]);

    return {
      items,
      total,
      page: args.page,
      pageSize: args.pageSize,
    };
  }

  /**
   * @CODE nxapi_nx00_parts_get_svc_001
   */
  async get(id: string) {
    const row = await this.prisma.nx00Part.findUnique({
      where: { id },
      include: { brand: true, functionGroup: true, status: true },
    });

    if (!row) throw new NotFoundException('Part not found');
    return row;
  }

  /**
   * @CODE nxapi_nx00_parts_create_svc_001
   */
  async create(body: CreatePartBody, actorUserId?: string) {
    if (!body?.partNo?.trim()) throw new BadRequestException('partNo is required');
    if (!body?.nameZh?.trim()) throw new BadRequestException('nameZh is required');
    if (!body?.brandId) throw new BadRequestException('brandId is required');
    if (!body?.statusId) throw new BadRequestException('statusId is required');

    try {
      const row = await this.prisma.nx00Part.create({
        data: {
          partNo: body.partNo.trim(),
          oldPartNo: body.oldPartNo ?? null,
          displayNo: body.displayNo ?? null,
          nameZh: body.nameZh.trim(),
          nameEn: body.nameEn ?? null,
          brandId: body.brandId,
          functionGroupId: body.functionGroupId ?? null,
          statusId: body.statusId,
          barcode: body.barcode ?? null,
          isActive: body.isActive ?? true,
          remark: body.remark ?? null,
          createdBy: actorUserId ?? null,
        },
        include: { brand: true, functionGroup: true, status: true },
      });

      return row;
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Create failed');
    }
  }

  /**
   * @CODE nxapi_nx00_parts_update_svc_001
   */
  async update(id: string, body: UpdatePartBody, actorUserId?: string) {
    await this.get(id);

    try {
      const row = await this.prisma.nx00Part.update({
        where: { id },
        data: {
          ...(body.partNo !== undefined ? { partNo: body.partNo?.trim() ?? '' } : {}),
          ...(body.oldPartNo !== undefined ? { oldPartNo: body.oldPartNo } : {}),
          ...(body.displayNo !== undefined ? { displayNo: body.displayNo } : {}),
          ...(body.nameZh !== undefined ? { nameZh: body.nameZh?.trim() ?? '' } : {}),
          ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
          ...(body.brandId !== undefined ? { brandId: body.brandId } : {}),
          ...(body.functionGroupId !== undefined ? { functionGroupId: body.functionGroupId } : {}),
          ...(body.statusId !== undefined ? { statusId: body.statusId } : {}),
          ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.remark !== undefined ? { remark: body.remark } : {}),
          updatedBy: actorUserId ?? null,
        },
        include: { brand: true, functionGroup: true, status: true },
      });

      return row;
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Update failed');
    }
  }

  /**
   * @CODE nxapi_nx00_parts_set_active_svc_001
   */
  async setActive(id: string, body: SetPartActiveBody, actorUserId?: string) {
    await this.get(id);

    try {
      const row = await this.prisma.nx00Part.update({
        where: { id },
        data: {
          isActive: !!body.isActive,
          updatedBy: actorUserId ?? null,
        },
        include: { brand: true, functionGroup: true, status: true },
      });

      return row;
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Set active failed');
    }
  }
}
