// apps/nx-api/src/nx02/warranty-claim/warranty-claim.controller.ts
// LITE 階段 1 M2-d：保固申請單 controller（含附件 endpoint）。

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { CreateWarrantyClaimAttachmentDto } from './dto/warranty-claim-attachment.dto';
import {
  CreateWarrantyClaimDto,
  ListWarrantyClaimQueryDto,
  RegisterResultDto,
  UpdateWarrantyClaimDto,
} from './dto/warranty-claim.dto';
import { WarrantyClaimAttachmentService } from './warranty-claim-attachment.service';
import { WarrantyClaimService } from './warranty-claim.service';

@Controller('nx02/warranty-claims')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
export class WarrantyClaimController {
  constructor(
    private readonly svc: WarrantyClaimService,
    private readonly attSvc: WarrantyClaimAttachmentService,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListWarrantyClaimQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWarrantyClaimDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateWarrantyClaimDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  /** D → S 送出 */
  @Post(':id/submit')
  submit(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.submit(user, id);
  }

  /** S → R 進入審核（業務聯絡供應商後標記） */
  @Post(':id/start-review')
  startReview(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.startReview(user, id);
  }

  /** R → C 登記審核結果（4 種：NEW/REF/RPR/REJ） */
  @Post(':id/register-result')
  registerResult(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RegisterResultDto,
  ) {
    return this.svc.registerResult(user, id, dto);
  }

  /** V 作廢（DRAFT/SUBMITTED/REVIEWING 都可作廢、COMPLETED 不能） */
  @Delete(':id')
  voidClaim(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.voidClaim(user, id);
  }

  // ===== 附件 endpoints =====

  @Get(':id/attachments')
  listAttachments(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attSvc.list(user, id);
  }

  @Post(':id/attachments')
  createAttachment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateWarrantyClaimAttachmentDto,
  ) {
    return this.attSvc.create(user, id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attSvc.remove(user, id, attachmentId);
  }
}
