// apps/nx-api/src/nx09/sub-tables/sub-tables.controller.ts
// NX09 子表 controller（IMPL-01 4 endpoint + IMPL-02 17 endpoint = 21 endpoint）
//
// 對齊 plan v0.1.0 §2.L2 + Crown Q3=a 4 子表全補

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Nx09ProPlanGuard } from '../../shared/nx09/nx09-pro-plan.guard';

import { Nx09SubTablesService } from './sub-tables.service';

// ===== IMPL-01 既有 DTO =====

class CreateKmTagDto {
  @IsString() @MaxLength(50) name!: string;
  @IsOptional() @IsInt() @Min(0) sortNo?: number;
}

class CreateKmFeedbackDto {
  @IsOptional() @IsBoolean() isHelpful?: boolean;
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}

// ===== IMPL-02 新 DTO =====

class CreateArticleTagDto {
  @IsString() articleId!: string;
  @IsString() tagId!: string;
}

class CreateMeetingActionDto {
  @IsString() meetingId!: string;
  @IsOptional() @IsString() minutesId?: string;
  @IsString() @MaxLength(200) title!: string;
  @IsString() assigneeId!: string;
  @IsDateString() dueDate!: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

class PatchMeetingActionDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsIn(['O', 'I', 'C', 'D', 'X']) status?: string;
  @IsOptional() @IsString() resultDesc?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

class CreateMeetingAttendeeDto {
  @IsString() meetingId!: string;
  @IsString() userId!: string;
  @IsOptional() @IsIn(['P', 'Y', 'L', 'N']) confirmStatus?: string;
}

class PatchMeetingAttendeeDto {
  @IsOptional() @IsIn(['P', 'Y', 'L', 'N']) confirmStatus?: string;
  @IsOptional() @IsBoolean() actualAttended?: boolean;
  @IsOptional() @IsString() @MaxLength(200) absentReason?: string;
}

class CreateMeetingMinutesDto {
  @IsString() meetingId!: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() decisions?: string;
}

class PatchMeetingMinutesDto {
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() decisions?: string;
}

@Controller('nx09')
@UseGuards(JwtAuthGuard, RolesGuard, Nx09ProPlanGuard)
export class Nx09SubTablesController {
  constructor(private readonly svc: Nx09SubTablesService) {}

  // ===== DocumentVersion =====

  @Get('document/:documentId/versions')
  listDocumentVersions(@CurrentUser() user: RequestUser, @Param('documentId') documentId: string) {
    return this.svc.listDocumentVersions(user, documentId);
  }

  // ===== KmTag =====

  @Get('km-tag')
  listKmTags(@CurrentUser() user: RequestUser) {
    return this.svc.listKmTags(user);
  }

  @Post('km-tag')
  @Roles('SYSADMIN', 'HR_ADMIN', 'OWNER')
  createKmTag(@CurrentUser() user: RequestUser, @Body() dto: CreateKmTagDto) {
    return this.svc.createKmTag(user, dto);
  }

  // ===== KmFeedback =====

  @Post('km-article/:articleId/feedback')
  createKmFeedback(
    @CurrentUser() user: RequestUser,
    @Param('articleId') articleId: string,
    @Body() dto: CreateKmFeedbackDto,
  ) {
    return this.svc.createKmFeedback(user, articleId, dto);
  }

  // ===== KmArticleTag（IMPL-02、link 表 attach/detach）=====

  @Get('km-article/:articleId/tags')
  listArticleTags(@CurrentUser() user: RequestUser, @Param('articleId') articleId: string) {
    return this.svc.listArticleTags(user, articleId);
  }

  @Post('km-article-tag')
  @Roles('SYSADMIN', 'HR_ADMIN', 'OWNER')
  createArticleTag(@CurrentUser() user: RequestUser, @Body() dto: CreateArticleTagDto) {
    return this.svc.createArticleTag(user, dto);
  }

  @Delete('km-article-tag/:id')
  @Roles('SYSADMIN', 'HR_ADMIN', 'OWNER')
  deleteArticleTag(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.deleteArticleTag(user, id);
  }

  // ===== MeetingAction（5 CRUD）=====

  @Get('meeting/:meetingId/actions')
  listMeetingActions(@CurrentUser() user: RequestUser, @Param('meetingId') meetingId: string) {
    return this.svc.listMeetingActions(user, meetingId);
  }

  @Get('meeting-action/:id')
  getMeetingAction(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getMeetingAction(user, id);
  }

  @Post('meeting-action')
  createMeetingAction(@CurrentUser() user: RequestUser, @Body() dto: CreateMeetingActionDto) {
    return this.svc.createMeetingAction(user, dto);
  }

  @Patch('meeting-action/:id')
  patchMeetingAction(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PatchMeetingActionDto,
  ) {
    return this.svc.patchMeetingAction(user, id, dto);
  }

  @Delete('meeting-action/:id')
  deleteMeetingAction(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.deleteMeetingAction(user, id);
  }

  // ===== MeetingAttendee（4 CRUD）=====

  @Get('meeting/:meetingId/attendees')
  listMeetingAttendees(@CurrentUser() user: RequestUser, @Param('meetingId') meetingId: string) {
    return this.svc.listMeetingAttendees(user, meetingId);
  }

  @Post('meeting-attendee')
  createMeetingAttendee(@CurrentUser() user: RequestUser, @Body() dto: CreateMeetingAttendeeDto) {
    return this.svc.createMeetingAttendee(user, dto);
  }

  @Patch('meeting-attendee/:id')
  patchMeetingAttendee(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PatchMeetingAttendeeDto,
  ) {
    return this.svc.patchMeetingAttendee(user, id, dto);
  }

  @Delete('meeting-attendee/:id')
  deleteMeetingAttendee(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.deleteMeetingAttendee(user, id);
  }

  // ===== MeetingMinutes（5 CRUD、每會議 unique 一筆）=====

  @Get('meeting/:meetingId/minutes')
  listMeetingMinutes(@CurrentUser() user: RequestUser, @Param('meetingId') meetingId: string) {
    return this.svc.listMeetingMinutes(user, meetingId);
  }

  @Get('meeting-minutes/:id')
  getMeetingMinutes(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getMeetingMinutes(user, id);
  }

  @Post('meeting-minutes')
  createMeetingMinutes(@CurrentUser() user: RequestUser, @Body() dto: CreateMeetingMinutesDto) {
    return this.svc.createMeetingMinutes(user, dto);
  }

  @Patch('meeting-minutes/:id')
  patchMeetingMinutes(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PatchMeetingMinutesDto,
  ) {
    return this.svc.patchMeetingMinutes(user, id, dto);
  }

  @Delete('meeting-minutes/:id')
  deleteMeetingMinutes(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.deleteMeetingMinutes(user, id);
  }
}
