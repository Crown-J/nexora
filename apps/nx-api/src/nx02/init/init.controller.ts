/**
 * File: apps/nx-api/src/nx02/init/init.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-INIT-CTRL-001：開帳存 REST（JWT + NX02_INIT 畫面權限）
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
import { NX00_VIEW } from '../../nx00/rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../nx00/rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../nx00/rbac/require-nx00-view-permission.decorator';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';

import type { CreateInitBodyDto, PatchInitBodyDto } from './dto/init.dto';
import { InitService } from './init.service';

@Controller('nx02/init')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class InitController {
  constructor(private readonly init: InitService) { }

  /**
   * @FUNCTION_CODE NX02-INIT-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX02_INIT, 'read')
  async list(
    @Req() req: { user?: RequestUser },
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    const page = Math.max(1, Number(pageStr) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeStr) || 20));
    return this.init.list(tenantId, {
      warehouseId: warehouseId?.trim() || undefined,
      status: status?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
      page,
      pageSize,
    });
  }

  /**
   * @FUNCTION_CODE NX02-INIT-CTRL-001-F02
   */
  @Get(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_INIT, 'read')
  async get(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    return this.init.getById(tenantId, id);
  }

  /**
   * @FUNCTION_CODE NX02-INIT-CTRL-001-F03
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireNx00ViewPermission(NX00_VIEW.NX02_INIT, 'create')
  async create(@Req() req: { user?: RequestUser }, @Body() body: CreateInitBodyDto) {
    const tenantId = assertNx02TenantId(req.user);
    const uid = req.user?.sub;
    return this.init.create(tenantId, uid, body);
  }

  /**
   * @FUNCTION_CODE NX02-INIT-CTRL-001-F04
   */
  @Patch(':id')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_INIT, 'update')
  async patch(
    @Req() req: { user?: RequestUser },
    @Param('id') id: string,
    @Body() body: PatchInitBodyDto,
  ) {
    const tenantId = assertNx02TenantId(req.user);
    const uid = req.user?.sub;
    return this.init.patch(tenantId, uid, id, body);
  }

  /**
   * @FUNCTION_CODE NX02-INIT-CTRL-001-F05
   */
  @Post(':id/post')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_INIT, 'update')
  async post(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    const uid = req.user?.sub;
    return this.init.post(tenantId, uid, id);
  }

  /**
   * @FUNCTION_CODE NX02-INIT-CTRL-001-F06
   * 作廢視同狀態更新，使用 update 權限（無獨立 delete 維度）
   */
  @Post(':id/void')
  @RequireNx00ViewPermission(NX00_VIEW.NX02_INIT, 'update')
  async voidDoc(@Req() req: { user?: RequestUser }, @Param('id') id: string) {
    const tenantId = assertNx02TenantId(req.user);
    const uid = req.user?.sub;
    return this.init.voidDoc(tenantId, uid, id);
  }
}
