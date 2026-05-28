// apps/nx-api/src/nx01/user-role/user-role.controller.ts
/**
 * UserRole Controller（業界改革 #22 v1.2、解前端 /user-role 404）
 *
 * 路由前綴：`/user-role`（root、對齊前端既有 features/base + features/shared/master client）
 * 後續軌 TASK-API-NAMESPACE-NORMALIZE 統一為 /nx01/user-role 範式。
 */

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
  AssignUserRoleDto,
  ListUserRoleQueryDto,
  RevokeUserRoleDto,
  SetActiveDto,
  SetPrimaryDto,
} from './dto/user-role.dto';
import { UserRoleService } from './user-role.service';

@Controller('user-role')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class UserRoleController {
  constructor(private readonly svc: UserRoleService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListUserRoleQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  assign(@CurrentUser() user: RequestUser, @Body() dto: AssignUserRoleDto) {
    return this.svc.assign(user, dto);
  }

  @Patch(':id/revoke')
  revoke(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RevokeUserRoleDto,
  ) {
    return this.svc.revoke(user, id, dto);
  }

  @Patch(':id/primary')
  setPrimary(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetPrimaryDto,
  ) {
    return this.svc.setPrimary(user, id, dto);
  }

  @Patch(':id/active')
  setActive(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.svc.setActive(user, id, dto);
  }
}
