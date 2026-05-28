// apps/nx-api/src/nx98/task-pool/task-pool.controller.ts
// LITE 階段 1 M4：共享待辦池 controller

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import {
  AssignTaskPoolDto,
  CompleteTaskPoolDto,
  CreateTaskPoolDto,
  ListTaskPoolQueryDto,
  UpdateTaskPoolDto,
} from './dto/task-pool.dto';
import { TaskPoolService } from './task-pool.service';

@Controller('nx98/task-pool')
@UseGuards(JwtAuthGuard)
export class TaskPoolController {
  constructor(private readonly svc: TaskPoolService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListTaskPoolQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTaskPoolDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateTaskPoolDto) {
    return this.svc.update(user, id, dto);
  }

  /** 領取（OPEN → CLAIMED + assignee=current user） */
  @Post(':id/claim')
  claim(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.claim(user, id);
  }

  /** 放回池（CLAIMED → OPEN、清 assignee） */
  @Post(':id/release')
  release(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.release(user, id);
  }

  /** 指派（主管 ABCD 用、assigneeUserId=null 放回池） */
  @Post(':id/assign')
  assign(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: AssignTaskPoolDto) {
    return this.svc.assign(user, id, dto);
  }

  /** 完成（CLAIMED → DONE） */
  @Post(':id/complete')
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CompleteTaskPoolDto) {
    return this.svc.complete(user, id, dto);
  }

  /** 作廢（OPEN/CLAIMED → VOIDED） */
  @Delete(':id')
  voidTask(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.voidTask(user, id);
  }
}
