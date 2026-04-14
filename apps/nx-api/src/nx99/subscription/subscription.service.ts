import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

import type { ListSubscriptionsQueryDto } from './dto/subscription.dto';

const SUBSCRIPTION_INCLUDE = {
  tenant: { select: { id: true, code: true, name: true } },
  plan: { select: { id: true, code: true, name: true, levelNo: true } },
  currency: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveTenantFilter(user: RequestUser, query: ListSubscriptionsQueryDto): string {
    const tid = query.tenantId?.trim();
    const isAdmin = (user.roles ?? []).some((r) => String(r).trim().toUpperCase() === 'ADMIN');
    if (!user.tenantId) {
      if (!tid) throw new BadRequestException('tenantId query is required');
      return tid;
    }
    if (tid && tid !== user.tenantId && !isAdmin) {
      throw new ForbiddenException('Cannot query another tenant subscription');
    }
    return tid ?? user.tenantId;
  }

  async list(user: RequestUser, query: ListSubscriptionsQueryDto) {
    const tenantId = this.resolveTenantFilter(user, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.nx99Subscription.count({ where }),
      this.prisma.nx99Subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          ...SUBSCRIPTION_INCLUDE,
          rev_Nx99SubscriptionItem_subscriptionId: {
            where: { status: 'A' },
            take: 50,
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      rows: rows.map((r) => this.mapRow(r)),
    };
  }

  async getById(user: RequestUser, id: string) {
    const row = await this.prisma.nx99Subscription.findUnique({
      where: { id },
      include: {
        ...SUBSCRIPTION_INCLUDE,
        rev_Nx99SubscriptionItem_subscriptionId: {
          where: { status: 'A' },
          take: 100,
        },
      },
    });
    if (!row) throw new NotFoundException('Subscription not found');
    const isAdmin = (user.roles ?? []).some((r) => String(r).trim().toUpperCase() === 'ADMIN');
    if (!isAdmin && user.tenantId && row.tenantId !== user.tenantId) {
      throw new ForbiddenException('Cannot access another tenant subscription');
    }
    return this.mapRow(row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma include 形別過長，列表／單筆共用
  private mapRow(row: any) {
    const items = (row.rev_Nx99SubscriptionItem_subscriptionId ?? []) as {
      id: string;
      itemType: string;
      refId: string;
      status: string;
      isIncluded: boolean;
      billingCycle: string;
      priceSnapshot: number;
      totalSnapshot: number;
      startAt: Date;
      endAt: Date;
    }[];
    return {
      id: row.id,
      tenant_id: row.tenantId,
      tenant: row.tenant
        ? { id: row.tenant.id, code: row.tenant.code, name: row.tenant.name }
        : null,
      plan_id: row.planId,
      plan: row.plan
        ? {
            id: row.plan.id,
            code: row.plan.code,
            name: row.plan.name,
            level_no: row.plan.levelNo,
          }
        : null,
      status: row.status,
      billing_cycle: row.billingCycle,
      seats: row.seats,
      start_at: row.startAt,
      end_at: row.endAt,
      auto_renew: row.autoRenew,
      base_fee_snapshot: row.baseFeeSnapshot,
      seat_fee_snapshot: row.seatFeeSnapshot,
      discount_type_snapshot: row.discountTypeSnapshot,
      discount_value_snapshot: row.discountValueSnapshot,
      subtotal_snapshot: row.subtotalSnapshot,
      discount_amount_snapshot: row.discountAmountSnapshot,
      total_snapshot: row.totalSnapshot,
      currency: row.currency
        ? { id: row.currency.id, code: row.currency.code, name: row.currency.name }
        : null,
      remark: row.remark,
      created_at: row.createdAt,
      created_by: row.createdBy,
      updated_at: row.updatedAt,
      updated_by: row.updatedBy,
      items: items.map((it: (typeof items)[number]) => ({
        id: it.id,
        item_type: it.itemType,
        ref_id: it.refId,
        status: it.status,
        is_included: it.isIncluded,
        billing_cycle: it.billingCycle,
        price_snapshot: it.priceSnapshot,
        total_snapshot: it.totalSnapshot,
        start_at: it.startAt,
        end_at: it.endAt,
      })),
    };
  }
}
