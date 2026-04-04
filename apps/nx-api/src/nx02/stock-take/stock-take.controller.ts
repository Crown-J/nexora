/**
 * File: apps/nx-api/src/nx02/stock-take/stock-take.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-STTK-CTRL-001：盤點單 REST + CSV 匯出
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { NX00_VIEW } from '../../nx00/rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../nx00/rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../nx00/rbac/require-nx00-view-permission.decorator';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';

import type { CreateStockTakeBodyDto, PatchStockTakeItemsBodyDto } from './dto/stock-take.dto';
import { StockTakeService } from './stock-take.service';

@Controller('nx02/stock-take')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class StockTakeController {
  constructor(private readonly svc: StockTakeService) { }

  /**
   * @FUNCTION_CODE NX02-STTK-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_TAKE, 'read')
  async list(
    @Req() req: { user?: RequestUser },
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    const page = Math.max(1, Number(pageStr) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeStr) || 20));
    return this.svc.list(tenantId, {
      warehouseId: warehouseId?.trim() || undefined,
      status: status?.trim() || undefined,
      page,
      pageSize,
    });
  }

  /**
   * @FUNCTION_CODE NX02-STTK-CTRL-001-F02
   */
  @Get(':id/export')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_TAKE, 'export')
  async export(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Res() res: { setHeader(n: string, v: string): void; send(body: string): void },
  ) {
    const tenantId = assertNx02TenantId(req.user);
    const { docNo, csv } = await this.svc.exportCsv(tenantId, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stock-take-${docNo}.csv"`,
    );
    res.send(`\ufeff${csv}`);
  }

  /**
   * @FUNCTION_CODE NX02-STTK-CTRL-001-F03
   */
  @Patch(':id/items')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_TAKE, 'update')
  async patchItems(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchStockTakeItemsBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.patchItems(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX02-STTK-CTRL-001-F04
   */
  @Get(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_TAKE, 'read')
  async get(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-STTK-CTRL-001-F05
   */
  @Post()
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_TAKE, 'create')
  async create(@Req() req: { user?: RequestUser }, @Body() body: CreateStockTakeBodyDto) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX02-STTK-CTRL-001-F06
   */
  @Post(':id/post')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_TAKE, 'update')
  async post(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.post(tenantId, req.user?.sub, id);
  }

  /**
   * @FUNCTION_CODE NX02-STTK-CTRL-001-F07
   */
  @Post(':id/void')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_STOCK_TAKE, 'update')
  async voidDoc(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.voidDoc(tenantId, req.user?.sub, id);
  }
}
