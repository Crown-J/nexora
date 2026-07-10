// apps/nx-api/src/nx01/part-batch-price/part-batch-price.controller.ts
// 偉盟 P2 2.8 Step 3 2026-07-11：批次調價工具（鎖 SYSADMIN/OWNER、對齊零件主檔調價權限）

import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { BatchPricePayloadDto } from './dto/part-batch-price.dto';
import { PartBatchPriceService } from './part-batch-price.service';

@Controller('nx01/part-batch-price')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER')
export class PartBatchPriceController {
  constructor(private readonly svc: PartBatchPriceService) {}

  @Post('preview')
  preview(@CurrentUser() user: RequestUser, @Body() dto: BatchPricePayloadDto) {
    return this.svc.preview(user, dto);
  }

  @Post('apply')
  apply(@CurrentUser() user: RequestUser, @Body() dto: BatchPricePayloadDto) {
    return this.svc.apply(user, dto);
  }
}
