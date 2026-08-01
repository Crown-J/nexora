// apps/nx-ui/src/features/nx04/sales/ui/InstantSalesWorkspace.tsx
// F2 即時工作檯・站 4「即時銷售」——成交快速建單精靈（5 步 客戶→明細→交易→出貨→訊息）
//
// 拍板（執行長 2026-07-18）：
//   · 站 4 = 即時銷售、原「即時補貨」順延站 5（station-registry.ts）
//   · 精靈只做到「建單 + 確認」→ 落撿貨清單、倉庫接手後續（不在此撿貨/出貨）
// 範式對齊 F5 調貨詢價（GlobalTransferInquiry）：單一元件內 stage(1~5) 切步、
//   左 52px 流程軌 + 中主區 + 右副區、FocusLockedDialog 全螢幕、Alt+1~5 跳步、Enter 走到底。
// 後端：POST /nx04/so（DRAFT）→ PATCH status=CONFIRMED；零 schema、沿用現成端點。
//
// commit 2：步驟 1 客戶（CustomerPicker）+ 步驟 2 明細（PartPicker + 數量/價格）+ 右側訂單摘要。
//   步驟 3/4/5 仍為佔位（後續 commit）。
'use client';

import { ClipboardCheck, ListPlus, MessageSquareText, ReceiptText, Star, Trash2, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { listWarehouses, type WarehouseDto } from '@data/endpoints/nx01/api/warehouse';
import { lookupStockBalance } from '@data/endpoints/nx03/stock-balance/api/lookup';
import { resolvePromotionPrice } from '@data/endpoints/nx04/promotion/api/promotion';
import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { createInquiryRecord, createQuoteRecord, listInquiryRecords } from '@data/endpoints/nx04/record/api/record';
import { createSo, createTiFromSo, softDeleteSo, updateSo } from '@data/endpoints/nx04/so/api/so';
import type { InquiryRecord } from '@data/types/nx04/record';
import {
  createPartnerAddress,
  listPartnerAddresses,
  type PartnerAddressRow,
} from '@data/endpoints/shared/address/partner-address-api';
import { getPartner } from '@data/endpoints/shared/master/partner/api/partner';
import { FocusLockedDialog } from '@design/primitives/focus-locked-dialog';

import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';
import { formatAddressOneLine } from '@/features/shared/address/AddressPicker';
import { registerStationDirtyChecker } from '@/features/shared/instant-workbench/station-registry';

/** 站內步驟號（5 步；與 SO 建單流程對應） */
type SalesStage = 1 | 2 | 3 | 4 | 5;

type StageDef = { n: SalesStage; label: string; icon: ReactNode; hint: string };

const STAGE_DEFS: StageDef[] = [
  { n: 1, label: '客戶', icon: <UserRound size={18} />, hint: '選擇客戶' },
  { n: 2, label: '明細', icon: <ListPlus size={18} />, hint: '品項・數量・價格・從哪出' },
  { n: 3, label: '交易', icon: <ReceiptText size={18} />, hint: '付款・發票・帳期・取貨方式' },
  { n: 4, label: '確認', icon: <ClipboardCheck size={18} />, hint: '覆核・自動拆單' },
  { n: 5, label: '訊息', icon: <MessageSquareText size={18} />, hint: '確認・訊息內容' },
];

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

/** 建單草稿的明細行；allocations 加總須等於 qty（Step2 出貨分配） */
export type SalesLine = {
  partId: string;
  partNo: string;
  partName: string;
  brandName: string | null;
  availableTotal: string;
  qty: number;
  unitPrice: number;
  remark: string;
  /** 選料時本客戶是否已有近一月報價紀錄；false → 建單送出時自動生成即時報價紀錄（送出步驟） */
  hadQuoteRecord: boolean;
  /** 出貨分配（現貨/等調撥）；建單送出時每筆 → 一張銷貨明細行 */
  allocations: Allocation[];
  /** 低於底價原因（加入時真的低於 成本/最低售價 才要求填；2026-07-18 執行長拍板、不再固定繞過） */
  belowMinReason?: string;
};

/** 依「客戶預設倉可用量」自動拆分配：足→現貨一筆；不足→現貨+調撥；無→調撥 */
function autoAllocate(warehouseId: string, qty: number, avail: number): Allocation[] {
  if (avail >= qty) return [{ warehouseId, qty, source: 'STOCK' }];
  if (avail <= 0) return [{ warehouseId, qty, source: 'TRANSFER' }];
  return [
    { warehouseId, qty: avail, source: 'STOCK' },
    { warehouseId, qty: qty - avail, source: 'TRANSFER' },
  ];
}

const nf = new Intl.NumberFormat('zh-TW');
const money = (n: number) => `$${nf.format(Math.round(n))}`;

/** 付款條件（步驟 3；直接列具體值，客戶主檔預設那顆標星號）*/
const PAYMENT_TERMS: { v: string; label: string }[] = [
  { v: 'CASH', label: '現金' },
  { v: 'PREPAY', label: '預付' },
  { v: 'NET30', label: '月結 30 天' },
  { v: 'NET60', label: '月結 60 天' },
  { v: 'NET90', label: '月結 90 天' },
];
/** 付款條件代碼 → 中文（客戶預設值落在標準清單外時仍能顯示）*/
const paymentTermLabel = (v: string): string => PAYMENT_TERMS.find((t) => t.v === v)?.label ?? v;
/** 發票種類（invoiceCopies；0 不開 / 2 二聯 / 3 三聯）*/
const INVOICE_OPTS: { v: number; label: string }[] = [
  { v: 3, label: '三聯' },
  { v: 2, label: '二聯' },
  { v: 0, label: '不開發票' },
];
/** 取貨方式（deliveryType；後端權威 P/D/C）*/
const DELIVERY_OPTS: { v: string; label: string }[] = [
  { v: 'P', label: '自取' },
  { v: 'D', label: '配送' },
  { v: 'C', label: '寄貨' },
];

/** 選客戶時一併帶回的預設值（結帳日/預設發票聯式/付款條件）*/
type CustomerDefaults = {
  statementDay: number | null;
  defaultInvoiceCopies: number | null;
  paymentTermDomestic: string;
};

/** 帳期預設（YYYY-MM）：今天日 > 客戶結帳日 → 切下月帳，否則本月 */
function defaultAccountPeriod(statementDay: number | null | undefined): string {
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
const taxRateOf = (invoiceCopies: number) => (invoiceCopies === 0 ? 0 : 5);

/** 送貨地址列 → 單行字串（結構化組字對齊 backend compose；freeform / 標籤兜底）
 *  ⚠️ seed／恆迎歷史資料常把台灣地址整串放 freeformAddress（結構化欄只有郵遞區號）——
 *  結構化組不出街道級內容（無 streetName/buildingNo）時、把 freeform 併上、不然只剩「106」這種郵碼 */
function shipAddressOneLine(r: PartnerAddressRow): string {
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

/** 建單結果（Step 5 顯示用） */
type OrderResult = { docNo: string; stockLines: number; transferLines: number; tiDocNos: string[] };

/** Step 5 客戶訊息可設定顯示項（存 localStorage） */
type MsgOpts = { partNo: boolean; partName: boolean; qty: boolean; price: boolean; ship: boolean; remark: boolean };
const MSG_OPTS_KEY = 'nx-instant-sales-msg-opts';
const DEFAULT_MSG_OPTS: MsgOpts = { partNo: true, partName: true, qty: true, price: true, ship: true, remark: false };
const MSG_OPT_DEFS: { key: keyof MsgOpts; label: string }[] = [
  { key: 'partNo', label: '料號' },
  { key: 'partName', label: '品名' },
  { key: 'qty', label: '數量' },
  { key: 'price', label: '單價' },
  { key: 'ship', label: '出貨狀態（現貨/等調撥）' },
  { key: 'remark', label: '備註' },
];

/** 依顯示設定組客戶訊息文字 */
function buildMessage(
  customerName: string,
  docNo: string,
  lines: SalesLine[],
  opts: MsgOpts,
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

/** 對外：受控元件，殼以 open/onClosed 掛載（比照 GlobalTransferInquiry） */
export function InstantSalesWorkspace({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  if (!open) return null;
  return <InstantSalesDialog onClose={onClosed} />;
}

function InstantSalesDialog({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<SalesStage>(1);
  // ── 建單草稿 ──
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [custDefaults, setCustDefaults] = useState<CustomerDefaults | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);
  const [paymentTerm, setPaymentTerm] = useState(''); // '' = 客戶預設
  const [invoiceCopies, setInvoiceCopies] = useState(3);
  const [accountPeriod, setAccountPeriod] = useState(() => defaultAccountPeriod(null));
  const [deliveryType, setDeliveryType] = useState('P');
  // 送貨地點／取貨註記（執行長 2026-07-18：必填——A 叫貨送 B、B 來取都要寫清楚）
  const [deliveryAddress, setDeliveryAddress] = useState('');
  // 客戶送貨地點清單（nx01_partner_address SHIPPING；執行長 2026-07-19：接主檔＋可快速建立）
  const [shipAddresses, setShipAddresses] = useState<PartnerAddressRow[]>([]);
  // 送出/結果
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  // Step 5 客戶訊息顯示設定（localStorage）
  const [msgOpts, setMsgOpts] = useState<MsgOpts>(DEFAULT_MSG_OPTS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MSG_OPTS_KEY);
      if (raw) setMsgOpts({ ...DEFAULT_MSG_OPTS, ...JSON.parse(raw) });
    } catch {
      /* 讀不到用預設 */
    }
  }, []);
  const setMsgOpt = useCallback((patch: Partial<MsgOpts>) => {
    setMsgOpts((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(MSG_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* 存不了不擋 */
      }
      return next;
    });
  }, []);
  // 開站/回步驟 1 時聚焦客戶搜尋框（修：開站需滑鼠點框才能打字）
  const customerInputRef = useRef<HTMLInputElement>(null);

  // 送出：驗配平 → 建 SO（分配攤成明細行）→ 確認（觸發自動調撥單）→ 成功後補報價紀錄
  // 冪等（2026-07-18 全面測試修正）：確認失敗 → 草稿自動作廢、重試不留孤兒；報價紀錄挪到成功後、重試不重複
  const buildOrder = useCallback(async () => {
    if (!customer || submitting || orderResult) return; // 已建單不重送
    // 0. 守門：每行分配需配平、每筆分配量 > 0 且有倉、同行分配需綁對象（Alt+數字跳步可繞過 Step2 守門、這裡兜底）
    const bad = lines.find(
      (l) =>
        l.allocations.length === 0 ||
        l.allocations.some((a) => !(a.qty > 0) || !a.warehouseId || (a.source === 'PEER' && !a.peerPartnerId)) ||
        l.allocations.reduce((s, a) => s + a.qty, 0) !== l.qty,
    );
    if (lines.length === 0 || bad) {
      setSubmitError(bad ? `品項 ${bad.partNo} 出貨分配未配平或同行未選對象（回步驟 2 調整）` : '沒有品項');
      return;
    }
    if (!deliveryAddress.trim()) {
      setSubmitError('送貨地點必填（步驟 3）——送哪裡或誰來取要寫清楚');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. 誤標調撥自動轉現貨（執行長 2026-07-18 拍板）：該倉可用量（扣掉本單同料同倉現貨行）夠 → 轉回現貨
      const stockTaken = new Map<string, number>();
      lines.forEach((l) =>
        l.allocations.forEach((a) => {
          if (a.source === 'STOCK') {
            const k = `${l.partId}|${a.warehouseId}`;
            stockTaken.set(k, (stockTaken.get(k) ?? 0) + a.qty);
          }
        }),
      );
      const fixedLines = await Promise.all(
        lines.map(async (l) => ({
          ...l,
          allocations: await Promise.all(
            l.allocations.map(async (a) => {
              if (a.source !== 'TRANSFER') return a;
              try {
                const bal = await lookupStockBalance(l.partId, a.warehouseId);
                const taken = stockTaken.get(`${l.partId}|${a.warehouseId}`) ?? 0;
                if ((bal?.availableQty ?? 0) - taken >= a.qty) return { ...a, source: 'STOCK' as AllocSource };
              } catch {
                /* 查不到 → 保留調撥、後端擋 */
              }
              return a;
            }),
          ),
        })),
      );
      setLines(fixedLines); // 預覽/訊息與實際送出一致

      // 2. 分配攤成明細行（現貨=S、等調撥=T、同行=G）；低價原因只在真的低於底價時才帶（加入時已判）
      const items = fixedLines.flatMap((l) =>
        l.allocations.map((a) => ({
          partId: l.partId,
          warehouseId: a.warehouseId,
          qty: a.qty,
          unitPriceSnapshot: l.unitPrice,
          transferSourceType: a.source === 'PEER' ? 'G' : a.source === 'TRANSFER' ? 'T' : 'S',
          belowMinReason: l.belowMinReason || undefined,
          remark: l.remark || undefined,
        })),
      );
      // 同行分組（flat index ↔ 建單回傳 items 同序、確認後逐同行建 TI）
      const flatAllocs = fixedLines.flatMap((l) => l.allocations);
      const peerGroups = new Map<string, number[]>(); // peerPartnerId → flat indexes
      flatAllocs.forEach((a, i) => {
        if (a.source === 'PEER' && a.peerPartnerId) {
          peerGroups.set(a.peerPartnerId, [...(peerGroups.get(a.peerPartnerId) ?? []), i]);
        }
      });
      const headerWh = fixedLines[0]?.allocations[0]?.warehouseId ?? customer.defaultWarehouseId ?? undefined;
      const soDate = new Date().toISOString().slice(0, 10);
      const so = await createSo({
        customerId: customer.id,
        warehouseId: headerWh ?? undefined,
        soDate,
        deliveryType,
        deliveryAddress: deliveryAddress.trim(),
        taxRate: taxRateOf(invoiceCopies),
        invoiceCopies,
        paymentTerm: paymentTerm || undefined,
        accountPeriod: accountPeriod ? `${accountPeriod}-01` : undefined,
        salesMethod: '即時銷售',
        items,
      });
      // 3. 確認 → CONFIRMED（後端對 T 行自動開調撥單 ST；G/B 行已排除不掃）；失敗把草稿作廢、避免重試堆孤兒 DRAFT
      try {
        await updateSo(so.id, { status: 'CONFIRMED' });
      } catch (confirmErr) {
        await softDeleteSo(so.id, '即時銷售確認失敗自動作廢').catch(() => undefined);
        throw confirmErr;
      }
      // 4. 同行分配 → 逐同行建調貨單 TI（價由後端自動取該同行×該料最近詢價紀錄、含回鏈）
      //    TI 建立失敗不整單回滾（SO 已確認生效）——留待補行、錯誤顯示請業務到銷貨單補開
      const tiDocNos: string[] = [];
      let tiError: string | null = null;
      const soItems = so.items ?? [];
      for (const [partnerId, flatIdxs] of peerGroups) {
        const soItemIds = flatIdxs.map((i) => soItems[i]?.id).filter((x): x is string => !!x);
        if (!soItemIds.length) continue;
        try {
          const r = await createTiFromSo(so.id, { partnerId, soItemIds, remark: '即時銷售自動開單' });
          tiDocNos.push(r.tiDocNo);
        } catch (e) {
          tiError = e instanceof Error ? e.message : '調貨單建立失敗';
        }
      }
      if (tiError) {
        setSubmitError(`銷貨單已建立（${so.docNo}）、但調貨單開立失敗：${tiError}——請到銷貨單詳情補開同行調貨`);
      }
      // 5. 確認成功後、對「無近一月報價紀錄」的行補即時報價紀錄（失敗不擋單）
      await Promise.all(
        fixedLines
          .filter((l) => !l.hadQuoteRecord)
          .map((l) =>
            createQuoteRecord({
              customerId: customer.id,
              partId: l.partId,
              qty: l.qty,
              unitPrice: l.unitPrice,
              warehouseId: l.allocations[0]?.warehouseId,
              source: 'INSTANT',
              sourceDocId: so.id,
            }).catch(() => undefined),
          ),
      );
      const transferLines = items.filter((it) => it.transferSourceType === 'T').length;
      const peerLines = items.filter((it) => it.transferSourceType === 'G').length;
      setOrderResult({
        docNo: so.docNo,
        stockLines: items.length - transferLines - peerLines,
        transferLines,
        tiDocNos,
      });
      setStage(5);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '建單失敗');
    } finally {
      setSubmitting(false);
    }
  }, [customer, submitting, orderResult, lines, deliveryType, deliveryAddress, invoiceCopies, paymentTerm, accountPeriod]);

  // 選客戶 → 帶回客戶預設（結帳日算帳期、發票聯式、付款條件提示）
  const pickedCustomerIdRef = useRef<string | null>(null);
  const handlePickCustomer = useCallback((c: PickedCustomer) => {
    // 換不同客戶 → 送貨地點歸零（舊客戶的地址帶到新客戶是錯資料）
    if (pickedCustomerIdRef.current !== null && pickedCustomerIdRef.current !== c.id) setDeliveryAddress('');
    pickedCustomerIdRef.current = c.id;
    setCustomer(c);
    getPartner(c.id)
      .then((p) => {
        const d: CustomerDefaults = {
          statementDay: p.statementDay ?? null,
          defaultInvoiceCopies: p.defaultInvoiceCopies ?? null,
          paymentTermDomestic: p.paymentTermDomestic,
        };
        setCustDefaults(d);
        setInvoiceCopies(d.defaultInvoiceCopies ?? 3);
        setPaymentTerm(d.paymentTermDomestic || 'CASH');
        setAccountPeriod(defaultAccountPeriod(d.statementDay));
      })
      .catch(() => {
        /* 帶不到預設不擋、留手選 */
      });
    // 送貨地點接衛星表（partner.address 純文字欄已 DROP、原 p.address 預填從沒生效過）：
    // 抓 SHIPPING 清單給步驟 3 下拉、預設地址（isDefault）預填（欄位空著才填、不蓋手打內容）
    setShipAddresses([]);
    listPartnerAddresses(c.id)
      .then((rows) => {
        const ship = rows.filter((r) => r.addressType === 'SHIPPING' && r.isActive);
        setShipAddresses(ship);
        const def = ship.find((r) => r.isDefault) ?? ship[0];
        const line = def ? shipAddressOneLine(def) : '';
        if (line) setDeliveryAddress((prev) => prev || line);
      })
      .catch(() => {
        /* 清單抓不到不擋、留手填 */
      });
  }, []);

  // Alt+1~5 直接跳步（全域 capture，比照 F5）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        e.preventDefault();
        e.stopPropagation();
        setStage(n as SalesStage);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  // 關窗守衛（執行長 2026-07-19：站內有資料、關窗/切站都要先確認）；建單完成（orderResult）後放行
  const dirtyRef = useRef(false);
  dirtyRef.current = !orderResult && (customer !== null || lines.length > 0 || deliveryAddress.trim() !== '');
  useEffect(() => registerStationDirtyChecker(4, () => dirtyRef.current), []);
  const guardedClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm('訂單還沒送出、關閉會清空已填內容——確定關閉？')) return;
    onClose();
  }, [onClose]);

  const cur = STAGE_DEFS.find((s) => s.n === stage)!;

  return (
    <FocusLockedDialog
      open
      onClose={guardedClose}
      ariaLabel="即時銷售"
      initialFocusRef={customerInputRef}
      backdropClassName="bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
      dialogClassName="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
      dialogStyle={{ width: 'min(1080px, 96vw)', height: 'min(680px, 92vh)' }}
    >
      {/* header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#02EDAB]" />
        <h2 className="text-sm font-bold tracking-wide">即時銷售</h2>
        <span className="text-[11px] text-muted-foreground">・成交快速建單</span>
        {customer ? (
          <span className="ml-3 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {customer.code}　{customer.name}
          </span>
        ) : null}
        {/* ⚠️ v3.0.0：這裡原本掛一顆「F2」角標（舊的「F2＝即時工作檯」時代留下的）。
               F2 現在是九宮格（規格 §7.3），標著會讓人以為按 F2 回到本站，拿掉。 */}
        <span className="ml-auto" />
        <button
          type="button"
          onClick={guardedClose}
          aria-label="關閉"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* body：52px 流程軌 | 主區 | 副區 */}
      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(360px,1fr)_minmax(320px,1fr)]">
        {/* 流程軌 */}
        <nav className="relative flex flex-col items-center justify-evenly border-r border-border/40 py-6">
          <span aria-hidden className="absolute bottom-12 left-1/2 top-12 w-[2px] -translate-x-1/2 bg-border/70" />
          {STAGE_DEFS.map((s) => {
            const active = s.n === stage;
            const done = s.n < stage;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setStage(s.n)}
                title={`${s.label}（Alt+${s.n}）`}
                className={
                  active
                    ? 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(2,237,171,0.35)]'
                    : done
                      ? 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-primary/50 bg-primary/8 text-primary/70 hover:text-primary'
                      : 'relative z-10 grid size-10 place-items-center rounded-full border-2 border-border/60 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              >
                {s.icon}
                <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-border/60 bg-background font-mono text-[9px] text-muted-foreground">
                  {s.n}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 主區：依 stage 切內容 */}
        <section className="flex min-h-0 flex-col overflow-hidden p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-base font-bold">
              {cur.n}. {cur.label}
            </span>
            <span className="text-[12px] text-muted-foreground">{cur.hint}</span>
          </div>

          {stage === 1 ? (
            <CustomerStep
              customer={customer}
              inputRef={customerInputRef}
              onPick={handlePickCustomer}
              onNext={() => setStage(2)}
            />
          ) : stage === 2 ? (
            <ItemsStep customer={customer} lines={lines} setLines={setLines} onNext={() => setStage(3)} />
          ) : stage === 3 ? (
            <TransactionStep
              custDefaults={custDefaults}
              paymentTerm={paymentTerm}
              setPaymentTerm={setPaymentTerm}
              invoiceCopies={invoiceCopies}
              setInvoiceCopies={setInvoiceCopies}
              accountPeriod={accountPeriod}
              setAccountPeriod={setAccountPeriod}
              deliveryType={deliveryType}
              setDeliveryType={setDeliveryType}
              deliveryAddress={deliveryAddress}
              setDeliveryAddress={setDeliveryAddress}
              customerId={customer?.id ?? null}
              addresses={shipAddresses}
              onAddressCreated={(row) => setShipAddresses((prev) => [...prev, row])}
              onNext={() => setStage(4)}
            />
          ) : stage === 4 ? (
            <ConfirmStep
              customer={customer}
              lines={lines}
              deliveryType={deliveryType}
              deliveryAddress={deliveryAddress}
              invoiceCopies={invoiceCopies}
              submitting={submitting}
              submitError={submitError}
              onSubmit={buildOrder}
            />
          ) : (
            <MessageStep
              customer={customer}
              lines={lines}
              invoiceCopies={invoiceCopies}
              result={orderResult}
              msgOpts={msgOpts}
              onClose={onClose}
            />
          )}
        </section>

        {/* 副區：Step 5 顯示訊息設定、其餘顯示訂單摘要 */}
        <aside className="flex min-h-0 flex-col overflow-auto border-l border-border/40 p-5">
          {stage === 5 ? (
            <MessageOptionsPanel opts={msgOpts} onChange={setMsgOpt} />
          ) : (
            <OrderSummary customer={customer} lines={lines} invoiceCopies={invoiceCopies} />
          )}
        </aside>
      </div>

      {/* footer 快捷鍵提示 */}
      <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
        Alt+1~5 跳步・Enter 下一步・Esc 關閉
      </div>
    </FocusLockedDialog>
  );
}

/** 步驟 1：客戶 */
function CustomerStep({
  customer,
  inputRef,
  onPick,
  onNext,
}: {
  customer: PickedCustomer | null;
  inputRef: React.Ref<HTMLInputElement>;
  onPick: (c: PickedCustomer) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* 帳戶閘門 v1.3（2026-07-21）：可銷售=收款戶∪現金客戶∪散客、不再看類型 */}
      <CustomerPicker onPick={onPick} onCommit={() => customer && onNext()} autoFocus gate="SELL" inputRef={inputRef} />
      {customer ? (
        <div className="rounded-xl border border-primary/40 bg-primary/8 p-3">
          <div className="text-[11px] text-muted-foreground">已選客戶</div>
          <div className="mt-0.5 text-sm font-bold text-primary">
            {customer.code}　{customer.name}
          </div>
          {customer.defaultWarehouseName ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              預設出貨倉：{customer.defaultWarehouseName}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-[12px] text-muted-foreground">輸入客戶編號或名稱搜尋（Alt+Z 注音首碼）。</div>
      )}
      <div className="mt-auto flex justify-end">
        <button
          type="button"
          disabled={!customer}
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步：明細 →
        </button>
      </div>
    </div>
  );
}

/** 步驟 2：明細（加品項 → 數量/單價/備註 → 加入；單價自動帶價 + 出貨分配現貨/調撥） */
function ItemsStep({
  customer,
  lines,
  setLines,
  onNext,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  setLines: React.Dispatch<React.SetStateAction<SalesLine[]>>;
  onNext: () => void;
}) {
  const [pending, setPending] = useState<PickedPart | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [remark, setRemark] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceSource, setPriceSource] = useState<string | null>(null);
  const [hadRecord, setHadRecord] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [whs, setWhs] = useState<WarehouseDto[]>([]);
  // 低價守門（2026-07-18 執行長拍板：真的低於 成本/最低售價 才要求填原因、不再固定繞過）
  const [floorWarn, setFloorWarn] = useState<string | null>(null);
  const [floorReason, setFloorReason] = useState('');
  const qtyRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const defaultWhRef = useRef<string | null>(customer?.defaultWarehouseId ?? null);

  // 載入倉庫清單 + 決定預設出貨倉（客戶預設倉 → 主倉 → 第一個）
  useEffect(() => {
    let alive = true;
    listWarehouses({ page: 1, pageSize: 200, isActive: true })
      .then((res) => {
        if (!alive) return;
        setWhs(res.items);
        defaultWhRef.current =
          customer?.defaultWarehouseId ?? res.items.find((w) => w.isMain)?.id ?? res.items[0]?.id ?? null;
      })
      .catch(() => {
        /* 載入失敗不擋 */
      });
    return () => {
      alive = false;
    };
  }, [customer]);

  const whName = (id: string) => {
    const w = whs.find((x) => x.id === id);
    return w ? `${w.code}　${w.name}` : id;
  };

  // Alt+S 存檔 → 跳確認視窗（配平才可進下一步）
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      e.stopPropagation();
      const ls = linesRef.current;
      const ok = (l: SalesLine) =>
        l.allocations.reduce((a, x) => a + x.qty, 0) === l.qty &&
        l.allocations.every((a) => a.source !== 'PEER' || !!a.peerPartnerId);
      if (ls.length > 0 && ls.every(ok)) {
        setConfirmOpen(true);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, []);

  // 選料 → 自動帶價（沿用即時報價範式）
  const pickPart = async (p: PickedPart) => {
    setPending(p);
    setQty('1');
    setPrice('');
    setRemark('');
    setPriceSource(null);
    setHadRecord(false);
    setFloorWarn(null);
    setFloorReason('');
    setTimeout(() => qtyRef.current?.focus(), 0);
    if (!customer) return;
    setPriceLoading(true);
    try {
      const intel = await getQuotePriceIntel(customer.id, p.id);
      const cq = intel.sameCustomerQuote;
      const cs = intel.sameCustomerSale;
      const recent = cq && cs ? (cq.date >= cs.date ? cq : cs) : (cq ?? cs);
      setPrice(recent?.amount ?? intel.suggestedPrice ?? '');
      setPriceSource(recent ? (recent === cq ? '近一月報價' : '近一月成交') : intel.suggestedPrice ? '建議售價' : null);
      setHadRecord(!!cq);
    } catch {
      /* 查不到不擋 */
    } finally {
      setPriceLoading(false);
    }
  };

  // 加入 → 低價檢查 → 查客戶預設倉庫存、自動拆現貨/調撥
  const addLine = async () => {
    if (!pending) return;
    const q = Number(qty);
    const pr = Number(price);
    if (!(q > 0) || !(pr >= 0) || price.trim() === '') return;
    const p = pending;
    const wh = defaultWhRef.current ?? whs[0]?.id ?? '';
    // 低價檢查：低於底價且沒填原因 → 擋在加入、跳原因欄
    let belowMinReason: string | undefined;
    if (customer) {
      try {
        const r = await resolvePromotionPrice({ customerId: customer.id, partId: p.id, qty: q, warehouseId: wh || undefined });
        const costTrig = r.cost !== null && pr <= Number(r.cost);
        const minTrig = r.minPrice !== null && pr < Number(r.minPrice);
        if (costTrig || minTrig) {
          if (!floorReason.trim()) {
            setFloorWarn(costTrig ? `單價低於成本 ${r.cost}，請填原因` : `單價低於最低售價 ${r.minPrice}，請填原因`);
            setTimeout(() => document.getElementById('is-floor-reason')?.focus(), 0);
            return;
          }
          belowMinReason = floorReason.trim();
        }
      } catch {
        /* 查不到底價 → 不擋、後端建單仍有最後防線 */
      }
    }
    let allocations: Allocation[] = [{ warehouseId: wh, qty: q, source: 'STOCK' }];
    if (wh) {
      try {
        const bal = await lookupStockBalance(p.id, wh);
        allocations = autoAllocate(wh, q, bal?.availableQty ?? 0);
      } catch {
        /* 查不到 → 單筆現貨、業務手調 */
      }
    }
    setLines((prev) => [
      ...prev,
      {
        partId: p.id,
        partNo: p.code,
        partName: p.name,
        brandName: p.brandName,
        availableTotal: p.availableTotal,
        qty: q,
        unitPrice: pr,
        remark: remark.trim(),
        hadQuoteRecord: hadRecord,
        allocations,
        belowMinReason,
      },
    ]);
    setPending(null);
    setQty('1');
    setPrice('');
    setRemark('');
    setPriceSource(null);
    setHadRecord(false);
    setFloorWarn(null);
    setFloorReason('');
    setPickerKey((k) => k + 1);
  };

  // 分配編輯
  const updateAlloc = (li: number, ai: number, patch: Partial<Allocation>) =>
    setLines((prev) =>
      prev.map((l, i) =>
        i !== li ? l : { ...l, allocations: l.allocations.map((a, j) => (j !== ai ? a : { ...a, ...patch })) },
      ),
    );
  const addAlloc = (li: number) =>
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== li) return l;
        const wh = defaultWhRef.current ?? whs[0]?.id ?? '';
        return { ...l, allocations: [...l.allocations, { warehouseId: wh, qty: 0, source: 'STOCK' as AllocSource }] };
      }),
    );
  const removeAlloc = (li: number, ai: number) =>
    setLines((prev) =>
      prev.map((l, i) =>
        i !== li ? l : l.allocations.length <= 1 ? l : { ...l, allocations: l.allocations.filter((_, j) => j !== ai) },
      ),
    );
  // 換倉 → 重查該倉庫存、自動判現貨/調撥（治「選 A 但 A 沒貨＝等調撥」）
  const changeAllocWh = async (li: number, ai: number, whId: string) => {
    const alloc = linesRef.current[li]?.allocations[ai];
    const partId = linesRef.current[li]?.partId;
    updateAlloc(li, ai, { warehouseId: whId });
    if (!alloc || !partId) return;
    try {
      const bal = await lookupStockBalance(partId, whId);
      updateAlloc(li, ai, { source: (bal?.availableQty ?? 0) >= alloc.qty ? 'STOCK' : 'TRANSFER' });
    } catch {
      /* 查不到 → 保留現值 */
    }
  };

  const allocSum = (l: SalesLine) => l.allocations.reduce((a, x) => a + x.qty, 0);
  const lineOk = (l: SalesLine) =>
    allocSum(l) === l.qty && l.allocations.every((a) => a.source !== 'PEER' || !!a.peerPartnerId);
  const allBalanced = lines.length > 0 && lines.every(lineOk);
  // 同行挑選對話框（哪一列分配在選同行）
  const [peerPick, setPeerPick] = useState<{ li: number; ai: number } | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* 加品項列 */}
      <div className="rounded-xl border border-border/50 bg-background/40 p-3">
        <PartPicker key={pickerKey} onPick={pickPart} autoFocus />
        {pending ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">
                  {pending.code}　{pending.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pending.brandName ?? '—'}・可出 {pending.availableTotal}
                </div>
              </div>
              <label className="flex flex-col text-[10px] text-muted-foreground">
                數量
                <input
                  ref={qtyRef}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), document.getElementById('is-price')?.focus())}
                  inputMode="decimal"
                  className="w-16 rounded border border-border/60 bg-background px-2 py-1 text-right text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col text-[10px] text-muted-foreground">
                單價
                <input
                  id="is-price"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPriceSource('手動');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), document.getElementById('is-remark')?.focus())}
                  inputMode="decimal"
                  placeholder={priceLoading ? '帶價中…' : '0'}
                  className="w-20 rounded border border-border/60 bg-background px-2 py-1 text-right text-sm text-foreground"
                />
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col text-[10px] text-muted-foreground">
                備註
                <input
                  id="is-remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void addLine())}
                  placeholder="選填"
                  className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <button
                type="button"
                onClick={() => void addLine()}
                className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-primary-foreground"
              >
                加入
              </button>
            </div>
            {floorWarn ? (
              <div className="flex items-end gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2">
                <label className="flex flex-1 flex-col text-[10px] font-bold text-destructive">
                  {floorWarn}
                  <input
                    id="is-floor-reason"
                    value={floorReason}
                    onChange={(e) => setFloorReason(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void addLine())}
                    placeholder="低價原因（必填才能加入）"
                    className="mt-0.5 w-full rounded border border-destructive/40 bg-background px-2 py-1 text-sm font-normal text-foreground"
                  />
                </label>
              </div>
            ) : null}
            <div className="text-[10px] text-muted-foreground">
              {priceSource ? `單價來源：${priceSource}` : priceLoading ? '查詢報價中…' : '　'}
              {!hadRecord && !priceLoading ? '・建單時自動生成即時報價紀錄' : ''}
            </div>
          </div>
        ) : (
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            搜尋料號加入，選定後自動帶價、填數量/備註，Enter 一路到加入。加入後在下方配「從哪出」。
          </div>
        )}
      </div>

      {/* 明細清單（每品項一卡 + 出貨分配） */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        {lines.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border/40 text-[12px] text-muted-foreground">
            尚無品項
          </div>
        ) : (
          lines.map((l, li) => {
            const sum = allocSum(l);
            const balanced = sum === l.qty;
            return (
              <div key={li} className="rounded-xl border border-border/50 p-2.5">
                {/* 品項頭 */}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{l.partNo}</div>
                    <div className="text-[11px] text-muted-foreground">{l.partName}</div>
                    {l.remark ? <div className="text-[11px] text-amber-600">※ {l.remark}</div> : null}
                  </div>
                  <div className="text-right text-[12px]">
                    <div className="tabular-nums">
                      {nf.format(l.qty)} × {money(l.unitPrice)}
                    </div>
                    <div className="font-bold tabular-nums">{money(l.qty * l.unitPrice)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== li))}
                    aria-label="移除品項"
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* 出貨分配 */}
                <div className="mt-2 border-t border-border/30 pt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">出貨分配</span>
                    <span className={balanced ? 'text-[10px] text-primary' : 'text-[10px] font-bold text-destructive'}>
                      已配 {nf.format(sum)}/{nf.format(l.qty)}
                      {balanced ? ' ✓' : ' ⚠'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {l.allocations.map((a, ai) => (
                      <div key={ai}>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={a.warehouseId}
                          onChange={(e) => void changeAllocWh(li, ai, e.target.value)}
                          className="min-w-0 flex-1 rounded border border-border/60 bg-background px-1.5 py-1 text-[12px] text-foreground"
                        >
                          {whs.length === 0 ? <option value={a.warehouseId}>{whName(a.warehouseId)}</option> : null}
                          {whs.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.code}　{w.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={String(a.qty)}
                          onChange={(e) => updateAlloc(li, ai, { qty: Math.max(0, Number(e.target.value) || 0) })}
                          inputMode="decimal"
                          className="w-14 rounded border border-border/60 bg-background px-1.5 py-1 text-right text-[12px] text-foreground"
                        />
                        <div className="flex overflow-hidden rounded border border-border/60">
                          {(['STOCK', 'TRANSFER', 'PEER'] as AllocSource[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                if (s === 'PEER') {
                                  // 同行：先選對象（詢價紀錄/現場填價）、選定才落 PEER
                                  setPeerPick({ li, ai });
                                } else {
                                  updateAlloc(li, ai, { source: s, peerPartnerId: undefined, peerLabel: undefined, peerPrice: undefined });
                                }
                              }}
                              className={
                                a.source === s
                                  ? s === 'TRANSFER'
                                    ? 'bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-700'
                                    : s === 'PEER'
                                      ? 'bg-sky-500/20 px-2 py-1 text-[11px] font-bold text-sky-700'
                                      : 'bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary'
                                  : 'px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/40'
                              }
                            >
                              {s === 'STOCK' ? '現貨' : s === 'TRANSFER' ? '調撥' : '同行'}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAlloc(li, ai)}
                          disabled={l.allocations.length <= 1}
                          aria-label="刪分配"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {a.source === 'PEER' ? (
                        <button
                          type="button"
                          onClick={() => setPeerPick({ li, ai })}
                          className="ml-1 mt-0.5 text-[10px] text-sky-700 underline-offset-2 hover:underline"
                        >
                          {a.peerLabel
                            ? `${a.peerLabel}${a.peerPrice ? `・詢價 $${a.peerPrice}` : ''}（點我換）`
                            : '⚠ 未選同行對象（點我選）'}
                        </button>
                      ) : null}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addAlloc(li)}
                    className="mt-1.5 rounded border border-dashed border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    ＋ 分配（拆倉／調撥）
                  </button>
                  {l.allocations.some((a) => a.source === 'TRANSFER') ? (
                    <span className="ml-2 text-[10px] text-amber-600">含等調撥・建單時自動開調撥單</span>
                  ) : null}
                  {l.allocations.some((a) => a.source === 'PEER') ? (
                    <span className="ml-2 text-[10px] text-sky-700">含同行調貨・建單時自動開調貨單</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between">
        {!customer ? (
          <span className="text-[11px] text-amber-600">尚未選客戶（步驟 1），無法自動帶價</span>
        ) : !allBalanced && lines.length > 0 ? (
          <span className="text-[11px] text-destructive">有品項分配未配平，配平才能進下一步</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Alt+S 存檔並進下一步</span>
        )}
        <button
          type="button"
          disabled={!allBalanced}
          onClick={() => setConfirmOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步：交易 →
        </button>
      </div>

      {/* 同行對象挑選（詢價紀錄 / 現場填價逃生門） */}
      {peerPick ? (
        <PeerPickDialog
          line={lines[peerPick.li]}
          allocQty={lines[peerPick.li]?.allocations[peerPick.ai]?.qty ?? 1}
          onPick={(peer) => {
            updateAlloc(peerPick.li, peerPick.ai, {
              source: 'PEER',
              peerPartnerId: peer.partnerId,
              peerLabel: peer.label,
              peerPrice: peer.price,
            });
            setPeerPick(null);
          }}
          onClose={() => setPeerPick(null)}
        />
      ) : null}

      {/* Alt+S / 下一步 → 明細確認視窗（確認後進交易步驟） */}
      {confirmOpen ? (
        <FocusLockedDialog
          open
          onClose={() => setConfirmOpen(false)}
          initialFocusRef={confirmBtnRef}
          ariaLabel="確認明細"
          backdropClassName="bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-100"
          dialogClassName="w-[360px] rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-4">
            <h3 className="text-sm font-bold">確認明細</h3>
            <div className="mt-2 space-y-1 text-[13px]">
              <div>
                <span className="text-muted-foreground">客戶　</span>
                {customer ? `${customer.code}　${customer.name}` : '—'}
              </div>
              <div>
                <span className="text-muted-foreground">品項　</span>
                {lines.length} 項・總數量 {nf.format(lines.reduce((a, l) => a + l.qty, 0))}
              </div>
              <div>
                <span className="text-muted-foreground">金額　</span>
                <span className="font-bold text-primary">
                  {money(lines.reduce((a, l) => a + l.qty * l.unitPrice, 0))}
                </span>
                （未稅）
              </div>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">確認後進入「交易」設定。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-border/60 px-3 py-1.5 text-sm hover:bg-muted/40"
              >
                取消
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onNext();
                }}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground"
              >
                確認 →
              </button>
            </div>
          </div>
        </FocusLockedDialog>
      ) : null}
    </div>
  );
}

/** 同行對象挑選：列該料詢價紀錄選一筆（帶對象+價）；逃生門＝現場填價（挑同行+填價→補詢價紀錄）。
 *  拍板（執行長 2026-07-18/19）：查無詢價紀錄 → 擋、提示先詢價或現場填價；現場填價立即補一筆詢價紀錄
 *  （原子日誌語意：真的問到價就記）。TI 成本由後端自動取「該同行×該料最近詢價紀錄」、此處選誰=綁定對象。 */
function PeerPickDialog({
  line,
  allocQty,
  onPick,
  onClose,
}: {
  line: SalesLine | undefined;
  allocQty: number;
  onPick: (p: { partnerId: string; label: string; price?: string }) => void;
  onClose: () => void;
}) {
  const [recs, setRecs] = useState<InquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualPeer, setManualPeer] = useState<PickedCustomer | null>(null);
  const [manualPrice, setManualPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 該料詢價紀錄（partNo 快照過濾、近的在前）
  useEffect(() => {
    if (!line) return;
    let alive = true;
    listInquiryRecords({ partNo: line.partNo, pageSize: 20 })
      .then((r) => {
        if (alive) setRecs(r.items.filter((x) => x.partId === line.partId));
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [line]);

  if (!line) return null;

  // 逃生門：現場填價 → 立即補一筆詢價紀錄 → 選用
  const saveManual = async () => {
    if (!manualPeer || !(Number(manualPrice) >= 0) || manualPrice.trim() === '') return;
    setSaving(true);
    setErr(null);
    try {
      await createInquiryRecord({
        sourcePartnerId: manualPeer.id,
        partId: line.partId,
        qty: allocQty > 0 ? allocQty : 1,
        unitPrice: Number(manualPrice),
        remark: '即時銷售現場填價',
      });
      onPick({ partnerId: manualPeer.id, label: `${manualPeer.code}　${manualPeer.name}`, price: manualPrice });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '詢價紀錄建立失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FocusLockedDialog
      open
      onClose={onClose}
      ariaLabel="選同行調貨對象"
      backdropClassName="bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-100"
      dialogClassName="flex max-h-[80vh] w-[460px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="border-b border-border/40 px-4 py-2.5">
        <h3 className="text-sm font-bold">同行調貨對象</h3>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {line.partNo}　{line.partName}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mb-1 text-[11px] font-bold text-muted-foreground">詢價紀錄（選一筆帶對象與價）</div>
        {loading ? (
          <div className="py-4 text-center text-[12px] text-muted-foreground">載入中…</div>
        ) : recs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 p-3 text-[12px] text-muted-foreground">
            此料尚無詢價紀錄——先到站 3 即時調貨詢價問價，或下方「現場填價」直接記一筆。
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {recs.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  onPick({
                    partnerId: r.sourcePartnerId,
                    label: `${r.partnerCode ?? ''}　${r.partnerName ?? ''}`.trim(),
                    price: r.unitPrice,
                  })
                }
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-left hover:border-sky-500/60 hover:bg-sky-500/5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">
                    {r.partnerCode}　{r.partnerName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{r.recordDate?.slice(0, 10)}</span>
                </span>
                <span className="ml-2 shrink-0 font-bold tabular-nums text-sky-700">${r.unitPrice}</span>
              </button>
            ))}
          </div>
        )}

        {/* 逃生門：現場填價 */}
        <div className="mt-3 rounded-xl border border-border/50 bg-background/40 p-3">
          <div className="mb-1.5 text-[11px] font-bold text-muted-foreground">
            現場填價（剛問到的價、順手補一筆詢價紀錄）
          </div>
          {/* 帳戶閘門 v1.3：現場同行=可調貨（同行身分∩調貨付款戶） */}
          <CustomerPicker onPick={setManualPeer} onCommit={() => undefined} gate="TRANSFER" />
          <div className="mt-2 flex items-end gap-2">
            <label className="flex flex-col text-[10px] text-muted-foreground">
              同行報價
              <input
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void saveManual())}
                inputMode="decimal"
                placeholder="0"
                className="w-24 rounded border border-border/60 bg-background px-2 py-1 text-right text-sm text-foreground"
              />
            </label>
            <button
              type="button"
              disabled={!manualPeer || manualPrice.trim() === '' || saving}
              onClick={() => void saveManual()}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40"
            >
              {saving ? '記錄中…' : '記詢價並選用'}
            </button>
          </div>
          {err ? <div className="mt-1 text-[11px] text-destructive">{err}</div> : null}
        </div>
      </div>
    </FocusLockedDialog>
  );
}

/** 選項膠囊組（付款/發票/取貨共用；鍵盤 radiogroup：←→↑↓ 選、Tab 進出、預設值標示）
 *  export：站 5 即時銷退（InstantSalesReturnWorkspace）取件方式共用（2026-07-19） */
export function PillGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hint,
  defaultValue,
  autoFocusGroup,
  onEnter,
  containerRef,
}: {
  label: string;
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  hint?: string;
  /** 客戶預設值 → 該顆標「預設」徽章 + 底色，讓業務知道停在預設上 */
  defaultValue?: T;
  /** 進站聚焦此組（步驟第一組用） */
  autoFocusGroup?: boolean;
  /** Enter → 前進下一欄（父層聚焦下一個欄位） */
  onEnter?: () => void;
  /** 外部拿 radiogroup 容器（父層 Enter 前進時聚焦本組選中顆用） */
  containerRef?: React.Ref<HTMLDivElement>;
}) {
  const idx = Math.max(
    options.findIndex((o) => o.v === value),
    0,
  );
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (autoFocusGroup) btnRefs.current[idx]?.focus();
    // 僅進站聚焦一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusGroup]);

  const move = (d: number) => {
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].v);
    btnRefs.current[n]?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div>
      <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">{label}</div>
      <div ref={containerRef} role="radiogroup" aria-label={label} onKeyDown={onKey} className="flex flex-wrap gap-2">
        {options.map((o, i) => {
          const selected = value === o.v;
          const isDefault = defaultValue !== undefined && o.v === defaultValue;
          return (
            <button
              key={String(o.v)}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(o.v)}
              className={
                (selected
                  ? 'border-primary bg-primary/15 font-bold text-primary'
                  : isDefault
                    ? 'border-primary/40 bg-primary/5 text-foreground hover:border-primary/60'
                    : 'border-border/60 text-foreground hover:border-primary/40') +
                ' relative rounded-lg border px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
              }
            >
              {o.label}
              {isDefault ? (
                <span
                  title="客戶預設"
                  className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full border border-primary/50 bg-background text-primary"
                >
                  <Star size={9} fill="currentColor" strokeWidth={0} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** 步驟 3：交易（付款條件 + 發票種類 + 帳期 + 取貨方式） */
function TransactionStep({
  custDefaults,
  paymentTerm,
  setPaymentTerm,
  invoiceCopies,
  setInvoiceCopies,
  accountPeriod,
  setAccountPeriod,
  deliveryType,
  setDeliveryType,
  deliveryAddress,
  setDeliveryAddress,
  customerId,
  addresses,
  onAddressCreated,
  onNext,
}: {
  custDefaults: CustomerDefaults | null;
  paymentTerm: string;
  setPaymentTerm: (v: string) => void;
  invoiceCopies: number;
  setInvoiceCopies: (v: number) => void;
  accountPeriod: string;
  setAccountPeriod: (v: string) => void;
  deliveryType: string;
  setDeliveryType: (v: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  customerId: string | null;
  addresses: PartnerAddressRow[];
  onAddressCreated: (row: PartnerAddressRow) => void;
  onNext: () => void;
}) {
  // 客戶預設（標星號用）
  const defaultInvoice = custDefaults?.defaultInvoiceCopies ?? 3;
  const defaultTerm = custDefaults?.paymentTermDomestic;
  // 付款條件選項：客戶預設值若不在標準清單（如 NET45/INSTALLMENT）→ 補進去
  const termOptions =
    defaultTerm && !PAYMENT_TERMS.some((t) => t.v === defaultTerm)
      ? [{ v: defaultTerm, label: paymentTermLabel(defaultTerm) }, ...PAYMENT_TERMS]
      : PAYMENT_TERMS;
  const rolled = custDefaults?.statementDay && new Date().getDate() > custDefaults.statementDay;
  const invoiceGroupRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const deliveryGroupRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const focusSelectedIn = (el: HTMLDivElement | null) =>
    el?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();

  // ── 送貨地點下拉（客戶送貨地點表 nx01_partner_address SHIPPING；執行長 2026-07-19）──
  // 輸入即過濾常用地點、↑↓ 選 Enter 帶入；打的內容不在清單 → 尾列「＋存入客戶送貨地點」
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrHi, setAddrHi] = useState(0);
  // 是否按過 ↑↓（「＋存入」列只有主動移過去 Enter 才觸發；直接 Enter＝手打註記走下一步、不誤存）
  const [addrNav, setAddrNav] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrSaveErr, setAddrSaveErr] = useState<string | null>(null);
  const addrListRef = useRef<HTMLDivElement>(null);
  const q = deliveryAddress.trim();
  const addrEntries = addresses.map((a) => ({ a, line: shipAddressOneLine(a) })).filter((e) => e.line);
  const addrFiltered = q
    ? addrEntries.filter((e) => e.line.includes(q) || (e.a.label ?? '').includes(q))
    : addrEntries;
  // 快速存入：有客戶、有內容、不與既有列完全相同；> 100 字超過欄寬不給存（streetName VARCHAR(100)）
  const canQuickSave =
    !!customerId && !!q && q.length <= 100 && !addrEntries.some((e) => e.line === q) && !addrSaving;
  const addrOptionCount = addrFiltered.length + (canQuickSave ? 1 : 0);
  useEffect(() => {
    setAddrHi((h) => Math.min(h, Math.max(0, addrOptionCount - 1)));
  }, [addrOptionCount]);
  useEffect(() => {
    addrListRef.current?.querySelector(`[data-hi="${addrHi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [addrHi, addrOpen]);

  const pickAddr = (line: string) => {
    setDeliveryAddress(line);
    setAddrOpen(false);
  };
  // 快速建立：寫進 streetName（TW 組字含街道、主檔地址管理也看得到／可再補齊細欄）；
  // 不用 freeformAddress——那是非 TW 專用、TW 組字不吃、其他模組會顯示成空地址
  const quickSaveAddr = async () => {
    if (!customerId || !canQuickSave) return;
    setAddrSaving(true);
    setAddrSaveErr(null);
    try {
      const row = await createPartnerAddress(customerId, {
        addressType: 'SHIPPING',
        streetName: q,
        isDefault: addresses.length === 0,
      });
      onAddressCreated(row);
      setAddrOpen(false);
    } catch (e) {
      setAddrSaveErr(e instanceof Error ? e.message : '存入失敗');
    } finally {
      setAddrSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PillGroup
        label="付款條件"
        options={termOptions}
        value={paymentTerm}
        onChange={setPaymentTerm}
        defaultValue={defaultTerm}
        autoFocusGroup
        onEnter={() => focusSelectedIn(invoiceGroupRef.current)}
        hint="★ 為客戶主檔預設；←→ 選、Enter 到發票種類。"
      />
      <PillGroup
        label="發票種類"
        options={INVOICE_OPTS}
        value={invoiceCopies}
        onChange={setInvoiceCopies}
        defaultValue={defaultInvoice}
        containerRef={invoiceGroupRef}
        onEnter={() => monthRef.current?.focus()}
      />
      <div>
        <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">帳期（帳款年月）</div>
        <input
          ref={monthRef}
          type="month"
          value={accountPeriod}
          onChange={(e) => setAccountPeriod(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              focusSelectedIn(deliveryGroupRef.current);
            }
          }}
          className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground"
        />
        {custDefaults?.statementDay ? (
          <div className="mt-1 text-[11px] text-muted-foreground">
            客戶結帳日 {custDefaults.statementDay} 號{rolled ? '・今天已過 → 預設切下月帳' : '・今天未過 → 本月帳'}
          </div>
        ) : (
          <div className="mt-1 text-[11px] text-muted-foreground">客戶未設結帳日 → 預設本月；可手動調整。</div>
        )}
      </div>
      <PillGroup
        label="取貨方式"
        options={DELIVERY_OPTS}
        value={deliveryType}
        onChange={setDeliveryType}
        containerRef={deliveryGroupRef}
        onEnter={() => addressRef.current?.focus()}
      />
      <div>
        <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">
          送貨地點 <span className="text-destructive">*</span>
        </div>
        <div className="relative">
          <input
            ref={addressRef}
            value={deliveryAddress}
            onChange={(e) => {
              setDeliveryAddress(e.target.value);
              setAddrOpen(true);
              setAddrNav(false);
              setAddrSaveErr(null);
            }}
            onFocus={() => {
              if (addrOptionCount > 0) setAddrOpen(true);
              setAddrHi(0);
              setAddrNav(false);
            }}
            onBlur={() => setTimeout(() => setAddrOpen(false), 120)}
            onKeyDown={(e) => {
              if (addrOpen && addrOptionCount > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setAddrHi((h) => Math.min(addrOptionCount - 1, h + 1));
                  setAddrNav(true);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setAddrHi((h) => Math.max(0, h - 1));
                  setAddrNav(true);
                  return;
                }
                if (e.key === 'Escape') {
                  // 只收下拉、不關整站（stopPropagation 擋住 FocusLockedDialog 的 Esc）
                  e.preventDefault();
                  e.stopPropagation();
                  setAddrOpen(false);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (addrHi < addrFiltered.length) {
                    const line = addrFiltered[addrHi].line;
                    // 高亮列＝已填的內容 → 視為確認、直接下一步
                    if (line === q) {
                      setAddrOpen(false);
                      onNext();
                    } else pickAddr(line);
                  } else if (addrNav) {
                    // 主動 ↑↓ 移到「＋存入」列才存；沒移過＝手打註記、Enter 走下一步
                    void quickSaveAddr();
                  } else if (q) {
                    setAddrOpen(false);
                    onNext();
                  }
                  return;
                }
              }
              if (e.key === 'Enter' && deliveryAddress.trim()) {
                e.preventDefault();
                onNext();
              }
            }}
            maxLength={200}
            placeholder="送哪裡／誰來取（例：送林口B店、王先生下午來取）"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground"
          />
          {addrOpen && addrOptionCount > 0 ? (
            <div
              ref={addrListRef}
              className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg"
            >
              {addrFiltered.map((e, i) => (
                <button
                  key={e.a.id}
                  type="button"
                  data-hi={i}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    pickAddr(e.line);
                  }}
                  className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm ${i === addrHi ? 'bg-primary/15' : ''} hover:bg-accent/15`}
                >
                  {e.a.isDefault ? <Star size={11} className="shrink-0 fill-primary text-primary" /> : null}
                  {e.a.label ? (
                    <span className="shrink-0 rounded bg-muted/60 px-1 text-[10px] text-muted-foreground">
                      {e.a.label}
                    </span>
                  ) : null}
                  <span className="truncate">{e.line}</span>
                </button>
              ))}
              {canQuickSave ? (
                <button
                  type="button"
                  data-hi={addrFiltered.length}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    void quickSaveAddr();
                  }}
                  className={`block w-full border-t border-border/40 px-2 py-1.5 text-left text-sm text-primary ${addrFiltered.length === addrHi ? 'bg-primary/15' : ''} hover:bg-accent/15`}
                >
                  ＋ 把「{q}」存入客戶送貨地點
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          必填——常有「A 叫貨送 B 地點」「A 叫貨 B 來取」，要寫清楚給倉庫。↑↓ 選常用地點、Enter 帶入。
        </div>
        {addrSaving ? <div className="mt-1 text-[11px] text-muted-foreground">存入客戶送貨地點…</div> : null}
        {addrSaveErr ? <div className="mt-1 text-[11px] text-destructive">存入失敗：{addrSaveErr}</div> : null}
      </div>
      <div className="mt-auto flex items-center justify-end gap-3">
        {!deliveryAddress.trim() ? <span className="text-[11px] text-destructive">送貨地點未填</span> : null}
        <button
          type="button"
          disabled={!deliveryAddress.trim()}
          onClick={onNext}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          下一步：確認 →
        </button>
      </div>
    </div>
  );
}

/** 步驟 4：確認（覆核 + 自動拆單預覽 + 送出建單） */
function ConfirmStep({
  customer,
  lines,
  deliveryType,
  deliveryAddress,
  invoiceCopies,
  submitting,
  submitError,
  onSubmit,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  deliveryType: string;
  deliveryAddress: string;
  invoiceCopies: number;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}) {
  const deliveryLabel = DELIVERY_OPTS.find((d) => d.v === deliveryType)?.label ?? deliveryType;
  const allAllocs = lines.flatMap((l) => l.allocations);
  const stockLines = allAllocs.filter((a) => a.source === 'STOCK').length;
  const transferLines = allAllocs.filter((a) => a.source === 'TRANSFER').length;
  const peerPartners = new Set(
    allAllocs.filter((a) => a.source === 'PEER' && a.peerPartnerId).map((a) => a.peerPartnerId),
  );
  const peerLines = allAllocs.filter((a) => a.source === 'PEER').length;
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const total = subtotal + Math.round((subtotal * taxRateOf(invoiceCopies)) / 100);
  // Alt+數字可跳步繞過 Step2 守門 → 這裡再擋一次（含同行未選對象）
  const unbalanced = lines.some(
    (l) =>
      l.allocations.some((a) => !(a.qty > 0) || !a.warehouseId || (a.source === 'PEER' && !a.peerPartnerId)) ||
      l.allocations.reduce((s, a) => s + a.qty, 0) !== l.qty,
  );

  // 掛載自動聚焦「建立訂單」鈕（執行長 2026-07-19 抓的 bug：步驟 3 Enter 進來後焦點掉到 body、
  // modal 守衛把下一鍵拉回視窗第一個可聚焦元素＝標題列 X → 連按 Enter 變成關窗而不是送出）
  // 鈕 disabled（沒品項/未配平）時改聚焦容器、鍵盤留在視窗內
  const submitRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const btn = submitRef.current;
    if (btn && !btn.disabled) btn.focus();
    else rootRef.current?.focus();
  }, []);

  return (
    <div ref={rootRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col gap-3 outline-none">
      <div className="rounded-xl border border-border/40 p-3 text-[13px]">
        <div>
          <span className="text-muted-foreground">客戶　</span>
          {customer ? `${customer.code}　${customer.name}` : '—'}
        </div>
        <div className="mt-1">
          <span className="text-muted-foreground">取貨　</span>
          {deliveryLabel}・含稅合計 <span className="font-bold text-primary">{money(total)}</span>
        </div>
        <div className="mt-1">
          <span className="text-muted-foreground">地點　</span>
          {deliveryAddress.trim() || <span className="text-destructive">未填（回步驟 3）</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">料號 / 品名</th>
              <th className="px-2 py-1.5 text-right font-medium">數量</th>
              <th className="px-2 py-1.5 text-right font-medium">單價</th>
              <th className="px-2 py-1.5 text-left font-medium">出貨</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-border/30 align-top">
                <td className="px-2 py-1.5">
                  <div className="font-medium">{l.partNo}</div>
                  <div className="text-[11px] text-muted-foreground">{l.partName}</div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{nf.format(l.qty)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{money(l.unitPrice)}</td>
                <td className="px-2 py-1.5 text-[11px]">
                  {l.allocations.map((a, j) => (
                    <div
                      key={j}
                      className={
                        a.source === 'TRANSFER'
                          ? 'text-amber-600'
                          : a.source === 'PEER'
                            ? 'text-sky-700'
                            : 'text-muted-foreground'
                      }
                    >
                      {nf.format(a.qty)}{' '}
                      {a.source === 'TRANSFER' ? '等調撥' : a.source === 'PEER' ? `同行（${a.peerLabel ?? '?'}）` : '現貨'}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-[12px]">
        <span className="font-bold text-foreground">將產生：</span>
        <span className="text-muted-foreground">
          {' '}
          銷貨單 ×1（現貨 {stockLines} 行
          {transferLines ? ` + 等調撥 ${transferLines} 行` : ''}
          {peerLines ? ` + 同行 ${peerLines} 行` : ''}）
          {transferLines ? `、調撥單 ×${transferLines}（自動開、系統配來源倉）` : ''}
          {peerPartners.size ? `、調貨單 ×${peerPartners.size}（自動開、成本帶詢價紀錄）` : ''}
        </span>
      </div>

      {submitError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {submitError}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {unbalanced ? <span className="text-[11px] text-destructive">有品項分配未配平（回步驟 2 調整）</span> : null}
        <button
          ref={submitRef}
          type="button"
          disabled={submitting || lines.length === 0 || unbalanced}
          onClick={onSubmit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {submitting ? '建立中…' : '建立訂單 → 送撿貨'}
        </button>
      </div>
    </div>
  );
}

/** 步驟 5：訊息（建單結果 + 客戶訊息；右側面板設定顯示項） */
function MessageStep({
  customer,
  lines,
  invoiceCopies,
  result,
  msgOpts,
  onClose,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  invoiceCopies: number;
  result: OrderResult | null;
  msgOpts: MsgOpts;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // 掛載自動聚焦「完成・下一單」（同步驟 4 的焦點掉 body 問題；建單完成後 Enter＝收單、不會誤觸 X）
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    doneRef.current?.focus();
  }, []);
  if (!result) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-muted-foreground">尚未建立訂單。</div>
    );
  }
  const msg = buildMessage(customer?.name ?? '', result.docNo, lines, msgOpts, invoiceCopies);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 複製失敗忽略 */
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-xl border border-primary/40 bg-primary/8 p-3">
        <div className="text-sm font-bold text-primary">✓ 訂單已建立　{result.docNo}</div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          現貨 {result.stockLines} 行已送撿貨清單
          {result.transferLines ? `；等調撥 ${result.transferLines} 行已自動開調撥單、到貨後接續出貨` : ''}
          {result.tiDocNos.length ? `；同行調貨單 ${result.tiDocNos.join('、')} 已開立（草稿、待採購端跟催）` : ''}。
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-muted-foreground">客戶訊息</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-border/60 px-2.5 py-1 text-[12px] hover:bg-muted/40"
        >
          {copied ? '已複製 ✓' : '複製訊息'}
        </button>
      </div>
      <textarea
        readOnly
        value={msg}
        className="min-h-0 flex-1 resize-none rounded-xl border border-border/40 bg-background/40 p-3 font-mono text-[12px] text-foreground"
      />

      <div className="flex justify-end">
        <button
          ref={doneRef}
          type="button"
          onClick={onClose}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          完成・下一單
        </button>
      </div>
    </div>
  );
}

/** 右側：Step 5 客戶訊息顯示設定（存 localStorage） */
function MessageOptionsPanel({ opts, onChange }: { opts: MsgOpts; onChange: (patch: Partial<MsgOpts>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] font-bold text-muted-foreground">訊息顯示項目</div>
      <div className="flex flex-col gap-1.5">
        {MSG_OPT_DEFS.map((o) => {
          const on = opts[o.key];
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange({ [o.key]: !on })}
              className={
                (on ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border/60 text-muted-foreground') +
                ' flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[13px] hover:border-primary/40'
              }
            >
              <span>{o.label}</span>
              <span
                className={
                  (on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground') +
                  ' rounded px-1.5 py-0.5 text-[10px] font-bold'
                }
              >
                {on ? 'ON' : 'OFF'}
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-muted-foreground">設定會記住（下次沿用）。</div>
    </div>
  );
}

/** 右側：訂單摘要（客戶 + 明細合計 + 未稅/稅額/含稅，稅隨發票種類） */
function OrderSummary({
  customer,
  lines,
  invoiceCopies,
}: {
  customer: PickedCustomer | null;
  lines: SalesLine[];
  invoiceCopies: number;
}) {
  const totalQty = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const rate = taxRateOf(invoiceCopies);
  const tax = Math.round((subtotal * rate) / 100);
  const total = subtotal + tax;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] font-bold text-muted-foreground">訂單摘要</div>
      <div className="rounded-xl border border-border/40 p-3">
        <div className="text-[11px] text-muted-foreground">客戶</div>
        <div className="mt-0.5 text-sm font-medium">
          {customer ? `${customer.code}　${customer.name}` : <span className="text-muted-foreground">未選</span>}
        </div>
      </div>
      <div className="rounded-xl border border-border/40 p-3">
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">品項數</span>
          <span className="font-medium tabular-nums">{lines.length}</span>
        </div>
        <div className="mt-1 flex justify-between text-[12px]">
          <span className="text-muted-foreground">總數量</span>
          <span className="font-medium tabular-nums">{nf.format(totalQty)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border/30 pt-2 text-[13px]">
          <span className="text-muted-foreground">未稅</span>
          <span className="tabular-nums">{money(subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-[13px]">
          <span className="text-muted-foreground">稅額（{rate}%）</span>
          <span className="tabular-nums">{money(tax)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border/30 pt-1.5 text-sm">
          <span className="font-bold">含稅合計</span>
          <span className="font-bold tabular-nums text-primary">{money(total)}</span>
        </div>
        {invoiceCopies === 0 ? (
          <div className="mt-1 text-[10px] text-amber-600">不開發票 → 稅額 0</div>
        ) : null}
      </div>
    </div>
  );
}
