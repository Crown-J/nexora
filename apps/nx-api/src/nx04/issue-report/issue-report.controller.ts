// apps/nx-api/src/nx04/issue-report/issue-report.controller.ts
// NX04-M2 §A C6：跨單據問題回報入口 controller
import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateNx04IssueReportDto } from './dto/issue-report.dto';
import { Nx04IssueReportService } from './issue-report.service';

@Controller('nx04/issue-report')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class Nx04IssueReportController {
  constructor(private readonly svc: Nx04IssueReportService) {}

  /// POST 共用入口、QT/SO/SR detail 右上按鈕呼叫
  /// 寫 Nx03IssueReport（sourceModule='NX04' 自動帶）
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateNx04IssueReportDto) {
    return this.svc.create(user, dto);
  }
}
