// apps/nx-api/src/nx01/permission-level/permission-level.controller.ts
// 職務↔權限拆分軌 Step3：權限等級 controller（CRUD + 等級權限設定）

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreatePermissionLevelDto,
  ListPermissionLevelQueryDto,
  SetLevelPermissionsDto,
  UpdatePermissionLevelDto,
} from './dto/permission-level.dto';
import { PermissionLevelService } from './permission-level.service';

@Controller('nx01/permission-levels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PermissionLevelController {
  constructor(private readonly svc: PermissionLevelService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListPermissionLevelQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePermissionLevelDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionLevelDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }

  /// 列指定等級的權限集合（編輯預填）
  @Get(':id/permissions')
  listPermissions(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.listPermissions(user, id);
  }

  /// 替換指定等級的權限集合（PUT 語意）
  @Put(':id/permissions')
  setPermissions(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SetLevelPermissionsDto,
  ) {
    return this.svc.setPermissions(user, id, dto.permissionCodes);
  }
}
