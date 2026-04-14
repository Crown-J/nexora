import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx09ProPlanGuard } from '../../shared/nx09/nx09-pro-plan.guard';

import { CreateMeetingDto, PatchMeetingDto } from './meeting.dto';
import { Nx09MeetingService } from './meeting.service';
import { Nx09MeetingListQueryDto } from './nx09-meeting-list-query.dto';

@Controller('nx09/meetings')
@UseGuards(JwtAuthGuard, Nx09ProPlanGuard)
export class Nx09MeetingController {
  constructor(private readonly svc: Nx09MeetingService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx09MeetingListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMeetingDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchMeetingDto) {
    return this.svc.patch(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
