// apps/nx-api/src/shared/nx05/nx05-post-by-rule.ts
// ⭐⭐ 總帳脊椎 B2：過帳共用能力（2026-08-01）
//
// 規格：docs/專案/規格書/核心/NEXORA-總帳脊椎-schema規格-B階段.md v0.2 §4
//
// 上位原則（0724 討論已定）：
//   ① 營運事件是因、會計分錄是果，同一筆交易「原子產生」——傳票不是人工打的
//   ② 過帳後不可逆，要修正只能走紅字沖銷（本檔只管產生；沖銷見 nx05-reverse-voucher.ts）
//   ③ 因果單向：⛔ 本檔一行都不得寫任何營運表
//   ⭐ 過帳＝共用能力（之於總帳＝撿包送之於庫存）：只有這一支，各劇本在自己的過帳點叫用
//
// 呼叫端只需要給「交易代號 ＋ 金額 ＋ 維度」，科目與借貸方向由 nx05_posting_rule 決定。
// ⚠ 呼叫端不得自己決定科目——那會讓 67 個交易代號的規格失去意義。

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import { allocNx05DocNo } from './nx05-doc-no';

type Dec = PrismaNs.Decimal;
type DecLike = Dec | number | string;

/**
 * 金額基礎 → 實際金額。key 對應 nx05_posting_rule_line.amount_basis。
 * 只要規則有用到的基礎都要給，否則該行會被判定「缺金額」。
 */
export type PostingAmounts = Partial<Record<string, DecLike>>;

export interface PostingDimensions {
  departmentId?: string | null;
  partnerId?: string | null;
  employeeUserId?: string | null;
  bankAccountId?: string | null;
  taxCodeId?: string | null;
}

/** 依分錄行號覆寫。行號＝nx05_posting_rule_line.line_no。 */
export interface PostingLineOverride {
  /** 樣板科目（6xxx／15x2／1102-1111…）在過帳當下解析成哪一個實際科目代碼。 */
  accountCode?: string;
  /** 直接指定本行金額（不走 amount_basis 查表）。 */
  amount?: DecLike;
  /** 該行不出現（僅 is_optional=true 的行可跳過）。 */
  skip?: boolean;
  /** 借貸二選一的行（例：FX 兌換差額，賺走貸方、賠走借方）。 */
  drCr?: 'D' | 'C';
  dimensions?: PostingDimensions;
  summary?: string;
  sourceDocItemId?: string;
}

export interface PostByRuleInput {
  tenantId: string;
  actorUserId: string;
  /** 交易代號，例 'SO-CA'、'PO-IMP'、'FA-DEP'。 */
  ruleCode: string;
  /** 傳票日期＝營運事件發生日（決定落在哪一個會計期間）。 */
  voucherDate: Date;
  /** 機構碼（傳票號第三段）。預設 HQ0。 */
  orgCode?: string;
  source?: { docType: string; docId?: string; docNo?: string };
  origin?: 'AUTO' | 'MANUAL' | 'BATCH';
  summary?: string;
  amounts: PostingAmounts;
  /** 單頭層維度預設；個別行可用 lineOverrides 覆寫。 */
  dimensions?: PostingDimensions;
  lineOverrides?: Record<number, PostingLineOverride>;
  /** 預設 true＝直接 POSTED。false 則留 DRAFT（人工傳票流程用）。 */
  autoPost?: boolean;
}

export interface PostByRuleResult {
  voucherId: string;
  docNo: string;
  lineCount: number;
  totalDebit: Dec;
  totalCredit: Dec;
  status: 'DRAFT' | 'POSTED';
}

const D0 = new PrismaNs.Decimal(0);

function toDec(v: DecLike): Dec {
  return v instanceof PrismaNs.Decimal ? v : new PrismaNs.Decimal(v);
}

/**
 * 🔴 關帳硬閘：傳票只能寫進「開帳中」的會計期間。
 * ⚠ 這與 nx05-period-lock.ts 的 401 申報期鎖定是兩件事——
 *    那個管營業稅申報（雙月一期、nx05_closing），這個管帳務月期（nx05_fiscal_period）。
 *    亞羅自己也寫了「營業稅每兩個月申報，與會計期間的月結是兩回事，不要混」。
 */
export async function resolveOpenPeriod(
  tx: Prisma.TransactionClient,
  tenantId: string,
  voucherDate: Date,
): Promise<{ id: string; code: string }> {
  const period = await tx.nx05FiscalPeriod.findFirst({
    where: {
      tenantId,
      startDate: { lte: voucherDate },
      endDate: { gte: voucherDate },
    },
    select: { id: true, code: true, status: true },
  });

  const ymd = voucherDate.toISOString().slice(0, 10);
  if (!period) {
    throw new BadRequestException(
      `過帳失敗：找不到 ${ymd} 所屬的會計期間，請先建立該期間`,
    );
  }
  if (period.status === 'CLOSED') {
    throw new BadRequestException(
      `過帳失敗：會計期間 ${period.code} 已關帳，不得新增傳票。要調整請在下一期做調整分錄`,
    );
  }
  if (period.status !== 'OPEN') {
    throw new BadRequestException(
      `過帳失敗：會計期間 ${period.code} 尚未開放（狀態 ${period.status}）`,
    );
  }
  return { id: period.id, code: period.code };
}

interface BuiltLine {
  lineNo: number;
  drCr: string;
  accountCodeId: string;
  amount: Dec;
  departmentId: string | null;
  partnerId: string | null;
  employeeUserId: string | null;
  bankAccountId: string | null;
  taxCodeId: string | null;
  summary: string | null;
  postingRuleLineId: string;
  sourceDocItemId: string | null;
}

/**
 * ⭐ 依過帳規則產生傳票與分錄。整支在呼叫端的 transaction 內執行。
 *
 * 會處理 A 階段留下的三種特殊形狀（實測 182 條樣板裡都有）：
 *   · 樣板科目（account_pattern，如 6xxx／15x2）→ 必須由 lineOverrides[n].accountCode 指定
 *   · 條件性行（is_optional）→ 沒給金額就跳過，不報錯
 *   · 借貸二選一（FX 兌換差額）→ 由 lineOverrides[n].drCr 指定方向
 */
export async function postByRule(
  tx: Prisma.TransactionClient,
  input: PostByRuleInput,
): Promise<PostByRuleResult> {
  const { tenantId, actorUserId, ruleCode } = input;
  const overrides = input.lineOverrides ?? {};
  const headDim = input.dimensions ?? {};

  // ── 1) 規則 ──
  const rule = await tx.nx05PostingRule.findFirst({
    where: { tenantId, code: ruleCode },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isActive: true,
      rev_Nx05PostingRuleLine_ruleId: {
        orderBy: { lineNo: 'asc' },
        select: {
          id: true,
          lineNo: true,
          drCr: true,
          accountCodeId: true,
          accountPattern: true,
          amountBasis: true,
          requireDept: true,
          requirePartner: true,
          partnerScope: true,
          requireBankAccount: true,
          isOptional: true,
          condition: true,
        },
      },
    },
  });
  if (!rule)
    throw new BadRequestException(`過帳失敗：找不到交易代號 ${ruleCode}`);
  const ruleLines = rule.rev_Nx05PostingRuleLine_ruleId;
  // ⚠ 「沒有分錄行」要先於「未啟用」判斷：有些代號是**依設計**就不產生分錄
  //    （例 FA-TRF 資產移轉＝同庫存層的內部位移，只改主檔維度、不動總帳），
  //    對呼叫端講「本代號依設計不產生分錄」遠比「未啟用」有用。
  if (ruleLines.length === 0) {
    throw new BadRequestException(
      `過帳失敗：交易代號 ${ruleCode}（${rule.name}）沒有分錄行——本代號依設計不產生分錄，不應被呼叫過帳`,
    );
  }
  if (!rule.isActive || rule.status === 'INACTIVE') {
    throw new BadRequestException(
      `過帳失敗：交易代號 ${ruleCode}（${rule.name}）未啟用`,
    );
  }
  if (rule.status === 'PENDING') {
    throw new BadRequestException(
      `過帳失敗：交易代號 ${ruleCode}（${rule.name}）狀態為待決，需先定案會計政策才能啟用`,
    );
  }

  // ── 2) 關帳硬閘 ──
  const period = await resolveOpenPeriod(tx, tenantId, input.voucherDate);

  // ── 3) 逐行解析 ──
  // 樣板科目要查代碼 → 先把本次會用到的科目代碼一次撈出來
  const wantedCodes = Object.values(overrides)
    .map((o) => o.accountCode)
    .filter((c): c is string => !!c);
  const byCode = new Map<
    string,
    { id: string; isPostable: boolean; isActive: boolean }
  >();
  if (wantedCodes.length > 0) {
    const rows = await tx.nx05AccountCode.findMany({
      where: { tenantId, code: { in: wantedCodes } },
      select: { id: true, code: true, isPostable: true, isActive: true },
    });
    for (const r of rows) byCode.set(r.code, r);
  }

  const built: BuiltLine[] = [];
  for (const rl of ruleLines) {
    const ov = overrides[rl.lineNo] ?? {};
    const where = `${ruleCode} 第 ${rl.lineNo} 行`;

    if (ov.skip) {
      if (!rl.isOptional) {
        throw new BadRequestException(
          `過帳失敗：${where} 不是條件性分錄行，不可略過`,
        );
      }
      continue;
    }

    // 金額
    const raw = ov.amount ?? input.amounts[rl.amountBasis];
    if (raw === undefined || raw === null) {
      if (rl.isOptional) continue;
      throw new BadRequestException(
        `過帳失敗：${where} 缺金額（金額基礎 ${rl.amountBasis}），呼叫端未提供`,
      );
    }
    const amount = toDec(raw);
    if (amount.isNegative()) {
      throw new BadRequestException(
        `過帳失敗：${where} 金額為負（${amount.toString()}）。分錄金額恆為正，方向由借貸表達`,
      );
    }
    if (amount.isZero()) {
      if (rl.isOptional) continue;
      throw new BadRequestException(
        `過帳失敗：${where} 金額為 0，非條件性分錄行不可為 0`,
      );
    }

    // 科目：固定 or 樣板
    let accountCodeId: string;
    if (rl.accountCodeId) {
      accountCodeId = rl.accountCodeId;
    } else {
      if (!ov.accountCode) {
        throw new BadRequestException(
          `過帳失敗：${where} 的科目是樣板 ${rl.accountPattern}，` +
            `必須由呼叫端指定實際科目（lineOverrides[${rl.lineNo}].accountCode）`,
        );
      }
      const acc = byCode.get(ov.accountCode);
      if (!acc)
        throw new BadRequestException(
          `過帳失敗：${where} 指定的科目 ${ov.accountCode} 不存在`,
        );
      if (!acc.isPostable) {
        throw new BadRequestException(
          `過帳失敗：${where} 指定的科目 ${ov.accountCode} 是標題科目、不可記帳`,
        );
      }
      if (!acc.isActive) {
        throw new BadRequestException(
          `過帳失敗：${where} 指定的科目 ${ov.accountCode} 已停用或為預留科目`,
        );
      }
      accountCodeId = acc.id;
    }

    // 維度：行覆寫 > 單頭預設
    const dim = { ...headDim, ...(ov.dimensions ?? {}) };
    if (rl.requireDept && !dim.departmentId) {
      throw new BadRequestException(
        `過帳失敗：${where} 需要部門（成本中心），呼叫端未提供`,
      );
    }
    if (rl.requirePartner) {
      const scope = rl.partnerScope;
      const hasPartner = !!dim.partnerId;
      const hasEmployee = !!dim.employeeUserId;
      const ok =
        scope === 'EMPLOYEE'
          ? hasEmployee
          : scope === 'EITHER'
            ? hasPartner || hasEmployee
            : hasPartner;
      if (!ok) {
        const need =
          scope === 'EMPLOYEE'
            ? '員工'
            : scope === 'EITHER'
              ? '往來對象或員工（二擇一）'
              : '往來對象';
        throw new BadRequestException(
          `過帳失敗：${where} 需要${need}，呼叫端未提供`,
        );
      }
    }
    if (rl.requireBankAccount && !dim.bankAccountId) {
      throw new BadRequestException(
        `過帳失敗：${where} 需要銀行帳戶。⚠ 同科目跨帳戶的分錄（如帳戶間調撥）少了這個維度，` +
          `借貸會同科目同金額、看起來像沒發生任何事`,
      );
    }

    const drCr = ov.drCr ?? rl.drCr;
    if (drCr !== 'D' && drCr !== 'C') {
      throw new BadRequestException(
        `過帳失敗：${where} 借貸方向不合法（${drCr}）`,
      );
    }

    built.push({
      lineNo: rl.lineNo,
      drCr,
      accountCodeId,
      amount,
      departmentId: dim.departmentId ?? null,
      partnerId: dim.partnerId ?? null,
      employeeUserId: dim.employeeUserId ?? null,
      bankAccountId: dim.bankAccountId ?? null,
      taxCodeId: dim.taxCodeId ?? null,
      summary: ov.summary ?? null,
      postingRuleLineId: rl.id,
      sourceDocItemId: ov.sourceDocItemId ?? null,
    });
  }

  if (built.length === 0) {
    throw new BadRequestException(`過帳失敗：${ruleCode} 解析後沒有任何分錄行`);
  }

  // ── 4) 🔴 借貸平衡 ──
  let totalDebit = D0;
  let totalCredit = D0;
  for (const l of built) {
    if (l.drCr === 'D') totalDebit = totalDebit.add(l.amount);
    else totalCredit = totalCredit.add(l.amount);
  }
  if (!totalDebit.equals(totalCredit)) {
    throw new BadRequestException(
      `過帳失敗：${ruleCode} 借貸不平衡——借方 ${totalDebit.toString()} / 貸方 ${totalCredit.toString()}、` +
        `差額 ${totalDebit.sub(totalCredit).toString()}`,
    );
  }
  if (totalDebit.isZero()) {
    throw new BadRequestException(`過帳失敗：${ruleCode} 借貸合計為 0`);
  }

  // ── 5) 建傳票 ──
  const docNo = await allocNx05DocNo(
    tx,
    tenantId,
    'JV',
    input.orgCode ?? 'HQ0',
  );
  const willPost = input.autoPost !== false;

  const voucher = await tx.nx05Voucher.create({
    data: {
      tenantId,
      docNo,
      voucherDate: input.voucherDate,
      fiscalPeriodId: period.id,
      postingRuleId: rule.id,
      sourceDocType: input.source?.docType ?? null,
      sourceDocId: input.source?.docId ?? null,
      sourceDocNo: input.source?.docNo ?? null,
      origin: input.origin ?? 'AUTO',
      summary: input.summary ?? `${rule.code} ${rule.name}`,
      totalDebit,
      totalCredit,
      status: willPost ? 'POSTED' : 'DRAFT',
      postedAt: willPost ? new Date() : null,
      postedBy: willPost ? actorUserId : null,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    select: { id: true },
  });

  await tx.nx05VoucherLine.createMany({
    data: built.map((l) => ({
      tenantId,
      voucherId: voucher.id,
      lineNo: l.lineNo,
      drCr: l.drCr,
      accountCodeId: l.accountCodeId,
      amount: l.amount,
      departmentId: l.departmentId,
      partnerId: l.partnerId,
      employeeUserId: l.employeeUserId,
      bankAccountId: l.bankAccountId,
      taxCodeId: l.taxCodeId,
      summary: l.summary,
      postingRuleLineId: l.postingRuleLineId,
      sourceDocItemId: l.sourceDocItemId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })),
  });

  // ── 6) 科目餘額（只有 POSTED 才動；DRAFT 傳票不進帳）──
  if (willPost) {
    await applyToGlBalance(tx, {
      tenantId,
      actorUserId,
      fiscalPeriodId: period.id,
      lines: built.map((l) => ({
        accountCodeId: l.accountCodeId,
        departmentId: l.departmentId,
        drCr: l.drCr,
        amount: l.amount,
      })),
    });
  }

  return {
    voucherId: voucher.id,
    docNo,
    lineCount: built.length,
    totalDebit,
    totalCredit,
    status: willPost ? 'POSTED' : 'DRAFT',
  };
}

/**
 * 把分錄累加進科目餘額。
 * ⚠ 只有「部門」進餘額表（B 階段 Q1 拍板）——往來對象已有 AR/AP 子帳、銀行帳戶走對帳，
 *    多帶就是第二份數字，而且行數是乘法成長。
 * ⚠ 期末＝期初＋本期（借貸各自累計、不軋淨額）。淨額由查詢端依科目方向算，
 *    這樣試算表的「借方合計 vs 貸方合計」才拿得到原始數字。
 */
export async function applyToGlBalance(
  tx: Prisma.TransactionClient,
  p: {
    tenantId: string;
    actorUserId: string;
    fiscalPeriodId: string;
    lines: {
      accountCodeId: string;
      departmentId: string | null;
      drCr: string;
      amount: Dec;
    }[];
  },
): Promise<void> {
  // 同科目×部門先在記憶體裡合併，減少 DB 往返
  const agg = new Map<
    string,
    { accountCodeId: string; departmentId: string | null; d: Dec; c: Dec }
  >();
  for (const l of p.lines) {
    // 組合鍵分隔符用 '|'：ID 都是 NX01DEPT0000001 這種英數內碼，不會含 '|'。
    // ⚠ 原本用了 NUL 位元組當分隔符——功能上可行，但 git 會把整個檔判成二進位、diff 與 review 全失效。
    const key = `${l.accountCodeId}|${l.departmentId ?? ''}`;
    const cur = agg.get(key) ?? {
      accountCodeId: l.accountCodeId,
      departmentId: l.departmentId,
      d: D0,
      c: D0,
    };
    if (l.drCr === 'D') cur.d = cur.d.add(l.amount);
    else cur.c = cur.c.add(l.amount);
    agg.set(key, cur);
  }

  for (const a of agg.values()) {
    const existing = await tx.nx05GlBalance.findFirst({
      where: {
        tenantId: p.tenantId,
        fiscalPeriodId: p.fiscalPeriodId,
        accountCodeId: a.accountCodeId,
        departmentId: a.departmentId,
      },
      select: {
        id: true,
        openingDebit: true,
        openingCredit: true,
        periodDebit: true,
        periodCredit: true,
      },
    });

    if (existing) {
      const pd = new PrismaNs.Decimal(existing.periodDebit).add(a.d);
      const pc = new PrismaNs.Decimal(existing.periodCredit).add(a.c);
      await tx.nx05GlBalance.update({
        where: { id: existing.id },
        data: {
          periodDebit: pd,
          periodCredit: pc,
          closingDebit: new PrismaNs.Decimal(existing.openingDebit).add(pd),
          closingCredit: new PrismaNs.Decimal(existing.openingCredit).add(pc),
          recalculatedAt: new Date(),
          updatedBy: p.actorUserId,
        },
      });
    } else {
      await tx.nx05GlBalance.create({
        data: {
          tenantId: p.tenantId,
          fiscalPeriodId: p.fiscalPeriodId,
          accountCodeId: a.accountCodeId,
          departmentId: a.departmentId,
          periodDebit: a.d,
          periodCredit: a.c,
          closingDebit: a.d,
          closingCredit: a.c,
          recalculatedAt: new Date(),
          createdBy: p.actorUserId,
          updatedBy: p.actorUserId,
        },
      });
    }
  }
}
