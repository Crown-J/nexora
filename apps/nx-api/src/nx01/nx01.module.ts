/**
 * File: apps/nx-api/src/nx01/nx01.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-MOD-001：採購模組（RFQ／PO／RR／PR）
 */

import { Module } from '@nestjs/common';

import { Nx02Module } from '../nx02/nx02.module';
import { PrismaModule } from '../prisma/prisma.module';

import { Nx01DashboardController } from './dashboard/nx01-dashboard.controller';
import { Nx01DashboardService } from './dashboard/nx01-dashboard.service';
import { PoController } from './po/po.controller';
import { PoService } from './po/po.service';
import { PrController } from './pr/pr.controller';
import { PrService } from './pr/pr.service';
import { RfqController } from './rfq/rfq.controller';
import { RfqService } from './rfq/rfq.service';
import { RrController } from './rr/rr.controller';
import { RrService } from './rr/rr.service';

@Module({
  imports: [PrismaModule, Nx02Module],
  controllers: [Nx01DashboardController, RfqController, PoController, RrController, PrController],
  providers: [Nx01DashboardService, RrService, PrService, PoService, RfqService],
})
export class Nx01Module { }
