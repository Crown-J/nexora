/**
 * File: apps/nx-api/src/nx01/nx01.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-ROOT-001：NX01 採購域聚合（RFQ / PO）
 */

import { Module } from '@nestjs/common';
import { RfqModule } from './rfq/rfq.module';
import { PoModule } from './po/po.module';

@Module({
  imports: [RfqModule, PoModule],
})
export class Nx01Module {}

