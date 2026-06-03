import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { BulkActivateUsersDto, CreateUserDto, ListUserQueryDto, UpdateUserDto } from './dto/user.dto';
import { UserService } from './user.service';

@Controller('nx01/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class UserController {
  constructor(private readonly svc: UserService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListUserQueryDto) {
    return this.svc.list(user, q);
  }

  /** 席次制 query：目前已用 X / Y 席（精靈第二步 + 主檔 toolbar 顯示）*/
  @Get('seat-usage')
  seatUsage(@CurrentUser() user: RequestUser) {
    return this.svc.getSeatUsage(user);
  }

  /** 席次制：批次啟用（精靈第二步「挑啟用」核心）*/
  @Put('bulk-activate')
  bulkActivate(@CurrentUser() user: RequestUser, @Body() dto: BulkActivateUsersDto) {
    return this.svc.bulkActivate(user, dto);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }
}
