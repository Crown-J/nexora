/**
 * File: apps/nx-api/src/nx01/po/po.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-PO-CTRL-001：採購單 REST（JWT + PLUS + NX01_PO）
 *
 * @FUNCTION_CODE NX01-PO-CTRL-001-F01
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
import { NX00_VIEW } from '../../nx00/rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../nx00/rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../nx00/rbac/require-nx00-view-permission.decorator';

import { PlusPlanGuard } from '../../nx02/guards/plus-plan.guard';
import { assertNx02TenantId } from '../../nx02/utils/assert-nx02-tenant';

import type {
  CreatePoBodyDto,
  PatchPoBodyDto,
  PatchPoStatusBodyDto,
  PoToRrBodyDto,
} from './dto/po.dto';
import { PoService } from './po.service';

@Controller('nx01/po')
@UseGuards(JwtAuthGuard, PlusPlanGuard, Nx00ViewPermissionGuard)
export class PoController {
  constructor(private readonly po: PoService) { }

  /**
   * @FUNCTION_CODE NX01-PO-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PO, 'read')
  async list(
    @Req() req: { user?: RequestUser },
    @Query('q') q?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    const page = Math.max(1, Number(pageStr) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeStr) || 20));
    return this.po.list(tenantId, { q, supplierId, status, dateFrom, dateTo, page, pageSize });
  }

  /**
   * @FUNCTION_CODE NX01-PO-CTRL-001-F02
   */
  @Get(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PO, 'read')
  async get(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.po.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX01-PO-CTRL-001-F03
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PO, 'create')
  async create(@Req() req: { user?: RequestUser }, @Body() body: CreatePoBodyDto) {
    const tenantId = assertNx02TenantId(req.user);
    return this.po.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX01-PO-CTRL-001-F04
   */
  @Patch(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PO, 'update')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchPoBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.po.patch(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-PO-CTRL-001-F05
   */
  @Patch(':id/status')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PO, 'update')
  async patchStatus(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchPoStatusBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.po.patchStatus(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-PO-CTRL-001-F06
   */
  @Post(':id/to-rr')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PO, 'create')
  async toRr(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PoToRrBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.po.toRr(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-PO-CTRL-001-F07
   */
  @Post(':id/void')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PO, 'update')
  async voidDoc(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.po.voidDoc(tenantId, req.user?.sub, id);
  }
}
