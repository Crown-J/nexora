// apps/nx-api/src/nx10/sprint/nx10-sprint.controller.ts
// NX10 Sprint controller（驅動力 #6 稀缺與渴望 ⭐）

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx10ProPlanGuard } from '../../shared/nx10/nx10-pro-plan.guard';

import { CreateSprintDto, PatchSprintDto } from './dto/nx10-sprint.dto';
import { Nx10SprintService } from './nx10-sprint.service';

@Controller('nx10/sprint')
@UseGuards(JwtAuthGuard, RolesGuard, Nx10ProPlanGuard)
export class Nx10SprintController {
  constructor(private readonly svc: Nx10SprintService) {}

  /** 當前進行中衝刺（全員可讀）。 */
  @Get('active')
  listActive(@CurrentUser() user: RequestUser) {
    return this.svc.listActive(user);
  }

  /** 個人衝刺參與紀錄。 */
  @Get('me')
  getMyParticipation(@CurrentUser() user: RequestUser) {
    return this.svc.getMyParticipation(user);
  }

  /** 衝刺詳情（全員可讀）。 */
  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /** HR_ADMIN 建立衝刺。 */
  @Post()
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  createSprint(@CurrentUser() user: RequestUser, @Body() dto: CreateSprintDto) {
    return this.svc.createSprint(user, dto);
  }

  /** HR_ADMIN 修改衝刺（不可改 startDate / sprintType）。 */
  @Patch(':id')
  @Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
  patchSprint(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PatchSprintDto,
  ) {
    return this.svc.patchSprint(user, id, dto);
  }
}
