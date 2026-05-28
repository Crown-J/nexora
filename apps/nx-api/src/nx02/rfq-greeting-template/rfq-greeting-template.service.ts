// apps/nx-api/src/nx02/rfq-greeting-template/rfq-greeting-template.service.ts
// LITE 階段 1 M2-e：詢價客套話設定 service（每租戶 1:1）。
//
// 業務語意（Crown 拍板）：
//   - 每租戶一套客套話設定（@@unique([tenantId])）
//   - 沒有時自動建 default（含 default greeting + closing）
//   - 業務人員可在「公司設定」頁修改

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { UpdateRfqGreetingTemplateDto } from './dto/rfq-greeting-template.dto';

const SEL = {
  id: true,
  tenantId: true,
  greetingContent: true,
  closingContent: true,
  isActive: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class RfqGreetingTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 取得（或自動建 default）租戶客套話設定。
   * schema default 已含 '您好、想詢價以下零件：' 跟 '麻煩報價謝謝'、初次建立直接用。
   */
  async getOrCreate(user: RequestUser) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02RfqGreetingTemplate.findFirst({
      where: { tenantId },
      select: SEL,
    });
    if (existing) return existing;
    return this.prisma.nx02RfqGreetingTemplate.create({
      data: {
        tenantId,
        // 不傳 greetingContent/closingContent、走 schema default
        isActive: true,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
  }

  async update(user: RequestUser, dto: UpdateRfqGreetingTemplateDto) {
    const tenantId = requireTenantId(user);
    // 走 getOrCreate 確保 row 存在
    const existing = await this.getOrCreate(user);
    const row = await this.prisma.nx02RfqGreetingTemplate.update({
      where: { id: existing.id },
      data: {
        ...(dto.greetingContent !== undefined ? { greetingContent: dto.greetingContent } : {}),
        ...(dto.closingContent !== undefined ? { closingContent: dto.closingContent } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    return row;
  }
}
