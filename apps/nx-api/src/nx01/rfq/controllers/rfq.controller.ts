/**
 * File: apps/nx-api/src/nx01/rfq/controllers/rfq.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-RFQ-CTRL-001：RFQ endpoints
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { RfqService } from '../services/rfq.service';
import type { CreateRfqBody, ListRfqQuery, ToPoFromRfqBody, UpdateRfqBody } from '../dto/rfq.dto';

@Controller('nx01/rfq')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RfqController {
  constructor(private readonly rfq: RfqService) {}

  @Get()
  async list(@Query() query: any) {
    const q: ListRfqQuery = {
      q: typeof query.q === 'string' ? query.q : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    };
    return this.rfq.list(q);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.rfq.get(id);
  }

  @Post()
  async create(@Body() body: CreateRfqBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

    return this.rfq.create(body, { actorUserId, ipAddr, userAgent });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateRfqBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

    return this.rfq.update(id, body, { actorUserId, ipAddr, userAgent });
  }

  @Post(':id/to-po')
  async toPo(@Param('id') rfqId: string, @Body() body: ToPoFromRfqBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

    return this.rfq.createPoFromRfq(rfqId, body, { actorUserId, ipAddr, userAgent });
  }
}

