// apps/nx-api/src/nx01/calendar-event/calendar-event.controller.ts
// 行事曆事件 read-only controller — 首頁右側事件簿用

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { CalendarEventService } from './calendar-event.service';

@Controller('nx01/calendar-event')
@UseGuards(JwtAuthGuard)
export class CalendarEventController {
  constructor(private readonly svc: CalendarEventService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(user, { from, to });
  }
}
