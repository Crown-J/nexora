import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx05FinanceAccessGuard } from '../../shared/nx05/nx05-finance-access.guard';
import { Nx05ListQueryDto } from '../../shared/nx05/nx05-list-query.dto';

import { CreateReceiptDto, PatchReceiptDto } from './dto/receipt.dto';
import { ReceiptService } from './receipt.service';

@Controller('nx05/receipt')
@UseGuards(JwtAuthGuard, RolesGuard, Nx05FinanceAccessGuard)
@Roles('SYSADMIN', 'OWNER')
export class ReceiptController {
  constructor(private readonly svc: ReceiptService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx05ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReceiptDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: PatchReceiptDto) {
    return this.svc.patch(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
