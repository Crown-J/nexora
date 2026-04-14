import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx06ListQueryDto } from '../../shared/nx06/nx06-list-query.dto';
import { LogisticsKind } from '../../shared/nx06/nx06-state-machine';

import { DnLogisticsService } from '../dn-logistics.service';
import { CreateIntlShippingDto, PatchIntlShippingDto } from './intl-shipping.dto';

@Controller('nx06/intl-shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class IntlShippingController {
  constructor(private readonly svc: DnLogisticsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx06ListQueryDto) {
    return this.svc.list(user, q, LogisticsKind.INTL_SHIPPING);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id, LogisticsKind.INTL_SHIPPING);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateIntlShippingDto) {
    return this.svc.createIntlShipping(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchIntlShippingDto) {
    return this.svc.patchIntlShipping(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id, LogisticsKind.INTL_SHIPPING);
  }
}
