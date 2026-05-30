// apps/nx-api/src/nx02/purchase-suggestion/purchase-suggestion.controller.ts
// NX02 PurchaseSuggestion controller（採購建議單列表）
// 對齊 overview §3.3 + Crown Q20 列表式

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { PurchaseSuggestionListQueryDto } from './dto/purchase-suggestion.dto';
import { PurchaseSuggestionService } from './purchase-suggestion.service';

@Controller('nx02/purchase-suggestion')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class PurchaseSuggestionController {
  constructor(private readonly svc: PurchaseSuggestionService) {}

  /// 採購建議單列表（v1.2 §5.4 採購需求單聚合 3 來源）
  @Get()
  @Permission('purchase.demand.list')
  list(@CurrentUser() user: RequestUser, @Query() q: PurchaseSuggestionListQueryDto) {
    return this.svc.list(user, q);
  }
}
