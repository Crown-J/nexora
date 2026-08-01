import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';

import type { ApplyBundleToSoDto } from '../bundle/dto/bundle.dto';

import { CreateSoDto, CreateSoItemDto, CreateTiFromSoDto, PatchSoItemDto, UpdateSoDto } from './dto/so.dto';
import { SoService } from './so.service';

@Controller('nx04/so')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class SoController {
  constructor(private readonly svc: SoService) {}

  @Get()
  @Permission('sale.so.list')
  list(@CurrentUser() user: RequestUser, @Query() q: Nx04ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post('from-quote/:quoteId')
  @Permission('sale.so.create')
  createFromQuote(@CurrentUser() user: RequestUser, @Param('quoteId') quoteId: string) {
    return this.svc.createFromQuote(user, quoteId);
  }

  /// NX04-M2 §A C2：拉報價 picker（給 SO 開單 UI 列出該客戶 OPEN 報價行）
  @Get('quote-lines/open')
  @Permission('sale.so.create')
  openQuoteLines(@CurrentUser() user: RequestUser, @Query('customerId') customerId: string) {
    return this.svc.listOpenQuoteLines(user, customerId);
  }

  /// 保固查詢（九宮格 銷售第 8 格、規格 §4.2）：查「這個客戶買過這顆嗎、什麼時候買的」
  /// ⚠️ 須排在 :id 路由前
  @Get('warranty-lookup')
  @Permission('sale.so.list')
  warrantyLookup(
    @CurrentUser() user: RequestUser,
    @Query('customerId') customerId?: string,
    @Query('partNo') partNo?: string,
  ) {
    return this.svc.warrantyLookup(user, customerId, partNo);
  }

  /// 即時銷退站 5（2026-07-19）：該客戶可退貨 SO＋行（含已退量/可退量；⚠️ 須排在 :id 路由前）
  @Get('returnable-lines')
  @Permission('sale.sr.create')
  returnableLines(@CurrentUser() user: RequestUser, @Query('customerId') customerId: string) {
    return this.svc.listReturnableSoLines(user, customerId);
  }

  /// NX04-M2 §A C3：SO 待調貨行清單（transferSourceType='G' + transferStatus='P'）
  @Get(':id/pending-transfer-lines')
  @Permission('sale.so.view')
  pendingTransferLines(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.listPendingTransferLines(user, id);
  }

  /// NX04-M2 §A C3：從 SO 行群組建 Nx02Ti 草稿（一張 TI 對應一個同行）
  @Post(':id/create-ti')
  @Permission('sale.ti.create')
  createTiFromSo(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateTiFromSoDto,
  ) {
    return this.svc.createTiFromSoLines(user, id, dto);
  }

  @Post(':id/items')
  @Permission('sale.so.edit')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateSoItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permission('sale.so.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchSoItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('sale.so.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  /// F2 組合套餐 2026-06-09：把套餐套用到 SO（新增 N 條 line、總金額 = bundle.bundlePrice）
  @Post(':id/apply-bundle')
  @Permission('sale.so.edit')
  applyBundle(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ApplyBundleToSoDto,
  ) {
    return this.svc.applyBundle(user, id, dto);
  }

  @Get(':id')
  @Permission('sale.so.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('sale.so.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSoDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('sale.so.edit', 'sale.so.post')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateSoDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('sale.so.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query('cancelReason') cancelReason?: string) {
    return this.svc.softDelete(user, id, cancelReason);
  }
}
