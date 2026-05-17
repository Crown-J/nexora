import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';

import { CreateRfqDto, CreateRfqItemDto, PatchRfqItemDto, UpdateRfqDto } from './dto/rfq.dto';
import { RfqService } from './rfq.service';

@Controller('nx02/rfq')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class RfqController {
  constructor(private readonly svc: RfqService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: Nx02ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateRfqItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchRfqItemDto,
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

  /**
   * NX02-IMPL-01 Phase 3 commit 3c：RFQ 匯出（廠商不登入 email 範式）
   * 回 { text, payload }、採購員自選格式 copy 寄 email
   * 對齊 overview §3.6 + Crown Q18
   */
  @Get(':id/export')
  exportRfq(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.exportRfq(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRfqDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateRfqDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
