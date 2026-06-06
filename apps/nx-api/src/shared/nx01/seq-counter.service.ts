// apps/nx-api/src/shared/nx01/seq-counter.service.ts
/**
 * W3 [3-1] 2026-06-06：租戶內編號流水共用服務（NX-MANUAL-02 v2.0 §3.1）
 *
 * 用途：
 *   - 員工編號 'Y' + 4 碼（Y0001~Y9999、scope='EMPLOYEE'、即 userAccount = 登入帳號）
 *   - 往來對象編號 類型碼 + 4 碼（scope='PARTNER_C' / PARTNER_O / PARTNER_S / PARTNER_V / PARTNER_T / PARTNER_B / PARTNER_L）
 *
 * 取號方式（race-safe）：
 *   upsert + atomic increment、底層走 PostgreSQL row-level lock。
 *
 * 手動覆寫：
 *   caller 傳號時可呼叫 reserveIfHigher() 把 next_no 推到該值 + 1、防衝突。
 *
 * 上限：
 *   4 碼上限 9999。超過拋 ConflictException、後續軌再評估擴位（5 / 6 碼）。
 */

import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

export type SeqScope =
  | 'EMPLOYEE'
  | 'PARTNER_C'
  | 'PARTNER_O'
  | 'PARTNER_S'
  | 'PARTNER_V'
  | 'PARTNER_T'
  | 'PARTNER_B'
  | 'PARTNER_L';

/** transaction 內可傳的 client（PrismaService 或 Prisma.TransactionClient）*/
type TxLike = PrismaService | Prisma.TransactionClient;

const MAX_NO = 9999;

@Injectable()
export class SeqCounterService {
  constructor(private readonly prisma: PrismaService) {}

  /** 原子取下一個流水號（race-safe）；本次取到的整數編號（由 caller LPAD format）*/
  async next(tenantId: string, scope: SeqScope, tx?: TxLike): Promise<number> {
    const db = (tx ?? this.prisma) as PrismaClient;
    const row = await db.nx01SeqCounter.upsert({
      where: { tenantId_scope: { tenantId, scope } },
      // 首次：next_no=2、本次取到 1（首號）
      create: { tenantId, scope, nextNo: 2 },
      // 既有：next_no += 1、本次取到 = updated next_no - 1
      update: { nextNo: { increment: 1 } },
      select: { nextNo: true },
    });
    const taken = row.nextNo - 1;
    if (taken > MAX_NO) {
      throw new ConflictException(
        `編號流水達 4 碼上限（${MAX_NO}）、scope=${scope}、需擴位處理`,
      );
    }
    return taken;
  }

  /**
   * 手動覆寫防衝突：若 caller 填的編號數字 ≥ next_no、把 next_no 推到 n+1。
   * 例：next_no=5、user 手動填 'Y0010' → reserveIfHigher(10) → next_no=11。
   * 注意：直接 set（非 max(current, n+1)）；race condition 下兩 caller 同時 reserve
   * 不同 n 可能相互覆蓋、但 DB unique 仍守住「同 code 不會重複」。
   */
  async reserveIfHigher(
    tenantId: string,
    scope: SeqScope,
    n: number,
    tx?: TxLike,
  ): Promise<void> {
    if (!Number.isFinite(n) || n <= 0 || n > MAX_NO) return;
    const db = (tx ?? this.prisma) as PrismaClient;
    const existing = await db.nx01SeqCounter.findUnique({
      where: { tenantId_scope: { tenantId, scope } },
      select: { nextNo: true },
    });
    const targetNext = n + 1;
    if (existing && existing.nextNo >= targetNext) return; // 已比手動值大、不退
    await db.nx01SeqCounter.upsert({
      where: { tenantId_scope: { tenantId, scope } },
      create: { tenantId, scope, nextNo: targetNext },
      update: { nextNo: targetNext },
    });
  }

  /** 員工編號 'Y' + 4 碼（Crown 拍板 employeeNo = userAccount）*/
  async nextEmployeeNo(tenantId: string, tx?: TxLike): Promise<string> {
    const no = await this.next(tenantId, 'EMPLOYEE', tx);
    return `Y${String(no).padStart(4, '0')}`;
  }

  /** 往來對象編號 類型碼 + 4 碼（六分類 + 散客 L）*/
  async nextPartnerCode(
    tenantId: string,
    partnerType: string,
    tx?: TxLike,
  ): Promise<string> {
    const upperType = partnerType.toUpperCase();
    const scope = `PARTNER_${upperType}` as SeqScope;
    const no = await this.next(tenantId, scope, tx);
    return `${upperType}${String(no).padStart(4, '0')}`;
  }

  /** Y0001 / C0001 / O0042 ... 解析數字部分；非標準格式回 null */
  static parseSerialNumber(code: string, expectedPrefix: string): number | null {
    const re = new RegExp(`^${expectedPrefix}(\\d{4})$`);
    const m = code.trim().match(re);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 && n <= MAX_NO ? n : null;
  }
}
