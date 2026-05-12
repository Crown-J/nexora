// apps/nx-api/src/nx01/bulletin/bulletin.controller.ts
// NX01-08 公告系統 v1.0 controller（軌 3 commit 3）
//
// Access control（對齊 A042 closure 範式）：
//   - SYSADMIN / OWNER 全通行（透過 RolesGuard）
//   - HR：寫入動作（建公告 / 發布 / 撤回 / 附件 / 已讀統計）
//   - 一般 user：list / getById / markRead / list attachments 可呼叫（讀對自己可見的公告）

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { BulletinService } from './bulletin.service';
import {
  AttachmentInputDto,
  CreateBulletinDto,
  ListBulletinQueryDto,
  MarkReadDto,
  UpdateBulletinDto,
} from './dto/bulletin.dto';

@Controller('nx01/bulletins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulletinController {
  constructor(private readonly svc: BulletinService) {}

  // List / GetById（任意登入 user 可讀）
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() q: ListBulletinQueryDto) {
    return this.svc.list(user, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getById(user, id);
  }

  // Create / Update / SoftDelete（OWNER / HR / SYSADMIN）
  @Post()
  @Roles('SYSADMIN', 'OWNER', 'HR')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBulletinDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBulletinDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.softDelete(user, id);
  }

  // Status 流轉
  @Post(':id/publish')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  publish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.publish(user, id);
  }

  @Post(':id/withdraw')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  withdraw(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.withdraw(user, id);
  }

  // 對象識別 + 已讀
  @Get(':id/audience')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  async resolveAudience(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const userIds = await this.svc.resolveAudienceUserIds(user, id);
    return { bulletinId: id, userIds, count: userIds.length };
  }

  @Post(':id/read')
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.svc.markRead(user, id, dto);
  }

  @Get(':id/read-stats')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  getReadStats(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.getReadStats(user, id);
  }

  // 附件 CRUD
  @Get(':id/attachments')
  listAttachments(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.listAttachments(user, id);
  }

  @Post(':id/attachments')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  addAttachment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AttachmentInputDto,
  ) {
    return this.svc.addAttachment(user, id, dto);
  }

  @Delete('attachments/:attachmentId')
  @Roles('SYSADMIN', 'OWNER', 'HR')
  removeAttachment(
    @CurrentUser() user: RequestUser,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.svc.removeAttachment(user, attachmentId);
  }

  /**
   * 下載附件、return base64 + metadata（避開 @Res 對 @types/express 的依賴）。
   * 軌 3 範式：客戶端拿 base64 後轉 binary、未來可改用 StreamableFile 升級。
   */
  @Get('attachments/:attachmentId/download')
  async downloadAttachment(
    @CurrentUser() user: RequestUser,
    @Param('attachmentId') attachmentId: string,
  ) {
    const { buffer, mimeType, origFilename } = await this.svc.downloadAttachment(
      user,
      attachmentId,
    );
    return {
      base64Content: buffer.toString('base64'),
      mimeType,
      origFilename,
      size: buffer.length,
    };
  }
}
