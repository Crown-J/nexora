import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { ListWarehouseTypeQueryDto } from './dto/warehouse-type.dto';
import { WarehouseTypeService } from './warehouse-type.service';

@Controller('nx01/warehouse-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class WarehouseTypeController {
  constructor(private readonly svc: WarehouseTypeService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListWarehouseTypeQueryDto) {
    return this.svc.list(user, q);
  }
}
