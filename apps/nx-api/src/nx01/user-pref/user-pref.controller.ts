// apps/nx-api/src/nx01/user-pref/user-pref.controller.ts
// 使用者偏好設定 controller — 不掛 PermissionsGuard（個人偏好、不需特定權限）

import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { UpsertUserPrefDto } from './dto/user-pref.dto';
import { UserPrefService } from './user-pref.service';

@Controller('nx01/user-pref')
@UseGuards(JwtAuthGuard)
export class UserPrefController {
  constructor(private readonly svc: UserPrefService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.svc.list(user);
  }

  @Get(':prefKey')
  get(@CurrentUser() user: RequestUser, @Param('prefKey') prefKey: string) {
    return this.svc.get(user, prefKey);
  }

  @Put(':prefKey')
  upsert(
    @CurrentUser() user: RequestUser,
    @Param('prefKey') prefKey: string,
    @Body() dto: UpsertUserPrefDto,
  ) {
    return this.svc.upsert(user, prefKey, dto.prefValue);
  }

  @Delete(':prefKey')
  remove(@CurrentUser() user: RequestUser, @Param('prefKey') prefKey: string) {
    return this.svc.remove(user, prefKey);
  }
}
