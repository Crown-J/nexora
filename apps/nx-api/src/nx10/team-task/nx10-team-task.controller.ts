// apps/nx-api/src/nx10/team-task/nx10-team-task.controller.ts
// NX10 TeamTask controller

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { CreateTeamTaskDto, PatchTeamTaskDto } from './dto/nx10-team-task.dto';
import { Nx10TeamTaskService } from './nx10-team-task.service';

@Controller('nx10/team-task')
@UseGuards(JwtAuthGuard, RolesGuard, Nx10ProPlanGuard)
export class Nx10TeamTaskController {
  constructor(private readonly svc: Nx10TeamTaskService) {}

  /** 列團隊任務（全員可讀、員工 self filter by 倉庫）。 */
  @Get()
  listTasks(@CurrentUser() user: RequestUser, @Query('warehouseId') warehouseId?: string) {
    return this.svc.listTasks(user, { warehouseId });
  }

  @Get('me/achievements')
  listMyAchievements(@CurrentUser() user: RequestUser) {
    return this.svc.listMyAchievements(user);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  createTask(@CurrentUser() user: RequestUser, @Body() dto: CreateTeamTaskDto) {
    return this.svc.createTask(user, dto);
  }

  @Patch(':id')
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  patchTask(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchTeamTaskDto) {
    return this.svc.patchTask(user, id, dto);
  }
}
