// apps/nx-api/src/nx03/issue-report/issue-report.controller.ts
// NX03-STOCK-LITE M2-C：異常回報 endpoint
//
// 動詞型 endpoint（非 REST 純風格、業務流轉清楚）：
//   POST /report       提交 DRAFT → REPORTED
//   POST /dispose      處置分流 REPORTED → PROCESSING（dispositionType + relatedDocId）
//   POST /close        結案 PROCESSING → CLOSED
//   POST /cancel       作廢任意 → CANCELLED

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import {
  CloseIssueReportDto,
  CreateIssueReportDto,
  DisposeIssueReportDto,
  ListIssueReportQueryDto,
  UpdateIssueReportDto,
} from './dto/issue-report.dto';
import { IssueReportService } from './issue-report.service';

@Controller('nx03/issue-report')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER')
export class IssueReportController {
  constructor(private readonly svc: IssueReportService) {}

  @Get()
  @Permission('inventory.issue-report.list')
  list(@CurrentUser() user: RequestUser, @Query() q: ListIssueReportQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @Permission('inventory.issue-report.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('inventory.issue-report.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateIssueReportDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('inventory.issue-report.edit')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateIssueReportDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Post(':id/report')
  @Permission('inventory.issue-report.edit')
  report(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.report(user, id);
  }

  @Post(':id/dispose')
  @Permission('inventory.issue-report.edit')
  dispose(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: DisposeIssueReportDto,
  ) {
    return this.svc.dispose(user, id, dto);
  }

  @Post(':id/close')
  @Permission('inventory.issue-report.edit')
  close(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CloseIssueReportDto,
  ) {
    return this.svc.close(user, id, dto);
  }

  @Post(':id/cancel')
  @Permission('inventory.issue-report.delete')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.cancel(user, id);
  }
}
