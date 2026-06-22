// apps/nx-api/src/nx01/user-warehouse/user-warehouse.controller.ts
/**
 * UserWarehouse Controller（補完軌：仿 user-role 範式、解前端 /user-warehouse 404）
 *
 * 路由前綴：`/user-warehouse`（root、對齊前端既有 features/base/api/user-warehouse.ts）
 * 權限：SYSADMIN / OWNER（與 user-role 一致；倉庫指派屬帳號權限管理）
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  AssignUserWarehouseDto,
  ListUserWarehouseQueryDto,
  RevokeUserWarehouseDto,
  SetPrimaryUserWarehouseDto,
} from './dto/user-warehouse.dto';
import { UserWarehouseService } from './user-warehouse.service';

@Controller('user-warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class UserWarehouseController {
  constructor(private readonly svc: UserWarehouseService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListUserWarehouseQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  assign(@CurrentUser() user: RequestUser, @Body() dto: AssignUserWarehouseDto) {
    return this.svc.assign(user, dto);
  }

  @Patch(':id/revoke')
  revoke(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RevokeUserWarehouseDto,
  ) {
    return this.svc.revoke(user, id, dto);
  }

  @Patch(':id/set-primary')
  setPrimary(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetPrimaryUserWarehouseDto,
  ) {
    return this.svc.setPrimary(user, id, dto);
  }
}
