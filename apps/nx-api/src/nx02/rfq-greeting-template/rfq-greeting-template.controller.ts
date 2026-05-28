// apps/nx-api/src/nx02/rfq-greeting-template/rfq-greeting-template.controller.ts
// LITE 階段 1 M2-e：詢價客套話 controller。

import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { UpdateRfqGreetingTemplateDto } from './dto/rfq-greeting-template.dto';
import { RfqGreetingTemplateService } from './rfq-greeting-template.service';

@Controller('nx02/rfq-greeting-template')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING')
export class RfqGreetingTemplateController {
  constructor(private readonly svc: RfqGreetingTemplateService) {}

  @Get()
  get(@CurrentUser() user: RequestUser) {
    return this.svc.getOrCreate(user);
  }

  @Patch()
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateRfqGreetingTemplateDto) {
    return this.svc.update(user, dto);
  }
}
