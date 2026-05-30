// apps/nx-api/src/nx03/auto-replenish/auto-replenish.controller.ts
// AR controller（manual trigger + scheduler run-due endpoints）
// 對齊 Crown Q-C1=D 混合 scheduled + on-demand

import { Controller, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { ArSchedulerService } from './ar-scheduler.service';
import { ArSuggestionWriterService } from './ar-suggestion-writer.service';

@Controller('nx03/auto-replenish')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('purchase.demand.edit')
export class AutoReplenishController {
  constructor(
    private readonly writer: ArSuggestionWriterService,
    private readonly scheduler: ArSchedulerService,
  ) {}

  /**
   * 手動觸發：對指定倉跑 AR 計算 + 寫 Demand
   * - warehouseId 可選、undefined=全倉（注意：全倉跑可能 slow、適合管理員）
   * - 業界場景：倉管/產品看到缺貨想立刻跑、不等 cron
   */
  @Post('trigger')
  trigger(
    @CurrentUser() user: RequestUser,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.writer.runForWarehouse(user, warehouseId?.trim() || undefined);
  }

  /**
   * scheduler 用：外部 cron / k8s CronJob 透過 HTTP 觸發
   * - 找所有 due 倉（now - lastCalculatedAt >= frequencyDays）
   * - 對每倉跑 AR + 寫 Demand
   * - 回傳每倉的 ArRunResult
   */
  @Post('run-due')
  runDue(@CurrentUser() user: RequestUser) {
    return this.scheduler.runDueBatch(user);
  }
}
