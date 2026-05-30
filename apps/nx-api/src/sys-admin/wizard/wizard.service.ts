// apps/nx-api/src/sys-admin/wizard/wizard.service.ts
// v1.2 對齊軌 C：精靈狀態 service（負責人 / 員工皆可呼叫）
//
// - 匯入精靈：tenant 層級、import_wizard_completed_at NULL=未完成
// - 設定精靈：user × page_key、每頁第一次跳

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

@Injectable()
export class WizardService {
  constructor(private readonly prisma: PrismaService) {}

  /// 取當前 user 的精靈狀態
  async getWizardStatus(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const tenant = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { importWizardCompletedAt: true },
    });
    const seenPages = await this.prisma.nx01UserPageGuide.findMany({
      where: { userId: user.sub },
      select: { pageKey: true, seenAt: true },
    });
    return {
      importWizardCompleted: !!tenant?.importWizardCompletedAt,
      importWizardCompletedAt: tenant?.importWizardCompletedAt ?? null,
      seenPages: seenPages.map((p) => ({ pageKey: p.pageKey, seenAt: p.seenAt })),
    };
  }

  /// 標記匯入精靈完成（v1.2 §3.2 完成 / 全部略過、都標完成）
  async markImportWizardCompleted(user: RequestUser) {
    const tenantId = requireTenantId(user);
    await this.prisma.nx99Tenant.update({
      where: { id: tenantId },
      data: { importWizardCompletedAt: new Date(), updatedBy: user.sub },
    });
    return { ok: true };
  }

  /// 重置匯入精靈狀態（負責人「主畫面右上精靈引導按鈕」重開）
  async resetImportWizard(user: RequestUser) {
    const tenantId = requireTenantId(user);
    await this.prisma.nx99Tenant.update({
      where: { id: tenantId },
      data: { importWizardCompletedAt: null, updatedBy: user.sub },
    });
    return { ok: true };
  }

  /// 標記設定精靈某頁已看完（v1.2 §3.3）
  async markPageSeen(user: RequestUser, pageKey: string) {
    const tenantId = requireTenantId(user);
    await this.prisma.nx01UserPageGuide.upsert({
      where: { userId_pageKey: { userId: user.sub, pageKey } },
      create: { tenantId, userId: user.sub, pageKey },
      update: { seenAt: new Date() },
    });
    return { ok: true };
  }

  /// 重置當前 user 的所有設定精靈記憶（v1.2 §12.5「重置我的設定精靈」）
  async resetMyPageGuides(user: RequestUser) {
    await this.prisma.nx01UserPageGuide.deleteMany({
      where: { userId: user.sub },
    });
    return { ok: true };
  }

  /// 列出匯入歷史（給匯入精靈完成頁的「匯入結果」用）
  async listImportHistory(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const batches = await this.prisma.nx01ImportBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        importType: true,
        fileName: true,
        totalRows: true,
        successRows: true,
        failedRows: true,
        status: true,
        createdAt: true,
        importedAt: true,
      },
    });
    return batches;
  }
}
