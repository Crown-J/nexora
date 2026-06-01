// apps/nx-api/src/platform-tenants/controllers/platform-tenants.controller.ts
// 平台層 vs 租戶層分離軌 Phase 4：平台後台「客戶列表/詳情」endpoint
//
// 路由：
// - GET /platform/tenants            列出所有客戶租戶（排除 SYSTEM / INNOVA）
// - GET /platform/tenants/:id        客戶租戶詳情 + 訂閱 + 統計

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { PlatformAdminGuard } from '../../shared/guards/platform-admin.guard';
import { ListTenantsQueryDto } from '../dto/list-tenants.dto';
import { PlatformTenantsService } from '../services/platform-tenants.service';

@Controller('platform/tenants')
@UseGuards(PlatformAdminGuard)
export class PlatformTenantsController {
  constructor(private readonly svc: PlatformTenantsService) {}

  @Get()
  list(@Query() query: ListTenantsQueryDto) {
    return this.svc.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }
}
