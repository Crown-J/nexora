import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';

import { CreateRfqDto, CreateRfqItemDto, PatchRfqItemDto, UpdateRfqDto } from './dto/rfq.dto';
import { RfqService } from './rfq.service';

@Controller('nx02/rfq')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class RfqController {
  constructor(private readonly svc: RfqService) {}

  @Get()
  @Permission('purchase.rfq.list')
  list(@CurrentUser() user: RequestUser, @Query() q: Nx02ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Post(':id/items')
  @Permission('purchase.rfq.edit')
  addItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateRfqItemDto) {
    return this.svc.addItem(user, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permission('purchase.rfq.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchRfqItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('purchase.rfq.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  @Get(':id')
  @Permission('purchase.rfq.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Get(':id/export')
  @Permission('purchase.rfq.export')
  exportRfq(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.exportRfq(user, id);
  }

  /// 產生詢價文字（v1.2 §5.2「產生詢價文字」按鈕）
  @Get(':id/inquiry-text')
  @Permission('purchase.rfq.view')
  generateInquiryText(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.generateInquiryText(user, id);
  }

  @Post()
  @Permission('purchase.rfq.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRfqDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('purchase.rfq.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateRfqDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('purchase.rfq.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
