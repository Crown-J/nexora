// apps/nx-api/src/nx05/ar-statement/ar-statement.controller.ts
// NX05 ArStatement controller（月底對帳單查詢）

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { ArStatementQueryDto } from './dto/ar-statement.dto';
import { ArStatementService } from './ar-statement.service';

@Controller('nx05/ar-statement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'FINANCE', 'SALES')
export class ArStatementController {
  constructor(private readonly svc: ArStatementService) {}

  /**
   * 月底對帳單（業務員 / 業務助理 / 財務 寄客戶）
   *   - text 純文字、適合 email 內文
   *   - payload 結構化、前端可生 PDF
   *   - cron 設計留 backlog（每月 1 號自動跑、外部 cron 觸發）
   */
  @Get(':customerId')
  getStatement(
    @CurrentUser() user: RequestUser,
    @Param('customerId') customerId: string,
    @Query() q: ArStatementQueryDto,
  ) {
    return this.svc.getStatement(user, customerId, q);
  }
}
