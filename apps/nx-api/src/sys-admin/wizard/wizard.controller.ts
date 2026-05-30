// apps/nx-api/src/sys-admin/wizard/wizard.controller.ts
// v1.2 對齊軌 C：精靈狀態 controller

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { WizardService } from './wizard.service';

@Controller('wizard')
@UseGuards(JwtAuthGuard)
export class WizardController {
  constructor(private readonly svc: WizardService) {}

  @Get('status')
  status(@CurrentUser() user: RequestUser) {
    return this.svc.getWizardStatus(user);
  }

  @Post('import/complete')
  completeImport(@CurrentUser() user: RequestUser) {
    return this.svc.markImportWizardCompleted(user);
  }

  @Post('import/reset')
  resetImport(@CurrentUser() user: RequestUser) {
    return this.svc.resetImportWizard(user);
  }

  @Post('page/:pageKey/seen')
  markPageSeen(
    @CurrentUser() user: RequestUser,
    @Body() body: { pageKey?: string },
    /// fallback：body 沒帶就用 url param
  ) {
    return this.svc.markPageSeen(user, body.pageKey ?? '');
  }

  @Post('page/reset-mine')
  resetMyPageGuides(@CurrentUser() user: RequestUser) {
    return this.svc.resetMyPageGuides(user);
  }

  @Get('import/history')
  history(@CurrentUser() user: RequestUser) {
    return this.svc.listImportHistory(user);
  }
}
