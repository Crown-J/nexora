// apps/nx-api/src/nx03/nx03.module.ts
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ArCalculatorService } from './auto-replenish/ar-calculator.service';
import { ArSchedulerService } from './auto-replenish/ar-scheduler.service';
import { ArSuggestionWriterService } from './auto-replenish/ar-suggestion-writer.service';
import { AutoReplenishController } from './auto-replenish/auto-replenish.controller';
import { PartReplacementService } from './auto-replenish/part-replacement.service';
import { BrandAllocationRuleController } from './brand-allocation-rule/brand-allocation-rule.controller';
import { BrandAllocationRuleService } from './brand-allocation-rule/brand-allocation-rule.service';
import { ConversionController } from './conversion/conversion.controller';
import { ConversionService } from './conversion/conversion.service';
import { DisposalController } from './disposal/disposal.controller';
import { DisposalService } from './disposal/disposal.service';
import { InboundController } from './inbound/inbound.controller';
import { InboundService } from './inbound/inbound.service';
import { InitController } from './init/init.controller';
import { InitService } from './init/init.service';
import { IssueReportController } from './issue-report/issue-report.controller';
import { IssueReportService } from './issue-report/issue-report.service';
import { OutboundController } from './outbound/outbound.controller';
import { OutboundService } from './outbound/outbound.service';
import { PartStockSettingController } from './part-stock-setting/part-stock-setting.controller';
import { PartStockSettingService } from './part-stock-setting/part-stock-setting.service';
import { ParcelController } from './parcel/parcel.controller';
import { ParcelService } from './parcel/parcel.service';
import { PkController } from './pk/pk.controller';
import { PkService } from './pk/pk.service';
import { PlController } from './pl/pl.controller';
import { PlService } from './pl/pl.service';
import { StockBalanceController } from './stock-balance/stock-balance.controller';
import { StockBalanceService } from './stock-balance/stock-balance.service';
import { StockLedgerController } from './stock-ledger/stock-ledger.controller';
import { StockLedgerService } from './stock-ledger/stock-ledger.service';
import { StockQueryController } from './stock-query/stock-query.controller';
import { StockQueryService } from './stock-query/stock-query.service';
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
    StockQueryController,
    StockReservationController,
    PartStockSettingController,
    BrandAllocationRuleController,
    AutoReplenishController,
    InitController,
    DisposalController,
    ConversionController,
    IssueReportController,
    PkController,
    PlController,
    ParcelController,
    InboundController,
    OutboundController,
    StockTakeController,
    TransferController,
  ],
  providers: [
    StockBalanceService,
    StockLedgerService,
    StockQueryService,
    Nx03StockReservationService,
    PartStockSettingService,
    BrandAllocationRuleService,
    PartReplacementService,
    ArCalculatorService,
    ArSuggestionWriterService,
    ArSchedulerService,
    InitService,
    DisposalService,
    ConversionService,
    IssueReportService,
    PkService,
    PlService,
    ParcelService,
    InboundService,
    OutboundService,
    StockTakeService,
    TransferService,
  ],
})
export class Nx03Module {}
