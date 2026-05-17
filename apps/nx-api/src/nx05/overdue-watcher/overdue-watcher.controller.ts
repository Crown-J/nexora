// apps/nx-api/src/nx05/overdue-watcher/overdue-watcher.controller.ts
// NX05 OverdueWatcher controller（逾期催收警示查詢）

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { OverdueWatcherListQueryDto } from './dto/overdue-watcher.dto';
import { OverdueWatcherService } from './overdue-watcher.service';

@Controller('nx05/overdue-watcher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'FINANCE', 'SALES')
export class OverdueWatcherController {
  constructor(private readonly svc: OverdueWatcherService) {}

  /**
   * 逾期催收警示清單（共享 NX04 CreditGuard tenant 閾值）
   *   - response: { threshold, summary, customerSummary, arItems }
   *   - 按 customer 分組 + 排序（overdueDays desc + balanceAmount desc）
   */
  @Get('list')
  list(@CurrentUser() user: RequestUser, @Query() q: OverdueWatcherListQueryDto) {
    return this.svc.list(user, q);
  }
}
