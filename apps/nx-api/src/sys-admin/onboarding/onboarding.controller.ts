// apps/nx-api/src/sys-admin/onboarding/onboarding.controller.ts
// v1.2 對齊軌 C：開戶後台 controller
//
// 路由：POST /sys-admin/onboarding/create-tenant
// 限 SYSADMIN（伊諾瓦業務、跨租戶）

import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateOnboardingDto } from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('sys-admin/onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN')
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  /// 開通新客戶租戶（v1.2 §2.2）
  /// 自動建：租戶 + 負責人帳號 + OWNER 角色指派 + 主據點 + 主倉
  /// 寄通知 Email（測試環境 console.log）
  @Post('create-tenant')
  createTenant(@CurrentUser() user: RequestUser, @Body() dto: CreateOnboardingDto) {
    return this.svc.createTenantAndOwner(user, dto);
  }
}
