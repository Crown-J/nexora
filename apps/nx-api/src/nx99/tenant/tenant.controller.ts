import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateTenantDto, ListTenantsQueryDto, UpdateTenantDto } from './dto/tenant.dto';
import { TenantService } from './tenant.service';

@Controller('nx99/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListTenantsQueryDto) {
    return this.tenantService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.tenantService.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTenantDto) {
    return this.tenantService.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.tenantService.softDelete(user, id);
  }
}
