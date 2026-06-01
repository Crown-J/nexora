// apps/nx-api/src/nx02/demand/demand.controller.ts
// v1.2 階段 I P3：採購需求手動 CRUD（GET list + POST create + POST :id/ignore）

import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { DemandService } from './demand.service';
import { CreateDemandDto, IgnoreDemandDto, ListDemandQueryDto } from './dto/demand.dto';

@Controller('nx02/demand')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
export class DemandController {
  constructor(private readonly svc: DemandService) {}

  @Get()
  @Permission('purchase.demand.list')
  list(@CurrentUser() user: RequestUser, @Query() q: ListDemandQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @Permission('purchase.demand.list')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('purchase.demand.list')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDemandDto) {
    return this.svc.create(user, dto);
  }

  @Post(':id/ignore')
  @Permission('purchase.demand.list')
  ignore(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: IgnoreDemandDto) {
    return this.svc.ignore(user, id, dto);
  }
}
