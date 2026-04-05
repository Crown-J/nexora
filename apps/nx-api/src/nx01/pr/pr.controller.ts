/**
 * File: apps/nx-api/src/nx01/pr/pr.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-PR-CTRL-001：退貨單 REST（JWT + NX01_PR）
 *
 * @FUNCTION_CODE NX01-PR-CTRL-001-F01
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

import { assertNx02TenantId } from '../../nx02/utils/assert-nx02-tenant';

import type { CreatePrBodyDto, PatchPrBodyDto } from './dto/pr.dto';
import { PrService } from './pr.service';

@Controller('nx01/pr')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class PrController {
  constructor(private readonly pr: PrService) { }

  /**
   * @FUNCTION_CODE NX01-PR-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PR, 'read')
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
    return this.pr.list(tenantId, { q, supplierId, status, dateFrom, dateTo, page, pageSize });
  }

  /**
   * @FUNCTION_CODE NX01-PR-CTRL-001-F02
   */
  @Get(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PR, 'read')
  async get(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.pr.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX01-PR-CTRL-001-F03
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PR, 'create')
  async create(@Req() req: { user?: RequestUser }, @Body() body: CreatePrBodyDto) {
    const tenantId = assertNx02TenantId(req.user);
    return this.pr.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX01-PR-CTRL-001-F04
   */
  @Patch(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PR, 'update')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchPrBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.pr.patch(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-PR-CTRL-001-F05
   */
  @Post(':id/post')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PR, 'update')
  async post(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.pr.post(tenantId, req.user?.sub, id);
  }

  /**
   * @FUNCTION_CODE NX01-PR-CTRL-001-F06
   */
  @Post(':id/void')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_PR, 'update')
  async voidDoc(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.pr.voidDoc(tenantId, req.user?.sub, id);
  }
}
