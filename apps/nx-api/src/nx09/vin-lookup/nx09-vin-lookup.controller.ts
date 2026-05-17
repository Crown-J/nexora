// apps/nx-api/src/nx09/vin-lookup/nx09-vin-lookup.controller.ts
// NX09 VinLookup controller（VIN decode + 手動建檔 + Parts 查詢、業界改革 ⭐⭐⭐）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBooleanString, IsIn, IsOptional } from 'class-validator';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx09ProPlanGuard } from '../../shared/nx09/nx09-pro-plan.guard';

import {
  CreateVinLookupManualDto,
  DecodeVinDto,
  PatchVinLookupDto,
} from './dto/vin-lookup.dto';
import { Nx09VinLookupService } from './nx09-vin-lookup.service';

class ListVinLookupQuery {
  @IsOptional() @IsIn(['API', 'MANUAL']) source?: string;
  @IsOptional() @IsBooleanString() isActive?: string;
}

@Controller('nx09/vin-lookup')
@UseGuards(JwtAuthGuard, RolesGuard, Nx09ProPlanGuard)
export class Nx09VinLookupController {
  constructor(private readonly svc: Nx09VinLookupService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListVinLookupQuery) {
    return this.svc.listMine(user, {
      source: q.source,
      isActive: q.isActive === undefined ? undefined : q.isActive === 'true',
    });
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Get('by-vin/:vin')
  getByVin(@CurrentUser() user: RequestUser, @Param('vin') vin: string) {
    return this.svc.getByVin(user, vin);
  }

  /** NHTSA decode + upsert（業界改革 ⭐⭐⭐ 核心 endpoint）。 */
  @Post('decode')
  decode(@CurrentUser() user: RequestUser, @Body() dto: DecodeVinDto) {
    return this.svc.decodeFromNhtsa(user, dto);
  }

  /** 業務員手動建檔（NHTSA 查不到時、亞洲車型常用）。 */
  @Post()
  upsertManual(@CurrentUser() user: RequestUser, @Body() dto: CreateVinLookupManualDto) {
    return this.svc.upsertManual(user, dto);
  }

  @Patch(':id')
  patch(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PatchVinLookupDto,
  ) {
    return this.svc.patch(user, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.delete(user, id);
  }

  /** VIN → modelId → PartModel → parts（業界改革核心 query、業務員「這台車能用哪些料件」）。 */
  @Get(':id/parts')
  listParts(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.listPartsByVinLookup(user, id);
  }
}
