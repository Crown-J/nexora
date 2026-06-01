// apps/nx-api/src/sys-admin/onboarding/onboarding.controller.ts
// v1.2 對齊軌 C：開戶後台 controller
// 平台/租戶層分離軌 Phase 3：守衛從 RolesGuard('SYSADMIN') 改成 PlatformAdminGuard。
//
// 路由：POST /sys-admin/onboarding/create-tenant
// 守衛：PlatformAdminGuard（只認 scope='platform' 的 JWT）
// 過渡期：route prefix 仍掛 /sys-admin/onboarding、Phase 4 才搬到 /platform/onboarding 入口

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import type { PlatformRequestUser } from '../../platform-auth/strategies/platform-jwt.strategy';
import { PlatformAdminGuard } from '../../shared/guards/platform-admin.guard';

import { CreateOnboardingDto } from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('sys-admin/onboarding')
@UseGuards(PlatformAdminGuard)
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  /// 開通新客戶租戶（v1.2 §2.2）
  /// 自動建：租戶 + 負責人帳號 + OWNER 角色指派 + 主據點 + 主倉
  /// 寄通知 Email（測試環境 console.log）
  @Post('create-tenant')
  createTenant(@Req() req: Request, @Body() dto: CreateOnboardingDto) {
    const actor = req.user as PlatformRequestUser;
    return this.svc.createTenantAndOwner(actor.sub, dto);
  }
}
