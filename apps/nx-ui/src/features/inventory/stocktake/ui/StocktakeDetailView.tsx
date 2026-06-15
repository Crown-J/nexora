// apps/nx-ui/src/features/inventory/stocktake/ui/StocktakeDetailView.tsx
// NX03-STOCK-LITE M3-1：盤點工作台 - 詳情 + counting + 核可流程 + post
//
// 狀態流程：DRAFT → COUNTING → ADJUSTING → 送審 → (auto/簽核) → POSTED
// 核可：approvalStatus N=未送審 / P=等簽 / A=核可 / R=退回（重送）

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  addStockTakeItem,
  decideApproval,
  getStockTake,
  patchStockTakeItem,
  removeStockTakeItem,
  submitForApproval,
  updateStockTake,
} from '@data/endpoints/inventory/stocktake/api/stocktake';
import type {
  StockTake,
  StockTakeItem,
  StockTakeStatus,
  VarianceReasonCode,
} from '@data/types/inventory/stocktake';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  COUNTING: '盤點中',
  ADJUSTING: '調整中',
  POSTED: '已過帳',
  CANCELLED: '已作廢',
};
const APPROVAL_LABEL: Record<string, string> = {
  N: '未送審',
  P: '等簽核',
  A: '已核可',
  R: '已退回',
};
const REASON_OPTIONS: { value: VarianceReasonCode | ''; label: string }[] = [
  { value: '', label: '—' },
  { value: 'S', label: 'S 被偷' },
  { value: 'M', label: 'M 算錯' },
  { value: 'B', label: 'B 破損' },
  { value: 'U', label: 'U 不明' },
];

export function StocktakeDetailView({ id }: { id: string }) {
  const [st, setSt] = useState<StockTake | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStockTake(id);
      setSt(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAction = async (action: () => Promise<unknown>, errPrefix: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setError(`${errPrefix}: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !st) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !st) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!st) return null;

  const editable = st.status === 'DRAFT' || st.status === 'COUNTING' || st.status === 'ADJUSTING';
  const items = st.items ?? [];

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · STOCKTAKE</p>
          <h1 className="text-2xl font-mono font-semibold">{st.docNo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              狀態：{STATUS_LABEL[st.status] ?? st.status}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">
              核可：{APPROVAL_LABEL[st.approvalStatus] ?? st.approvalStatus}
            </span>
            <span className="text-muted-foreground">倉庫：{st.warehouseId}</span>
            <span className="text-muted-foreground">日期：{st.stockTakeDate.slice(0, 10)}</span>
            <span className="text-muted-foreground">小門檻：NT$ {st.smallToleranceQty}</span>
          </div>
          {st.remark ? <p className="mt-2 text-sm text-muted-foreground">備註：{st.remark}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href="/dashboard/inventory/stocktake" className="text-sm text-primary hover:underline">
            ← 返回列表
          </Link>
          {st.status !== 'POSTED' && st.status !== 'CANCELLED' ? (
            <Link
              href={`/dashboard/inventory/stocktake/${st.id}/scan`}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/10 px-3 py-1.5 text-xs text-[#E8A020] hover:bg-[#E8A020]/15"
            >
              📱 手機掃條碼模式
            </Link>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      <StatusActions
        st={st}
        busy={busy}
        onTransition={(toStatus) =>
          handleAction(() => updateStockTake(st.id, { status: toStatus }), `轉 ${toStatus} 失敗`)
        }
        onSubmit={() => handleAction(() => submitForApproval(st.id), '送審失敗')}
        onDecide={(decision) =>
          handleAction(() => decideApproval(st.id, { decision }), '核可決定失敗')
        }
      />

      <ItemsTable
        st={st}
        editable={editable}
        onPatch={(itemId, payload) =>
          handleAction(() => patchStockTakeItem(st.id, itemId, payload), '修改明細失敗')
        }
        onDelete={(itemId) =>
          handleAction(() => removeStockTakeItem(st.id, itemId), '刪除明細失敗')
        }
      />

      {editable ? (
        <AddItemForm
          onAdd={(payload) =>
            handleAction(() => addStockTakeItem(st.id, payload), '新增明細失敗')
          }
        />
      ) : null}
    </div>
  );
}

function StatusActions(props: {
  st: StockTake;
  busy: boolean;
  onTransition: (to: StockTakeStatus) => Promise<void>;
  onSubmit: () => Promise<void>;
  onDecide: (decision: 'A' | 'R') => Promise<void>;
}) {
  const { st, busy, onTransition, onSubmit, onDecide } = props;
  return (
    <section className="flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-3">
      <span className="text-xs text-muted-foreground">流程：</span>
      {st.status === 'DRAFT' ? (
        <button
          disabled={busy}
          onClick={() => void onTransition('COUNTING')}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
        >
          1️⃣ 啟動盤點（DRAFT → COUNTING）
        </button>
      ) : null}
      {st.status === 'COUNTING' ? (
        <button
          disabled={busy}
          onClick={() => void onTransition('ADJUSTING')}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
        >
          2️⃣ 進入調整（COUNTING → ADJUSTING）
        </button>
      ) : null}
      {st.status === 'ADJUSTING' && (st.approvalStatus === 'N' || st.approvalStatus === 'R') ? (
        <button
          disabled={busy}
          onClick={() => void onSubmit()}
          className="rounded bg-amber-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          3️⃣ 送審（即時計算誤差成本 vs 小門檻）
        </button>
      ) : null}
      {st.status === 'ADJUSTING' && st.approvalStatus === 'P' ? (
        <>
          <button
            disabled={busy}
            onClick={() => void onDecide('A')}
            className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            ✅ 核可通過
          </button>
          <button
            disabled={busy}
            onClick={() => void onDecide('R')}
            className="rounded bg-destructive px-3 py-1 text-sm text-destructive-foreground disabled:opacity-50"
          >
            ❌ 退回
          </button>
        </>
      ) : null}
      {st.status === 'ADJUSTING' && st.approvalStatus === 'A' ? (
        <button
          disabled={busy}
          onClick={() => void onTransition('POSTED')}
          className="rounded bg-green-700 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          4️⃣ 過帳（寫帳 + 寫補貨通知到 nx98）
        </button>
      ) : null}
      {st.status === 'DRAFT' || st.status === 'COUNTING' || st.status === 'ADJUSTING' ? (
        <button
          disabled={busy}
          onClick={() => void onTransition('CANCELLED')}
          className="ml-auto rounded border px-3 py-1 text-sm text-muted-foreground hover:bg-destructive/10 disabled:opacity-50"
        >
          作廢
        </button>
      ) : null}
    </section>
  );
}

function ItemsTable(props: {
  st: StockTake;
  editable: boolean;
  onPatch: (itemId: string, payload: { countedQty?: number; varianceReasonCode?: VarianceReasonCode; remark?: string }) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}) {
  const { st, editable, onPatch, onDelete } = props;
  const items = st.items ?? [];
  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left">行</th>
            <th className="px-2 py-2 text-left">料號</th>
            <th className="px-2 py-2 text-left">品名</th>
            <th className="px-2 py-2 text-left">庫位</th>
            <th className="px-2 py-2 text-right">系統量</th>
            <th className="px-2 py-2 text-right">snapshot</th>
            <th className="px-2 py-2 text-right">盤點量</th>
            <th className="px-2 py-2 text-right">公式應有</th>
            <th className="px-2 py-2 text-right">真實誤差</th>
            <th className="px-2 py-2 text-right">單位成本</th>
            <th className="px-2 py-2 text-left">差異原因</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-2 py-6 text-center text-sm text-muted-foreground">
                尚無明細。{editable ? '下方表單新增。' : ''}
              </td>
            </tr>
          ) : null}
          {items.map((it) => (
            <ItemRow key={it.id} item={it} editable={editable} onPatch={onPatch} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemRow(props: {
  item: StockTakeItem;
  editable: boolean;
  onPatch: (itemId: string, payload: { countedQty?: number; varianceReasonCode?: VarianceReasonCode; remark?: string }) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}) {
  const { item, editable, onPatch, onDelete } = props;
  const [countedDraft, setCountedDraft] = useState(item.countedQty);

  useEffect(() => {
    setCountedDraft(item.countedQty);
  }, [item.countedQty]);

  return (
    <tr className="border-t hover:bg-muted/20">
      <td className="px-2 py-1">{item.lineNo}</td>
      <td className="px-2 py-1 font-mono text-xs">{item.partNo}</td>
      <td className="px-2 py-1">{item.partName}</td>
      <td className="px-2 py-1 font-mono text-xs">{item.locationId}</td>
      <td className="px-2 py-1 text-right tabular-nums">{item.systemQty}</td>
      <td className="px-2 py-1 text-right tabular-nums text-xs text-muted-foreground">{item.snapshotQty}</td>
      <td className="px-2 py-1 text-right">
        {editable ? (
          <input
            type="number"
            step="0.0001"
            value={countedDraft}
            onChange={(e) => setCountedDraft(e.target.value)}
            onBlur={() => {
              const v = Number(countedDraft);
              if (!Number.isNaN(v) && countedDraft !== item.countedQty) {
                void onPatch(item.id, { countedQty: v });
              }
            }}
            className="w-24 rounded border bg-background px-1 text-right tabular-nums"
          />
        ) : (
          <span className="tabular-nums">{item.countedQty}</span>
        )}
      </td>
      <td className="px-2 py-1 text-right tabular-nums text-xs">{item.formulaExpectedQty}</td>
      <td className="px-2 py-1 text-right tabular-nums font-semibold">
        {item.realDiffQty}
      </td>
      <td className="px-2 py-1 text-right tabular-nums text-xs">{item.unitCost}</td>
      <td className="px-2 py-1">
        {editable ? (
          <select
            value={item.varianceReasonCode ?? ''}
            onChange={(e) => {
              const v = e.target.value as VarianceReasonCode | '';
              void onPatch(item.id, v ? { varianceReasonCode: v } : { varianceReasonCode: undefined });
            }}
            className="rounded border bg-background px-1 text-xs"
          >
            {REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs">{item.varianceReasonCode ?? '—'}</span>
        )}
      </td>
      <td className="px-2 py-1 text-right">
        {editable ? (
          <button
            onClick={() => {
              if (window.confirm('確認刪除此明細？')) void onDelete(item.id);
            }}
            className="text-xs text-destructive hover:underline"
          >
            刪除
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function AddItemForm(props: {
  onAdd: (payload: { partId: string; locationId: string; countedQty?: number; remark?: string }) => Promise<void>;
}) {
  const [partId, setPartId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [countedQty, setCountedQty] = useState('');
  const [remark, setRemark] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partId.trim() || !locationId.trim()) return;
    await props.onAdd({
      partId: partId.trim(),
      locationId: locationId.trim(),
      countedQty: countedQty.trim() ? Number(countedQty) : undefined,
      remark: remark.trim() || undefined,
    });
    setPartId('');
    setLocationId('');
    setCountedQty('');
    setRemark('');
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded border bg-muted/20 p-3 md:grid-cols-5">
      <input
        value={partId}
        onChange={(e) => setPartId(e.target.value)}
        placeholder="🟢 partId *"
        className="rounded border bg-background px-2 py-1 text-sm"
        required
      />
      <input
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
        placeholder="🟢 locationId *"
        className="rounded border bg-background px-2 py-1 text-sm"
        required
      />
      <input
        type="number"
        step="0.0001"
        value={countedQty}
        onChange={(e) => setCountedQty(e.target.value)}
        placeholder="🟡 初盤量 (可空)"
        className="rounded border bg-background px-2 py-1 text-sm tabular-nums"
      />
      <input
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="⚪ 備註"
        className="rounded border bg-background px-2 py-1 text-sm"
      />
      <button
        type="submit"
        className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
      >
        新增明細
      </button>
    </form>
  );
}
