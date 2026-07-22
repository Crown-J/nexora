// apps/nx-api/src/nx03/ship-zones/ship-zones.controller.ts
// 出貨三區 controller（SALES-FLOW 階段 3b）。封箱後路由：自取 / 寄貨 / 配送。

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateDeliveryRunDto, ShipMailDto, ShipZonesQueryDto, SignPickupDto } from './dto/ship-zones.dto';
import { ShipZonesService } from './ship-zones.service';

@Controller('nx03/ship-zones')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
@Permission('inventory.workstation.packing')
export class ShipZonesController {
  constructor(private readonly svc: ShipZonesService) {}

  /** 三區佇列（自取/寄貨/配送）。 */
  @Get()
  getZones(@CurrentUser() user: RequestUser, @Query() q: ShipZonesQueryDto) {
    return this.svc.getZones(user, q);
  }

  /** 自取簽收。 */
  @Post('pickup/sign')
  signPickup(@CurrentUser() user: RequestUser, @Body() dto: SignPickupDto) {
    return this.svc.signPickup(user, dto);
  }

  /** 寄貨寄出。 */
  @Post('mail/ship')
  shipMail(@CurrentUser() user: RequestUser, @Body() dto: ShipMailDto) {
    return this.svc.shipMail(user, dto);
  }

  /** 配送配單（組多張包貨單成一趟、派外務）。 */
  @Post('delivery/run')
  createDeliveryRun(@CurrentUser() user: RequestUser, @Body() dto: CreateDeliveryRunDto) {
    return this.svc.createDeliveryRun(user, dto);
  }
}
