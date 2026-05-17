import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { TranslatorErrorFilter } from '../shared/filters/translator-error.filter';

import { CreditGuardController } from './credit-guard/credit-guard.controller';
import { CreditGuardService } from './credit-guard/credit-guard.service';
import { QuoteController } from './quote/quote.controller';
import { QuoteService } from './quote/quote.service';
import { SalesReturnController } from './sales-return/sales-return.controller';
import { SalesReturnService } from './sales-return/sales-return.service';
import { SoController } from './so/so.controller';
import { SoService } from './so/so.service';
import { RefreshmentDocCreator } from './so/translator/refreshment-doc-creator';
import { TransferSourceResolver } from './so/translator/transfer-source-resolver';
import { SoTranslatorController } from './so/translator/translator.controller';
import { Nx04SoTranslatorService } from './so/translator/translator.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    QuoteController,
    SoController,
    SoTranslatorController,
    SalesReturnController,
    CreditGuardController,
  ],
  providers: [
    QuoteService,
    SoService,
    SalesReturnService,
    Nx04SoTranslatorService,
    TransferSourceResolver,
    RefreshmentDocCreator,
    CreditGuardService,
    { provide: APP_FILTER, useClass: TranslatorErrorFilter },
  ],
})
export class Nx04Module {}
