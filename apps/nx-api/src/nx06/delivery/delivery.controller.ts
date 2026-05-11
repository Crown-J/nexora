import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { LogisticsKind } from '../../shared/nx06/nx06-state-machine';
import { Nx06ListQueryDto } from '../../shared/nx06/nx06-list-query.dto';

import { DnLogisticsService } from '../dn-logistics.service';
import { CreateDeliveryDto, PatchDeliveryDto, PatchDnLocationDto } from './delivery.dto';

@Controller('nx06/delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class DeliveryController {
  constructor(private readonly svc: DnLogisticsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx06ListQueryDto) {
    return this.svc.list(user, q, LogisticsKind.DELIVERY);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id, LogisticsKind.DELIVERY);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDeliveryDto) {
    return this.svc.createDelivery(user, dto);
  }

  @Patch(':id/location')
  patchLocation(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchDnLocationDto) {
    return this.svc.patchDeliveryLocation(user, id, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchDeliveryDto) {
    return this.svc.patchDelivery(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id, LogisticsKind.DELIVERY);
  }
}
