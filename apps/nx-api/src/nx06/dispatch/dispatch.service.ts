// apps/nx-api/src/nx06/dispatch/dispatch.service.ts
// NX06 Dispatch service（倉管組長配單：指派外務 + 車輛）
//
// 對齊：
//   - overview §3.1 #5（倉管組長配單）
//   - overview §2.1 WAREHOUSE 倉管組長主操作
//   - Crown Q1 拍板 WAREHOUSE 主寫入
//
// 業務語意：
//   - DN DRAFT → DISPATCHED transit 時呼叫
//   - 寫 Dn.driverUserId + vehicleNo + status='DISPATCHED' + departedAt 留空（外務員 App 點出發後寫）
//   - guard：driver 必存在 + isActive

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { AssignDispatchDto } from './dto/dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async assignDriver(user: RequestUser, dnId: string, dto: AssignDispatchDto) {
    const tenantId = requireTenantId(user);

    const dn = await this.prisma.nx06Dn.findFirst({
      where: { id: dnId, tenantId },
      select: { id: true, docNo: true, status: true },
    });
    if (!dn) throw new NotFoundException('DN not found');
    if (dn.status !== 'DRAFT') {
      throw new BadRequestException(
        `DN must be DRAFT to assign driver, current status='${dn.status}'`,
      );
    }

    // guard driver 存在 + isActive
    const driver = await this.prisma.nx01User.findFirst({
      where: { id: dto.driverUserId.trim(), tenantId, isActive: true },
      select: { id: true, userName: true },
    });
    if (!driver) {
      throw new BadRequestException('driverUserId not found or inactive in tenant');
    }

    const updated = await this.prisma.nx06Dn.update({
      where: { id: dnId },
      data: {
        driverUserId: driver.id,
        vehicleNo: dto.vehicleNo?.trim() || null,
        status: 'DISPATCHED',
        updatedBy: user.sub,
      },
      select: {
        id: true,
        docNo: true,
        status: true,
        driverUserId: true,
        vehicleNo: true,
      },
    });

    return {
      ok: true,
      dn: updated,
      driver: { id: driver.id, userName: driver.userName },
    };
  }
}
