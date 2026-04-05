/**
 * File: apps/nx-api/src/nx01/rr/rr.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-RR-CTRL-001：進貨單 REST（JWT + NX01_RR）
 *
 * @FUNCTION_CODE NX01-RR-CTRL-001-F01
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

import type { CreateRrBodyDto, PatchRrBodyDto } from './dto/rr.dto';
import { RrService } from './rr.service';

@Controller('nx01/rr')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class RrController {
  constructor(private readonly rr: RrService) { }

  /**
   * @FUNCTION_CODE NX01-RR-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RR, 'read')
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
    return this.rr.list(tenantId, { q, supplierId, status, dateFrom, dateTo, page, pageSize });
  }

  /**
   * @FUNCTION_CODE NX01-RR-CTRL-001-F02
   */
  @Get(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RR, 'read')
  async get(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rr.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX01-RR-CTRL-001-F03
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RR, 'create')
  async create(@Req() req: { user?: RequestUser }, @Body() body: CreateRrBodyDto) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rr.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX01-RR-CTRL-001-F04
   */
  @Patch(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RR, 'update')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchRrBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rr.patch(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-RR-CTRL-001-F05
   */
  @Post(':id/post')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RR, 'update')
  async post(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rr.post(tenantId, req.user?.sub, id);
  }

  /**
   * @FUNCTION_CODE NX01-RR-CTRL-001-F06
   */
  @Post(':id/void')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RR, 'update')
  async voidDoc(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rr.voidDoc(tenantId, req.user?.sub, id);
  }
}
