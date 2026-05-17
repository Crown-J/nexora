// apps/nx-api/src/nx10/surprise-box/nx10-surprise-box.controller.ts
// NX10 SurpriseBox controller（驅動力 #7 不可預期與好奇 ⭐）

import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { Nx10SurpriseBoxService } from './nx10-surprise-box.service';

@Controller('nx10/surprise-box')
@UseGuards(JwtAuthGuard, Nx10ProPlanGuard)
export class Nx10SurpriseBoxController {
  constructor(private readonly svc: Nx10SurpriseBoxService) {}

  /** 開箱（每日上限 3 個、隨機 boxType + 隨機 Exp）。 */
  @Post('open')
  openBox(@CurrentUser() user: RequestUser) {
    return this.svc.openBox(user);
  }

  /** 個人開箱歷史。 */
  @Get('me')
  listMyBoxes(@CurrentUser() user: RequestUser) {
    return this.svc.listMyBoxes(user);
  }
}
