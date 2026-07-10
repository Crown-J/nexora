// apps/nx-api/src/nx02/ti/ti.controller.ts
// NX02-TI-SHELL 2026-07-11：同行調貨單管理端點（首發；⛔ 無 POST 建單——只能由 SO 缺貨行 / 比價採用產生）

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';

import { PatchTiItemDto, TiToRrDto, UpdateTiDto } from './dto/ti.dto';
import { TiService } from './ti.service';

@Controller('nx02/ti')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class TiController {
  constructor(private readonly svc: TiService) {}

  @Get()
  @Permission('purchase.ti.list')
  list(@CurrentUser() user: RequestUser, @Query() q: Nx02ListQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @Permission('purchase.ti.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Patch(':id')
  @Permission('purchase.ti.edit')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateTiDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Permission('purchase.ti.delete')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }

  @Patch(':id/items/:itemId')
  @Permission('purchase.ti.edit')
  patchItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchTiItemDto,
  ) {
    return this.svc.patchItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permission('purchase.ti.edit')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.removeItem(user, id, itemId);
  }

  // 轉進貨：建草稿 RR（供應商=同行、tiId 回鏈）→ TI → 待驗收
  @Post(':id/to-rr')
  @Permission('purchase.ti.edit')
  toRr(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: TiToRrDto) {
    return this.svc.toRr(user, id, dto);
  }
}
