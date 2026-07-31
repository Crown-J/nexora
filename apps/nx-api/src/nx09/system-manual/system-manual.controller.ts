// apps/nx-api/src/nx09/system-manual/system-manual.controller.ts
// NX09 SystemManual controller（業界 ERP 標配、Crown Q5=b ⭐）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ModuleAccessGuard } from '../../shared/module-access/module-access.guard';
import { RequiresModule } from '../../shared/module-access/requires-module.decorator';

import { CreateSystemManualDto, PatchSystemManualDto } from './dto/system-manual.dto';
import { Nx09SystemManualService } from './system-manual.service';

@Controller('nx09/system-manual')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@RequiresModule('NX09')
export class Nx09SystemManualController {
  constructor(private readonly svc: Nx09SystemManualService) {}

  /** 全員可讀（list）。 */
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('category') category?: string) {
    return this.svc.list(user, { category });
  }

  /** 全員可讀（按 featureKey 查、UI「？」按鈕 wire 主要呼叫 endpoint）。 */
  @Get('by-feature/:featureKey')
  getByFeatureKey(@CurrentUser() user: RequestUser, @Param('featureKey') featureKey: string) {
    return this.svc.getByFeatureKey(user, featureKey);
  }

  /** 全員可讀（按 id 查）。 */
  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /** SYSADMIN 主寫入。 */
  @Post()
  @Roles('SYSADMIN')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSystemManualDto) {
    return this.svc.create(user, dto);
  }

  /** SYSADMIN 主寫入。 */
  @Patch(':id')
  @Roles('SYSADMIN')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchSystemManualDto) {
    return this.svc.patch(user, id, dto);
  }

  /** SYSADMIN 主寫入。 */
  @Delete(':id')
  @Roles('SYSADMIN')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.delete(user, id);
  }
}
