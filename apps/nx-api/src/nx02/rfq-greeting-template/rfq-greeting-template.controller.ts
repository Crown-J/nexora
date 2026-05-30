// apps/nx-api/src/nx02/rfq-greeting-template/rfq-greeting-template.controller.ts
// LITE 階段 1 M2-e：詢價客套話 controller。

import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { UpdateRfqGreetingTemplateDto } from './dto/rfq-greeting-template.dto';
import { RfqGreetingTemplateService } from './rfq-greeting-template.service';

@Controller('nx02/rfq-greeting-template')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class RfqGreetingTemplateController {
  constructor(private readonly svc: RfqGreetingTemplateService) {}

  /// v1.2 §12.3 系統參數 → 詢價單客套話設定
  @Get()
  @Permission('purchase.rfq.view', 'settings.system-param.edit')
  get(@CurrentUser() user: RequestUser) {
    return this.svc.getOrCreate(user);
  }

  @Patch()
  @Permission('settings.system-param.edit')
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateRfqGreetingTemplateDto) {
    return this.svc.update(user, dto);
  }
}
