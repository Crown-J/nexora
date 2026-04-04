/**
 * File: apps/nx-api/src/nx02/nx02.module.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-MOD-001：庫存模組（balance / ledger / init / stock-setting / stock-take）
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { BalanceController } from './balance/balance.controller';
import { BalanceService } from './balance/balance.service';
import { InitController } from './init/init.controller';
import { InitService } from './init/init.service';
import { LedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';
import { StockSettingController } from './stock-setting/stock-setting.controller';
import { StockSettingService } from './stock-setting/stock-setting.service';
import { StockTakeController } from './stock-take/stock-take.controller';
import { StockTakeService } from './stock-take/stock-take.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    BalanceController,
    LedgerController,
    InitController,
    StockSettingController,
    StockTakeController,
  ],
  providers: [BalanceService, LedgerService, InitService, StockSettingService, StockTakeService],
})
export class Nx02Module { }
