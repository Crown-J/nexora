/**
 * File: apps/nx-api/src/nx02/nx02.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-MOD-001：庫存模組（balance / ledger）
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { BalanceController } from './balance/balance.controller';
import { BalanceService } from './balance/balance.service';
import { LedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';

@Module({
  imports: [PrismaModule],
  controllers: [BalanceController, LedgerController],
  providers: [BalanceService, LedgerService],
})
export class Nx02Module { }
