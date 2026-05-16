// apps/nx-api/src/nx03/nx03.module.ts
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { InboundController } from './inbound/inbound.controller';
import { InboundService } from './inbound/inbound.service';
import { InitController } from './init/init.controller';
import { InitService } from './init/init.service';
import { OutboundController } from './outbound/outbound.controller';
import { OutboundService } from './outbound/outbound.service';
import { PartStockSettingController } from './part-stock-setting/part-stock-setting.controller';
import { PartStockSettingService } from './part-stock-setting/part-stock-setting.service';
import { StockBalanceController } from './stock-balance/stock-balance.controller';
import { StockBalanceService } from './stock-balance/stock-balance.service';
import { StockLedgerController } from './stock-ledger/stock-ledger.controller';
import { StockLedgerService } from './stock-ledger/stock-ledger.service';
import { StockReservationController } from './stock-reservation/stock-reservation.controller';
import { Nx03StockReservationService } from './stock-reservation/stock-reservation.service';
import { StockTakeController } from './stocktake/stocktake.controller';
import { StockTakeService } from './stocktake/stocktake.service';
import { TransferController } from './transfer/transfer.controller';
import { TransferService } from './transfer/transfer.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    StockBalanceController,
    StockLedgerController,
    StockReservationController,
    PartStockSettingController,
    InitController,
    InboundController,
    OutboundController,
    StockTakeController,
    TransferController,
  ],
  providers: [
    StockBalanceService,
    StockLedgerService,
    Nx03StockReservationService,
    PartStockSettingService,
    InitService,
    InboundService,
    OutboundService,
    StockTakeService,
    TransferService,
  ],
})
export class Nx03Module {}
