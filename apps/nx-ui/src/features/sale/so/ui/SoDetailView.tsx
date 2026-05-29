// apps/nx-ui/src/features/sale/so/ui/SoDetailView.tsx
// NX04-M3 C2：SO 銷貨單 - 詳情 + 狀態流轉 + 拉報價 + IT-O 警示橫條
//
// 三大核心特色：
// 1. 拉報價建單（非 1:1）：開啟 modal 勾選客戶 OPEN 報價行、混合 + 純新行
// 2. 雙段狀態組合顯示：每行用 combinedStatusLabel(transferStatus, fulfillStatus) 渲染
// 3. IT-O 警示橫條：任一 line transferSourceType='G' + transferStatus='P' → 顯示 + 跳 C3 modal

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

import {
  addSoItem,
  getSo,
  listOpenQuoteLines,
  removeSoItem,
  softDeleteSo,
  updateSo,
} from '../api/so';
import type {
  CreateSoItemPayload,
  OpenQuoteLine,
  So,
  SoItem,
  SoStatus,
} from '../types';
import {
  FULFILL_STATUS_LABEL,
  SO_STATUS_LABEL,
  TRANSFER_SOURCE_LABEL,
  TRANSFER_STATUS_LABEL,
} from '../types';
import { combinedStatusLabel, SO_HEADER_STATUS_BADGE_CLASS } from '../utils';
import { CreateTiFromSoModal } from './CreateTiFromSoModal';

const TRANSFER_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'S', label: 'S 本倉現貨' },
  { value: 'T', label: 'T 自倉調撥' },
  { value: 'G', label: 'G 同行調貨' },
  { value: 'B', label: 'B 客戶訂單' },
];

const NEXT_STATUS: Partial<Record<SoStatus, SoStatus>> = {
  DRAFT: 'CONFIRMED',
  CONFIRMED: 'PICKING',
  PICKING: 'SHIPPED',
  SHIPPED: 'INVOICED',
};

export function SoDetailView({ id }: { id: string }) {
  return (
    <TieredFormProvider defaultMode="lite">
      <SoDetailInner id={id} />
    </TieredFormProvider>
  );
}

function SoDetailInner({ id }: { id: string }) {
  const [so, setSo] = useState<So | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showTiModal, setShowTiModal] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSo(id);
      setSo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handle = async (fn: () => Promise<unknown>, prefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(`${prefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  // IT-O 警示橫條偵測：任一 line transferSourceType='G' + transferStatus='P' + 未綁 TI
  const pendingTransferCount = useMemo(() => {
    if (!so?.items) return 0;
    return so.items.filter(
      (it) => it.transferSourceType === 'G' && it.transferStatus === 'P' && !it.tiId,
    ).length;
  }, [so]);

  if (loading && !so) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !so) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!so) return null;

  const editable = so.status === 'DRAFT' || so.status === 'CONFIRMED' || so.status === 'PICKING';
  const itemsEditable = editable && !so.cancelledAt;
  const next = NEXT_STATUS[so.status];
  const canCancel = so.status === 'DRAFT' || so.status === 'CONFIRMED' || so.status === 'PICKING';

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE · SALES ORDER</p>
          <h1 className="text-2xl font-mono font-semibold">{so.docNo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded px-2 py-0.5 text-xs ${SO_HEADER_STATUS_BADGE_CLASS[so.status] ?? 'bg-muted'}`}>
              狀態：{SO_STATUS_LABEL[so.status] ?? so.status}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">客戶 {so.customerId}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">倉庫 {so.warehouseId}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">交貨 {so.deliveryType}</span>
            {so.quoteId ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
                來源報價 {so.quoteId}
              </span>
            ) : null}
            {so.paymentTerm ? (
              <span className="rounded bg-muted px-2 py-0.5 text-xs">付款 {so.paymentTerm}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/nx04/sales-order" className="rounded border px-3 py-1 text-sm hover:bg-muted">
            ← 返回列表
          </Link>
          <button
            disabled={busy}
            onClick={() => void reload()}
            className="rounded border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            重整 (R)
          </button>
          {next ? (
            <button
              disabled={busy}
              onClick={() => void handle(() => updateSo(id, { status: next }), `推進 ${so.status} → ${next}`)}
              className="rounded bg-amber-500 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              推進 → {next}
            </button>
          ) : null}
          {canCancel ? (
            <button
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('取消原因（必填）');
                if (!reason?.trim()) return;
                void handle(() => softDeleteSo(id, reason.trim()), '取消');
              }}
              className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 disabled:opacity-50"
            >
              取消 → CANCELLED
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {pendingTransferCount > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-amber-900">
              ⚠️ 此銷貨單有 <strong className="font-semibold">{pendingTransferCount}</strong> 行需向同行調貨（G 同行 + 待補）
              、尚未建 IT-O 調貨單。
            </div>
            <button
              onClick={() => setShowTiModal(true)}
              className="rounded bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-700"
            >
              建調貨單 →
            </button>
          </div>
        </div>
      ) : null}

      {showTiModal ? (
        <CreateTiFromSoModal
          soId={so.id}
          docNo={so.docNo}
          onClose={() => setShowTiModal(false)}
          onCreated={(resp) => {
            setShowTiModal(false);
            void reload();
            // 跳轉 NX02 TI detail
            window.location.href = `/dashboard/nx02/ti/${resp.tiId}`;
          }}
        />
      ) : null}

      <HeaderEditor so={so} editable={editable} onSaved={reload} />

      <ItemsSection
        so={so}
        items={so.items ?? []}
        editable={itemsEditable}
        onChanged={reload}
      />

      <footer className="flex flex-wrap gap-6 rounded border bg-muted/30 p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">未稅小計</div>
          <div className="font-mono tabular-nums">{so.subtotal}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">稅率 / 稅額</div>
          <div className="font-mono tabular-nums">
            {so.taxRate}% / {so.taxAmount}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">總額（含稅）</div>
          <div className="font-mono tabular-nums text-lg font-semibold">{so.totalAmount}</div>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          建立 {so.createdAt.slice(0, 19).replace('T', ' ')} by {so.createdBy}
          <br />
          更新 {so.updatedAt.slice(0, 19).replace('T', ' ')} by {so.updatedBy}
        </div>
      </footer>
    </div>
  );
}

function HeaderEditor({
  so,
  editable,
  onSaved,
}: {
  so: So;
  editable: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const [soDate, setSoDate] = useState(so.soDate.slice(0, 10));
  const [deliveryType, setDeliveryType] = useState(so.deliveryType);
  const [deliveryAddress, setDeliveryAddress] = useState(so.deliveryAddress ?? '');
  const [remark, setRemark] = useState(so.remark ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await updateSo(so.id, {
        soDate,
        deliveryType,
        deliveryAddress: deliveryAddress.trim() || undefined,
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

  return (
    <section className="rounded border p-4">
      <h2 className="mb-3 text-sm font-semibold">
        基本資料 {editable ? '' : <span className="text-muted-foreground">（唯讀）</span>}
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="block mb-1">銷貨日</span>
          <input
            type="date"
            value={soDate}
            onChange={(e) => setSoDate(e.target.value)}
            disabled={!editable}
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">交貨方式</span>
          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            disabled={!editable}
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          >
            <option value="P">P 自取</option>
            <option value="D">D 配送</option>
            <option value="S">S 寄送</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1">配送地址（D 配送時必填）</span>
          <input
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            disabled={!editable}
            placeholder="客戶配送地址"
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          />
        </label>
        <label className="text-sm md:col-span-3">
          <span className="block mb-1">備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={!editable}
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          />
        </label>
      </div>
      {editable ? (
        <div className="mt-3 flex items-center gap-3">
          <button
            disabled={busy}
            onClick={() => void save()}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? '儲存中…' : '儲存基本資料'}
          </button>
          {savedAt ? <span className="text-xs text-emerald-700">已儲存 {savedAt}</span> : null}
          {err ? <span className="text-xs text-destructive">{err}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function ItemsSection({
  so,
  items,
  editable,
  onChanged,
}: {
  so: So;
  items: SoItem[];
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
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-left">來源</th>
                <th className="px-3 py-2 text-left">行狀態</th>
                <th className="px-3 py-2 text-left">細節</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const combined = combinedStatusLabel(it.transferStatus, it.fulfillStatus);
                const isIto = it.transferSourceType === 'G';
                const sourceLabel = TRANSFER_SOURCE_LABEL[it.transferSourceType] ?? it.transferSourceType;
                return (
                  <tr key={it.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.lineNo}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-mono">{it.partNo}</div>
                      <div className="text-muted-foreground">{it.partName}</div>
                      {it.quoteItemId ? (
                        <div className="text-emerald-700">📜 拉自 QT</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.unitPrice}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.lineAmount}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`rounded px-2 py-0.5 ${isIto ? 'bg-amber-100 text-amber-900' : 'bg-muted'}`}>
                        {it.transferSourceType} {sourceLabel}
                      </span>
                      {it.tiId ? (
                        <div className="mt-1 text-emerald-700">TI {it.tiId}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`rounded px-2 py-0.5 ${combined.badgeClass}`}>
                        {combined.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <div>補貨：{TRANSFER_STATUS_LABEL[it.transferStatus] ?? it.transferStatus}</div>
                      <div>出貨：{FULFILL_STATUS_LABEL[it.fulfillStatus] ?? it.fulfillStatus}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editable ? (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`刪除明細 ${it.lineNo}？`)) return;
                            try {
                              await removeSoItem(so.id, it.id);
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
          尚無明細。{editable ? '用下方表單新增（或拉客戶舊報價）。' : ''}
        </div>
      )}

      {editable ? (
        <AddItemArea customerId={so.customerId} soId={so.id} defaultWarehouseId={so.warehouseId} onAdded={onChanged} />
      ) : null}
    </section>
  );
}

function AddItemArea({
  customerId,
  soId,
  defaultWarehouseId,
  onAdded,
}: {
  customerId: string;
  soId: string;
  defaultWarehouseId: string;
  onAdded: () => void | Promise<void>;
}) {
  const [showPullQuote, setShowPullQuote] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowPullQuote((v) => !v)}
          className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-900 hover:bg-emerald-100"
        >
          {showPullQuote ? '收起拉報價' : '📜 拉客戶舊報價'}
        </button>
      </div>
      {showPullQuote ? (
        <PullQuotePanel
          customerId={customerId}
          soId={soId}
          defaultWarehouseId={defaultWarehouseId}
          onAdded={onAdded}
          onClose={() => setShowPullQuote(false)}
        />
      ) : null}
      <AddItemForm soId={soId} defaultWarehouseId={defaultWarehouseId} onAdded={onAdded} />
    </div>
  );
}

function PullQuotePanel({
  customerId,
  soId,
  defaultWarehouseId,
  onAdded,
  onClose,
}: {
  customerId: string;
  soId: string;
  defaultWarehouseId: string;
  onAdded: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<OpenQuoteLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, { qty: string; sourceType: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const rows = await listOpenQuoteLines(customerId);
      setLines(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '查報價失敗');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = (line: OpenQuoteLine) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[line.quoteItemId]) {
        delete next[line.quoteItemId];
      } else {
        next[line.quoteItemId] = { qty: String(line.remainQty), sourceType: 'S' };
      }
      return next;
    });
  };

  const updateSel = (id: string, patch: Partial<{ qty: string; sourceType: string }>) => {
    setSelected((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  };

  const submitAll = async () => {
    const ids = Object.keys(selected);
    if (!ids.length) return;
    setSubmitting(true);
    setErr(null);
    try {
      for (const qid of ids) {
        const sel = selected[qid];
        const line = lines.find((l) => l.quoteItemId === qid);
        if (!line) continue;
        const payload: CreateSoItemPayload = {
          partId: line.partId,
          warehouseId: line.warehouseId || defaultWarehouseId,
          qty: Number(sel.qty),
          unitPriceSnapshot: Number(line.unitPrice),
          quoteItemId: qid,
          transferSourceType: sel.sourceType,
        };
        await addSoItem(soId, payload);
      }
      setSelected({});
      await onAdded();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加行失敗（部分行可能已加入）');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-900">📜 拉舊報價（客戶 {customerId} OPEN 報價行）</h3>
        <button onClick={() => void reload()} className="rounded border px-2 py-0.5 text-xs">
          重新整理
        </button>
      </div>
      {loading ? <div className="text-xs text-muted-foreground">載入中…</div> : null}
      {err ? <div className="mb-2 text-xs text-destructive">{err}</div> : null}
      {!loading && !lines.length ? (
        <div className="text-xs text-muted-foreground">該客戶目前無可拉的 OPEN 報價行（已轉完 / 過期 / 未寄出）。</div>
      ) : null}
      {lines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-emerald-100/40 text-[10px] uppercase text-emerald-900">
              <tr>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1 text-left">報價</th>
                <th className="px-2 py-1 text-left">料號 / 品名</th>
                <th className="px-2 py-1 text-right">原數量</th>
                <th className="px-2 py-1 text-right">已轉</th>
                <th className="px-2 py-1 text-right">剩餘</th>
                <th className="px-2 py-1 text-right">單價</th>
                <th className="px-2 py-1 text-right">本次數量</th>
                <th className="px-2 py-1 text-left">補貨來源</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const sel = selected[l.quoteItemId];
                return (
                  <tr key={l.quoteItemId} className="border-t border-emerald-100">
                    <td className="px-2 py-1">
                      <input type="checkbox" checked={!!sel} onChange={() => toggle(l)} />
                    </td>
                    <td className="px-2 py-1 font-mono">
                      <div>{l.docNo}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {l.quoteDate.slice(0, 10)} · {l.quoteStatus}
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <div className="font-mono">{l.partNo}</div>
                      <div className="text-[10px] text-muted-foreground">{l.partName}</div>
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{l.qty}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{l.transferredQty}</td>
                    <td className="px-2 py-1 text-right tabular-nums font-semibold">{l.remainQty}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{l.unitPrice}</td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={sel?.qty ?? ''}
                        onChange={(e) => updateSel(l.quoteItemId, { qty: e.target.value })}
                        disabled={!sel}
                        placeholder={String(l.remainQty)}
                        className="w-20 rounded border bg-background px-1 py-0.5 text-right tabular-nums disabled:opacity-40"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={sel?.sourceType ?? 'S'}
                        onChange={(e) => updateSel(l.quoteItemId, { sourceType: e.target.value })}
                        disabled={!sel}
                        className="rounded border bg-background px-1 py-0.5 text-[10px] disabled:opacity-40"
                      >
                        {TRANSFER_SOURCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={submitting || !Object.keys(selected).length}
          onClick={() => void submitAll()}
          className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {submitting ? '加入中…' : `加入 ${Object.keys(selected).length} 行到 SO`}
        </button>
        <button onClick={onClose} className="rounded border px-3 py-1 text-sm">
          關閉
        </button>
      </div>
    </div>
  );
}

function AddItemForm({
  soId,
  defaultWarehouseId,
  onAdded,
}: {
  soId: string;
  defaultWarehouseId: string;
  onAdded: () => void | Promise<void>;
}) {
  const [partId, setPartId] = useState('');
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [transferSourceType, setTransferSourceType] = useState('S');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partId.trim() || !warehouseId.trim() || Number(qty) <= 0) {
      setErr('partId / warehouseId / qty 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateSoItemPayload = {
        partId: partId.trim(),
        warehouseId: warehouseId.trim(),
        qty: Number(qty),
        unitPriceSnapshot: Number(unitPrice),
        transferSourceType,
        remark: remark.trim() || undefined,
      };
      await addSoItem(soId, payload);
      setPartId('');
      setQty('1');
      setUnitPrice('0');
      setRemark('');
      setTransferSourceType('S');
      await onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '新增失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">新增明細（純新行、未拉報價）</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="block mb-1">🟢 料號 ID *</span>
          <input
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
            placeholder="NX01PART..."
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 倉庫 ID *</span>
          <input
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            placeholder="NX01WHSE..."
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
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
          <span className="block mb-1">🟢 單價 *</span>
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
        <label className="text-sm">
          <span className="block mb-1">🟡 補貨來源</span>
          <select
            value={transferSourceType}
            onChange={(e) => setTransferSourceType(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          >
            {TRANSFER_SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-5">
          <span className="block mb-1">⚪ 備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
      </div>
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
