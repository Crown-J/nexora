/**
 * File: apps/nx-api/src/nx00/location/location.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOCATION-MODULE-001：Location Module（LITE 統一單數命名）
 */

import { Module } from '@nestjs/common';
import { LocationController } from './controllers/location.controller';
import { LocationService } from './services/location.service';

@Module({
    controllers: [LocationController],
    providers: [LocationService],
})
export class LocationModule { }