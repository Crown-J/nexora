// apps/nx-api/src/nx06/printer-integration/printer-integration.service.ts
// NX06 PrinterIntegration service（熱感印表機列印標記、純 backend）
//
// 對齊：
//   - overview §6.2 現場熱感印表機列印（Crown Q7=a 藍牙）
//   - 業界範式：Brother / Epson / 漢印 / 芝商熱敏（NTD 2000~5000 / 台）
//   - 業界應用：物流業 / 餐飲外送 / 工地簽收
//
// 業務語意：
//   - 純 backend：接收 printer_device_id + 寫 printed_at
//   - 藍牙 SDK 對接屬前端 mobile UI 軌（本軌不做）
//   - 本 endpoint 純標記「已列印」、實際印單據在前端 App 完成

import { Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { PrintDnDto } from './dto/printer-integration.dto';

@Injectable()
export class PrinterIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async markPrinted(user: RequestUser, dnId: string, dto: PrintDnDto) {
    const tenantId = requireTenantId(user);

    const dn = await this.prisma.nx06Dn.findFirst({
      where: { id: dnId, tenantId },
      select: { id: true, docNo: true, status: true, printerDeviceId: true, printedAt: true },
    });
    if (!dn) throw new NotFoundException('DN not found');

    const updated = await this.prisma.nx06Dn.update({
      where: { id: dnId },
      data: {
        printerDeviceId: dto.printerDeviceId.trim(),
        printedAt: new Date(),
        updatedBy: user.sub,
      },
      select: { id: true, docNo: true, printerDeviceId: true, printedAt: true },
    });

    return { ok: true, dn: updated };
  }
}
