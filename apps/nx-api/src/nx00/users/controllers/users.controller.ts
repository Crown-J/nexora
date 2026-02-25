/**
 * File: apps/nx-api/src/users/users.controller.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-USERS-CTRL-001：Users CRUD endpoints (ADMIN only)
 *
 * Notes:
 * - 路由規則對齊 Roles：不加 nx00 前綴，直接用 /users
 * - 若前端打到 /nx00/users，代表前端或 apiFetch 有自動加前綴，需要一併修正回 /users
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { UsersService } from '../services/users.service';
import type { ChangePasswordBody, CreateUserBody, SetActiveBody, UpdateUserBody } from '../dto/users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) { }

  /**
   * @CODE nxapi_nx00_users_list_002
   */
  @Get()
  async list(@Query() query: any) {
    return this.users.list({
      q: typeof query.q === 'string' ? query.q : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
      statusCode: typeof query.statusCode === 'string' ? query.statusCode : undefined,
    } as any);
  }

  /**
   * @CODE nxapi_nx00_users_get_002
   */
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.users.get(id);
  }

  /**
   * @CODE nxapi_nx00_users_create_003
   */
  @Post()
  async create(@Body() body: CreateUserBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    return this.users.create(body, actorUserId);
  }

  /**
   * @CODE nxapi_nx00_users_update_002
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    return this.users.update(id, body, actorUserId);
  }

  /**
   * @CODE nxapi_nx00_users_set_active_001
   */
  @Patch(':id/active')
  async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    return this.users.setActive(id, body, actorUserId);
  }

  /**
   * @CODE nxapi_nx00_users_change_password_001
   */
  @Patch(':id/password')
  async changePassword(@Param('id') id: string, @Body() body: ChangePasswordBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    return this.users.changePassword(id, body, actorUserId);
  }
}