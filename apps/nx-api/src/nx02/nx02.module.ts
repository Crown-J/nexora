// apps/nx-api/src/nx02/nx02.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { Nx02ErrorFilter } from '../shared/filters/nx02-error.filter';

import { PartnerPartController } from './partner-part/partner-part.controller';
import { PartnerPartService } from './partner-part/partner-part.service';
import { PoController } from './po/po.controller';
import { PoService } from './po/po.service';
import { PriceComparisonController } from './price-comparison/price-comparison.controller';
import { PriceComparisonService } from './price-comparison/price-comparison.service';
import { PurchaseReturnController } from './purchase-return/purchase-return.controller';
import { PurchaseReturnService } from './purchase-return/purchase-return.service';
import { PurchaseStageController } from './purchase-stage/purchase-stage.controller';
import { PurchaseStageService } from './purchase-stage/purchase-stage.service';
import { PurchaseSuggestionController } from './purchase-suggestion/purchase-suggestion.controller';
import { PurchaseSuggestionService } from './purchase-suggestion/purchase-suggestion.service';
import { QtController } from './qt/qt.controller';
import { Nx02QtService } from './qt/qt.service';
import { RfqController } from './rfq/rfq.controller';
import { RfqService } from './rfq/rfq.service';
import { RrController } from './rr/rr.controller';
import { RrService } from './rr/rr.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    RfqController,
    PoController,
    RrController,
    PurchaseReturnController,
    QtController,
    PartnerPartController,
    PurchaseSuggestionController,
    PriceComparisonController,
    PurchaseStageController,
  ],
  providers: [
    RfqService,
    PoService,
    RrService,
    PurchaseReturnService,
    Nx02QtService,
    PartnerPartService,
    PurchaseSuggestionService,
    PriceComparisonService,
    PurchaseStageService,
    { provide: APP_FILTER, useClass: Nx02ErrorFilter },
  ],
})
export class Nx02Module {}
