/**
 * File: apps/nx-api/src/nx00/partner/partner.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PARTNER-MODULE-001：Partner Module（LITE 統一單數命名）
 *
 * Notes:
 * - 匯入 AuditLogModule 以便 PartnerService 寫入操作紀錄（CREATE/UPDATE/SET_ACTIVE）
 */

import { Module } from '@nestjs/common';
import { PartnerController } from './controllers/partner.controller';
import { PartnerService } from './services/partner.service';

import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [PartnerController],
    providers: [PartnerService],
})
export class PartnerModule { }