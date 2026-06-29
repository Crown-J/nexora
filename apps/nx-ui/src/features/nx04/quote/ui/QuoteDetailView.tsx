// apps/nx-ui/src/features/nx04/quote/ui/QuoteDetailView.tsx
// NX04-QT-SHELL：報價單詳情面板（QuoteWorkbench「詳細資料」分頁 L4 內容）
//   內容層只分上下兩層：上＝單頭（三區欄位）／下＝明細（表格＋總計）
//   所有動作收進 L3 工具列：瀏覽=編輯/狀態鈕/問題回報；編輯=存檔/取消/新增明細
//   瀏覽唯讀、編輯可改；新增明細走對話框（不再常駐大表單）

'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Send,
  X,
  XCircle,
} from 'lucide-react';
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
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // 表頭可編欄位（編輯模式）
  const [quoteDate, setQuoteDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [customerRefNo, setCustomerRefNo] = useState('');
  const [remark, setRemark] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQ(await getQuote(id));
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

  // 換筆/重載時離開編輯模式、表單欄位同步自 q
  useEffect(() => {
    if (!q) return;
    setQuoteDate(q.quoteDate.slice(0, 10));
    setValidUntil(q.validUntil?.slice(0, 10) ?? '');
    setCustomerRefNo(q.customerRefNo ?? '');
    setRemark(q.remark ?? '');
  }, [q?.id, q?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 換筆時自動退出編輯
  useEffect(() => {
    setEditing(false);
  }, [id]);

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

  const statusEditable = q.status === 'DRAFT' || q.status === 'SENT';
  const itemsEditable = editing && statusEditable && !q.voidedAt;
  const expired = q.validUntil ? new Date(q.validUntil) < new Date(new Date().toDateString()) : false;

  const canSend = q.status === 'DRAFT';
  const canReject = q.status === 'SENT';
  const canExpire = q.status === 'SENT';
  const canVoid = q.status === 'DRAFT' || q.status === 'SENT';

  async function saveHeader() {
    setBusy(true);
    setError(null);
    try {
      await updateQuote(id, {
        quoteDate,
        validUntil: validUntil || undefined,
        customerRefNo: customerRefNo.trim() || undefined,
        remark,
      });
      setEditing(false);
      await reloadAll();
    } catch (e) {
      setError(`存檔: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (q) {
      setQuoteDate(q.quoteDate.slice(0, 10));
      setValidUntil(q.validUntil?.slice(0, 10) ?? '');
      setCustomerRefNo(q.customerRefNo ?? '');
      setRemark(q.remark ?? '');
    }
    setEditing(false);
  }

  const inputCls = 'w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-60';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {/* L3 工具列 */}
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
          <NavButton icon={ChevronLeft} disabled={!onPrevItem || (itemIndex ?? 1) <= 1} onClick={onPrevItem} title="上一筆" />
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

          {editing ? (
            <>
              <ToolbarButton icon={Save} letter="S" label="存檔" enabled={!busy} accent onClick={() => void saveHeader()} />
              <ToolbarButton icon={X} letter="C" label="取消" enabled={!busy} onClick={cancelEdit} />
              <ToolbarButton icon={Plus} label="新增明細" enabled={itemsEditable} onClick={() => setAddOpen(true)} />
            </>
          ) : (
            <>
              <ToolbarButton icon={Pencil} letter="E" label="編輯" enabled={statusEditable && !busy} onClick={() => setEditing(true)} />
              {canSend ? (
                <ToolbarButton icon={Send} label="寄出" enabled={!busy} accent onClick={() => void handle(() => updateQuote(id, { status: 'SENT' }), '寄出')} />
              ) : null}
              {canReject ? (
                <ToolbarButton icon={XCircle} label="客戶拒絕" enabled={!busy} variant="danger" onClick={() => void handle(() => updateQuote(id, { status: 'REJECTED' }), '拒絕')} />
              ) : null}
              {canExpire ? (
                <ToolbarButton icon={AlertTriangle} label="標記過期" enabled={!busy} onClick={() => void handle(() => updateQuote(id, { status: 'EXPIRED' }), '過期')} />
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
            </>
          )}
          <div className="flex-1" />
        </div>
      </ToolbarPortal>

      {error ? (
        <div className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {/* ── 上層：單頭 ── */}
      <section className="border-b border-border/40 p-4">
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-3">
          {/* ① 單據資訊 */}
          <ReadField label="單號">
            <span className="font-mono">{q.docNo}</span>
            <span className={`ml-2 rounded px-2 py-0.5 text-[11px] ${STATUS_BADGE_CLASS[q.status] ?? 'bg-muted'}`}>
              {QUOTE_STATUS_LABEL[q.status] ?? q.status}
            </span>
          </ReadField>
          <Field label={`有效期限${expired ? '（已過期）' : ''}`} labelClass={expired ? 'text-rose-600' : ''}>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={!editing} className={inputCls} />
          </Field>
          <Field label="報價日">
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} disabled={!editing} className={inputCls} />
          </Field>

          {/* ② 客戶與倉庫 */}
          <ReadField label="客戶">
            {q.customerName ?? q.customerId}
            {q.customerCode ? <span className="ml-1 text-xs text-muted-foreground">{q.customerCode}</span> : null}
          </ReadField>
          <ReadField label="客戶等級">
            {q.customerGradeName ? (
              q.customerGradeName
            ) : (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">未設、無毛利警告</span>
            )}
          </ReadField>
          <ReadField label="報價倉庫">{q.warehouseName ?? q.warehouseId}</ReadField>

          {/* ③ 金額條件 / 其他 */}
          <ReadField label="業務員">{q.salesPersonName ?? '—'}</ReadField>
          <ReadField label="幣別 / 稅率">
            {(q.currencyCode ?? q.currencyId)} · {q.taxRate}%
          </ReadField>
          <Field label="參考文號">
            <input value={customerRefNo} onChange={(e) => setCustomerRefNo(e.target.value)} disabled={!editing} placeholder="客戶採購單號等" className={inputCls} />
          </Field>
          <Field label="備註" full>
            <input value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!editing} className={inputCls} />
          </Field>
        </div>
      </section>

      {/* ── 下層：明細 ── */}
      <ItemsSection q={q} items={q.items ?? []} editable={itemsEditable} onChanged={reloadAll} />

      {/* 底部總計 + 稽核 */}
      <footer className="mt-auto flex flex-wrap items-center gap-6 border-t border-border/40 bg-muted/20 px-4 py-3 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">未稅小計 </span>
          <span className="font-mono tabular-nums">{q.subtotal}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">稅額 </span>
          <span className="font-mono tabular-nums">{q.taxAmount}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">總額（含稅）</span>
          <span className="ml-1 font-mono tabular-nums text-lg font-semibold">{q.totalAmount}</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          建立 {q.createdAt.slice(0, 16).replace('T', ' ')} · 更新 {q.updatedAt.slice(0, 16).replace('T', ' ')}
        </div>
      </footer>

      {addOpen ? (
        <AddItemDialog
          customerId={q.customerId}
          quoteId={q.id}
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await reloadAll();
          }}
        />
      ) : null}
    </div>
  );
}

function ReadField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{children ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
  labelClass,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  labelClass?: string;
}) {
  return (
    <label className={`text-sm ${full ? 'md:col-span-3' : ''}`}>
      <span className={`mb-0.5 block text-xs text-muted-foreground ${labelClass ?? ''}`}>{label}</span>
      {children}
    </label>
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
    <section className="flex-1 p-4">
      <h2 className="mb-2 text-sm font-semibold">明細（{items.length} 行）</h2>
      <div className="overflow-x-auto rounded-lg border border-border/40">
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
              {editable ? <th className="px-3 py-2"></th> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={editable ? 9 : 8} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  尚無明細。{editable ? '用工具列「新增明細」加入。' : ''}
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const below = it.minPrice && Number(it.unitPrice) < Number(it.minPrice);
                return (
                  <tr key={it.id} className="border-t border-border/20 hover:bg-accent/10">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-mono">{it.partNo}</div>
                      <div className="text-muted-foreground">{it.partName}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${below ? 'font-semibold text-rose-600' : ''}`}>{it.unitPrice}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">{it.minPrice ?? '-'}</td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{it.transferredQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
                    <td className="px-3 py-2 text-xs">
                      {below ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-900">⚠️ 低於最低售價：{it.belowMinReason ?? '未填理由'}</span>
                      ) : null}
                    </td>
                    {editable ? (
                      <td className="px-3 py-2 text-right">
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
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** 新增明細對話框（含歷史價提示）*/
function AddItemDialog({
  customerId,
  quoteId,
  onClose,
  onAdded,
}: {
  customerId: string;
  quoteId: string;
  onClose: () => void;
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
      if (rows.length && Number(unitPrice) === 0) setUnitPrice(rows[0].unitPrice);
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
      await onAdded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '新增失敗';
      setErr(msg.includes('belowMinReason') ? `${msg}（請補填「低於最低售價的原因」後重送）` : msg);
    } finally {
      setBusy(false);
    }
  }

  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">新增明細（料號 picker 待 Step4）</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent/20" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm md:col-span-3">
            <span className="mb-1 block text-xs text-muted-foreground">料號 ID *</span>
            <div className="flex gap-1">
              <input value={partId} onChange={(e) => setPartId(e.target.value)} placeholder="NX01PART..." className={cls} required />
              <button type="button" onClick={() => void fetchHistory()} disabled={histLoading} className="rounded border px-2 text-xs disabled:opacity-50" title="查歷史價">
                📜 歷史價
              </button>
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">數量 *</span>
            <input type="number" step="0.0001" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className={`${cls} tabular-nums`} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">報價單價 *</span>
            <input type="number" step="0.0001" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={`${cls} tabular-nums`} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">低於最低售價原因</span>
            <input value={belowMinReason} onChange={(e) => setBelowMinReason(e.target.value)} placeholder="老主顧 / 量大…" className={cls} />
          </label>
          <label className="text-sm md:col-span-3">
            <span className="mb-1 block text-xs text-muted-foreground">備註</span>
            <input value={remark} onChange={(e) => setRemark(e.target.value)} className={cls} />
          </label>
        </div>

        {history.length > 0 ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs">
            <div className="mb-2 font-semibold text-emerald-900">📜 該客戶歷史報價（最近 {history.length} 筆）</div>
            <div className="space-y-1 font-mono">
              {history.map((h) => (
                <div key={h.quoteItemId} className="flex flex-wrap gap-3 text-emerald-900">
                  <span>{h.docNo}</span>
                  <span>{h.quoteDate.slice(0, 10)}</span>
                  <span>{h.status}</span>
                  <span>單價 {h.unitPrice}</span>
                  <span>數量 {h.qty}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {err ? <div className="text-xs text-destructive">{err}</div> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-1.5 text-sm">
            取消
          </button>
          <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? '新增中…' : '新增明細'}
          </button>
        </div>
      </form>
    </div>
  );
}
