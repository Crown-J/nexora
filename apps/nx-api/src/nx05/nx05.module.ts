import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { AccountCodeController } from './account-code/account-code.controller';
import { AccountCodeService } from './account-code/account-code.service';
import { AllowanceController } from './allowance/allowance.controller';
import { AllowanceService } from './allowance/allowance.service';
import { ApController } from './ap/ap.controller';
import { ApService } from './ap/ap.service';
import { ArStatementController } from './ar-statement/ar-statement.controller';
import { ArStatementService } from './ar-statement/ar-statement.service';
import { ArController } from './ar/ar.controller';
import { ArService } from './ar/ar.service';
import { NoteController } from './note/note.controller';
import { NoteService } from './note/note.service';
import { PaymentController } from './payment/payment.controller';
import { PaymentService } from './payment/payment.service';
import { PeriodCloseController } from './period-close/period-close.controller';
import { PeriodCloseService } from './period-close/period-close.service';
import { ReceiptController } from './receipt/receipt.controller';
import { ReceiptService } from './receipt/receipt.service';
import { Nx05FinanceAccessGuard } from '../shared/nx05/nx05-finance-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [
    ArController,
    ApController,
    ReceiptController,
    PaymentController,
    NoteController,
    AllowanceController,
    PeriodCloseController,
    AccountCodeController,
    ArStatementController,
  ],
  providers: [
    ArService,
    ApService,
    ReceiptService,
    PaymentService,
    NoteService,
    AllowanceService,
    PeriodCloseService,
    AccountCodeService,
    ArStatementService,
    Nx05FinanceAccessGuard,
  ],
})
export class Nx05Module {}
