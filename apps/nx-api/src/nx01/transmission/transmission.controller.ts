// apps/nx-api/src/nx01/transmission/transmission.controller.ts
// 對應規格：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §2.1 / §6
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateTransmissionDto,
  ListTransmissionQueryDto,
  UpdateTransmissionDto,
} from './dto/transmission.dto';
import { TransmissionService } from './transmission.service';

@Controller('nx01/transmissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class TransmissionController {
  constructor(private readonly svc: TransmissionService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListTransmissionQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTransmissionDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransmissionDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
