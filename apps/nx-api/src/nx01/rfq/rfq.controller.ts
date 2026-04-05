/**
 * File: apps/nx-api/src/nx01/rfq/rfq.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-RFQ-CTRL-001：詢價單 REST（JWT + NX01_RFQ）
 *
 * @FUNCTION_CODE NX01-RFQ-CTRL-001-F01
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
import { PlusPlanGuard } from '../../nx02/guards/plus-plan.guard';

import { CreateRfqDto } from './dto/create-rfq.dto';
import { PatchReplyDto } from './dto/patch-reply.dto';
import type {
  PatchRfqBodyDto,
  PatchRfqStatusBodyDto,
  RfqToPoBodyDto,
  RfqToRrBodyDto,
} from './dto/rfq.dto';
import { RfqService } from './rfq.service';

@Controller('nx01/rfq')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class RfqController {
  constructor(private readonly rfq: RfqService) { }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'read')
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
    return this.rfq.list(tenantId, { q, supplierId, status, dateFrom, dateTo, page, pageSize });
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F02
   */
  @Get(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'read')
  async get(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F03
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'create')
  async create(@Req() req: { user?: RequestUser }, @Body() body: CreateRfqDto) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.create(tenantId, req.user?.sub, body);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F04A
   */
  @Patch(':id/reply')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'update')
  async patchReply(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchReplyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.patchReply(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F05
   */
  @Patch(':id/status')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'update')
  async patchStatus(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchRfqStatusBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.patchStatus(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F04
   */
  @Patch(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'update')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchRfqBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.patch(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F06
   */
  @Post(':id/to-rr')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'create')
  async toRr(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: RfqToRrBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.toRr(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F07
   */
  @Post(':id/to-po')
  @UseGuards(PlusPlanGuard)
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'create')
  async toPo(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: RfqToPoBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.toPo(tenantId, req.user?.sub, id, body);
  }

  /**
   * @FUNCTION_CODE NX01-RFQ-CTRL-001-F08
   */
  @Post(':id/void')
  @RequireNx00ViewPermission(NX00_VIEW.NX01_RFQ, 'update')
  async voidDoc(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.rfq.voidDoc(tenantId, req.user?.sub, id);
  }
}
