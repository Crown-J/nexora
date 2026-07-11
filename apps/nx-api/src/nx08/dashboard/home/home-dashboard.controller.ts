// apps/nx-api/src/nx08/dashboard/home/home-dashboard.controller.ts
// 首頁待辦彙總（2026-07-11 首頁改版 V1）：任何登入者可呼（不鎖角色、主管數字 service 內判）

import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

import { Nx08HomeDashboardService } from './home-dashboard.service';

@Controller('nx08/dashboard/home')
@UseGuards(JwtAuthGuard)
export class Nx08HomeDashboardController {
  constructor(private readonly svc: Nx08HomeDashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: RequestUser) {
    return this.svc.summary(user);
  }
}
