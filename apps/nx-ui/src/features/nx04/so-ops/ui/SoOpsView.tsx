// apps/nx-ui/src/features/nx04/so-ops/ui/SoOpsView.tsx
//
// 建立銷貨單（銷售第 2 格 ▸ 1）—— v3.0.0 一頁式，取代舊的「即時銷售」浮層工作站。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §6 §7
//
// ⭐ 五段沿用舊浮層工作站（執行長 2026-08-02：版面直接沿用、只是不再是彈窗）：
//      客戶 → 明細 → 交易 → 確認 → 訊息
//    每一段都是「左做事、右看資料」的兩欄（FlowPanes），⛔ 不再各想一套。
//
// ⭐ 鍵盤模型與「建立報價」完全一致（執行長 2026-08-02 拍板統一）：
//      Enter＝進右欄　·　Esc＝回左欄　·　Alt+1~5＝跳段
//    ⛔ Enter 不跳段。
//
// ⚠️ 規則不重寫：出貨分配、帳期、稅率、訊息格式全部 import 自 features/nx04/sales/so-draft.ts，
//    與舊浮層工作站共用同一份，⛔ 不複製（避免兩邊 drift）。
//
// ⚠️ 這一頁會真的開單（建 SO → 確認 → 後端自動開調撥單 → 逐同行建調貨單 → 補報價紀錄）。
//    ⛔ 送出流程（buildOrder）沿用舊站邏輯逐段搬過來，⛔ 不自己重寫——那 390 行是實戰規則。

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { listWarehouses } from '@data/endpoints/nx01/api/warehouse';
import { lookupStockBalance } from '@data/endpoints/nx03/stock-balance/api/lookup';
import { getQuotePriceIntel } from '@data/endpoints/nx04/quote/api/quote';
import { createQuoteRecord } from '@data/endpoints/nx04/record/api/record';
import { createSo, createTiFromSo, softDeleteSo, updateSo } from '@data/endpoints/nx04/so/api/so';
import {
  listPartnerAddresses,
  type PartnerAddressRow,
} from '@data/endpoints/shared/address/partner-address-api';
import { getPartner } from '@data/endpoints/shared/master/partner/api/partner';
import type { PartnerDto } from '@data/types/shared/master/partner';
import { FlowPanes } from '@design/templates/FlowPanes';
import { FlowTemplate, type FlowApi, type FlowSection } from '@design/templates/FlowTemplate';

import { CustomerPicker, type PickedCustomer } from '../../quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '../../quote/ui/PartPicker';
import {
  autoAllocate,
  buildSalesMessage,
  DEFAULT_SALES_MSG_OPTS,
  defaultAccountPeriod,
  DELIVERY_OPTS,
  INVOICE_OPTS,
  money,
  nf,
  PAYMENT_TERMS,
  paymentTermLabel,
  SALES_MSG_OPT_DEFS,
  SALES_MSG_OPTS_KEY,
  shipAddressOneLine,
  taxRateOf,
  type CustomerDefaults,
  type OrderResult,
  type SalesLine,
  type SalesMsgOpts,
} from '../../sales/so-draft';

/** 出貨分配來源 → 看得懂的字 */
const SOURCE_LABEL: Record<string, string> = {
  STOCK: '現貨',
  TRANSFER: '等調撥',
  PEER: '同行調貨',
};

export function SoOpsView() {
  // ── 建單草稿（欄位與舊浮層工作站一致）──
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [profile, setProfile] = useState<PartnerDto | null>(null);
  const [custDefaults, setCustDefaults] = useState<CustomerDefaults | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);
  const [paymentTerm, setPaymentTerm] = useState('');
  const [invoiceCopies, setInvoiceCopies] = useState(3);
  const [accountPeriod, setAccountPeriod] = useState(() => defaultAccountPeriod(null));
  const [deliveryType, setDeliveryType] = useState('P');
  /** 送貨地點／取貨註記（執行長 2026-07-18：必填——A 叫貨送 B、B 來取都要寫清楚） */
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [shipAddresses, setShipAddresses] = useState<PartnerAddressRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  /** 明細段：左欄選到第幾列、鍵盤在哪一側（與報價段同一個模型） */
  const [lineSel, setLineSel] = useState(0);
  const [itemsPane, setItemsPane] = useState<'list' | 'props'>('list');

  const [msgOpts, setMsgOpts] = useState<SalesMsgOpts>(DEFAULT_SALES_MSG_OPTS);

  const flowApi = useRef<FlowApi | null>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const lineListRef = useRef<HTMLDivElement>(null);
  const itemPropRef = useRef<HTMLDivElement>(null);
  const pickedCustomerIdRef = useRef<string | null>(null);

  // 進來先鎖客戶欄（與報價頁一致）
  useEffect(() => {
    customerRef.current?.focus();
  }, []);

  // 倉別清單（把 warehouseId 翻成看得懂的倉名）
  useEffect(() => {
    listWarehouses({ pageSize: 100, isActive: true })
      .then((r) => setWarehouses(r.items.map((w) => ({ id: w.id, code: w.code, name: w.name }))))
      .catch(() => {
        /* 抓不到就顯示代碼，⛔ 不擋流程 */
      });
  }, []);

  // 訊息顯示設定（會記住）。⚠️ 與舊浮層工作站共用同一把鑰匙，⛔ 不另開
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SALES_MSG_OPTS_KEY);
      if (raw) setMsgOpts({ ...DEFAULT_SALES_MSG_OPTS, ...JSON.parse(raw) });
    } catch {
      /* 壞掉的設定當作沒有 */
    }
  }, []);
  const setMsgOpt = useCallback((key: keyof SalesMsgOpts, value: boolean) => {
    setMsgOpts((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(SALES_MSG_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* 存不了不擋 */
      }
      return next;
    });
  }, []);

  const whName = useCallback(
    (id: string) => warehouses.find((w) => w.id === id)?.name ?? id.slice(-6),
    [warehouses],
  );

  /**
   * 選客戶 → 帶回客戶預設（結帳日算帳期、發票聯式、付款條件）＋ 送貨地點清單。
   * ⚠️ 邏輯與舊浮層工作站一致，⛔ 不自己改規則。
   */
  const handlePickCustomer = useCallback((c: PickedCustomer) => {
    // 換不同客戶 → 送貨地點歸零（舊客戶的地址帶到新客戶是錯資料）
    if (pickedCustomerIdRef.current !== null && pickedCustomerIdRef.current !== c.id) {
      setDeliveryAddress('');
    }
    pickedCustomerIdRef.current = c.id;
    setCustomer(c);
    getPartner(c.id)
      .then((p) => {
        setProfile(p);
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
    setShipAddresses([]);
    listPartnerAddresses(c.id)
      .then((rows) => {
        const ship = rows.filter((r) => r.addressType === 'SHIPPING' && r.isActive);
        setShipAddresses(ship);
        const def = ship.find((r) => r.isDefault) ?? ship[0];
        const line = def ? shipAddressOneLine(def) : '';
        // 欄位空著才填，⛔ 不蓋掉手打的內容
        if (line) setDeliveryAddress((prev) => prev || line);
      })
      .catch(() => {
        /* 清單抓不到不擋、留手填 */
      });
  }, []);

  /**
   * 加一支料進明細：帶建議價、依客戶預設倉的可用量自動拆出貨分配。
   * ⚠️ 帶價與「有沒有近一月報價紀錄」都沿用舊站的來源（getQuotePriceIntel）。
   */
  const addPart = useCallback(
    async (p: PickedPart) => {
      if (lines.some((l) => l.partId === p.id)) return; // 同一支料不重複加
      const wh = customer?.defaultWarehouseId ?? warehouses[0]?.id ?? '';
      let unitPrice = 0;
      let hadQuoteRecord = false;
      if (customer) {
        try {
          const intel = await getQuotePriceIntel(customer.id, p.id);
          unitPrice = Number(intel.sameCustomerSale?.amount ?? intel.suggestedPrice ?? 0) || 0;
          hadQuoteRecord = !!intel.sameCustomerQuote;
        } catch {
          /* 帶不到價就留 0、由業務自己填 */
        }
      }
      let avail = 0;
      if (wh) {
        try {
          const bal = await lookupStockBalance(p.id, wh);
          avail = bal?.availableQty ?? 0;
        } catch {
          /* 查不到當作 0 → 全部走調撥，後端會擋 */
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
          qty: 1,
          unitPrice,
          remark: '',
          hadQuoteRecord,
          allocations: wh ? autoAllocate(wh, 1, avail) : [],
        },
      ]);
    },
    [lines, customer, warehouses],
  );

  const patchLine = useCallback((partId: string, patch: Partial<SalesLine>) => {
    setLines((prev) => prev.map((l) => (l.partId === partId ? { ...l, ...patch } : l)));
  }, []);

  const removeLine = useCallback((partId: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.partId !== partId);
      setLineSel((i) => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  /**
   * 改數量 → 重新自動拆分配。
   * ⚠️ 只在「分配還是系統自動配的」時候重拆；使用者手動調過就⛔ 不覆蓋
   *    （目前手動調整的介面還沒做，先留這個判斷位置）。
   */
  const changeQty = useCallback(
    async (l: SalesLine, qty: number) => {
      const wh = l.allocations[0]?.warehouseId ?? customer?.defaultWarehouseId ?? '';
      let avail = 0;
      if (wh) {
        try {
          const bal = await lookupStockBalance(l.partId, wh);
          avail = bal?.availableQty ?? 0;
        } catch {
          /* 查不到當作 0 */
        }
      }
      patchLine(l.partId, { qty, allocations: wh ? autoAllocate(wh, qty, avail) : [] });
    },
    [customer, patchLine],
  );

  const subtotal = useMemo(
    () => lines.reduce((a, l) => a + l.qty * l.unitPrice, 0),
    [lines],
  );
  const taxRate = taxRateOf(invoiceCopies);
  const tax = Math.round((subtotal * taxRate) / 100);
  const grandTotal = subtotal + tax;

  /** 拆單預覽：現貨 / 等調撥 / 同行 各幾行（＝送出後會變成幾張明細行） */
  const splitPreview = useMemo(() => {
    let stock = 0;
    let transfer = 0;
    let peer = 0;
    lines.forEach((l) =>
      l.allocations.forEach((a) => {
        if (a.source === 'STOCK') stock += 1;
        else if (a.source === 'TRANSFER') transfer += 1;
        else peer += 1;
      }),
    );
    return { stock, transfer, peer };
  }, [lines]);

  const msgText = useMemo(
    () =>
      orderResult && customer
        ? buildSalesMessage(customer.name, orderResult.docNo, lines, msgOpts, invoiceCopies)
        : '',
    [orderResult, customer, lines, msgOpts, invoiceCopies],
  );

  /**
   * 送出建單。⚠️ 流程逐段沿用舊浮層工作站的 buildOrder，⛔ 不自己重寫：
   *   0 守門（分配配平／送貨地點必填）
   *   1 誤標調撥自動轉現貨（該倉可用量夠 → 轉回現貨）
   *   2 分配攤成明細行（現貨 S／等調撥 T／同行 G）
   *   3 建 SO（DRAFT）→ 確認 CONFIRMED；確認失敗 → 草稿自動作廢，⛔ 不留孤兒
   *   4 同行分配 → 逐同行建調貨單（失敗不整單回滾，SO 已生效）
   *   5 成功後補報價紀錄（失敗不擋單）
   */
  const buildOrder = useCallback(async () => {
    if (!customer || submitting || orderResult) return; // 已建單不重送
    const bad = lines.find(
      (l) =>
        l.allocations.length === 0 ||
        l.allocations.some(
          (a) => !(a.qty > 0) || !a.warehouseId || (a.source === 'PEER' && !a.peerPartnerId),
        ) ||
        l.allocations.reduce((s, a) => s + a.qty, 0) !== l.qty,
    );
    if (lines.length === 0 || bad) {
      setSubmitError(
        bad ? `品項 ${bad.partNo} 的出貨分配沒有配平（回「明細」調整）` : '還沒有任何品項',
      );
      return;
    }
    if (!deliveryAddress.trim()) {
      setSubmitError('送貨地點必填（在「交易」那一段）——送哪裡或誰來取要寫清楚');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. 誤標調撥自動轉現貨（執行長 2026-07-18 拍板）
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
                if ((bal?.availableQty ?? 0) - taken >= a.qty) {
                  return { ...a, source: 'STOCK' as const };
                }
              } catch {
                /* 查不到 → 保留調撥、後端擋 */
              }
              return a;
            }),
          ),
        })),
      );
      setLines(fixedLines); // 預覽/訊息與實際送出一致

      // 2. 分配攤成明細行
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
      const flatAllocs = fixedLines.flatMap((l) => l.allocations);
      const peerGroups = new Map<string, number[]>();
      flatAllocs.forEach((a, i) => {
        if (a.source === 'PEER' && a.peerPartnerId) {
          peerGroups.set(a.peerPartnerId, [...(peerGroups.get(a.peerPartnerId) ?? []), i]);
        }
      });
      const headerWh =
        fixedLines[0]?.allocations[0]?.warehouseId ?? customer.defaultWarehouseId ?? undefined;
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
        salesMethod: '建立銷貨單',
        items,
      });

      // 3. 確認 → CONFIRMED；失敗把草稿作廢，⛔ 不留孤兒 DRAFT
      try {
        await updateSo(so.id, { status: 'CONFIRMED' });
      } catch (confirmErr) {
        await softDeleteSo(so.id, '建立銷貨單確認失敗自動作廢').catch(() => undefined);
        throw confirmErr;
      }

      // 4. 同行分配 → 逐同行建調貨單（失敗不整單回滾）
      const tiDocNos: string[] = [];
      let tiError: string | null = null;
      const soItems = so.items ?? [];
      for (const [partnerId, flatIdxs] of peerGroups) {
        const soItemIds = flatIdxs.map((i) => soItems[i]?.id).filter((x): x is string => !!x);
        if (!soItemIds.length) continue;
        try {
          const r = await createTiFromSo(so.id, {
            partnerId,
            soItemIds,
            remark: '建立銷貨單自動開單',
          });
          tiDocNos.push(r.tiDocNo);
        } catch (e) {
          tiError = e instanceof Error ? e.message : '調貨單建立失敗';
        }
      }
      if (tiError) {
        setSubmitError(
          `銷貨單已建立（${so.docNo}）、但調貨單開立失敗：${tiError}——請到銷貨管理補開同行調貨`,
        );
      }

      // 5. 補報價紀錄（失敗不擋單）
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
      flowApi.current?.goTo(4); // 帶到「訊息」那一段
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '建單失敗');
    } finally {
      setSubmitting(false);
    }
  }, [
    customer,
    submitting,
    orderResult,
    lines,
    deliveryType,
    deliveryAddress,
    invoiceCopies,
    paymentTerm,
    accountPeriod,
  ]);

  const resetAll = useCallback(() => {
    if (
      (customer || lines.length > 0) &&
      !orderResult &&
      !window.confirm('這張單還沒送出，取消會清空已填的內容——確定？')
    ) {
      return;
    }
    setCustomer(null);
    setProfile(null);
    setCustDefaults(null);
    setLines([]);
    setDeliveryAddress('');
    setOrderResult(null);
    setSubmitError(null);
    pickedCustomerIdRef.current = null;
    customerRef.current?.focus();
  }, [customer, lines.length, orderResult]);

  /** 訂單摘要（交易／確認兩段的右欄共用；⭐ 沿用舊站「副區常駐訂單摘要」的做法） */
  const orderSummary = (
    <div className="flex h-full flex-col">
      <div className="nx-t-sub break-all">{customer ? customer.name : '還沒選客戶'}</div>
      <div className="nx-hint mt-0.5">{customer ? customer.code : '回第 1 段選一家'}</div>

      <div className="mt-4 grid gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <div className="nx-hint">品項</div>
          <div className="nx-num-md">{lines.length}</div>
        </div>
        <div>
          <div className="nx-hint">出貨行數</div>
          <div className="nx-num-md">
            {splitPreview.stock + splitPreview.transfer + splitPreview.peer}
          </div>
        </div>
        <div>
          <div className="nx-hint">未稅小計</div>
          <div className="nx-num-md">{money(subtotal)}</div>
        </div>
        <div>
          <div className="nx-hint">稅（{taxRate}%）</div>
          <div className="nx-num-md">{money(tax)}</div>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2 border-t border-border pt-4">
        <span className="nx-hint">含稅合計</span>
        <span className="nx-num-xl">{money(grandTotal)}</span>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="nx-tag font-normal">現貨 {splitPreview.stock}</span>
          <span className="nx-tag font-normal">等調撥 {splitPreview.transfer}</span>
          <span className="nx-tag font-normal">同行 {splitPreview.peer}</span>
        </div>
        <p className="nx-hint">
          ⚠️ 送出後系統會把每一筆分配攤成一行銷貨明細；等調撥的行會自動開調撥單。
        </p>
      </div>
    </div>
  );

  // ───────────────────────────── 五個階段
  const sections: FlowSection[] = [
    {
      key: 'customer',
      label: '客戶',
      blocked: customer ? undefined : '還沒選客戶',
      content: (
        <FlowPanes
          mainTitle="客戶搜尋"
          mainNote="↑↓ 選　·　Enter 帶入　·　Alt+Z 注音首碼"
          main={
            <div>
              <CustomerPicker
                onPick={handlePickCustomer}
                onCommit={() => flowApi.current?.goTo(1)}
                partnerType="C,O"
                inputRef={customerRef}
                big
                autoFocus
              />
              <p className="nx-hint mt-3">
                打編號或名稱，↑↓ 選、Enter 帶入；注音首碼按 Alt+Z。
                <br />
                要換客戶：再按一次 Alt+1，欄位會反白讓你重打。
              </p>
              <p className="nx-hint mt-3">
                ⚠️ 換成別家客戶時，已經填好的送貨地點會清空——
                舊客戶的地址留到新客戶身上是錯資料。
              </p>
            </div>
          }
          sideTitle="客戶基本資料"
          sideNote={profile ? '確認無誤按 Alt+2 進明細' : undefined}
          side={
            <div className="h-full overflow-auto">
              {!customer ? (
                <div className="nx-hint">還沒選客戶。選定之後這裡會顯示他的交易條件。</div>
              ) : !profile ? (
                <div className="nx-hint">讀取客戶資料中…</div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-3">
                    <span className="nx-t-page">{profile.name}</span>
                    <span className="nx-mono">{profile.code}</span>
                  </div>
                  <div className="grid gap-x-6 gap-y-5 pt-4 sm:grid-cols-2">
                    <Field label="統一編號" value={profile.taxId} />
                    <Field
                      label="客戶等級"
                      value={profile.customerGradeName ?? profile.customerGradeCode}
                    />
                    <Field
                      label="付款條件（主檔預設）"
                      value={
                        profile.paymentTermDomestic
                          ? paymentTermLabel(profile.paymentTermDomestic)
                          : null
                      }
                    />
                    <Field
                      label="結帳日"
                      value={custDefaults?.statementDay ? `每月 ${custDefaults.statementDay} 日` : null}
                    />
                    <Field label="預設出貨倉" value={profile.defaultWarehouseName} />
                    <Field
                      label="預設發票"
                      value={
                        INVOICE_OPTS.find((o) => o.v === (profile.defaultInvoiceCopies ?? 3))?.label
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          }
        />
      ),
    },

    {
      key: 'items',
      label: '明細',
      blocked: lines.length > 0 ? undefined : '還沒加任何品項',
      content: (
        <FlowPanes
          activePane={itemsPane === 'list' ? 'main' : 'side'}
          mainTitle="品項"
          mainNote={`共 ${lines.length} 筆　·　↑↓ 選　·　Enter 進右邊改　·　Alt+D 移除`}
          main={
            <div className="flex h-full flex-col">
              <div className="mb-3">
                <PartPicker onPick={(p) => void addPart(p)} />
                <p className="nx-hint mt-2">
                  打料號、品名或車型加進來。⚠️ 單價會帶「這個客戶最近成交／建議售價」，帶不到就留 0 讓你自己填。
                </p>
              </div>

              {lines.length === 0 ? (
                <div className="nx-hint">上面加第一支料。</div>
              ) : (
                <div
                  ref={lineListRef}
                  tabIndex={0}
                  data-flow-focus
                  role="listbox"
                  aria-label="品項"
                  onFocus={() => setItemsPane('list')}
                  onKeyDown={(e) => {
                    if (lines.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setLineSel((i) => Math.min(lines.length - 1, i + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setLineSel((i) => Math.max(0, i - 1));
                    } else if (e.key === 'Enter') {
                      // ⭐ Enter＝進右欄（與報價段同一條規則），⛔ 不跳段
                      e.preventDefault();
                      setItemsPane('props');
                      setTimeout(() => {
                        const el = itemPropRef.current?.querySelector<HTMLInputElement>('input');
                        el?.focus();
                        el?.select();
                      }, 0);
                    } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
                      e.preventDefault();
                      const l = lines[lineSel];
                      if (l && window.confirm(`把 ${l.partNo} ${l.partName} 從這張單移除？`)) {
                        removeLine(l.partId);
                      }
                    }
                  }}
                  className="min-h-0 flex-1 space-y-2 overflow-auto rounded-md focus:outline focus:outline-2 focus:outline-primary"
                >
                  {lines.map((l, i) => {
                    const sel = i === lineSel;
                    const short = l.allocations.reduce((s, a) => s + a.qty, 0) !== l.qty;
                    return (
                      <button
                        key={l.partId}
                        type="button"
                        data-line={i}
                        tabIndex={-1}
                        role="option"
                        aria-selected={sel}
                        onClick={() => setLineSel(i)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left',
                          sel
                            ? 'border-primary bg-primary/[0.07]'
                            : 'border-border hover:bg-foreground/[0.04]',
                        ].join(' ')}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="nx-mono font-medium">{l.partNo}</span>
                            {l.allocations.map((a, ai) => (
                              <span
                                key={ai}
                                className={
                                  a.source === 'STOCK' ? 'nx-pill-ok' : 'nx-tag font-normal'
                                }
                              >
                                {SOURCE_LABEL[a.source]} {nf.format(a.qty)}
                              </span>
                            ))}
                            {short ? <span className="nx-pill-danger">分配沒配平</span> : null}
                          </div>
                          <div className="nx-hint truncate">{l.partName}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="nx-num-md">{money(l.qty * l.unitPrice)}</div>
                          <div className="nx-hint tabular-nums">
                            {nf.format(l.qty)} × {money(l.unitPrice)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-border pt-3">
                <div className="nx-body font-medium">
                  未稅小計 <span className="nx-num-lg ml-1">{money(subtotal)}</span>
                </div>
                <div className="nx-body font-medium">
                  含稅 <span className="nx-num-xl">{money(grandTotal)}</span>
                </div>
              </div>
            </div>
          }
          sideTitle="品項內容"
          sideNote={itemsPane === 'props' ? 'Esc 回清單' : lines[lineSel]?.partNo}
          side={(() => {
            const l = lines[lineSel];
            if (!l) return <div className="nx-hint">左邊選一筆。</div>;
            return (
              <div
                ref={itemPropRef}
                onFocus={() => setItemsPane('props')}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setItemsPane('list');
                    setTimeout(() => lineListRef.current?.focus(), 0);
                  }
                }}
                className="flex h-full flex-col overflow-auto"
              >
                <div className="nx-t-sub break-all">{l.partNo}</div>
                <div className="nx-hint mt-0.5">
                  {l.partName}・{l.brandName ?? '—'}・全公司可出 {l.availableTotal}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <label className="block">
                    <span className="nx-label">數量</span>
                    <input
                      value={String(l.qty)}
                      onChange={(e) => void changeQty(l, Number(e.target.value) || 0)}
                      inputMode="numeric"
                      aria-label={`${l.partNo} 數量`}
                      className="nx-field text-right tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="nx-label">單價</span>
                    <input
                      value={String(l.unitPrice)}
                      onChange={(e) =>
                        patchLine(l.partId, { unitPrice: Number(e.target.value) || 0 })
                      }
                      inputMode="decimal"
                      aria-label={`${l.partNo} 單價`}
                      className="nx-field text-right tabular-nums"
                    />
                  </label>
                  <label className="col-span-2 block">
                    <span className="nx-label">備註</span>
                    <input
                      value={l.remark}
                      onChange={(e) => patchLine(l.partId, { remark: e.target.value })}
                      placeholder="選填（會照設定決定要不要寫進訊息）"
                      aria-label={`${l.partNo} 備註`}
                      className="nx-field"
                    />
                  </label>
                </div>

                {/*
                  出貨分配：改數量時系統會依「客戶預設倉的可用量」重新自動拆。
                  ⚠️ 手動調整分配（改倉、改來源、指定同行）的介面還沒做——見檔尾 TODO。
                */}
                <div className="mt-4 border-t border-border pt-4">
                  <div className="nx-t-sub mb-2">從哪裡出</div>
                  {l.allocations.length === 0 ? (
                    <div className="nx-alert-warn">
                      ⚠️ 這一筆沒有出貨分配（客戶沒有預設倉）——⛔ 這樣送不出去。
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {l.allocations.map((a, ai) => (
                        <div
                          key={ai}
                          className="flex items-baseline gap-3 rounded-lg border border-border bg-card px-3 py-2"
                        >
                          <span
                            className={a.source === 'STOCK' ? 'nx-pill-ok' : 'nx-tag font-normal'}
                          >
                            {SOURCE_LABEL[a.source]}
                          </span>
                          <span className="nx-body min-w-0 flex-1 truncate">
                            {whName(a.warehouseId)}
                          </span>
                          <span className="nx-num-md">{nf.format(a.qty)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="nx-hint mt-2">
                    數量一改就會重新自動拆：本倉夠就全部現貨、不夠的部分轉等調撥。
                  </p>
                </div>

                <div className="mt-4 flex items-baseline gap-2 border-t border-border pt-4">
                  <span className="nx-hint">小計</span>
                  <span className="nx-num-xl">{money(l.qty * l.unitPrice)}</span>
                  <button
                    type="button"
                    onClick={() => removeLine(l.partId)}
                    aria-label={`移除 ${l.partNo}`}
                    className="nx-btn ml-auto hover:border-red-500"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    移除這筆
                  </button>
                </div>
              </div>
            );
          })()}
        />
      ),
    },

    {
      key: 'trade',
      label: '交易',
      blocked: deliveryAddress.trim() ? undefined : '送貨地點還沒填',
      content: (
        <FlowPanes
          mainTitle="交易條件"
          mainNote="付款・發票・帳期・取貨方式"
          main={
            <div className="h-full overflow-auto">
              <div className="nx-form-grid">
                <label className="block">
                  <span className="nx-label">付款條件</span>
                  <select
                    value={paymentTerm}
                    onChange={(e) => setPaymentTerm(e.target.value)}
                    className="nx-field"
                  >
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t.v} value={t.v}>
                        {t.label}
                        {custDefaults?.paymentTermDomestic === t.v ? '（主檔預設）' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="nx-label">發票</span>
                  <select
                    value={String(invoiceCopies)}
                    onChange={(e) => setInvoiceCopies(Number(e.target.value))}
                    className="nx-field"
                  >
                    {INVOICE_OPTS.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="nx-label">帳期</span>
                  <input
                    type="month"
                    value={accountPeriod}
                    onChange={(e) => setAccountPeriod(e.target.value)}
                    className="nx-field"
                  />
                </label>

                <label className="block">
                  <span className="nx-label">取貨方式</span>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className="nx-field"
                  >
                    {DELIVERY_OPTS.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/*
                  ⭐ 送貨地點必填（執行長 2026-07-18）：A 叫貨送 B、B 自己來取，都要寫清楚。
                     有主檔地址就給下拉快速帶入，⛔ 但不強迫——現場常常是臨時指定的地方。
                */}
                <label className="block md:col-span-2">
                  <span className="nx-label">送貨地點（必填）</span>
                  <input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="送到哪裡、或誰來取——整行打進來就好"
                    className="nx-field"
                  />
                </label>

                {shipAddresses.length > 0 ? (
                  <div className="md:col-span-2">
                    <div className="nx-label">主檔裡的送貨地址</div>
                    <div className="flex flex-wrap gap-2">
                      {shipAddresses.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setDeliveryAddress(shipAddressOneLine(r))}
                          className="nx-btn h-9 text-[14px]"
                        >
                          {r.isDefault ? '★ ' : ''}
                          {shipAddressOneLine(r)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          }
          sideTitle="訂單摘要"
          sideNote="跟著左邊即時算"
          side={orderSummary}
        />
      ),
    },

    {
      key: 'confirm',
      label: '確認',
      blocked: lines.length > 0 && deliveryAddress.trim() ? undefined : '還有必要條件沒完成',
      content: (
        <FlowPanes
          mainTitle="覆核"
          mainNote="送出前最後看一次"
          main={
            <div className="h-full overflow-auto">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="客戶" value={customer ? `${customer.code} ${customer.name}` : null} />
                <Field label="付款條件" value={paymentTerm ? paymentTermLabel(paymentTerm) : null} />
                <Field
                  label="發票"
                  value={INVOICE_OPTS.find((o) => o.v === invoiceCopies)?.label}
                />
                <Field label="帳期" value={accountPeriod} />
                <Field
                  label="取貨方式"
                  value={DELIVERY_OPTS.find((o) => o.v === deliveryType)?.label}
                />
                <Field label="送貨地點" value={deliveryAddress} wide />
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <div className="nx-t-sub mb-2">會開出這些明細行</div>
                <div className="space-y-2">
                  {lines.flatMap((l) =>
                    l.allocations.map((a, ai) => (
                      <div
                        key={`${l.partId}-${ai}`}
                        className="flex items-baseline gap-3 rounded-lg border border-border px-3 py-2"
                      >
                        <span
                          className={a.source === 'STOCK' ? 'nx-pill-ok' : 'nx-tag font-normal'}
                        >
                          {SOURCE_LABEL[a.source]}
                        </span>
                        <span className="nx-mono shrink-0">{l.partNo}</span>
                        <span className="nx-hint min-w-0 flex-1 truncate">{l.partName}</span>
                        <span className="nx-hint shrink-0">{whName(a.warehouseId)}</span>
                        <span className="nx-num-md shrink-0">{nf.format(a.qty)}</span>
                      </div>
                    )),
                  )}
                </div>
                <p className="nx-hint mt-3">
                  ⚠️ 「等調撥」的行送出後系統會自動開調撥單；「同行調貨」的行會逐同行開調貨單。
                </p>
              </div>

              {submitError ? <div className="nx-alert-danger mt-4">{submitError}</div> : null}
              {orderResult ? (
                <div className="nx-alert-ok mt-4">
                  已建單 {orderResult.docNo}——這張單不會重複送出。
                </div>
              ) : null}
            </div>
          }
          sideTitle="訂單摘要"
          sideNote="送出前的最終金額"
          side={orderSummary}
        />
      ),
    },

    {
      key: 'message',
      label: '訊息',
      content: (
        <FlowPanes
          mainTitle="給客戶的訊息"
          mainNote={orderResult ? `單號 ${orderResult.docNo}` : '建單後才有內容'}
          main={
            <div className="flex h-full flex-col">
              {!orderResult ? (
                <div className="nx-hint">
                  還沒建單。回「確認」那一段按底下的「建立銷貨單」，成功之後這裡會出現單號與給客戶的訊息。
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="nx-pill-ok">已建單</span>
                    <span className="nx-mono font-medium">{orderResult.docNo}</span>
                    <span className="nx-hint">
                      現貨 {orderResult.stockLines} 行　·　等調撥 {orderResult.transferLines} 行
                      {orderResult.tiDocNos.length > 0
                        ? `　·　調貨單 ${orderResult.tiDocNos.join('、')}`
                        : ''}
                    </span>
                  </div>
                  <textarea
                    readOnly
                    value={msgText}
                    aria-label="給客戶的訊息"
                    className="min-h-0 w-full flex-1 rounded-lg border border-border bg-muted p-3 text-[15px] leading-relaxed text-foreground"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(msgText)}
                      className="nx-btn font-medium"
                    >
                      複製訊息
                    </button>
                    <span className="nx-hint">複製後貼到 LINE 給客戶。</span>
                  </div>
                </>
              )}
            </div>
          }
          sideTitle="訊息內容設定"
          sideNote="會記住"
          side={
            <div className="h-full overflow-auto">
              <div className="space-y-2">
                {SALES_MSG_OPT_DEFS.map((d) => (
                  <label
                    key={d.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 px-3 py-2.5 ${
                      msgOpts[d.key]
                        ? 'border-primary bg-primary/[0.07]'
                        : 'border-border hover:bg-foreground/[0.04]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={msgOpts[d.key]}
                      onChange={(e) => setMsgOpt(d.key, e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span className="nx-body">{d.label}</span>
                  </label>
                ))}
              </div>
              <p className="nx-hint mt-3">
                這些選項存在這台電腦上，下次進來還是同一套。⛔ 不影響別人。
              </p>
            </div>
          }
        />
      ),
    },
  ];

  return (
    <FlowTemplate
      title="建立銷貨單"
      sections={sections}
      apiRef={flowApi}
      onCancel={resetAll}
      onSubmit={() => void buildOrder()}
      submitLabel={
        orderResult
          ? `已建單 ${orderResult.docNo}`
          : submitting
            ? '建單中…'
            : `建立銷貨單（${lines.length} 項）`
      }
    />
  );
}

/** 一欄唯讀資料。⛔ 值不用灰字（規格 §6），只有標籤降一階 */
function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <div className="nx-hint mb-1">{label}</div>
      <div className="text-[15px] font-medium text-foreground">{value || '—'}</div>
    </div>
  );
}
