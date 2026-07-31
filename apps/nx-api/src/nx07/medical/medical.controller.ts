// apps/nx-api/src/nx07/medical/medical.controller.ts
// NX07 醫療管理 controller（MedicalRecord + Injury 共一個 controller）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ModuleAccessGuard } from '../../shared/module-access/module-access.guard';
import { RequiresModule } from '../../shared/module-access/requires-module.decorator';

import {
  CreateInjuryDto,
  CreateMedicalRecordDto,
  PatchInjuryStatusDto,
  PatchMedicalRecordDto,
} from './dto/medical.dto';
import { Nx07MedicalService } from './medical.service';

@Controller('nx07/medical')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@RequiresModule('NX07')
@Roles('SYSADMIN', 'OWNER', 'HR_ADMIN')
export class Nx07MedicalController {
  constructor(private readonly svc: Nx07MedicalService) {}

  // ===== Medical Record =====

  @Get('records')
  listRecords(@CurrentUser() user: RequestUser, @Query('userId') userId?: string) {
    return this.svc.listRecords(user, { userId });
  }

  @Get('records/:id')
  getRecord(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getRecord(user, id);
  }

  @Post('records')
  createRecord(@CurrentUser() user: RequestUser, @Body() dto: CreateMedicalRecordDto) {
    return this.svc.createRecord(user, dto);
  }

  @Patch('records/:id')
  patchRecord(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchMedicalRecordDto) {
    return this.svc.patchRecord(user, id, dto);
  }

  @Delete('records/:id')
  deleteRecord(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.deleteRecord(user, id);
  }

  // ===== Injury =====

  @Get('injuries')
  listInjuries(
    @CurrentUser() user: RequestUser,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listInjuries(user, { userId, status });
  }

  @Get('injuries/:id')
  getInjury(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getInjury(user, id);
  }

  @Post('injuries')
  createInjury(@CurrentUser() user: RequestUser, @Body() dto: CreateInjuryDto) {
    return this.svc.createInjury(user, dto);
  }

  /** 職災狀態流轉（REPORTED → TREATING → RECOVERED / DISABLED / FATAL）。 */
  @Patch('injuries/:id/status')
  patchInjuryStatus(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchInjuryStatusDto) {
    return this.svc.patchInjuryStatus(user, id, dto);
  }
}
