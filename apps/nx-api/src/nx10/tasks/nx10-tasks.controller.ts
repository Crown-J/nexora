import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { Nx10TaskListQueryDto } from './dto/nx10-task-list-query.dto';
import { Nx10TasksService } from './nx10-tasks.service';

@Controller('nx10/tasks')
@UseGuards(JwtAuthGuard, Nx10ProPlanGuard)
export class Nx10TasksController {
  constructor(private readonly svc: Nx10TasksService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx10TaskListQueryDto) {
    return this.svc.list(user, q);
  }

  @Patch(':id/done')
  done(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.markDone(user, id);
  }
}
