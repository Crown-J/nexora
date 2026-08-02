// apps/nx-ui/src/features/nx04/sales/so-draft.ts
//
// 銷貨建單草稿的共用核心（型別 + 規則 + 訊息產生器）
//
// ⭐ 為什麼抽出來（2026-08-02，v3.0.0 銷貨作業）：
//    舊的浮層工作站「即時銷售」與新的一頁式「建立銷貨單」是同一件事的兩個外殼。
//    這些規則（出貨分配怎麼拆、帳期怎麼算、稅率怎麼定、訊息怎麼組）⛔ 不能有兩份——
//    複製一份出去，日後改了一邊沒改另一邊，客戶就會收到兩種格式、帳期也會算出兩種答案。
//    ⚠️ 這是既有前例的做法：報價訊息當年就是為了「避免兩邊 drift」抽成 quote-message.ts
//       （2026-07-13，執行長選 A 案）。
//
// ⛔ 這個檔只放純邏輯：⛔ 不含 JSX、⛔ 不含 hooks、⛔ 不含 API 呼叫。
//    建單流程本身（buildOrder）仍留在各自的外殼裡——它跟畫面狀態綁太深，硬抽反而更難讀。

import {
  formatAddressOneLine,
} from '@/features/shared/address/AddressPicker';
import type { PartnerAddressRow } from '@data/endpoints/shared/address/partner-address-api';

/** 出貨分配來源：現貨（本倉可出）/ 等調撥（自倉調撥、系統配來源倉）/ 同行調貨（TI 鏈） */
export type AllocSource = 'STOCK' | 'TRANSFER' | 'PEER';

/** 一筆出貨分配：某倉出某數量（來源決定現貨/等調撥/同行）；PEER 需綁同行對象（價由詢價紀錄接） */
export type Allocation = {
  warehouseId: string;
  qty: number;
  source: AllocSource;
  /** PEER 專用：同行對象（create-ti 用；價後端自動取該同行×該料最近詢價紀錄） */
  peerPartnerId?: string;
  /** PEER 顯示用：同行編號+名稱 */
  peerLabel?: string;
  /** PEER 顯示用：詢價價（僅展示、實際成本後端從詢價紀錄帶） */
  peerPrice?: string;
};

/** 建單草稿的明細行；allocations 加總須等於 qty（出貨分配） */
export type SalesLine = {
  partId: string;
  partNo: string;
  partName: string;
  brandName: string | null;
  availableTotal: string;
  qty: number;
  unitPrice: number;
  remark: string;
  /** 選料時本客戶是否已有近一月報價紀錄；false → 建單送出時自動生成即時報價紀錄 */
  hadQuoteRecord: boolean;
  /** 出貨分配（現貨/等調撥/同行）；建單送出時每筆 → 一張銷貨明細行 */
  allocations: Allocation[];
  /** 低於底價原因（加入時真的低於 成本/最低售價 才要求填；2026-07-18 執行長拍板、不再固定繞過） */
  belowMinReason?: string;
  /**
   * 這一行是從哪一筆報價帶進來的（路 A：先報價、之後才成交）。
   * 送出時夾帶給後端 → 報價自動標成已成交、同客戶同料號的其他舊報價自動作廢。
   * ⚠️ 純新增的選填欄位，舊的浮層工作站不填也照常運作。
   */
  quoteItemId?: string;
};

/** 依「客戶預設倉可用量」自動拆分配：足→現貨一筆；不足→現貨+調撥；無→調撥 */
export function autoAllocate(warehouseId: string, qty: number, avail: number): Allocation[] {
  if (avail >= qty) return [{ warehouseId, qty, source: 'STOCK' }];
  if (avail <= 0) return [{ warehouseId, qty, source: 'TRANSFER' }];
  return [
    { warehouseId, qty: avail, source: 'STOCK' },
    { warehouseId, qty: qty - avail, source: 'TRANSFER' },
  ];
}

export const nf = new Intl.NumberFormat('zh-TW');
export const money = (n: number) => `$${nf.format(Math.round(n))}`;

/** 付款條件；客戶主檔預設那顆會標星號 */
export const PAYMENT_TERMS: { v: string; label: string }[] = [
  { v: 'CASH', label: '現金' },
  { v: 'PREPAY', label: '預付' },
  { v: 'NET30', label: '月結 30 天' },
  { v: 'NET60', label: '月結 60 天' },
  { v: 'NET90', label: '月結 90 天' },
];

/** 付款條件代碼 → 中文（客戶預設值落在標準清單外時仍能顯示） */
export const paymentTermLabel = (v: string): string =>
  PAYMENT_TERMS.find((t) => t.v === v)?.label ?? v;

/** 發票種類（invoiceCopies；0 不開 / 2 二聯 / 3 三聯） */
export const INVOICE_OPTS: { v: number; label: string }[] = [
  { v: 3, label: '三聯' },
  { v: 2, label: '二聯' },
  { v: 0, label: '不開發票' },
];

/** 取貨方式（deliveryType；後端權威 P/D/C） */
export const DELIVERY_OPTS: { v: string; label: string }[] = [
  { v: 'P', label: '自取' },
  { v: 'D', label: '配送' },
  { v: 'C', label: '寄貨' },
];

/** 選客戶時一併帶回的預設值（結帳日/預設發票聯式/付款條件） */
export type CustomerDefaults = {
  statementDay: number | null;
  defaultInvoiceCopies: number | null;
  paymentTermDomestic: string;
};

/** 帳期預設（YYYY-MM）：今天日 > 客戶結帳日 → 切下月帳，否則本月 */
export function defaultAccountPeriod(statementDay: number | null | undefined): string {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth(); // 0-based
  if (statementDay && now.getDate() > statementDay) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** 稅率：不開發票（invoiceCopies=0）→ 0%，否則 5%（營業稅） */
export const taxRateOf = (invoiceCopies: number) => (invoiceCopies === 0 ? 0 : 5);

/**
 * 送貨地址列 → 單行字串（結構化組字對齊 backend compose；freeform / 標籤兜底）
 * ⚠️ seed／恆迎歷史資料常把台灣地址整串放 freeformAddress（結構化欄只有郵遞區號）——
 *    結構化組不出街道級內容（無 streetName/buildingNo）時、把 freeform 併上，
 *    ⛔ 不然畫面上只會剩「106」這種郵遞區號。
 */
export function shipAddressOneLine(r: PartnerAddressRow): string {
  const line = formatAddressOneLine(r, {
    countryName: r.country?.name ?? null,
    countryCode: r.country?.code ?? null,
    cityName: r.city?.name ?? null,
    districtName: r.district?.name ?? null,
  });
  if (r.freeformAddress && !r.streetName && !r.buildingNo) {
    return [line, r.freeformAddress].filter(Boolean).join(' ').trim() || r.label || '';
  }
  return line || r.freeformAddress || r.label || '';
}

/** 建單結果（送出後顯示用） */
export type OrderResult = {
  docNo: string;
  stockLines: number;
  transferLines: number;
  tiDocNos: string[];
};

/**
 * 客戶訊息可設定顯示項（存 localStorage）。
 * ⚠️ 這一組與「報價」那一組（quote-message.ts 的 MsgOpts）⛔ 不是同一組、也不共用鑰匙——
 *    報價訊息講的是「報價多少」、銷貨訊息講的是「這張單出了什麼」，欄位本來就不同。
 */
export type SalesMsgOpts = {
  partNo: boolean;
  partName: boolean;
  qty: boolean;
  price: boolean;
  ship: boolean;
  remark: boolean;
};

export const SALES_MSG_OPTS_KEY = 'nx-instant-sales-msg-opts';

export const DEFAULT_SALES_MSG_OPTS: SalesMsgOpts = {
  partNo: true,
  partName: true,
  qty: true,
  price: true,
  ship: true,
  remark: false,
};

export const SALES_MSG_OPT_DEFS: { key: keyof SalesMsgOpts; label: string }[] = [
  { key: 'partNo', label: '料號' },
  { key: 'partName', label: '品名' },
  { key: 'qty', label: '數量' },
  { key: 'price', label: '單價' },
  { key: 'ship', label: '出貨狀態（現貨/等調撥）' },
  { key: 'remark', label: '備註' },
];

/** 依顯示設定組客戶訊息文字 */
export function buildSalesMessage(
  customerName: string,
  docNo: string,
  lines: SalesLine[],
  opts: SalesMsgOpts,
  invoiceCopies: number,
): string {
  const rows = lines.map((l) => {
    const seg: string[] = [];
    if (opts.partNo) seg.push(l.partNo);
    if (opts.partName) seg.push(l.partName);
    if (opts.qty) seg.push(`×${nf.format(l.qty)}`);
    if (opts.price) seg.push(money(l.unitPrice));
    if (opts.ship)
      seg.push(
        l.allocations.some((a) => a.source === 'PEER')
          ? '（調貨中）'
          : l.allocations.some((a) => a.source === 'TRANSFER')
            ? '（等調撥）'
            : '（現貨）',
      );
    if (opts.remark && l.remark) seg.push(`※${l.remark}`);
    return `・${seg.join(' ')}`;
  });
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const total = subtotal + Math.round((subtotal * taxRateOf(invoiceCopies)) / 100);
  return [`【${customerName}】${docNo}`, ...rows, `合計（含稅）${money(total)}`].join('\n');
}
