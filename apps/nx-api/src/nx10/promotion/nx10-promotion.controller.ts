// apps/nx-api/src/nx10/promotion/nx10-promotion.controller.ts
// NX10 Promotion 轉職機制 controller（⭐⭐⭐ 業界改革 3 階審核）

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import {
  ApplyRequestDto,
  CreateCriteriaDto,
  PatchSupervisorRecommendDto,
  ReviewRequestDto,
} from './dto/nx10-promotion.dto';
import { Nx10PromotionService } from './nx10-promotion.service';

@Controller('nx10/promotion')
@UseGuards(JwtAuthGuard, RolesGuard, Nx10ProPlanGuard)
export class Nx10PromotionController {
  constructor(private readonly svc: Nx10PromotionService) {}

  /** 列轉職條件（全員可讀）。 */
  @Get('criteria')
  listCriteria(@CurrentUser() user: RequestUser) {
    return this.svc.listCriteria(user);
  }

  /** HR_ADMIN 建立轉職條件。 */
  @Post('criteria')
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  createCriteria(@CurrentUser() user: RequestUser, @Body() dto: CreateCriteriaDto) {
    return this.svc.createCriteria(user, dto);
  }

  /** 個人轉職申請歷史。 */
  @Get('requests/me')
  listMyRequests(@CurrentUser() user: RequestUser) {
    return this.svc.listMyRequests(user);
  }

  /** 階段 1：員工申請（系統自動驗證）。 */
  @Post('requests')
  applyRequest(@CurrentUser() user: RequestUser, @Body() dto: ApplyRequestDto) {
    return this.svc.applyRequest(user, dto);
  }

  /** 階段 2：主管推薦（OWNER）。 */
  @Patch('requests/:id/supervisor-recommend')
  @Roles('SYSADMIN', 'OWNER')
  patchSupervisorRecommend(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PatchSupervisorRecommendDto,
  ) {
    return this.svc.patchSupervisorRecommend(user, id, dto);
  }

  /** 階段 3：負責人審核（HR_ADMIN 核准 / 退件 / 取消）。 */
  @Patch('requests/:id/review')
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  reviewRequest(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewRequestDto,
  ) {
    return this.svc.reviewRequest(user, id, dto);
  }

  /** 階段 4：執行（status='A' → 'E'、寫 NX01 user.roleId）。 */
  @Post('requests/:id/execute')
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  executeRequest(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.executeRequest(user, id);
  }
}
