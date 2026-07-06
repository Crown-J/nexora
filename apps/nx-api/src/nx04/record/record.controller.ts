// apps/nx-api/src/nx04/record/record.controller.ts
// 報價紀錄表 / 詢價紀錄表 controller（NX04 紀錄表 A2）
//   /nx04/quote-record   報價紀錄（客戶側）
//   /nx04/inquiry-record 詢價紀錄（調貨/同行側）
//   ⚠️ 權限暫沿用 sale.quote.*（詢價紀錄專屬權限待 D 階段補）
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CreateInquiryRecordDto,
  CreateQuoteRecordDto,
  InquiryRecordListQueryDto,
  QuoteRecordListQueryDto,
} from './dto/record.dto';
import { RecordService } from './record.service';

@Controller('nx04/quote-record')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class QuoteRecordController {
  constructor(private readonly svc: RecordService) {}

  @Get()
  @Permission('sale.quote.list')
  list(@CurrentUser() user: RequestUser, @Query() q: QuoteRecordListQueryDto) {
    return this.svc.listQuoteRecords(user, q);
  }

  @Post()
  @Permission('sale.quote.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateQuoteRecordDto) {
    return this.svc.createQuoteRecord(user, dto);
  }
}

@Controller('nx04/inquiry-record')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class InquiryRecordController {
  constructor(private readonly svc: RecordService) {}

  @Get()
  @Permission('sale.quote.list')
  list(@CurrentUser() user: RequestUser, @Query() q: InquiryRecordListQueryDto) {
    return this.svc.listInquiryRecords(user, q);
  }

  @Post()
  @Permission('sale.quote.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateInquiryRecordDto) {
    return this.svc.createInquiryRecord(user, dto);
  }
}
