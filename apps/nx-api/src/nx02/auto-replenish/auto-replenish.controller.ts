/**
 * File: apps/nx-api/src/nx02/auto-replenish/auto-replenish.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-AURE-CTRL-001：自動補貨設定 REST（JWT + PLUS）
 *
 * @FUNCTION_CODE NX02-AURE-CTRL-001-F01
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';
import { PlusPlanGuard } from '../guards/plus-plan.guard';

import type {
  CreateAutoReplenishBodyDto,
  PatchAutoReplenishActiveBodyDto,
  PatchAutoReplenishBodyDto,
} from './dto/auto-replenish.dto';
import { AutoReplenishService } from './auto-replenish.service';

@Controller('nx02/auto-replenish')
@UseGuards(JwtAuthGuard, PlusPlanGuard)
export class AutoReplenishController {
  constructor(private readonly svc: AutoReplenishService) { }

  /**
   * @FUNCTION_CODE NX02-AURE-CTRL-001-F01
   */
  @Get()
  async list(@Req() req: { user?: RequestUser }) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.list(tenantId);
  }

  /**
   * @FUNCTION_CODE NX02-AURE-CTRL-001-F02
   */
  @Get(':id')
  async getOne(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-AURE-CTRL-001-F03
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: { user?: RequestUser },
    @Body() body: CreateAutoReplenishBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX02-AURE-CTRL-001-F04
   */
  @Patch(':id')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchAutoReplenishBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.patch(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX02-AURE-CTRL-001-F05
   */
  @Patch(':id/active')
  async setActive(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchAutoReplenishActiveBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.setActive(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX02-AURE-CTRL-001-F06
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.remove(tenantId, id);
  }
}
