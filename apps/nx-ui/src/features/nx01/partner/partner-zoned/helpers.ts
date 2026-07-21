// apps/nx-ui/src/features/partner-zoned/helpers.ts
// v1.2 對齊軌 階段 E P2：partner 共用 helper
//
// row ↔ draft 轉換、partnerType label、依 zones 過濾 PATCH body。
// 對齊決策 3.1（身分動態 zones）+ v1.1 §1（PATCH 只送目前可編欄位、不覆寫其他區）

import {
  PARTNER_FIELDS,
  type PartnerZone,
} from '@/features/nx01/shell/zones';
import type {
  PartnerDto,
  PartnerType,
  UpdatePartnerBody,
} from '@data/types/shared/master/partner';

export type PartnerDraft = Record<string, string | boolean>;

/** partnerType 七分類中文標籤（W4 [3-5] 2026-06-06 加 L 散客；對齊 catalog-masters） */
export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  C: '保養廠',
  O: '同行',
  S: '供應商',
  T: '外包物流',
  V: '一般廠商',
  B: '銀行',
  L: '散客',
};

export const PARTNER_TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'C', label: '保養廠' },
  { value: 'O', label: '同行' },
  { value: 'S', label: '供應商' },
  { value: 'T', label: '外包物流' },
  { value: 'V', label: '一般廠商' },
  { value: 'B', label: '銀行' },
  { value: 'L', label: '散客' },
];

/** W4 [3-6] / 02 對齊第二批 C 軌 CP2 發票聯式選項（partner 預設 + SO 逐筆改皆用） */
export const INVOICE_COPIES_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '不開發票' },
  { value: 2, label: '二聯' },
  { value: 3, label: '三聯' },
];

export const PAY_DOM_OPTIONS = [
  { value: 'PREPAY', label: '預付' },
  { value: 'NET30', label: '月結 30 天' },
  { value: 'NET60', label: '月結 60 天' },
  { value: 'NET90', label: '月結 90 天' },
];

export const PAY_IMP_OPTIONS = [
  { value: 'TT', label: 'TT 電匯' },
  { value: 'LC', label: 'LC 信用狀' },
  { value: 'DP', label: 'DP 付款交單' },
  { value: 'DA', label: 'DA 承兌交單' },
];

export const CREDIT_STATUS_OPTIONS = [
  { value: 'N', label: '正常' },
  { value: 'W', label: '僅收現金' },
  { value: 'F', label: '凍結' },
];

/** 預設取貨方式（值域同銷貨單 delivery_type：D/P/C——C=寄貨、非 S、值域訂正 07/12） */
export const DELIVERY_TYPE_OPTIONS = [
  { value: 'D', label: '配送' },
  { value: 'P', label: '自取' },
  { value: 'C', label: '寄貨' },
];

/** 後端 row → 編輯 draft（所有 PARTNER_FIELDS 對映、空值轉空字串） */
export function partnerRowToDraft(row: PartnerDto): PartnerDraft {
  const draft: PartnerDraft = {};
  for (const f of PARTNER_FIELDS) {
    // 衛星表（shippingAddresses / billingAddress）不入 scalar draft（P5 啟用）
    if (f.isSatellite) continue;
    const v = (row as unknown as Record<string, unknown>)[f.key];
    if (f.key === 'canTransferStock' || f.key === 'isCashCustomer') draft[f.key] = Boolean(v);
    else draft[f.key] = v == null ? '' : String(v);
  }
  return draft;
}

/** 空 draft（新增用、partnerType 必填預設保養廠 C） */
export function emptyPartnerDraft(defaultPartnerType: PartnerType = 'C'): PartnerDraft {
  const draft: PartnerDraft = {};
  for (const f of PARTNER_FIELDS) {
    if (f.isSatellite) continue;
    if (f.key === 'partnerType') draft[f.key] = defaultPartnerType;
    else if (f.key === 'canTransferStock') draft[f.key] = defaultPartnerType === 'O';
    else if (f.key === 'isCashCustomer') draft[f.key] = false;
    else if (f.key === 'paymentTermDomestic') draft[f.key] = 'NET30';
    else if (f.key === 'paymentTermImport') draft[f.key] = 'TT';
    else if (f.key === 'incoterm') draft[f.key] = 'FOB';
    else if (f.key === 'creditStatus') draft[f.key] = 'N';
    else draft[f.key] = '';
  }
  return draft;
}

/**
 * draft → PATCH body：對齊 v1.1 §1 核心原則「只送本頁可編欄位、不覆寫其他區」
 * - zones=undefined 表示主檔中心、送全欄
 * - zones=Set 時、只送該 zones 內的 scalar 欄位（code/partnerType lockedOnEdit 例外）
 */
export function partnerDraftToBody(
  draft: PartnerDraft,
  editableZones: Set<PartnerZone> | undefined,
  options: { isCreate: boolean },
): UpdatePartnerBody & { code?: string; partnerType?: PartnerType } {
  const body: Record<string, unknown> = {};
  for (const f of PARTNER_FIELDS) {
    if (f.isSatellite) continue;
    // PATCH（編輯）時、code 鎖死、partnerType 通常也鎖（決定 zone 就是 partnerType 本身）
    if (!options.isCreate && (f.key === 'code' || f.key === 'partnerType')) continue;
    // editableZones 過濾：只送本頁可編 zone 的欄位
    if (editableZones && !editableZones.has(f.zone)) continue;
    const v = draft[f.key];
    if (f.key === 'canTransferStock' || f.key === 'isCashCustomer') {
      body[f.key] = Boolean(v);
      continue;
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '' && !f.required) continue; // optional 空值不送
      if (f.key === 'creditLimit') {
        const n = Number(trimmed);
        if (Number.isFinite(n)) body[f.key] = n;
        continue;
      }
      // W4 [3-6] defaultInvoiceCopies：字串 → number（0 / 2 / 3）
      if (f.key === 'defaultInvoiceCopies') {
        const n = Number(trimmed);
        if (Number.isFinite(n)) body[f.key] = n;
        continue;
      }
      // 偉盟設計檢視 P1-4：statementDay 字串 → number（1~31）
      if (f.key === 'statementDay') {
        const n = Number(trimmed);
        if (Number.isFinite(n)) body[f.key] = n;
        continue;
      }
      // 02 對齊第二批 C 軌 CP1：customMarginPct 字串 → number（Decimal）
      if (f.key === 'customMarginPct') {
        const n = Number(trimmed);
        if (Number.isFinite(n)) body[f.key] = n;
        continue;
      }
      body[f.key] = trimmed;
      continue;
    }
    body[f.key] = v;
  }
  if (options.isCreate) {
    // 新增時 code/name/partnerType 已在 body、其餘 optional 已自動處理
    return body as UpdatePartnerBody & { code?: string; partnerType?: PartnerType };
  }
  return body as UpdatePartnerBody;
}
