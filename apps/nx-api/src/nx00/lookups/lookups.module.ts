/**
 * File: apps/nx-api/src/nx00/lookups/lookups.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-LOOKUPS-001：Lookups Module（Controller / Service）
 */

import { Module } from '@nestjs/common';
import { Nx00LookupsController } from './controllers/lookups.controller';
import { Nx00LookupsService } from './services/lookups.service';

@Module({
  controllers: [Nx00LookupsController],
  providers: [Nx00LookupsService],
  exports: [Nx00LookupsService],
})
export class LookupsModule {}