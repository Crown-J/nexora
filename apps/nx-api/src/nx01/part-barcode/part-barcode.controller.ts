// apps/nx-api/src/nx01/part-barcode/part-barcode.controller.ts
// 偉盟 P2 2.6 2026-07-11：零件條碼對照
//   維護面（sub-resource、鎖管理角色、對齊 part/part-photo）＋
//   resolve（只掛 JwtAuthGuard、掃碼工作站倉管可用、對齊 part-search 範式）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreatePartBarcodeDto, DefaultsPartBarcodeDto, UpdatePartBarcodeDto } from './dto/part-barcode.dto';
import { PartBarcodeService } from './part-barcode.service';

@Controller('nx01/parts/:partId/barcodes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartBarcodeController {
  constructor(private readonly svc: PartBarcodeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('partId') partId: string) {
    return this.svc.list(user, partId);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Body() dto: CreatePartBarcodeDto,
  ) {
    return this.svc.create(user, partId, dto);
  }

  @Patch(':barcodeId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Param('barcodeId') barcodeId: string,
    @Body() dto: UpdatePartBarcodeDto,
  ) {
    return this.svc.update(user, partId, barcodeId, dto);
  }

  @Delete(':barcodeId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('partId') partId: string,
    @Param('barcodeId') barcodeId: string,
  ) {
    return this.svc.remove(user, partId, barcodeId);
  }
}

/** 掃碼解析：不鎖角色（RolesGuard 沒設角色即放行、倉管工作站用） */
@Controller('nx01/part-barcode')
@UseGuards(JwtAuthGuard)
export class PartBarcodeResolveController {
  constructor(private readonly svc: PartBarcodeService) {}

  @Get('resolve')
  resolve(@CurrentUser() user: RequestUser, @Query('code') code: string) {
    return this.svc.resolve(user, code ?? '');
  }

  /** Step 2 標籤列印：批量取預設條碼（進貨單全明細印標用、倉管可呼） */
  @Post('defaults')
  defaults(@CurrentUser() user: RequestUser, @Body() dto: DefaultsPartBarcodeDto) {
    return this.svc.defaults(user, dto.partIds ?? []);
  }
}
