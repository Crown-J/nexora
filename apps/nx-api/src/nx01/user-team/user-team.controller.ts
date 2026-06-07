// apps/nx-api/src/nx01/user-team/user-team.controller.ts
// 05 批 T3 2026-06-07：UserTeam 衛星 controller（路徑 /user-team 對齊 user-role 範式）
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  AssignUserTeamDto,
  ListUserTeamQueryDto,
  RevokeUserTeamDto,
  SetActiveUserTeamDto,
  SetLeaderUserTeamDto,
  SetPrimaryUserTeamDto,
} from './dto/user-team.dto';
import { UserTeamService } from './user-team.service';

@Controller('user-team')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class UserTeamController {
  constructor(private readonly svc: UserTeamService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListUserTeamQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  assign(@CurrentUser() user: RequestUser, @Body() dto: AssignUserTeamDto) {
    return this.svc.assign(user, dto);
  }

  @Patch(':id/revoke')
  revoke(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RevokeUserTeamDto,
  ) {
    return this.svc.revoke(user, id, dto);
  }

  @Patch(':id/primary')
  setPrimary(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetPrimaryUserTeamDto,
  ) {
    return this.svc.setPrimary(user, id, dto);
  }

  @Patch(':id/leader')
  setLeader(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetLeaderUserTeamDto,
  ) {
    return this.svc.setLeader(user, id, dto);
  }

  @Patch(':id/active')
  setActive(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetActiveUserTeamDto,
  ) {
    return this.svc.setActive(user, id, dto);
  }
}
