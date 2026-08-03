// apps/nx-ui/src/features/nx02/po-ops/ui/PoOpsView.tsx
//
// 建立採購單（九宮格 採購第 2 格）—— v3.0.0 建單殼一頁式。
// 規格：docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §6（殼 4 開單）
//       docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.2 §2.1 §6 §7
//
// ⭐ 五段由執行長 2026-08-03 口述重編：
//      供應商 → 明細 → 審核 → 訊息 → 確認
//    ⚠️ 執行長原本的版本第一段是「從請購單導入」，但系統裡⛔ 沒有請購單這張單
//       （全庫 grep「請購」0 處；Nx02Pr ＝ 進貨退回 Purchase Return，⛔ 不是請購）。
//       當場重編成上面五段，第一段改回「選供應商」。
//
// ⭐ 五段與後端狀態機一對一（⛔ 不改後端、⛔ 不改 schema）：
//      供應商＋明細 → DRAFT 草稿
//      審核        → PENDING_APPROVAL 待核准 →（主管）APPROVED 已核准
//      訊息        → SUBMITTED 已寄廠商
//      確認        → CONFIRMED 廠商確認（後端在這一刻產生應付，業務語意「先款後貨」）
//    ⚠️ 審核在寄出**之前**＝執行長 2026-08-03 拍板「照現況」。
//       他口述的第一版是「先寄出、拿到廠商回覆再審」，當場改回現況順序。
//
// ⭐「付款」與「進貨」⛔ 不進本流程（執行長 2026-08-03 重編時拿掉）。
//    那兩件是單子成立之後的動作，照外殼規格 §2.4 走檢視殼的動作列。
//
// ⚠️ 明細在建單當下就要加得完（執行長 2026-08-03 拍板）。
//    舊的建單面板只收得了第一行、其餘要存檔後另開畫面加——採購一次買十樣是常態。
//    ⛔ 這個改動不動後端：建單那一口本來就吃得下多行（從詢價單轉採購走的就是多行）。
//
// 鍵盤模型與「建立報價」「建立銷貨單」完全一致：
//    Enter＝進右欄　·　Esc＝回左欄　·　Alt+1~5＝跳段　·　Alt+D＝移除目前這行
//    ⛔ Enter 不跳段。

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { createPo, updatePo } from '@data/endpoints/nx02/po/api/po';
import { getPartner } from '@data/endpoints/shared/master/partner/api/partner';
import type { PartnerDto } from '@data/types/shared/master/partner';
import { PURCHASE_TYPE_LABEL } from '@data/types/nx02/po';
import { FlowPanes } from '@design/templates/FlowPanes';
import { FlowTemplate, type FlowApi, type FlowSection } from '@design/templates/FlowTemplate';

import { CustomerPicker, type PickedCustomer } from '@/features/nx04/quote/ui/CustomerPicker';
import { PartPicker, type PickedPart } from '@/features/nx04/quote/ui/PartPicker';

/** 一行採購明細。⚠️ 用 partId 當識別：同一支料⛔ 不重複加，加第二次是改數量 */
type PoLine = {
  partId: string;
  partNo: string;
  partName: string;
  brandName: string | null;
  qty: number;
  unitCost: number;
  /** 這一行的預計到貨。⭐ 放在行上不放單頭：一張單裡不同料的交期本來就不一樣 */
  expectedDate: string;
  remark: string;
};

const nf = new Intl.NumberFormat('en-US');
const money = (n: number) => nf.format(Math.round(n * 100) / 100);

const PURCHASE_TYPES: { v: 'D' | 'I' | 'B'; label: string; hint: string }[] = [
  { v: 'D', label: '國內', hint: '向國內廠商買，走國內付款流程' },
  { v: 'I', label: '國外', hint: '進口，之後要多走報關' },
  { v: 'B', label: '掃貨', hint: '同業出清、一次掃一批' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function PoOpsView() {
  const router = useRouter();

  // ── 第 1 段：供應商 ──
  const [supplier, setSupplier] = useState<PickedCustomer | null>(null);
  const [profile, setProfile] = useState<PartnerDto | null>(null);
  const [purchaseType, setPurchaseType] = useState<'D' | 'I' | 'B'>('D');
  const [poDate, setPoDate] = useState(today);

  // ── 第 2 段：明細 ──
  const [lines, setLines] = useState<PoLine[]>([]);
  const [lineSel, setLineSel] = useState(0);
  const [itemsPane, setItemsPane] = useState<'list' | 'props'>('list');

  // ── 第 3 段：審核 ──
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** 送審成功後留在畫面上，⛔ 不自動跳走——使用者要看得到單號 */
  const [created, setCreated] = useState<{ id: string; docNo: string } | null>(null);

  const flowApi = useRef<FlowApi | null>(null);
  const supplierRef = useRef<HTMLInputElement>(null);
  const lineListRef = useRef<HTMLDivElement>(null);
  const itemPropRef = useRef<HTMLDivElement>(null);

  // 進來先鎖供應商欄（與報價、銷貨兩頁一致）
  useEffect(() => {
    supplierRef.current?.focus();
  }, []);

  const handlePickSupplier = useCallback((s: PickedCustomer) => {
    setSupplier(s);
    setProfile(null);
    getPartner(s.id)
      .then(setProfile)
      .catch(() => {
        /* 抓不到就只顯示編號與名稱，⛔ 不擋流程 */
      });
  }, []);

  const addPart = useCallback((p: PickedPart) => {
    setLines((prev) => {
      const at = prev.findIndex((l) => l.partId === p.id);
      // ⭐ 已經在單上就把游標移過去並加一，⛔ 不長出重複的第二行
      if (at >= 0) {
        setLineSel(at);
        return prev.map((l, i) => (i === at ? { ...l, qty: l.qty + 1 } : l));
      }
      setLineSel(prev.length);
      return [
        ...prev,
        {
          partId: p.id,
          partNo: p.code,
          partName: p.name,
          brandName: p.brandName,
          qty: 1,
          // ⚠️ 單價一律留 0 讓採購自己填：進價是詢價談出來的，
          //    系統⛔ 不該猜一個數字進去讓人以為那是談好的價。
          unitCost: 0,
          expectedDate: '',
          remark: '',
        },
      ];
    });
  }, []);

  const patchLine = useCallback((partId: string, patch: Partial<PoLine>) => {
    setLines((prev) => prev.map((l) => (l.partId === partId ? { ...l, ...patch } : l)));
  }, []);

  const removeLine = useCallback((partId: string) => {
    setLines((prev) => prev.filter((l) => l.partId !== partId));
    setLineSel((i) => Math.max(0, i - 1));
  }, []);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.unitCost, 0), [lines]);
  const taxAmount = useMemo(
    () => (subtotal * (Number(taxRate) || 0)) / 100,
    [subtotal, taxRate],
  );
  const grandTotal = subtotal + taxAmount;

  /** 沒填單價的行：擋送審。⚠️ 0 元進採購單＝之後對不了帳，也核不了 */
  const zeroPriced = useMemo(() => lines.filter((l) => !(l.unitCost > 0)), [lines]);

  async function submitForApproval() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (!supplier) throw new Error('還沒選供應商');
      if (!lines.length) throw new Error('還沒加任何品項');
      if (zeroPriced.length) {
        throw new Error(`還有 ${zeroPriced.length} 行沒填單價：${zeroPriced.map((l) => l.partNo).join('、')}`);
      }
      const doc = await createPo({
        poDate,
        supplierId: supplier.id,
        purchaseType,
        taxRate: Number(taxRate) || 0,
        remark: remark.trim() || undefined,
        items: lines.map((l) => ({
          partId: l.partId,
          qty: l.qty,
          unitPriceSnapshot: l.unitCost,
          expectedDate: l.expectedDate || undefined,
          remark: l.remark.trim() || undefined,
        })),
      });
      // ⚠️ 兩口：建草稿、再送審。後端狀態機只吃 DRAFT → PENDING_APPROVAL，
      //    ⛔ 不能在 create 時直接給 PENDING_APPROVAL。
      await updatePo(doc.id, { status: 'PENDING_APPROVAL' });
      setCreated({ id: doc.id, docNo: doc.docNo });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '送審失敗');
    } finally {
      setSubmitting(false);
    }
  }

  // ───────────────────────────── 五個階段
  const sections: FlowSection[] = [
    {
      key: 'supplier',
      label: '供應商',
      blocked: supplier ? undefined : '還沒選供應商',
      content: (
        <FlowPanes
          mainTitle="供應商搜尋"
          mainNote="↑↓ 選　·　Enter 帶入　·　Alt+Z 注音首碼"
          main={
            <div>
              <CustomerPicker
                gate="PURCHASE"
                onPick={handlePickSupplier}
                onCommit={() => flowApi.current?.goTo(1)}
                inputRef={supplierRef}
                big
                autoFocus
              />
              <p className="nx-hint mt-3">
                打編號或名稱，↑↓ 選、Enter 帶入；注音首碼按 Alt+Z。
                <br />
                要換供應商：再按一次 Alt+1，欄位會反白讓你重打。
              </p>

              <div className="mt-6 border-t border-border pt-4">
                <span className="nx-label">這是哪一種買法</span>
                <div className="mt-2 space-y-2">
                  {PURCHASE_TYPES.map((t) => (
                    <label
                      key={t.v}
                      className={[
                        'flex cursor-pointer items-baseline gap-3 rounded-lg border-2 px-3 py-2.5',
                        purchaseType === t.v
                          ? 'border-primary bg-primary/[0.07]'
                          : 'border-border hover:bg-foreground/[0.04]',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="purchaseType"
                        checked={purchaseType === t.v}
                        onChange={() => setPurchaseType(t.v)}
                      />
                      <span className="nx-body font-medium">{t.label}</span>
                      <span className="nx-hint">{t.hint}</span>
                    </label>
                  ))}
                </div>
                {/* ⚠️ 國外要報關：報關行由誰聯繫尚未拍板（執行長 2026-08-03 提問、未定），
                       所以這裡只提醒、⛔ 不放報關行欄位。 */}
                {purchaseType === 'I' ? (
                  <p className="nx-alert-warn mt-3">
                    ⚠️ 國外採購之後要報關。報關行的聯繫與付款分工⛔ 還沒定案，
                    這張單先照一般流程走。
                  </p>
                ) : null}
              </div>

              <label className="mt-6 block border-t border-border pt-4">
                <span className="nx-label">採購日期</span>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="nx-field mt-1"
                />
              </label>
            </div>
          }
          sideTitle="供應商基本資料"
          sideNote={profile ? '確認無誤按 Alt+2 進明細' : undefined}
          side={
            <div className="h-full overflow-auto">
              {!supplier ? (
                <div className="nx-hint">還沒選供應商。選定之後這裡會顯示他的交易條件。</div>
              ) : !profile ? (
                <div className="nx-hint">讀取供應商資料中…</div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-3">
                    <span className="nx-t-page">{profile.name}</span>
                    <span className="nx-mono">{profile.code}</span>
                  </div>
                  <div className="grid gap-x-6 gap-y-5 pt-4 sm:grid-cols-2">
                    <Field label="統一編號" value={profile.taxId} />
                    <Field
                      label="供應商等級"
                      value={profile.supplierGradeName ?? profile.supplierGradeCode}
                    />
                    <Field label="國內付款條件" value={profile.paymentTermDomestic} />
                    <Field label="進口付款條件" value={profile.paymentTermImport} />
                  </div>
                  <p className="nx-hint mt-6 border-t border-border pt-4">
                    ⚠️ 付款條件這裡只是顯示主檔設定值，這張單的實際付款走財務那邊。
                  </p>
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
          mainTitle="要買什麼"
          mainNote={`共 ${lines.length} 筆　·　↑↓ 選　·　Enter 進右邊改　·　Alt+D 移除`}
          main={
            <div className="flex h-full flex-col">
              <div className="mb-3">
                <PartPicker onPick={addPart} />
                <p className="nx-hint mt-2">
                  打料號、品名或車型加進來，⭐ 這一段就把要買的東西全部加完。
                  <br />
                  ⚠️ 單價一律留 0 讓你自己填——進價是詢價談出來的，系統⛔ 不猜。
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
                  aria-label="採購品項"
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
                      // ⭐ Enter＝進右欄（與報價、銷貨同一條規則），⛔ 不跳段
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
                            {l.unitCost > 0 ? null : (
                              <span className="nx-pill-danger">還沒填單價</span>
                            )}
                            {l.expectedDate ? (
                              <span className="nx-tag font-normal">{l.expectedDate} 到</span>
                            ) : null}
                          </div>
                          <div className="nx-hint truncate">{l.partName}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="nx-num-md">{money(l.qty * l.unitCost)}</div>
                          <div className="nx-hint tabular-nums">
                            {nf.format(l.qty)} × {money(l.unitCost)}
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
          sideTitle="這一行的內容"
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
                  {l.partName}・{l.brandName ?? '—'}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <label className="block">
                    <span className="nx-label">數量</span>
                    <input
                      value={String(l.qty)}
                      onChange={(e) => patchLine(l.partId, { qty: Number(e.target.value) || 0 })}
                      inputMode="numeric"
                      aria-label={`${l.partNo} 數量`}
                      className="nx-field text-right tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="nx-label">單價（進價）</span>
                    <input
                      value={String(l.unitCost)}
                      onChange={(e) =>
                        patchLine(l.partId, { unitCost: Number(e.target.value) || 0 })
                      }
                      inputMode="decimal"
                      aria-label={`${l.partNo} 單價`}
                      className="nx-field text-right tabular-nums"
                    />
                  </label>
                  {/*
                    ⭐ 預計到貨放在行上（外殼規格 §6 欄位存廢判準：「這格空白的話誰會受影響」）——
                       空白的話倉庫不知道什麼時候要留位置、採購自己也追不了交期，答得出來所以留。
                    ⚠️ 一張單裡不同料的交期本來就不一樣，⛔ 不做成單頭一格。
                  */}
                  <label className="block">
                    <span className="nx-label">預計到貨</span>
                    <input
                      type="date"
                      value={l.expectedDate}
                      onChange={(e) => patchLine(l.partId, { expectedDate: e.target.value })}
                      aria-label={`${l.partNo} 預計到貨`}
                      className="nx-field"
                    />
                  </label>
                  <label className="block">
                    <span className="nx-label">這一行的備註</span>
                    <input
                      value={l.remark}
                      onChange={(e) => patchLine(l.partId, { remark: e.target.value })}
                      placeholder="選填"
                      aria-label={`${l.partNo} 備註`}
                      className="nx-field"
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-baseline gap-2 border-t border-border pt-4">
                  <span className="nx-hint">小計</span>
                  <span className="nx-num-xl">{money(l.qty * l.unitCost)}</span>
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
      key: 'review',
      label: '審核',
      blocked: created ? undefined : lines.length && !zeroPriced.length ? undefined : '還不能送審',
      content: (
        <FlowPanes
          mainTitle="送出去給主管看"
          main={
            <div className="flex h-full flex-col overflow-auto">
              {created ? (
                <div className="nx-alert-ok">
                  已送審：<span className="nx-mono">{created.docNo}</span>
                  <p className="nx-hint mt-2">
                    主管核准之後，這張單才寄得出去。核准了再回到這一頁走「訊息」那一段。
                  </p>
                  <button
                    type="button"
                    className="nx-btn mt-3"
                    onClick={() => router.push(`/dashboard/purchase/po/${created.id}`)}
                  >
                    去看這張單
                  </button>
                </div>
              ) : (
                <>
                  <p className="nx-body">
                    這一段是把單子交出去之前自己再看一遍。右邊是主管會看到的完整內容。
                  </p>

                  <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    {/*
                      ⚠️ 稅率與單頭備註從舊建單畫面的第一頁搬到這裡（執行長 2026-08-03 未指定位置、
                         本項為介面自決）：兩者都是「送出前確認」的東西，⛔ 不是一開始要想的。
                         稅率預設 5、幾乎沒人改，放在第一段只會擋住真正要填的供應商與品項。
                    */}
                    <label className="block">
                      <span className="nx-label">稅率 %</span>
                      <input
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        inputMode="decimal"
                        className="nx-field mt-1 text-right tabular-nums"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="nx-label">整張單的備註</span>
                      <input
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="選填。⚠️ 該填在欄位裡的東西⛔ 不要塞這裡"
                        className="nx-field mt-1"
                      />
                    </label>
                  </div>

                  {zeroPriced.length ? (
                    <div className="nx-alert-danger mt-5">
                      ⚠️ 還有 {zeroPriced.length} 行沒填單價，⛔ 不能送審：
                      {zeroPriced.map((l) => l.partNo).join('、')}
                      <p className="nx-hint mt-1">
                        0 元進採購單之後對不了帳，主管也核不了。按 Alt+2 回明細補。
                      </p>
                    </div>
                  ) : null}

                  {submitError ? <div className="nx-alert-danger mt-5">{submitError}</div> : null}

                  <button
                    type="button"
                    disabled={submitting || !supplier || !lines.length || zeroPriced.length > 0}
                    onClick={() => void submitForApproval()}
                    className="nx-btn-primary mt-6"
                  >
                    {submitting ? '送出中…' : '送給主管審核'}
                  </button>
                  <p className="nx-hint mt-2">
                    ⚠️ 送出後這張單就變成「待核准」，⛔ 不能再直接改欄位。
                  </p>
                </>
              )}
            </div>
          }
          sideTitle="主管會看到的內容"
          sideNote={`${lines.length} 筆`}
          side={
            <div className="flex h-full flex-col overflow-auto">
              <div className="grid gap-x-6 gap-y-4 border-b border-border pb-4 sm:grid-cols-2">
                <Field label="供應商" value={supplier ? `${supplier.code}　${supplier.name}` : null} />
                <Field label="買法" value={PURCHASE_TYPE_LABEL[purchaseType]} />
                <Field label="採購日期" value={poDate} />
                <Field label="單號" value={created?.docNo ?? '送出後產生'} />
              </div>

              {lines.length === 0 ? (
                <div className="nx-hint pt-4">還沒有品項。</div>
              ) : (
                <table className="mt-4 w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="nx-th text-left">料號</th>
                      <th className="nx-th text-right">數量</th>
                      <th className="nx-th text-right">單價</th>
                      <th className="nx-th text-right">金額</th>
                      <th className="nx-th text-left">預計到貨</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.partId}>
                        <td className="nx-td">
                          <span className="nx-mono">{l.partNo}</span>
                          <div className="nx-hint truncate">{l.partName}</div>
                        </td>
                        <td className="nx-td text-right tabular-nums">{nf.format(l.qty)}</td>
                        <td className="nx-td text-right tabular-nums">{money(l.unitCost)}</td>
                        <td className="nx-td text-right tabular-nums">
                          {money(l.qty * l.unitCost)}
                        </td>
                        <td className="nx-td">{l.expectedDate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="mt-4 space-y-1 border-t border-border pt-4 text-right">
                <div className="nx-body">
                  未稅 <span className="nx-num-md ml-2">{money(subtotal)}</span>
                </div>
                <div className="nx-body">
                  稅額（{Number(taxRate) || 0}%）
                  <span className="nx-num-md ml-2">{money(taxAmount)}</span>
                </div>
                <div className="nx-body font-medium">
                  總計 <span className="nx-num-xl ml-2">{money(grandTotal)}</span>
                </div>
              </div>

              {remark.trim() ? (
                <p className="nx-hint mt-4 border-t border-border pt-4">備註：{remark}</p>
              ) : null}
            </div>
          }
        />
      ),
    },

    // ⚠️ 第 4、5 段要有「已核准的單」才做得了事，所以在新建流程裡只說明下一步該怎麼走。
    //    ⛔ 這不是佔位空殼——這兩段本來就不屬於「建單當下」，它們是幾天後回來接著走的。
    //    實作見下一個 commit（帶單號進本頁 → 直接落在該走的那一段）。
    {
      key: 'message',
      label: '訊息',
      blocked: '要等主管核准',
      content: (
        <div className="nx-card">
          <h3 className="nx-t-sub">把單子寄給廠商</h3>
          <p className="nx-body mt-3">
            這一段是主管核准之後才做的：匯出 Excel 寄給廠商，或直接開信件。
          </p>
          <p className="nx-hint mt-3">
            ⚠️ 還沒接。核准後從採購單清單點進那張單，會回到這一頁的這一段。
          </p>
        </div>
      ),
    },

    {
      key: 'confirm',
      label: '確認',
      blocked: '要等廠商回覆',
      content: (
        <div className="nx-card">
          <h3 className="nx-t-sub">廠商回覆之後填在這裡</h3>
          <p className="nx-body mt-3">
            廠商回了價格與交期，在這一段輸入。存進去之後這張單就算廠商確認、系統會產生應付帳款。
          </p>
          <p className="nx-hint mt-3">⚠️ 還沒接。</p>
        </div>
      ),
    },
  ];

  return (
    <FlowTemplate
      title="建立採購單"
      sections={sections}
      apiRef={flowApi}
      onSubmit={() => void submitForApproval()}
      onCancel={() => router.push('/dashboard/purchase/po')}
      submitLabel="送給主管審核"
    />
  );
}

/** 右欄的唯讀欄位。⛔ 不用灰字表達次要（規格 §6），靠字級與位置分層 */
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="nx-label">{label}</div>
      <div className="nx-body mt-0.5">{value || '—'}</div>
    </div>
  );
}
