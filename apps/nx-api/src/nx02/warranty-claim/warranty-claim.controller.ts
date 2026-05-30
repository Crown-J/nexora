// apps/nx-api/src/nx02/warranty-claim/warranty-claim.controller.ts
// LITE 階段 1 M2-d：保固申請單 controller（含附件 endpoint）。

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Permission } from '../../shared/decorators/permission.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
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
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SYSADMIN', 'OWNER', 'PURCHASING', 'SALES')
export class WarrantyClaimController {
  constructor(
    private readonly svc: WarrantyClaimService,
    private readonly attSvc: WarrantyClaimAttachmentService,
  ) {}

  @Get()
  @Permission('purchase.warranty-claim.list')
  list(@CurrentUser() user: RequestUser, @Query() q: ListWarrantyClaimQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @Permission('purchase.warranty-claim.view')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  @Post()
  @Permission('purchase.warranty-claim.create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWarrantyClaimDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Permission('purchase.warranty-claim.edit')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateWarrantyClaimDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Post(':id/submit')
  @Permission('purchase.warranty-claim.edit')
  submit(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.submit(user, id);
  }

  @Post(':id/start-review')
  @Permission('purchase.warranty-claim.edit')
  startReview(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.startReview(user, id);
  }

  /// 4 種結果登記（NEW/REF/RPR/REJ）→ 對應 v1.2 §5.5 處理結果、需 approve 權限
  @Post(':id/register-result')
  @Permission('purchase.warranty-claim.approve')
  registerResult(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RegisterResultDto,
  ) {
    return this.svc.registerResult(user, id, dto);
  }

  @Delete(':id')
  @Permission('purchase.warranty-claim.delete')
  voidClaim(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.voidClaim(user, id);
  }

  @Get(':id/attachments')
  @Permission('purchase.warranty-claim.view')
  listAttachments(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attSvc.list(user, id);
  }

  @Post(':id/attachments')
  @Permission('purchase.warranty-claim.edit')
  createAttachment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateWarrantyClaimAttachmentDto,
  ) {
    return this.attSvc.create(user, id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @Permission('purchase.warranty-claim.edit')
  removeAttachment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attSvc.remove(user, id, attachmentId);
  }
}
