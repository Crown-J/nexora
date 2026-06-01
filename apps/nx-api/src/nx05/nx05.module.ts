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
import { OverdueWatcherController } from './overdue-watcher/overdue-watcher.controller';
import { OverdueWatcherService } from './overdue-watcher/overdue-watcher.service';
import { ArController } from './ar/ar.controller';
import { ArService } from './ar/ar.service';
import { NoteController } from './note/note.controller';
import { NoteService } from './note/note.service';
import { PaylogController } from './paylog/paylog.controller';
import { PaylogService } from './paylog/paylog.service';
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
    PaylogController,
    AllowanceController,
    PeriodCloseController,
    AccountCodeController,
    ArStatementController,
    OverdueWatcherController,
  ],
  providers: [
    ArService,
    ApService,
    ReceiptService,
    PaymentService,
    NoteService,
    PaylogService,
    AllowanceService,
    PeriodCloseService,
    AccountCodeService,
    ArStatementService,
    OverdueWatcherService,
    Nx05FinanceAccessGuard,
  ],
})
export class Nx05Module {}
