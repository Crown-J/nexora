/**
 * File: apps/nx-api/src/nx01/po/controllers/po.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-PO-CTRL-001：PO endpoints
 */

import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { PoService } from '../services/po.service';
import type { ListPoQuery } from '../dto/po.dto';

@Controller('nx01/po')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PoController {
  constructor(private readonly po: PoService) {}

  @Get()
  async list(@Query() query: any) {
    const q: ListPoQuery = {
      q: typeof query.q === 'string' ? query.q : undefined,
      status: typeof query.status === 'string' ? query.status : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    };
    return this.po.list(q);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.po.get(id);
  }

  @Post(':id/post')
  async post(@Param('id') id: string, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    const ipAddr = (req?.ip as string | undefined) ?? null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;
    return this.po.post(id, { actorUserId, ipAddr, userAgent });
  }
}

