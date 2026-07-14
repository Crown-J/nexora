// apps/nx-ui/src/features/nx04/quote/ui/quote-message.ts
// F2/F5 共用：報價訊息生成 + 訊息選項（2026-07-13 抽出，執行長選 A 案避免兩邊 drift）。
// 邏輯逐字沿用 QuoteWorkspace.copyText；F5 調貨報價共用同一套（whName='調貨'）。

export type MsgOpts = {
  brand: boolean;
  baseNo: boolean;
  secCode: boolean;
  qtyAlways: boolean;
  warehouse: boolean;
  remark: boolean;
};

export const MSG_OPTS_KEY = 'nx-f2-msg-opts';
export const defaultMsgOpts: MsgOpts = {
  brand: true,
  baseNo: true,
  secCode: false,
  qtyAlways: false,
  warehouse: false,
  remark: false,
};

export const MSG_OPT_DEFS: { key: keyof MsgOpts; label: string }[] = [
  { key: 'brand', label: '廠牌識別（正廠／廠牌名）' },
  { key: 'baseNo', label: '顯示基準料號' },
  { key: 'secCode', label: '顯示副廠料號' },
  { key: 'qtyAlways', label: '數量恆顯示（否則 >1 才顯示）' },
  { key: 'warehouse', label: '顯示出貨倉庫' },
  { key: 'remark', label: '顯示備註文字（如「5個在新莊倉」）' },
];

/** 金額格式（<100 且有小數 → 兩位；否則千分位無小數）。 */
export function formatNt(n: number): string {
  if (n < 100 && n !== Math.floor(n)) return n.toFixed(2);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

/** 訊息用行資料（QuoteWorkspace 的 QuoteLine 為其超集、可直接傳入）。 */
export type QuoteMsgLine = {
  name: string;
  code: string;
  secCode: string | null;
  brand: string | null;
  brandName: string | null;
  isOem: boolean;
  qty: string | number;
  price: string | number;
  warehouseLabel?: string | null;
  transfer?: boolean;
  remark?: string;
};

/** 依訊息選項生成給客戶的報價訊息（同品名分組、品名固定組標題）。 */
export function buildQuoteMessage(
  lines: QuoteMsgLine[],
  opts: MsgOpts,
  defaultWarehouseName?: string | null,
): string {
  const groups = new Map<string, QuoteMsgLine[]>();
  for (const l of lines) {
    const arr = groups.get(l.name);
    if (arr) arr.push(l);
    else groups.set(l.name, [l]);
  }
  const blocks: string[] = [];
  for (const [name, ls] of groups) {
    const rows = ls.map((l) => {
      const parts: string[] = [];
      if (opts.brand) parts.push(l.isOem ? '正廠' : (l.brandName ?? l.brand ?? ''));
      if (opts.baseNo) parts.push(l.code);
      if (opts.secCode && l.secCode) parts.push(l.secCode);
      const qtyNum = Number(l.qty);
      const qtyPart = opts.qtyAlways || qtyNum > 1 ? `　數量 ${qtyNum}` : '';
      // 出貨倉庫放行尾括號、只帶倉名；調貨 → 客戶預設倉
      const whName = l.transfer
        ? '調貨'
        : l.warehouseLabel
          ? l.warehouseLabel.split(' ').slice(1).join(' ') || l.warehouseLabel
          : (defaultWarehouseName ?? null);
      const whPart = opts.warehouse && whName ? ` (${whName})` : '';
      const remarkPart = opts.remark && l.remark?.trim() ? `　備註：${l.remark.trim()}` : '';
      return `${parts.filter(Boolean).join(' ')}${qtyPart}　報價 NT$ ${formatNt(Number(l.price))}${whPart}${remarkPart}`.trim();
    });
    blocks.push([name, ...rows].join('\n'));
  }
  return blocks.join('\n\n');
}
