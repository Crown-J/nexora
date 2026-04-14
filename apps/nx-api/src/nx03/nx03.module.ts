import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { InboundController } from './inbound/inbound.controller';
import { InboundService } from './inbound/inbound.service';
import { OutboundController } from './outbound/outbound.controller';
import { OutboundService } from './outbound/outbound.service';
import { StockBalanceController } from './stock-balance/stock-balance.controller';
import { StockBalanceService } from './stock-balance/stock-balance.service';
import { StockLedgerController } from './stock-ledger/stock-ledger.controller';
import { StockLedgerService } from './stock-ledger/stock-ledger.service';
import { StockTakeController } from './stocktake/stocktake.controller';
import { StockTakeService } from './stocktake/stocktake.service';
import { TransferController } from './transfer/transfer.controller';
import { TransferService } from './transfer/transfer.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    StockBalanceController,
    StockLedgerController,
    InboundController,
    OutboundController,
    StockTakeController,
    TransferController,
  ],
  providers: [
    StockBalanceService,
    StockLedgerService,
    InboundService,
    OutboundService,
    StockTakeService,
    TransferService,
  ],
})
export class Nx03Module {}
