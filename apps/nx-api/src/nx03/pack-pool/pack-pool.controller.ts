// apps/nx-api/src/nx03/pack-pool/pack-pool.controller.ts
// 包貨台 controller（SALES-FLOW 階段 2）。以客戶為單位、預設一箱一單、可併箱、封箱。

import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreatePackingDto, MergeParcelsDto, PackPoolQueryDto, SealPackingDto } from './dto/pack-pool.dto';
import { PackPoolService } from './pack-pool.service';

@Controller('nx03/pack-pool')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('inventory.workstation.packing')
export class PackPoolController {
  constructor(private readonly svc: PackPoolService) {}

  /** 包貨台清單（依 客戶 × 出貨方式 群組的已撿完待包行）。 */
  @Get()
  getPackPool(@CurrentUser() user: RequestUser, @Query() q: PackPoolQueryDto) {
    return this.svc.getPackPool(user, q);
  }

  /** 包貨單詳情（含包裹 + 每箱行）。 */
  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  /** 建包貨單（某客戶某出貨方式整批進、預設一箱一單）。 */
  @Post()
  createPacking(@CurrentUser() user: RequestUser, @Body() dto: CreatePackingDto) {
    return this.svc.createPacking(user, dto);
  }

  /** 併箱（同客戶小件省包材）。 */
  @Post('merge-parcels')
  mergeParcels(@CurrentUser() user: RequestUser, @Body() dto: MergeParcelsDto) {
    return this.svc.mergeParcels(user, dto);
  }

  /** 封箱（包貨完成）。 */
  @Post('seal')
  sealPacking(@CurrentUser() user: RequestUser, @Body() dto: SealPackingDto) {
    return this.svc.sealPacking(user, dto);
  }
}
