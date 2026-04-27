// apps/nx-api/src/nx04/so/translator/transfer-source-resolver.ts
// D4 翻譯器 — 校驗每個 line item 的 transferSourceRef 對應的目標真實存在。
// 邏輯（D4-impl §3.3）：
//   type='S' → ref 應為 null
//   type='T' → ref 必為 nx01_warehouse.id（同租戶 + active）
//   type='G' → ref 必為 nx01_partner.id（partner_type='S' 同行）
//   type='B' → ref 應為 null（CO 由 RefreshmentDocCreator 內部建立）

import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { TranslateLineItemDto } from './dto/translate-so.dto';
import { TranslatorInvalidInputError } from './translator-error';

@Injectable()
export class TransferSourceResolver {
  /**
   * 對所有 line item 校驗來源 ref。失敗即拋 TranslatorInvalidInputError。
   * 成功不回傳值（純校驗），失敗時 ref 帶在 error 訊息內方便業務修正。
   */
  async resolveAll(
    tx: Prisma.TransactionClient,
    tenantId: string,
    items: TranslateLineItemDto[],
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await this.resolveOne(tx, tenantId, item, i);
    }
  }

  private async resolveOne(
    tx: Prisma.TransactionClient,
    tenantId: string,
    item: TranslateLineItemDto,
    lineIdx: number,
  ): Promise<void> {
    const ref = item.transferSourceRef?.trim() || null;

    switch (item.transferSourceType) {
      case 'S':
      case 'B':
        if (ref) {
          throw new TranslatorInvalidInputError(
            'TRANSFER_SOURCE_REF_TYPE_MISMATCH',
            `第 ${lineIdx + 1} 項：來源類型「${item.transferSourceType}」不應帶 transferSourceRef`,
          );
        }
        return;

      case 'T':
        if (!ref) {
          throw new TranslatorInvalidInputError(
            'TRANSFER_SOURCE_REF_NOT_FOUND',
            `第 ${lineIdx + 1} 項：自倉調撥必須指定來源倉庫`,
          );
        }
        {
          const wh = await tx.nx01Warehouse.findFirst({
            where: { id: ref, tenantId, isActive: true },
            select: { id: true },
          });
          if (!wh) {
            throw new TranslatorInvalidInputError(
              'TRANSFER_SOURCE_REF_NOT_FOUND',
              `第 ${lineIdx + 1} 項：補貨來源倉庫 '${ref}' 不存在或停用`,
            );
          }
        }
        return;

      case 'G':
        if (!ref) {
          throw new TranslatorInvalidInputError(
            'TRANSFER_SOURCE_REF_NOT_FOUND',
            `第 ${lineIdx + 1} 項：同行調貨必須指定同行 partner`,
          );
        }
        {
          const partner = await tx.nx01Partner.findFirst({
            where: {
              id: ref,
              tenantId,
              isActive: true,
              partnerType: 'S',
            },
            select: { id: true },
          });
          if (!partner) {
            throw new TranslatorInvalidInputError(
              'TRANSFER_SOURCE_REF_NOT_FOUND',
              `第 ${lineIdx + 1} 項：同行 '${ref}' 不存在或不是有效的同行供應商`,
            );
          }
        }
        return;
    }
  }
}
