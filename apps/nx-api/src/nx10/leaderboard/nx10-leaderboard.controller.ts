import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { Nx10LeaderboardService } from './nx10-leaderboard.service';

@Controller('nx10/leaderboard')
@UseGuards(JwtAuthGuard, Nx10ProPlanGuard)
export class Nx10LeaderboardController {
  constructor(private readonly svc: Nx10LeaderboardService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query('period') period?: string) {
    return this.svc.leaderboard(user, period);
  }
}
