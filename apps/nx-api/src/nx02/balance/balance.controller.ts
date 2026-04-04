/**
 * File: apps/nx-api/src/nx02/balance/balance.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-BAL-CTRL-001：GET /nx02/balance、summary、dashboard
 *
 * Notes:
 * - JwtAuthGuard；租戶由 JWT validate 注入
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/strategies/jwt.strategy';

import { assertNx02TenantId } from '../utils/assert-nx02-tenant';

import { BalanceService } from './balance.service';
import type {
  BalanceSortField,
  BalanceStatusFilter,
  Nx02BalanceDashboardDto,
  SortDir,
} from './dto/balance.dto';

@Controller('nx02/balance')
@UseGuards(JwtAuthGuard)
export class BalanceController {
  constructor(private readonly balance: BalanceService) { }

  /**
   * @FUNCTION_CODE NX02-BAL-CTRL-001-F01
   */
  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query('q') q?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const tenantId = assertNx02TenantId(user);
    const page = Math.max(1, Number(pageStr) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeStr) || 20));
    const st = (status || 'all') as BalanceStatusFilter;
    const sb = (sortBy || 'last_move_at') as BalanceSortField;
    const sd = (sortDir || 'asc') as SortDir;
    const allowed: BalanceSortField[] = [
      'code',
      'name',
      'on_hand_qty',
      'available_qty',
      'stock_value',
      'last_move_at',
    ];
    const sortField = allowed.includes(sb) ? sb : 'last_move_at';
    const sortDirNorm: SortDir = sd === 'desc' ? 'desc' : 'asc';
    return this.balance.list(tenantId, {
      q,
      warehouseId: warehouseId?.trim() || undefined,
      status: ['all', 'in_stock', 'zero', 'negative'].includes(st) ? st : 'all',
      page,
      pageSize,
      sortBy: sortField,
      sortDir: sortDirNorm,
    });
  }

  /**
   * @FUNCTION_CODE NX02-BAL-CTRL-001-F02
   */
  @Get('summary')
  async summary(@CurrentUser() user: RequestUser, @Query('warehouseId') warehouseId?: string) {
    const tenantId = assertNx02TenantId(user);
    return this.balance.summary(tenantId, warehouseId?.trim() || undefined);
  }

  /**
   * @FUNCTION_CODE NX02-BAL-CTRL-001-F03
   * GET /nx02/balance/dashboard
   * 庫存首頁統計（租戶隔離；NX02 單據尚空時多為 0，結構固定供前端型別對齊）
   *
   * 回應範例：
   * {
   *   "balance": { "inStock": 0, "zero": 0, "negative": 0 },
   *   "ledger": { "thisMonthCount": 0 },
   *   "init": { "totalCount": 0 },
   *   "stockSetting": { "settingCount": 0 },
   *   "stockTake": { "inProgressCount": 0 },
   *   "transfer": { "inProgressCount": 0 },
   *   "shortage": { "openCount": 0 },
   *   "autoReplenish": { "activeRuleCount": 0 }
   * }
   */
  @Get('dashboard')
  async dashboard(@CurrentUser() user: RequestUser): Promise<Nx02BalanceDashboardDto> {
    const tenantId = assertNx02TenantId(user);
    return this.balance.dashboard(tenantId);
  }
}
