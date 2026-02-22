/**
 * File: apps/nx-api/src/users/users.controller.ts
 * Purpose: NX00-API-001 Users CRUD endpoints (ADMIN only)
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

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

import { UsersService } from './users.service';
import type {
  ChangePasswordBody,
  CreateUserBody,
  SetActiveBody,
  UpdateUserBody,
} from './users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * @CODE nxapi_nx00_users_list_002
   */
  @Get()
  async list(@Query() query: any) {
    return this.users.list({
      q: typeof query.q === 'string' ? query.q : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      statusCode: typeof query.statusCode === 'string' ? query.statusCode : undefined,
      isActive:
        typeof query.isActive === 'string'
          ? query.isActive === 'true'
            ? true
            : query.isActive === 'false'
              ? false
              : undefined
          : undefined,
    });
  }

  /**
   * @CODE nxapi_nx00_users_get_002
   */
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.users.get(id);
  }

  /**
   * @CODE nxapi_nx00_users_create_002
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
   * @CODE nxapi_nx00_users_set_active_002
   */
  @Patch(':id/active')
  async setActive(@Param('id') id: string, @Body() body: SetActiveBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    return this.users.setActive(id, body, actorUserId);
  }

  /**
   * @CODE nxapi_nx00_users_change_password_002
   */
  @Patch(':id/password')
  async changePassword(@Param('id') id: string, @Body() body: ChangePasswordBody, @Req() req: any) {
    const actorUserId = req?.user?.sub as string | undefined;
    return this.users.changePassword(id, body, actorUserId);
  }
}
