// apps/nx-api/src/nx06/web-push/web-push.controller.ts
// NX06 WebPush controller（VAPID 訂閱 + 通知）

import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { SendNotificationDto, SubscribeDto } from './dto/web-push.dto';
import { WebPushService } from './web-push.service';

@Controller('nx06/push')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSADMIN', 'OWNER', 'WAREHOUSE')
export class WebPushController {
  constructor(private readonly svc: WebPushService) {}

  /** PWA 訂閱（外務員 / 倉管組長瀏覽器初次開啟）。 */
  @Post('subscribe')
  subscribe(@CurrentUser() user: RequestUser, @Body() dto: SubscribeDto) {
    return this.svc.subscribe(user, dto);
  }

  /** 取消訂閱（登出 / 移除瀏覽器、走 endpoint 識別）。 */
  @Delete('subscribe')
  unsubscribe(@CurrentUser() user: RequestUser, @Body() body: { endpoint: string }) {
    return this.svc.unsubscribe(user, body.endpoint);
  }

  /** 當前 user 的訂閱列表（debug）。 */
  @Get('mine')
  listMine(@CurrentUser() user: RequestUser) {
    return this.svc.listMine(user);
  }

  /** 發送通知到指定 user（倉管組長使用）。 */
  @Post('send')
  send(@CurrentUser() user: RequestUser, @Body() dto: SendNotificationDto) {
    return this.svc.sendNotification(user, dto);
  }
}
