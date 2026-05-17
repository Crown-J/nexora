// apps/nx-api/src/nx09/sub-tables/sub-tables.controller.ts
// NX09 子表 controller（3 子表 core endpoint）

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx09ProPlanGuard } from '../../shared/nx09/nx09-pro-plan.guard';

import { Nx09SubTablesService } from './sub-tables.service';

class CreateKmTagDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortNo?: number;
}

class CreateKmFeedbackDto {
  @IsOptional()
  @IsBoolean()
  isHelpful?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

@Controller('nx09')
@UseGuards(JwtAuthGuard, RolesGuard, Nx09ProPlanGuard)
export class Nx09SubTablesController {
  constructor(private readonly svc: Nx09SubTablesService) {}

  /** Document 版本歷史（append-only、不暴露 PATCH）。 */
  @Get('document/:documentId/versions')
  listDocumentVersions(
    @CurrentUser() user: RequestUser,
    @Param('documentId') documentId: string,
  ) {
    return this.svc.listDocumentVersions(user, documentId);
  }

  /** KmTag 主檔列表（全員可讀）。 */
  @Get('km-tag')
  listKmTags(@CurrentUser() user: RequestUser) {
    return this.svc.listKmTags(user);
  }

  /** KmTag 建立（HR_ADMIN / SYSADMIN）。 */
  @Post('km-tag')
  @Roles('SYSADMIN', 'HR_ADMIN', 'OWNER')
  createKmTag(@CurrentUser() user: RequestUser, @Body() dto: CreateKmTagDto) {
    return this.svc.createKmTag(user, dto);
  }

  /** 給 KM 文章點「已解決」+ accumulate helpfulCount（全員可寫）。 */
  @Post('km-article/:articleId/feedback')
  createKmFeedback(
    @CurrentUser() user: RequestUser,
    @Param('articleId') articleId: string,
    @Body() dto: CreateKmFeedbackDto,
  ) {
    return this.svc.createKmFeedback(user, articleId, dto);
  }
}
