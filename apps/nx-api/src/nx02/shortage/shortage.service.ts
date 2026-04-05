/**
 * File: apps/nx-api/src/nx02/shortage/shortage.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHOR-SVC-001：缺貨偵測、缺貨簿列表、轉 RFQ、忽略
 *
 * Notes:
 * - detect() 供開帳存／盤點／調撥過帳於 transaction 內呼叫
 * - @FUNCTION_CODE NX02-SHOR-SVC-001-F01
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'db-core';

import { allocateRfqDocNo } from '../../nx01/utils/nx01-doc-no';
import { PrismaService } from '../../prisma/prisma.service';

import { allocateTransferDocNo } from '../utils/nx02-doc-no';

import type { ShortageToRfqBodyDto } from './dto/shortage.dto';

function d(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

@Injectable()
export class ShortageService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @FUNCTION_CODE NX02-SHOR-SVC-001-F01
   */
  async detect(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
    warehouseId: string,
    userId?: string | null,
  ): Promise<void> {
    const now = new Date();
    const bal = await tx.nx02StockBalance.findUnique({
      where: {
        tenantId_partId_warehouseId: { tenantId, partId, warehouseId },
      },
    });
    const onHand = bal?.onHandQty ?? d(0);

    const setting = await tx.nx02PartStockSetting.findFirst({
      where: { tenantId, partId, warehouseId, isActive: true },
    });
    const minQty = setting?.minQty ?? d(0);

    if (setting && minQty.gt(0)) {
      if (onHand.lt(minQty)) {
        const shortageQty = minQty.sub(onHand);
        const reorder = setting.reorderQty ?? d(0);
        const suggestOrderQty = reorder.gt(0) ? reorder : shortageQty;

        const open = await tx.nx02Shortage.findFirst({
          where: { tenantId, partId, warehouseId, status: 'O' },
        });
        if (open) {
          await tx.nx02Shortage.update({
            where: { id: open.id },
            data: {
              onHandQty: onHand,
              minQty,
              shortageQty,
              suggestOrderQty,
              detectedAt: now,
              updatedBy: userId ?? null,
            },
          });
        } else {
          await tx.nx02Shortage.create({
            data: {
              tenantId,
              partId,
              warehouseId,
              onHandQty: onHand,
              minQty,
              shortageQty,
              suggestOrderQty,
              status: 'O',
              detectedAt: now,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        }
        await this.tryCreateAutoTransferDraft(
          tx,
          tenantId,
          partId,
          warehouseId,
          suggestOrderQty,
          userId,
        );
      } else {
        await tx.nx02Shortage.updateMany({
          where: { tenantId, partId, warehouseId, status: 'O' },
          data: {
            status: 'C',
            resolvedAt: now,
            updatedBy: userId ?? null,
          },
        });
      }
    }
  }

  /**
   * @FUNCTION_CODE NX02-SHOR-SVC-001-F02
   */
  private async tryCreateAutoTransferDraft(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
    toWarehouseId: string,
    suggestOrderQty: Prisma.Decimal,
    userId?: string | null,
  ): Promise<void> {
    const rules = await tx.nx02AutoReplenish.findMany({
      where: { tenantId, toWarehouseId, isActive: true },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
      include: { fromWarehouse: { select: { id: true, code: true } } },
    });

    const part = await tx.nx00Part.findFirst({
      where: { id: partId, tenantId },
      select: { id: true, code: true, name: true, partBrandId: true },
    });
    if (!part) return;

    for (const rule of rules) {
      const srcBal = await tx.nx02StockBalance.findUnique({
        where: {
          tenantId_partId_warehouseId: {
            tenantId,
            partId,
            warehouseId: rule.fromWarehouseId,
          },
        },
      });
      const avail = srcBal?.availableQty ?? d(0);
      if (avail.lte(0)) continue;

      const qty = suggestOrderQty.lt(avail) ? suggestOrderQty : avail;
      if (qty.lte(0)) continue;

      const stNow = new Date();
      const utc = new Date(
        Date.UTC(
          stNow.getUTCFullYear(),
          stNow.getUTCMonth(),
          stNow.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const docNo = await allocateTransferDocNo(
        tx,
        tenantId,
        utc,
        rule.fromWarehouse.code,
      );

      await tx.nx02StockTransfer.create({
        data: {
          tenantId,
          docNo,
          stDate: utc,
          fromWarehouseId: rule.fromWarehouseId,
          toWarehouseId: rule.toWarehouseId,
          status: 'D',
          remark: '自動補貨觸發',
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: {
            create: [
              {
                lineNo: 1,
                partId: part.id,
                partNo: part.code,
                partName: part.name,
                partBrandId: part.partBrandId ?? null,
                fromLocationId: null,
                toLocationId: null,
                qty,
                unitCost: d(0),
                remark: '',
                createdBy: userId ?? null,
                updatedBy: userId ?? null,
              },
            ],
          },
        },
      });
      return;
    }
  }

  /**
   * @FUNCTION_CODE NX02-SHOR-SVC-001-F03
   */
  async list(
    tenantId: string,
    opts: {
      q?: string;
      warehouseId?: string;
      status?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const status =
      opts.status && ['O', 'R', 'C', 'I'].includes(opts.status) ? opts.status : null;

    const where: Prisma.Nx02ShortageWhereInput = { tenantId };
    if (status) where.status = status;
    if (opts.warehouseId?.trim()) {
      where.warehouseId = opts.warehouseId.trim();
    }
    const q = opts.q?.trim();
    if (q) {
      where.OR = [
        { part: { code: { contains: q, mode: 'insensitive' } } },
        { part: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.nx02Shortage.count({ where }),
      this.prisma.nx02Shortage.findMany({
        where,
        orderBy: [{ detectedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          part: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      rows: rows.map((r) => ({
        id: r.id,
        partId: r.partId,
        partNo: r.part.code,
        partName: r.part.name,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouse.name,
        onHandQty: r.onHandQty.toNumber(),
        minQty: r.minQty.toNumber(),
        shortageQty: r.shortageQty.toNumber(),
        suggestOrderQty: r.suggestOrderQty.toNumber(),
        detectedAt: r.detectedAt.toISOString(),
        status: r.status,
        refRfqId: r.refRfqId,
      })),
    };
  }

  /**
   * @FUNCTION_CODE NX02-SHOR-SVC-001-F04
   */
  async toRfq(tenantId: string, userId: string | undefined, body: ShortageToRfqBodyDto) {
    const ids = Array.isArray(body.shortageIds) ? body.shortageIds.map((x) => String(x).trim()).filter(Boolean) : [];
    if (!ids.length) throw new BadRequestException('shortageIds 不可為空');

    const rfqId = await this.prisma.$transaction(async (tx) => {
      const shorts = await tx.nx02Shortage.findMany({
        where: { id: { in: ids }, tenantId },
        include: {
          part: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true } },
        },
        orderBy: { id: 'asc' },
      });
      if (shorts.length !== ids.length) {
        throw new BadRequestException('部分缺貨紀錄不存在或不在本租戶');
      }
      for (const s of shorts) {
        if (s.status !== 'O') {
          throw new BadRequestException(`缺貨紀錄 ${s.id} 狀態非可轉 RFQ`);
        }
      }
      const whId = shorts[0]!.warehouseId;
      if (shorts.some((s) => s.warehouseId !== whId)) {
        throw new BadRequestException('批次轉 RFQ 僅限同一倉庫之缺貨紀錄');
      }

      const twd = await tx.nx00Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } });
      if (!twd) throw new BadRequestException('系統缺少 TWD 幣別，無法建立 RFQ 明細');

      const today = new Date();
      const rfqDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0),
      );
      const docNo = await allocateRfqDocNo(tx, tenantId, rfqDate, shorts[0]!.warehouse.code);

      const rfq = await tx.nx01Rfq.create({
        data: {
          tenantId,
          docNo,
          rfqDate,
          status: 'D',
          remark: '由缺貨簿轉入',
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
          items: {
            create: shorts.map((s, i) => ({
              lineNo: i + 1,
              partId: s.partId,
              partNo: s.part.code,
              partName: s.part.name,
              qty: s.suggestOrderQty,
              currencyId: twd.id,
              remark: `缺貨 ${s.part.code}`,
              createdBy: userId ?? null,
              updatedBy: userId ?? null,
            })),
          },
        },
      });

      await tx.nx02Shortage.updateMany({
        where: { id: { in: ids }, tenantId, status: 'O' },
        data: {
          status: 'R',
          refRfqId: rfq.id,
          updatedBy: userId ?? null,
        },
      });

      return rfq.id;
    });

    return { rfqId };
  }

  /**
   * @FUNCTION_CODE NX02-SHOR-SVC-001-F05
   */
  async ignore(tenantId: string, userId: string | undefined, id: string) {
    const row = await this.prisma.nx02Shortage.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('缺貨紀錄不存在');
    if (row.status !== 'O') throw new BadRequestException('僅缺貨中可忽略');
    await this.prisma.nx02Shortage.update({
      where: { id },
      data: { status: 'I', updatedBy: userId ?? null },
    });
    return { ok: true };
  }
}
