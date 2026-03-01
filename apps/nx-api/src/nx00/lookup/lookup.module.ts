/**
 * File: apps/nx-api/src/nx00/lookup/lookup.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOOKUP-MODULE-001：Lookup Module（下拉資料來源 / 精簡欄位）
 */

import { Module } from '@nestjs/common';
import { LookupController } from './controllers/lookup.controller';
import { LookupService } from './services/lookup.service';

@Module({
    controllers: [LookupController],
    providers: [LookupService],
})
export class LookupModule { }