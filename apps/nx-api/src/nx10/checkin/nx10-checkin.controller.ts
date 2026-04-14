import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { Nx10CheckinService } from './nx10-checkin.service';

@Controller('nx10/checkin')
@UseGuards(JwtAuthGuard, Nx10ProPlanGuard)
export class Nx10CheckinController {
  constructor(private readonly svc: Nx10CheckinService) {}

  @Get('today')
  today(@CurrentUser() user: RequestUser) {
    return this.svc.getToday(user);
  }

  @Post()
  checkin(@CurrentUser() user: RequestUser) {
    return this.svc.checkin(user);
  }
}
