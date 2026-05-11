import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx06ListQueryDto } from '../../shared/nx06/nx06-list-query.dto';
import { LogisticsKind } from '../../shared/nx06/nx06-state-machine';

import { DnLogisticsService } from '../dn-logistics.service';
import { CreatePickupDto, PatchPickupDto } from './pickup.dto';

@Controller('nx06/pickup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PickupController {
  constructor(private readonly svc: DnLogisticsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx06ListQueryDto) {
    return this.svc.list(user, q, LogisticsKind.PICKUP);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id, LogisticsKind.PICKUP);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePickupDto) {
    return this.svc.createPickup(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchPickupDto) {
    return this.svc.patchPickup(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id, LogisticsKind.PICKUP);
  }
}
