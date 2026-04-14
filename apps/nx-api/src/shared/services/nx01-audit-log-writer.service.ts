import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Nx01AuditLogWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async write(params: {
    tenantId: string;
    actorUserId: string;
    moduleCode: string;
    action: string;
    entityTable: string;
    entityId?: string | null;
    entityCode?: string | null;
    summary?: string | null;
    beforeData?: Prisma.InputJsonValue;
    afterData?: Prisma.InputJsonValue;
    ipAddr?: string | null;
    userAgent?: string | null;
  }) {
    await this.prisma.nx01AuditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        moduleCode: params.moduleCode,
        action: params.action,
        entityTable: params.entityTable,
        entityId: params.entityId ?? undefined,
        entityCode: params.entityCode ?? undefined,
        summary: params.summary ?? undefined,
        beforeData: params.beforeData,
        afterData: params.afterData,
        ipAddr: params.ipAddr ?? undefined,
        userAgent: params.userAgent ?? undefined,
      },
    });
  }
}
