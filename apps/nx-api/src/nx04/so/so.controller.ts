import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';

import { CreateSoDto, CreateSoItemDto, PatchSoItemDto, UpdateSoDto } from './dto/so.dto';
import { SoService } from './so.service';

@Controller('nx04/so')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class SoController {
  constructor(private readonly svc: SoService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx04ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post('from-quote/:quoteId')
  createFromQuote(@CurrentUser() user: RequestUser, @Param('quoteId') quoteId: string) {
    return this.svc.createFromQuote(user, quoteId);
  }

  /// NX04-M2 §A C2：拉報價 picker（給 SO 開單 UI 列出該客戶 OPEN 報價行）
  @Get('quote-lines/open')
  openQuoteLines(@CurrentUser() user: RequestUser, @Query('customerId') customerId: string) {
    return this.svc.listOpenQuoteLines(user, customerId);
  }

  @Post(':id/items')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateSoItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchSoItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSoDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateSoDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query('cancelReason') cancelReason?: string) {
    return this.svc.softDelete(user, id, cancelReason);
  }
}
