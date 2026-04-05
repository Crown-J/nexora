/**
 * File: apps/nx-api/src/nx01/dashboard/nx01-dashboard.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-DSH-CTRL-001：採購首頁統計 API
 *
 * @FUNCTION_CODE NX01-DSH-CTRL-001-F01
 */

import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { NX00_VIEW } from '../../nx00/rbac/nx00-view-codes';
import { Nx00ViewPermissionGuard } from '../../nx00/rbac/nx00-view-permission.guard';
import { RequireNx00ViewPermission } from '../../nx00/rbac/require-nx00-view-permission.decorator';
import { assertNx02TenantId } from '../../nx02/utils/assert-nx02-tenant';

import { Nx01DashboardService } from './nx01-dashboard.service';

@Controller('nx01/dashboard')
@UseGuards(JwtAuthGuard, Nx00ViewPermissionGuard)
export class Nx01DashboardController {
  constructor(private readonly svc: Nx01DashboardService) { }

  /**
   * @FUNCTION_CODE NX01-DSH-CTRL-001-F01
   */
  @Get()
  @RequireNx00ViewPermission(NX00_VIEW.NX01_HOME, 'read')
  async get(@Req() req: { user?: RequestUser }) {
    const tenantId = assertNx02TenantId(req.user);
    return this.svc.stats(tenantId);
  }
}
