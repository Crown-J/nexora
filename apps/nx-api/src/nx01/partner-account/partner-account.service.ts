// apps/nx-api/src/nx01/partner-account/partner-account.service.ts
// 往來帳戶開戶/停啟用（帳戶閘門規格 v1.3 Step 3a、2026-07-21 執行長拍板）
//   R 收款帳戶：統編必填（8 碼檢核＋外籍後門）、提供統編則回寫 partner.taxId
//   P 進貨付款帳戶：銀行名稱/帳號/戶名必填、開戶與異動皆需採購域權限（貨源隔離）
//   T 調貨付款帳戶：輕量免銀行、僅限同行 O 或 canTransferStock 對象
//   重開停用戶＝更新內容＋轉啟用；已啟用重開 → 400

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { assertPurchaseDomainAccess } from '../../shared/nx01/partner-account-gate';
import { isValidTaiwanTaxId } from '../../shared/nx01/taiwan-tax-id';

import type { OpenPartnerAccountDto, PatchPartnerAccountDto } from './dto/partner-account.dto';

const ACCT_SEL = {
  id: true,
  partnerId: true,
  direction: true,
  status: true,
  bankName: true,
  bankCode: true,
  bankAccountNo: true,
  accountHolder: true,
  needsBackfill: true,
  openedAt: true,
  openedBy: true,
  updatedAt: true,
} as const;

@Injectable()
export class PartnerAccountService {
  constructor(private readonly prisma: PrismaService) {}

  /** 某對象的帳戶清單（主檔帳戶分區資料源） */
  async listByPartner(user: RequestUser, partnerId: string) {
    const tenantId = requireTenantId(user);
    const partner = await this.prisma.nx01Partner.findFirst({
      where: { id: partnerId, tenantId },
      select: { id: true, taxId: true, isCashCustomer: true },
    });
    if (!partner) throw new NotFoundException('partner not found');
    const rows = await this.prisma.nx01PartnerAccount.findMany({
      where: { tenantId, partnerId },
      orderBy: { direction: 'asc' },
      select: ACCT_SEL,
    });
    return { partnerId, taxId: partner.taxId, isCashCustomer: partner.isCashCustomer, accounts: rows };
  }

  /** 開戶（含一鍵開戶）；已停用同方向戶＝重啟並更新內容 */
  async open(user: RequestUser, partnerId: string, dto: OpenPartnerAccountDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.nx01Partner.findFirst({
        where: { id: partnerId, tenantId, isActive: true },
        select: { id: true, partnerType: true, canTransferStock: true, taxId: true },
      });
      if (!partner) throw new BadRequestException('partner not found or inactive');

      const bank: Pick<Prisma.Nx01PartnerAccountUncheckedCreateInput, 'bankName' | 'bankCode' | 'bankAccountNo' | 'accountHolder'> = {
        bankName: dto.bankName?.trim() || null,
        bankCode: dto.bankCode?.trim() || null,
        bankAccountNo: dto.bankAccountNo?.trim() || null,
        accountHolder: dto.accountHolder?.trim() || null,
      };

      if (dto.direction === 'R') {
        // 統編必填（拍板 #4）：dto 提供或 partner 既有；台灣 8 碼檢核＋外籍後門（五-6）
        const taxId = dto.taxId?.trim() || partner.taxId?.trim() || '';
        if (!taxId) {
          throw new BadRequestException('[PA-005] 開收款帳戶需統編——無統編請改標記現金客戶');
        }
        if (!dto.foreignTaxId && !isValidTaiwanTaxId(taxId)) {
          throw new BadRequestException('[PA-006] 統編格式不符（台灣 8 碼檢核）——外籍/特殊統編請勾選跳過檢核');
        }
        if (dto.taxId?.trim() && dto.taxId.trim() !== partner.taxId) {
          await tx.nx01Partner.update({
            where: { id: partner.id },
            data: { taxId: dto.taxId.trim(), updatedBy: user.sub },
          });
        }
      } else if (dto.direction === 'P') {
        // 貨源隔離：P 戶開戶＝採購域操作
        await assertPurchaseDomainAccess(tx, user.sub);
        if (!bank.bankName || !bank.bankAccountNo || !bank.accountHolder) {
          throw new BadRequestException('[PA-007] 開進貨付款帳戶需銀行名稱／帳號／戶名（匯款對象）');
        }
      } else {
        // T 調貨戶：僅限同行身分（規格四：身分判斷維持）
        if (partner.partnerType !== 'O' && !partner.canTransferStock) {
          throw new BadRequestException('[PA-008] 調貨付款帳戶僅限同行（或可調貨標記）對象');
        }
      }

      const existing = await tx.nx01PartnerAccount.findFirst({
        where: { tenantId, partnerId, direction: dto.direction },
        select: { id: true, status: true },
      });
      if (existing?.status === 'A') {
        throw new BadRequestException('此方向帳戶已開立且啟用中');
      }
      if (existing) {
        return tx.nx01PartnerAccount.update({
          where: { id: existing.id },
          data: { status: 'A', needsBackfill: false, ...bank, openedAt: new Date(), openedBy: user.sub, updatedBy: user.sub },
          select: ACCT_SEL,
        });
      }
      return tx.nx01PartnerAccount.create({
        data: {
          tenantId,
          partnerId,
          direction: dto.direction,
          status: 'A',
          needsBackfill: false,
          ...bank,
          openedBy: user.sub,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: ACCT_SEL,
      });
    });
  }

  /** 停啟用／銀行資訊更新；P 戶異動需採購域權限 */
  async patch(user: RequestUser, accountId: string, dto: PatchPartnerAccountDto) {
    const tenantId = requireTenantId(user);
    const acct = await this.prisma.nx01PartnerAccount.findFirst({
      where: { id: accountId, tenantId },
      select: { id: true, direction: true },
    });
    if (!acct) throw new NotFoundException('account not found');
    if (acct.direction === 'P') {
      await assertPurchaseDomainAccess(this.prisma, user.sub);
    }
    const bankTouched =
      dto.bankName !== undefined || dto.bankCode !== undefined || dto.bankAccountNo !== undefined || dto.accountHolder !== undefined;
    return this.prisma.nx01PartnerAccount.update({
      where: { id: acct.id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName.trim() || null } : {}),
        ...(dto.bankCode !== undefined ? { bankCode: dto.bankCode.trim() || null } : {}),
        ...(dto.bankAccountNo !== undefined ? { bankAccountNo: dto.bankAccountNo.trim() || null } : {}),
        ...(dto.accountHolder !== undefined ? { accountHolder: dto.accountHolder.trim() || null } : {}),
        // 補上銀行資訊＝待補件解除
        ...(bankTouched ? { needsBackfill: false } : {}),
        updatedBy: user.sub,
      },
      select: ACCT_SEL,
    });
  }
}
