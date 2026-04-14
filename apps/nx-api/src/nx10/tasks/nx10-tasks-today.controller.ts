import { Controller, Get, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { Nx10TasksService } from './nx10-tasks.service';

/** 今日待辦彙總：LITE/PLUS 亦可存取（僅模組彙整；PRO 多帶 gameTasks）。 */
@Controller('nx10/tasks')
@UseGuards(JwtAuthGuard)
export class Nx10TasksTodayController {
  constructor(private readonly svc: Nx10TasksService) {}

  @Get('today')
  today(@CurrentUser() user: RequestUser) {
    return this.svc.today(user);
  }
}
