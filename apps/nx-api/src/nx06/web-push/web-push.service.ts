// apps/nx-api/src/nx06/web-push/web-push.service.ts
// NX06 WebPush service（VAPID 訂閱管理 + 推播發送、env toggle real vs mock）
//
// 對齊：
//   - overview v0.2.0 §4.5（Web Push API + Email fallback、不做客戶推播）
//   - Hank Q-H4：用 `web-push` npm package（業界標準）→ 本軌純 stub、實際 push 留 backlog
//   - Hank Q-H7：POST /subscribe + DELETE /unsubscribe
//
// 業務語意：
//   - subscribe：外務員 PWA 載入後寫入 nx06_push_subscription
//   - unsubscribe：登出 / 移除瀏覽器時將 is_active=false
//   - sendNotification：本軌純 stub（push payload structured 寫 audit、實際 web-push lib 呼叫留 backlog）
//
// 邊界：
//   - VAPID key 生成 + web-push npm package install 留 backlog（Hank Q-H4）
//   - Email fallback 留 backlog（iOS 15 舊版用、本軌 stub）
//   - mock 模式：sendNotification 寫 audit 但不實際 HTTP push

import { Injectable, NotFoundException } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { SendNotificationDto, SubscribeDto } from './dto/web-push.dto';

const WEB_PUSH_ENABLED = process.env.WEB_PUSH_ENABLED === 'true';

@Injectable()
export class WebPushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /** 訂閱：PWA 載入後寫入訂閱（同 endpoint 重複呼叫 → upsert is_active=true）。 */
  async subscribe(user: RequestUser, dto: SubscribeDto) {
    const tenantId = requireTenantId(user);
    const endpoint = dto.endpoint.trim();

    const existing = await this.prisma.nx06PushSubscription.findUnique({
      where: { endpoint },
      select: { id: true, userId: true, tenantId: true },
    });
    if (existing) {
      const updated = await this.prisma.nx06PushSubscription.update({
        where: { id: existing.id },
        data: {
          userId: user.sub,
          tenantId,
          p256dhKey: dto.p256dhKey.trim(),
          authKey: dto.authKey.trim(),
          userAgent: dto.userAgent?.trim() || null,
          isActive: true,
          updatedBy: user.sub,
        },
      });
      return { ok: true, action: 'updated', subscription: updated };
    }

    const created = await this.prisma.nx06PushSubscription.create({
      data: {
        tenantId,
        userId: user.sub,
        endpoint,
        p256dhKey: dto.p256dhKey.trim(),
        authKey: dto.authKey.trim(),
        userAgent: dto.userAgent?.trim() || null,
        isActive: true,
        updatedBy: user.sub,
      },
    });
    return { ok: true, action: 'created', subscription: created };
  }

  /** 取消訂閱（is_active=false、保留紀錄）。 */
  async unsubscribe(user: RequestUser, endpoint: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx06PushSubscription.findFirst({
      where: { endpoint: endpoint.trim(), tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Subscription not found');
    await this.prisma.nx06PushSubscription.update({
      where: { id: existing.id },
      data: { isActive: false, updatedBy: user.sub },
    });
    return { ok: true, action: 'unsubscribed' };
  }

  /** 列出當前 user 的訂閱（debug 用）。 */
  async listMine(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx06PushSubscription.findMany({
      where: { tenantId, userId: user.sub, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { ok: true, count: rows.length, rows };
  }

  /**
   * 發送通知到指定 user（所有 active subscription）。
   * 本軌 stub：寫 audit log + 回 mock response、實際 web-push HTTP call 留 backlog。
   */
  async sendNotification(user: RequestUser, dto: SendNotificationDto) {
    const tenantId = requireTenantId(user);

    const target = await this.prisma.nx01User.findFirst({
      where: { id: dto.userId.trim(), tenantId },
      select: { id: true, userName: true },
    });
    if (!target) throw new NotFoundException('Target user not found');

    const subs = await this.prisma.nx06PushSubscription.findMany({
      where: { tenantId, userId: target.id, isActive: true },
      select: { id: true, endpoint: true },
    });

    // mock 模式：寫 audit、不實際 push
    if (!WEB_PUSH_ENABLED) {
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX06',
        action: 'CREATE',
        entityTable: 'nx06_push_subscription',
        entityId: target.id,
        summary: `[MOCK] Push to ${target.userName}: ${dto.title}`,
        afterData: { title: dto.title, body: dto.body, url: dto.url, targetSubs: subs.length } as object,
      });
      return {
        ok: true,
        mode: 'mock',
        targetUserId: target.id,
        targetUserName: target.userName,
        deliveredToSubs: subs.length,
        title: dto.title,
        body: dto.body,
      };
    }

    // real 模式（後續軌啟動、需 web-push npm + VAPID key）
    throw new Error(
      'Web Push real send not implemented (install web-push package + VAPID key + set WEB_PUSH_ENABLED=true)',
    );
  }
}
