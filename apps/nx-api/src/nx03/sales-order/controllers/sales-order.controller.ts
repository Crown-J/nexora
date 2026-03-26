/**
 * File: apps/nx-api/src/nx03/sales-order/controllers/sales-order.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-SALES-ORDER-CTRL-001：Sales Order endpoints（MVP：list/get/ship）
 */

import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { SalesOrderService } from '../services/sales-order.service';
import type { ListSalesOrderQuery } from '../dto/sales-order.dto';

@Controller('nx03/sales-order')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SalesOrderController {
  constructor(private readonly so: SalesOrderService) {}

  @Get()
  async list(@Query() query: any) {
    const q: ListSalesOrderQuery = {
      q: typeof query.q === 'string' ? query.q : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    };
    return this.so.list(q);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.so.get(id);
  }

  @Post(':id/ship')
  async ship(@Param('id') id: string, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.so.ship(id, { actorUserId, ipAddr, userAgent });
  }
}

