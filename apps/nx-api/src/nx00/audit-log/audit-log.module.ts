/**
 * File: apps/nx-api/src/nx00/audit-log/audit-log.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-AUDIT-LOG-MODULE-001：AuditLog Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { AuditLogController } from './controllers/audit-log.controller';
import { AuditLogService } from './services/audit-log.service';

@Module({
    controllers: [AuditLogController],
    providers: [AuditLogService],
    exports: [AuditLogService], // 讓其他 module/service 可注入寫 log
})
export class AuditLogModule { }