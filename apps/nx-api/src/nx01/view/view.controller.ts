// apps/nx-api/src/nx01/view/view.controller.ts
/**
 * View Controller（補後端軌：畫面字典唯讀、路由 nx01/views）
 * 供 role-view 權限指派的 viewId 下拉來源。
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx01ListQueryDto } from '../../shared/nx01/pagination.dto';
import { ViewService } from './view.service';

@Controller('nx01/views')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class ViewController {
  constructor(private readonly svc: ViewService) {}

  @Get()
  list(@Query() q: Nx01ListQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }
}
