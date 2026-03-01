/**
 * File: apps/nx-api/src/nx00/part/part.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PART-MODULE-001：Part Module（LITE 統一單數命名）
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 PartService 寫入操作紀錄（CREATE/UPDATE/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';
import { PartController } from './controllers/part.controller';
import { PartService } from './services/part.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [PartController],
    providers: [PartService],
})
export class PartModule { }