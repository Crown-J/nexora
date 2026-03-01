/**
 * File: apps/nx-api/src/nx00/partner/partner.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-PARTNER-MODULE-001：Partner Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { PartnerController } from './controllers/partner.controller';
import { PartnerService } from './services/partner.service';

@Module({
    controllers: [PartnerController],
    providers: [PartnerService],
})
export class PartnerModule { }