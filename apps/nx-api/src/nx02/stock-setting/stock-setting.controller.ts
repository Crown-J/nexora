/**
 * File: apps/nx-api/src/nx02/stock-setting/stock-setting.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STKG-CTRL-001：庫存設定 REST
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { NX00_VIEW } from '../../nx00/rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../nx00/rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../nx00/rbac/require-nx00-view-permission.decorator';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';

import type {
  PatchStockSettingBodyDto,
  SetStockSettingActiveBodyDto,
  UpsertStockSettingBodyDto,
} from './dto/stock-setting.dto';
import { StockSettingService } from './stock-setting.service';

@Controller('nx02/stock-setting')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class StockSettingController {
  constructor(private readonly svc: StockSettingService) { }

  /**
   * @FUNCTION_CODE NX02-STKG-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_SETTING, 'read')
  async list(
    @Req() req: { user?: RequestUser },
    @Query('q') q?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('hasMinQty') hasMinQtyStr?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    const page = Math.max(1, Number(pageStr) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeStr) || 20));
    const hasMinQty = hasMinQtyStr === 'true';
    return this.svc.list(tenantId, {
      q: q?.trim() || undefined,
      warehouseId: warehouseId?.trim() || undefined,
      hasMinQty,
      page,
      pageSize,
    });
  }

  /**
   * @FUNCTION_CODE NX02-STKG-CTRL-001-F02
   */
  @Get(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_SETTING, 'read')
  async get(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-STKG-CTRL-001-F03
   */
  @Post()
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_SETTING, 'create')
  async create(@Req() req: { user?: RequestUser }, @Body() body: UpsertStockSettingBodyDto) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX02-STKG-CTRL-001-F04
   */
  @Patch(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_SETTING, 'update')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchStockSettingBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.patch(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX02-STKG-CTRL-001-F05
   */
  @Patch(':id/active')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_SETTING, 'update')
  async setActive(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: SetStockSettingActiveBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    if (typeof body?.isActive !== 'boolean') {
      throw new BadRequestException('isActive 須為布林值');
    }
    return this.svc.setActive(tenantId, req.user?.sub, id, body.isActive);
  }
}
