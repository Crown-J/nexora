// apps/nx-api/src/nx09/repair-sop/nx09-repair-sop.controller.ts
// NX09 RepairSop controller（維修 SOP CRUD + 內部 wire 雙向查詢、業界改革 ⭐⭐⭐）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx09ProPlanGuard } from '../../shared/nx09/nx09-pro-plan.guard';

import { CreateRepairSopDto, LinkPartModelDto, PatchRepairSopDto } from './dto/repair-sop.dto';
import { Nx09RepairSopService } from './nx09-repair-sop.service';

class ListRepairSopQuery {
  @IsOptional() @IsIn(['ENGINE', 'BRAKE', 'ELECTRIC', 'MAINTAIN', 'SUSPENSION', 'AC', 'TRANS', 'OTHER'])
  category?: string;
  @IsOptional() @IsString() carModelFilter?: string;
  @IsOptional() @IsBooleanString() isActive?: string;
}

@Controller('nx09')
@UseGuards(JwtAuthGuard, RolesGuard, Nx09ProPlanGuard)
export class Nx09RepairSopController {
  constructor(private readonly svc: Nx09RepairSopService) {}

  // ===== RepairSop CRUD =====

  @Get('repair-sop')
  list(@CurrentUser() user: RequestUser, @Query() q: ListRepairSopQuery) {
    return this.svc.list(user, {
      category: q.category,
      carModelFilter: q.carModelFilter,
      isActive: q.isActive === undefined ? undefined : q.isActive === 'true',
    });
  }

  @Get('repair-sop/:id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /** 業界改革查詢：依車型找適用 SOP（含通用 SOP carModelFilter IS NULL）。 */
  @Get('repair-sop/by-model/:modelId')
  findByCarModel(@CurrentUser() user: RequestUser, @Param('modelId') modelId: string) {
    return this.svc.findByCarModel(user, modelId);
  }

  @Post('repair-sop')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRepairSopDto) {
    return this.svc.create(user, dto);
  }

  @Patch('repair-sop/:id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchRepairSopDto) {
    return this.svc.patch(user, id, dto);
  }

  @Delete('repair-sop/:id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.delete(user, id);
  }

  // ===== Phase 5：RepairSop ↔ PartModel 雙向 wire ⭐⭐⭐ =====

  /** SOP → 連動的 PartModel 列表（料件清單）。 */
  @Get('repair-sop/:id/parts')
  listPartsBySop(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.listPartsBySop(user, id);
  }

  /** 反向查：PartModel → 哪些 SOP 適用（業務員查料件 → 看 SOP）。 */
  @Get('repair-sop/by-part-model/:partModelId')
  listSopsByPartModel(
    @CurrentUser() user: RequestUser,
    @Param('partModelId') partModelId: string,
  ) {
    return this.svc.listSopsByPartModel(user, partModelId);
  }

  @Post('repair-sop/:id/parts')
  linkParts(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: LinkPartModelDto,
  ) {
    return this.svc.linkParts(user, id, dto);
  }

  @Delete('repair-sop/:id/parts/:partModelId')
  unlinkPart(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('partModelId') partModelId: string,
  ) {
    return this.svc.unlinkPart(user, id, partModelId);
  }
}
