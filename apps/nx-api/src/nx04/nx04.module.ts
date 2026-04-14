import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { QuoteController } from './quote/quote.controller';
import { QuoteService } from './quote/quote.service';
import { SalesReturnController } from './sales-return/sales-return.controller';
import { SalesReturnService } from './sales-return/sales-return.service';
import { SoController } from './so/so.controller';
import { SoService } from './so/so.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuoteController, SoController, SalesReturnController],
  providers: [QuoteService, SoService, SalesReturnService],
})
export class Nx04Module {}
