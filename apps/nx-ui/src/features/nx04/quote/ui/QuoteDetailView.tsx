// apps/nx-ui/src/features/nx04/quote/ui/QuoteDetailView.tsx
// NX04-QT-SHELL Step3/5：報價單詳情面板 — 表頭三區 + 接外殼六層（L3 工具列 portal、清麵包屑）
//   ① 單據資訊 ② 客戶與倉庫 ③ 金額條件＋備註 → 明細 → 底部總計
//   作為 QuoteWorkbench 的「詳細資料」分頁內容（L4）；上下筆 nav 由 workbench 傳入
//   明細區（ItemsSection / AddItemForm）沿用 LITE 範式、待 Step4 接 picker + inline 行動作

'use client';

import { AlertTriangle, ArrowLeft, Ban, ChevronLeft, ChevronRight, RefreshCcw, Send, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { IssueReportTrigger } from '@/features/shared/issue-report-trigger';
import { NavButton, ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';

import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';

import {
  addQuoteItem,
  getQuote,
  getQuoteHistoricalPrices,
  removeQuoteItem,
  updateQuote,
  voidQuote,
} from '@data/endpoints/nx04/quote/api/quote';
import type {
  CreateQuoteItemPayload,
  Quote,
  QuoteHistoricalPrice,
  QuoteItem,
} from '@data/types/nx04/quote';
import { QUOTE_STATUS_LABEL } from '@data/types/nx04/quote';

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground',
  SENT: 'bg-amber-100 text-amber-900',
  ACCEPTED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
  EXPIRED: 'bg-zinc-200 text-zinc-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500 line-through',
};

export function QuoteDetailPanel({
  id,
  onBack,
  onChanged,
  itemIndex,
  itemTotal,
  onPrevItem,
  onNextItem,
}: {
  id: string;
  onBack: () => void;
  /** 詳情有變動（狀態流轉 / 存檔 / 明細增刪）時通知 workbench 重抓列表 */
  onChanged?: () => void;
  itemIndex?: number;
  itemTotal?: number;
  onPrevItem?: () => void;
  onNextItem?: () => void;
}) {
  const [q, setQ] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuote(id);
      setQ(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const reloadAll = useCallback(async () => {
    await reload();
    onChanged?.();
  }, [reload, onChanged]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handle = async (fn: () => Promise<unknown>, prefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reloadAll();
    } catch (e) {
      setError(`${prefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !q) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !q) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!q) return null;

  const editable = q.status === 'DRAFT' || q.status === 'SENT';
  const itemsEditable = editable && !q.voidedAt;

  // 狀態流轉
  const canSend = q.status === 'DRAFT';
  const canReject = q.status === 'SENT';
  const canExpire = q.status === 'SENT';
  const canVoid = q.status === 'DRAFT' || q.status === 'SENT';

  return (
    <div className="w-full min-w-0 space-y-5 p-5">
      {/* L3 情境工具列：投影到外殼第 3 層 */}
      <ToolbarPortal>
        <div
          data-nx-frame
          className="flex items-center gap-1 border-b border-border/40 px-3 py-2"
          style={{
            backgroundImage:
              'linear-gradient(180deg, var(--nx-surface-toolbar-from) 0%, var(--nx-surface-toolbar-to) 100%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5)',
          }}
        >
          <NavButton
            icon={ChevronLeft}
            disabled={!onPrevItem || (itemIndex ?? 1) <= 1}
            onClick={onPrevItem}
            title="上一筆"
          />
          <span className="min-w-[3rem] px-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
            {itemIndex ?? '-'} / {itemTotal ?? '-'}
          </span>
          <NavButton
            icon={ChevronRight}
            disabled={!onNextItem || (itemTotal !== undefined && (itemIndex ?? 0) >= itemTotal)}
            onClick={onNextItem}
            title="下一筆"
          />
          <ToolbarSeparator />
          <ToolbarButton icon={ArrowLeft} label="返回" enabled onClick={onBack} />
          <ToolbarButton icon={RefreshCcw} letter="R" label="重整" enabled onClick={() => void reload()} />
          <ToolbarSeparator />
          {canSend ? (
            <ToolbarButton
              icon={Send}
              label="寄出"
              enabled={!busy}
              accent
              onClick={() => void handle(() => updateQuote(id, { status: 'SENT' }), '寄出')}
            />
          ) : null}
          {canReject ? (
            <ToolbarButton
              icon={XCircle}
              label="客戶拒絕"
              enabled={!busy}
              variant="danger"
              onClick={() => void handle(() => updateQuote(id, { status: 'REJECTED' }), '拒絕')}
            />
          ) : null}
          {canExpire ? (
            <ToolbarButton
              icon={AlertTriangle}
              label="標記過期"
              enabled={!busy}
              onClick={() => void handle(() => updateQuote(id, { status: 'EXPIRED' }), '過期')}
            />
          ) : null}
          {canVoid ? (
            <ToolbarButton
              icon={Ban}
              label="作廢"
              enabled={!busy}
              variant="danger"
              onClick={() => {
                const reason = window.prompt('作廢原因（必填）');
                if (!reason?.trim()) return;
                void handle(() => voidQuote(id, reason.trim()), '作廢');
              }}
            />
          ) : null}
          <ToolbarSeparator />
          <IssueReportTrigger sourceDocType="QT" sourceDocId={q.id} warehouseId={q.warehouseId} />
          <div className="flex-1" />
        </div>
      </ToolbarPortal>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      <HeaderZones q={q} editable={editable} onSaved={reloadAll} />

      <ItemsSection q={q} items={q.items ?? []} editable={itemsEditable} onChanged={reloadAll} />

      <footer className="flex flex-wrap gap-6 rounded-lg border bg-muted/30 p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">未稅小計</div>
          <div className="font-mono tabular-nums">{q.subtotal}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">稅率 / 稅額</div>
          <div className="font-mono tabular-nums">
            {q.taxRate}% / {q.taxAmount}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">總額（含稅）</div>
          <div className="font-mono tabular-nums text-lg font-semibold">{q.totalAmount}</div>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          建立 {q.createdAt.slice(0, 19).replace('T', ' ')} by {q.createdBy}
          <br />
          更新 {q.updatedAt.slice(0, 19).replace('T', ' ')} by {q.updatedBy}
        </div>
      </footer>
    </div>
  );
}

/** 唯讀顯示欄 */
function ReadField({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''}`}>{children ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/**
 * 表頭三區。可編欄位（報價日 / 有效期 / 參考文號 / 備註）本地暫存 + 統一儲存。
 * 客戶 / 倉庫 / 客戶等級 / 業務員 為唯讀顯示（建單時決定；picker 化待 Step4）。
 */
function HeaderZones({
  q,
  editable,
  onSaved,
}: {
  q: Quote;
  editable: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const [quoteDate, setQuoteDate] = useState(q.quoteDate.slice(0, 10));
  const [validUntil, setValidUntil] = useState(q.validUntil?.slice(0, 10) ?? '');
  const [customerRefNo, setCustomerRefNo] = useState(q.customerRefNo ?? '');
  const [remark, setRemark] = useState(q.remark ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const expired = q.validUntil ? new Date(q.validUntil) < new Date(new Date().toDateString()) : false;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await updateQuote(q.id, {
        quoteDate,
        validUntil: validUntil || undefined,
        customerRefNo: customerRefNo.trim() || undefined,
        remark,
      });
      setSavedAt(new Date().toLocaleTimeString());
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ① 單據資訊 */}
      <SectionCard title="單據資訊">
        <div className="grid grid-cols-2 gap-3">
          <ReadField label="單號" mono>{q.docNo}</ReadField>
          <ReadField label="狀態">
            <span className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_BADGE_CLASS[q.status] ?? 'bg-muted'}`}>
              {QUOTE_STATUS_LABEL[q.status] ?? q.status}
            </span>
          </ReadField>
          <label className="text-sm">
            <span className="mb-0.5 block text-xs text-muted-foreground">報價日</span>
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} disabled={!editable} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-0.5 block text-xs text-muted-foreground">
              有效期限 {expired ? <span className="text-rose-600">· 已過期</span> : null}
            </span>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={!editable} className={inputCls} />
          </label>
          <ReadField label="建檔">
            <span className="text-xs text-muted-foreground">
              {q.createdAt.slice(0, 10)} · {q.createdBy}
            </span>
          </ReadField>
        </div>
      </SectionCard>

      {/* ② 客戶與倉庫（picker 化待 Step4） */}
      <SectionCard title="客戶與倉庫">
        <div className="grid grid-cols-2 gap-3">
          <ReadField label="客戶" mono>{q.customerId}</ReadField>
          <ReadField label="客戶等級">
            {q.customerGradeId ? (
              <span className="font-mono">{q.customerGradeId}</span>
            ) : (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">未設、無毛利警告</span>
            )}
          </ReadField>
          <ReadField label="報價倉庫" mono>{q.warehouseId}</ReadField>
          <ReadField label="業務員" mono>{q.salesPersonId}</ReadField>
        </div>
      </SectionCard>

      {/* ③ 金額條件＋備註 */}
      <SectionCard title="金額條件 / 備註">
        <div className="grid grid-cols-2 gap-3">
          <ReadField label="幣別" mono>{q.currencyId}</ReadField>
          <ReadField label="稅率">{q.taxRate}%</ReadField>
          <label className="col-span-2 text-sm">
            <span className="mb-0.5 block text-xs text-muted-foreground">參考文號（客戶採購單號等）</span>
            <input value={customerRefNo} onChange={(e) => setCustomerRefNo(e.target.value)} disabled={!editable} placeholder="選填" className={inputCls} />
          </label>
          <label className="col-span-2 text-sm">
            <span className="mb-0.5 block text-xs text-muted-foreground">備註</span>
            <input value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!editable} className={inputCls} />
          </label>
        </div>
      </SectionCard>

      {editable ? (
        <div className="lg:col-span-3 flex items-center gap-3">
          <button
            disabled={busy}
            onClick={() => void save()}
            className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '儲存中…' : '儲存表頭'}
          </button>
          {savedAt ? <span className="text-xs text-emerald-700">已儲存 {savedAt}</span> : null}
          {err ? <span className="text-xs text-destructive">{err}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ItemsSection({
  q,
  items,
  editable,
  onChanged,
}: {
  q: Quote;
  items: QuoteItem[];
  editable: boolean;
  onChanged: () => void | Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">明細（{items.length} 行）</h2>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">料號 / 品名</th>
                <th className="px-3 py-2 text-right">數量</th>
                <th className="px-3 py-2 text-right">單價</th>
                <th className="px-3 py-2 text-right">最低售價</th>
                <th className="px-3 py-2 text-right">已轉量</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-left">毛利警示</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const below = it.minPrice && Number(it.unitPrice) < Number(it.minPrice);
                return (
                  <tr key={it.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-mono">{it.partNo}</div>
                      <div className="text-muted-foreground">{it.partName}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${below ? 'text-rose-600 font-semibold' : ''}`}>
                      {it.unitPrice}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
                      {it.minPrice ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{it.transferredQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
                    <td className="px-3 py-2 text-xs">
                      {below ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-900">
                          ⚠️ 低於最低售價：{it.belowMinReason ?? '未填理由'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editable ? (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`刪除明細 ${it.lineNo}？`)) return;
                            try {
                              await removeQuoteItem(q.id, it.id);
                              await onChanged();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : '刪除失敗');
                            }
                          }}
                          className="text-xs text-rose-700 hover:underline"
                        >
                          刪除
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          尚無明細。{editable ? '用下方表單新增。' : ''}
        </div>
      )}

      {editable ? (
        <AddItemForm customerId={q.customerId} quoteId={q.id} onAdded={onChanged} />
      ) : null}
    </section>
  );
}

function AddItemForm({
  customerId,
  quoteId,
  onAdded,
}: {
  customerId: string;
  quoteId: string;
  onAdded: () => void | Promise<void>;
}) {
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [belowMinReason, setBelowMinReason] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<QuoteHistoricalPrice[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!partId.trim()) {
      setErr('請先輸入 partId');
      return;
    }
    setHistLoading(true);
    setErr(null);
    try {
      const rows = await getQuoteHistoricalPrices(customerId, partId.trim(), 5);
      setHistory(rows);
      if (rows.length && Number(unitPrice) === 0) {
        // 自動帶上次報價當預設、user 可改
        setUnitPrice(rows[0].unitPrice);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '查歷史價失敗');
    } finally {
      setHistLoading(false);
    }
  }, [customerId, partId, unitPrice]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partId.trim() || Number(qty) <= 0) {
      setErr('partId / qty 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateQuoteItemPayload = {
        partId: partId.trim(),
        qty: Number(qty),
        unitPriceSnapshot: Number(unitPrice),
        belowMinReason: belowMinReason.trim() || undefined,
        remark: remark.trim() || undefined,
      };
      await addQuoteItem(quoteId, payload);
      // reset
      setPartId('');
      setQty('1');
      setUnitPrice('0');
      setBelowMinReason('');
      setRemark('');
      setHistory([]);
      await onAdded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '新增失敗';
      setErr(
        msg.includes('belowMinReason')
          ? `${msg}（請補填「低於最低售價的原因」後重送）`
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">新增明細</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="block mb-1">🟢 料號 ID *</span>
          <div className="flex gap-1">
            <input
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              placeholder="NX01PART..."
              className="w-full rounded border bg-background px-2 py-1"
              required
            />
            <button
              type="button"
              onClick={() => void fetchHistory()}
              disabled={histLoading}
              className="rounded border px-2 text-xs disabled:opacity-50"
              title="查歷史價"
            >
              📜
            </button>
          </div>
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 數量 *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 tabular-nums"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 報價單價 *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 tabular-nums"
            required
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="block mb-1">🟡 低於最低售價原因（若被擋下、補填這欄）</span>
          <input
            value={belowMinReason}
            onChange={(e) => setBelowMinReason(e.target.value)}
            placeholder="客戶老主顧 / 量大 / ..."
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
        <label className="text-sm md:col-span-4">
          <span className="block mb-1">⚪ 備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
      </div>

      {history.length > 0 ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <div className="mb-2 font-semibold text-emerald-900">
            📜 該客戶歷史報價（最近 {history.length} 筆）
          </div>
          <div className="space-y-1 font-mono">
            {history.map((h) => (
              <div key={h.quoteItemId} className="flex flex-wrap gap-3 text-emerald-900">
                <span>{h.docNo}</span>
                <span>{h.quoteDate.slice(0, 10)}</span>
                <span>{h.status}</span>
                <span>單價 {h.unitPrice}</span>
                <span>數量 {h.qty}</span>
                {h.minPrice ? <span className="opacity-60">最低 {h.minPrice}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {busy ? '新增中…' : '新增明細'}
      </button>
    </form>
  );
}
