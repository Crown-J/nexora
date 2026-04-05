/**
 * File: apps/nx-api/src/nx02/shortage/shortage.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHOR-CTRL-001：缺貨簿 REST（JWT + PLUS）
 *
 * @FUNCTION_CODE NX02-SHOR-CTRL-001-F01
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';
import { PlusPlanGuard } from '../guards/plus-plan.guard';

import type { ShortageToRfqBodyDto } from './dto/shortage.dto';
import { ShortageService } from './shortage.service';

@Controller('nx02/shortage')
@UseGuards(JwtAuthGuard, PlusPlanGuard)
export class ShortageController {
  constructor(private readonly shortage: ShortageService) { }

  /**
   * @FUNCTION_CODE NX02-SHOR-CTRL-001-F01
   */
  @Get()
  async list(
    @Req() req: { user?: RequestUser },
    @Query('q') q?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.shortage.list(tenantId, {
      q,
      warehouseId,
      status,
      page: page ? parseInt(page, 10) || 1 : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) || 20 : 20,
    });
  }

  /**
   * @FUNCTION_CODE NX02-SHOR-CTRL-001-F02
   */
  @Post('to-rfq')
  @HttpCode(HttpStatus.OK)
  async toRfq(@Req() req: { user?: RequestUser }, @Body() body: ShortageToRfqBodyDto) {
    const tenantId = assertNx02TenantId(req.user);
    return this.shortage.toRfq(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX02-SHOR-CTRL-001-F03
   */
  @Patch(':id/ignore')
  async ignore(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.shortage.ignore(tenantId, req.user?.sub, id);
  }
}
