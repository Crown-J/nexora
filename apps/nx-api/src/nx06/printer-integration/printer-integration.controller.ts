// apps/nx-api/src/nx06/printer-integration/printer-integration.controller.ts
// NX06 PrinterIntegration controller（熱感印表機列印標記）

import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { PrintDnDto } from './dto/printer-integration.dto';
import { PrinterIntegrationService } from './printer-integration.service';

@Controller('nx06/printer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class PrinterIntegrationController {
  constructor(private readonly svc: PrinterIntegrationService) {}

  /**
   * 標記 DN 已列印（外務員 App 藍牙列印完成後呼叫）
   *   - 寫 printer_device_id + printed_at
   *   - 藍牙 SDK 對接屬前端 mobile UI 軌
   */
  @Post(':dnId/print')
  markPrinted(
    @CurrentUser() user: RequestUser,
    @Param('dnId') dnId: string,
    @Body() dto: PrintDnDto,
  ) {
    return this.svc.markPrinted(user, dnId, dto);
  }
}
