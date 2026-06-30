import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateQuoteDto, CreateQuoteItemDto, PatchQuoteItemDto, QuoteListQueryDto, UpdateQuoteDto } from './dto/quote.dto';
import { QuoteService } from './quote.service';

@Controller('nx04/quote')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class QuoteController {
  constructor(private readonly svc: QuoteService) {}

  @Get()
  @Permission('sale.quote.list')
  list(@CurrentUser() user: RequestUser, @Query() q: QuoteListQueryDto) {
    return this.svc.list(user, q);
  }

  /// NX04-M2 §A C1：歷史價提示（給 UI 加料件行時顯示「該客戶上次報過此料件的價格」）
  @Get('history')
  @Permission('sale.quote.create', 'sale.quote.edit')
  historicalPrices(
    @CurrentUser() user: RequestUser,
    @Query('customerId') customerId: string,
    @Query('partId') partId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Number(limit) : undefined;
    return this.svc.getHistoricalPrices(user, customerId, partId, Number.isFinite(n) ? n : undefined);
  }

  @Post(':id/items')
  @Permission('sale.quote.edit')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateQuoteItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permission('sale.quote.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchQuoteItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('sale.quote.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  @Permission('sale.quote.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('sale.quote.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateQuoteDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('sale.quote.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('sale.quote.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query('voidReason') voidReason?: string) {
    return this.svc.softDelete(user, id, voidReason);
  }
}
