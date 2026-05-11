// apps/nx-api/src/nx04/so/translator/translator.controller.ts
// D4 蝧餉陌??controller ??POST /nx04/so/translate

import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

import { TranslateSoDto } from './dto/translate-so.dto';
import { Nx04SoTranslatorService } from './translator.service';

@Controller('nx04/so')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class SoTranslatorController {
  constructor(private readonly svc: Nx04SoTranslatorService) {}

  @Post('translate')
  translate(@CurrentUser() user: RequestUser, @Body() dto: TranslateSoDto) {
    return this.svc.translate(user, dto);
  }
}
