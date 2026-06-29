// apps/nx-ui/src/features/nx04/quote/ui/QuoteWorkbench.tsx
// NX04-QT-SHELL Step5：報價單工作區 — 六層完整體
//   L4「資料瀏覽 / 詳細資料」同頁分頁（偉盟模型）：Alt+1/2 切換、列表點列→詳細、↑↓ 換筆
//   list tab / detail tab 各自投影 L3 工具列（同時只有一個 tab 活著、不會疊）
//   日期區間 / 業務員 / 只看我的 篩選、客戶名稱顯示 → 待後端補 query 後接（後續）

'use client';

import { Plus, RefreshCcw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MasterTabs, type MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import { ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';
import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';

import { createQuote, listQuote } from '@data/endpoints/nx04/quote/api/quote';
import type { CreateQuotePayload, Quote, QuoteStatus } from '@data/types/nx04/quote';
import { QUOTE_STATUSES, QUOTE_STATUS_LABEL } from '@data/types/nx04/quote';

import { QuoteDetailPanel } from './QuoteDetailView';

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground',
  SENT: 'bg-amber-100 text-amber-900',
  ACCEPTED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
  EXPIRED: 'bg-zinc-200 text-zinc-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500 line-through',
};

const STATUS_OPTIONS: { value: QuoteStatus | ''; label: string }[] = [
  { value: '', label: '全部狀態' },
  ...QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_STATUS_LABEL[s] })),
];

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date(new Date().toDateString());
}

export function QuoteWorkbench({
  initialId,
  initialTab = 'list',
}: {
  initialId?: string;
  initialTab?: MasterTab;
}) {
  const [tab, setTab] = useState<MasterTab>(initialId ? 'detail' : initialTab);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [rows, setRows] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listQuote({
        status: status || undefined,
        search: search.trim() || undefined,
        pageSize: 100,
      });
      setRows(resp.items);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '列表載入失敗');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setTab('detail');
  };

  // 上下筆 nav（在目前列表 rows 內移動）
  const idx = selectedId ? rows.findIndex((r) => r.id === selectedId) : -1;
  const itemIndex = idx >= 0 ? idx + 1 : undefined;
  const prevId = idx > 0 ? rows[idx - 1].id : null;
  const nextId = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1].id : null;
  const gotoPrev = useCallback(() => {
    if (prevId) setSelectedId(prevId);
  }, [prevId]);
  const gotoNext = useCallback(() => {
    if (nextId) setSelectedId(nextId);
  }, [nextId]);

  // 鍵盤：Alt+1 列表 / Alt+2 詳細 / 詳細時 ↑↓ 換筆（焦點在輸入框時不接管）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField = !!t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName);
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setTab('list');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        if (selectedId) setTab('detail');
        return;
      }
      if (tab === 'detail' && !inField && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === 'ArrowUp' && gotoPrev) {
          e.preventDefault();
          gotoPrev();
        } else if (e.key === 'ArrowDown' && gotoNext) {
          e.preventDefault();
          gotoNext();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, selectedId, gotoPrev, gotoNext]);

  return (
    <TieredFormProvider defaultMode="lite">
      <div className="w-full min-w-0">
        {/* L4 頁內分頁 */}
        <div className="px-5 pt-4">
          <MasterTabs
            tab={tab}
            onChange={(t) => {
              if (t === 'detail' && !selectedId) return;
              setTab(t);
            }}
          />
        </div>

        {tab === 'list' ? (
          <>
            {/* L3：列表動作 */}
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
                <ToolbarButton icon={Plus} letter="A" label="新增" enabled onClick={() => setShowNew(true)} />
                <ToolbarSeparator />
                <ToolbarButton
                  icon={Search}
                  letter="F"
                  label="查詢"
                  enabled
                  onClick={() => searchRef.current?.focus()}
                />
                <ToolbarButton icon={RefreshCcw} letter="R" label="重整" enabled onClick={() => void reload()} />
                <div className="flex-1" />
              </div>
            </ToolbarPortal>

            <div className="space-y-4 p-5">
              {/* 篩選列 */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuoteStatus | '')}
                  className="rounded border bg-background px-2 py-1 text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void reload()}
                  placeholder="搜尋：單號 / 客戶 / 料件"
                  className="min-w-[16rem] flex-1 rounded border bg-background px-2 py-1 text-sm"
                />
                <span className="text-xs text-muted-foreground">共 {total} 筆</span>
              </div>

              {error ? (
                <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
              ) : null}

              {showNew ? (
                <QuickCreateForm
                  onCreated={(id) => {
                    setShowNew(false);
                    void reload();
                    openDetail(id);
                  }}
                  onCancel={() => setShowNew(false)}
                />
              ) : null}

              {loading && !rows.length ? (
                <div className="text-sm text-muted-foreground">載入中…</div>
              ) : null}

              {!loading && !rows.length && !error ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  尚無報價單。按工具列「新增」建立一筆。
                </div>
              ) : null}

              {rows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">單號</th>
                        <th className="px-3 py-2 text-left">狀態</th>
                        <th className="px-3 py-2 text-left">報價日</th>
                        <th className="px-3 py-2 text-left">有效期限</th>
                        <th className="px-3 py-2 text-left">客戶</th>
                        <th className="px-3 py-2 text-left">業務員</th>
                        <th className="px-3 py-2 text-right">未稅</th>
                        <th className="px-3 py-2 text-right">含稅</th>
                        <th className="px-3 py-2 text-left">備註</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const expired = isExpired(r.validUntil);
                        return (
                          <tr
                            key={r.id}
                            onClick={() => openDetail(r.id)}
                            className={`cursor-pointer border-t hover:bg-accent/10 ${
                              r.id === selectedId ? 'bg-primary/10' : ''
                            }`}
                          >
                            <td className="px-3 py-2 font-mono">{r.docNo}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded px-2 py-0.5 text-xs ${STATUS_BADGE_CLASS[r.status] ?? 'bg-muted'}`}>
                                {QUOTE_STATUS_LABEL[r.status] ?? r.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">{r.quoteDate.slice(0, 10)}</td>
                            <td className={`px-3 py-2 ${expired ? 'font-semibold text-rose-600' : ''}`}>
                              {r.validUntil ? r.validUntil.slice(0, 10) : '—'}
                              {expired ? '（過期）' : ''}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{r.customerId}</td>
                            <td className="px-3 py-2 font-mono text-xs">{r.salesPersonId ?? '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.subtotal}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.totalAmount}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{r.remark ?? ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </>
        ) : selectedId ? (
          <QuoteDetailPanel
            id={selectedId}
            onBack={() => setTab('list')}
            onChanged={reload}
            itemIndex={itemIndex}
            itemTotal={rows.length}
            onPrevItem={gotoPrev}
            onNextItem={gotoNext}
          />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">請先回資料瀏覽選一張報價單。</div>
        )}
      </div>
    </TieredFormProvider>
  );
}

function QuickCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerGradeId, setCustomerGradeId] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId.trim() || !customerId.trim()) {
      setErr('倉庫 / 客戶必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateQuotePayload = {
        warehouseId: warehouseId.trim(),
        customerId: customerId.trim(),
        customerGradeId: customerGradeId.trim() || undefined,
        quoteDate,
        validUntil: validUntil || undefined,
        taxRate: Number(taxRate) || 0,
        remark: remark.trim() || undefined,
      };
      const q = await createQuote(payload);
      onCreated(q.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">新增報價單（建立後進入詳情頁加料件）</h2>
        <button type="button" onClick={onCancel} className="rounded p-1 hover:bg-accent/20" aria-label="取消">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">倉庫 ID *（picker 待 Step4）</span>
          <input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="NX01WHSE..." className={cls} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">客戶 ID *（picker 待 Step4）</span>
          <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="NX01PTNR..." className={cls} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">客戶等級 ID（自動帶待 Step4）</span>
          <input value={customerGradeId} onChange={(e) => setCustomerGradeId(e.target.value)} placeholder="NX01CUGR..." className={cls} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">報價日 *</span>
          <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={cls} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">有效期限（留白自動帶預設天數）</span>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={cls} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">稅率 % *</span>
          <input type="number" step="0.01" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={`${cls} tabular-nums`} required />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">備註</span>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="客戶口頭備註等" className={cls} />
        </label>
      </div>
      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          {busy ? '建立中…' : '建立並進入'}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5 text-sm">
          取消
        </button>
      </div>
    </form>
  );
}
