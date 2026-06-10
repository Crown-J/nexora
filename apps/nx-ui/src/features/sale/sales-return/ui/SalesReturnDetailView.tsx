// apps/nx-ui/src/features/sale/sales-return/ui/SalesReturnDetailView.tsx
// NX04-M3 C4：SR 銷退單 - 詳情 + 狀態流轉 + dispositionFlag 過帳檢查

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { IssueReportTrigger } from '@/features/shared/issue-report-trigger';
import { TieredFormProvider } from '@/features/shared/tiered-form/TieredFormProvider';

import {
  addSrItem,
  getSr,
  patchSrItem,
  removeSrItem,
  updateSr,
  voidSr,
} from '../api/sales-return';
import type {
  CreateSrItemPayload,
  Sr,
  SrItem,
  SrStatus,
} from '../types';
import {
  DISPOSITION_LABEL,
  RETURN_ACTION_LABEL,
  SR_STATUS_BADGE_CLASS,
  SR_STATUS_LABEL,
} from '../types';

export function SalesReturnDetailView({ id }: { id: string }) {
  return (
    <TieredFormProvider defaultMode="lite">
      <SrDetailInner id={id} />
    </TieredFormProvider>
  );
}

function SrDetailInner({ id }: { id: string }) {
  const [sr, setSr] = useState<Sr | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSr(id);
      setSr(data);
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

  // 過帳前檢查：returnMethod=X 換新可跳過 dispositionFlag、其他情況必填
  const postReadiness = useMemo(() => {
    if (!sr?.items?.length) return { ready: false, reason: '尚無明細' };
    if (sr.returnMethod === 'X') return { ready: true, reason: null as string | null };
    const lacking = sr.items.filter((it) => !it.dispositionFlag);
    if (lacking.length) {
      return {
        ready: false,
        reason: `${lacking.length} 行未填好品 / 壞品旗標（行 ${lacking.map((l) => l.lineNo).join(', ')}）`,
      };
    }
    return { ready: true, reason: null as string | null };
  }, [sr]);

  if (loading && !sr) return <div className="p-6 text-sm text-muted-foreground">載入中…</div>;
  if (error && !sr) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!sr) return null;

  const editable = sr.status === 'DRAFT' || sr.status === 'INSPECTING';
  const canSubmit = sr.status === 'DRAFT';
  const canPost = sr.status === 'INSPECTING' && postReadiness.ready;
  const canReject = sr.status === 'INSPECTING';
  const canCancel = sr.status === 'DRAFT' || sr.status === 'INSPECTING';

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SALE · SALES RETURN</p>
          <h1 className="text-2xl font-mono font-semibold">{sr.docNo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded px-2 py-0.5 text-xs ${SR_STATUS_BADGE_CLASS[sr.status] ?? 'bg-muted'}`}>
              狀態：{SR_STATUS_LABEL[sr.status] ?? sr.status}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">客戶 {sr.customerId}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">SO {sr.soId}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">倉庫 {sr.warehouseId}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">退款 {sr.returnMethod}</span>
            {/* 05 補做 C1 2026-06-09：退回方式 A=業務發起 / B=送貨員當場帶回 */}
            {sr.initiationType ? (
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-900">
                退回方式 {sr.initiationType === 'A' ? 'A 業務發起' : 'B 送貨員當場帶回'}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/sale/return" className="rounded border px-3 py-1 text-sm hover:bg-muted">
            ← 返回列表
          </Link>
          <button
            disabled={busy}
            onClick={() => void reload()}
            className="rounded border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            重整 (R)
          </button>
          <IssueReportTrigger sourceDocType="SR" sourceDocId={sr.id} warehouseId={sr.warehouseId} />
          {canSubmit ? (
            <button
              disabled={busy || !sr.items?.length}
              onClick={() => void handle(() => updateSr(id, { status: 'INSPECTING' }), '送驗收')}
              className="rounded bg-amber-500 px-3 py-1 text-sm text-white disabled:opacity-50"
              title={!sr.items?.length ? '尚無明細不可送驗' : ''}
            >
              送驗收 → INSPECTING
            </button>
          ) : null}
          {canPost ? (
            <button
              disabled={busy}
              onClick={() => {
                const action =
                  sr.returnMethod === 'X' ? 'X' : (window.prompt('returnAction（R 退錢 / D 折讓 / X 換新）', sr.returnMethod) ?? '').toUpperCase();
                if (action !== 'R' && action !== 'D' && action !== 'X') {
                  alert('returnAction 必為 R / D / X');
                  return;
                }
                void handle(
                  () => updateSr(id, { status: 'POSTED', returnAction: action as 'R' | 'D' | 'X' }),
                  '過帳',
                );
              }}
              className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              過帳 → POSTED
            </button>
          ) : null}
          {canReject ? (
            <button
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('駁回原因（必填）');
                if (!reason?.trim()) return;
                void handle(
                  () => updateSr(id, { status: 'REJECTED', rejectReason: reason.trim() }),
                  '駁回',
                );
              }}
              className="rounded border border-rose-300 px-3 py-1 text-sm text-rose-700 disabled:opacity-50"
            >
              駁回 → REJECTED
            </button>
          ) : null}
          {canCancel ? (
            <button
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('取消原因（必填）');
                if (!reason?.trim()) return;
                void handle(() => voidSr(id, reason.trim()), '取消');
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

      {sr.status === 'INSPECTING' && !postReadiness.ready ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ⚠️ 過帳前要倉管收貨檢驗：{postReadiness.reason}
        </div>
      ) : null}

      {sr.rejectReason ? (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
          駁回原因：{sr.rejectReason}
        </div>
      ) : null}

      <HeaderEditor sr={sr} editable={editable} onSaved={reload} />

      <ItemsSection
        sr={sr}
        items={sr.items ?? []}
        editable={editable}
        onChanged={reload}
      />

      <footer className="flex flex-wrap gap-6 rounded border bg-muted/30 p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">未稅小計</div>
          <div className="font-mono tabular-nums">{sr.subtotal}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">稅率 / 稅額</div>
          <div className="font-mono tabular-nums">
            {sr.taxRate}% / {sr.taxAmount}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">總額（含稅）</div>
          <div className="font-mono tabular-nums text-lg font-semibold">{sr.totalAmount}</div>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          建立 {sr.createdAt.slice(0, 19).replace('T', ' ')} by {sr.createdBy}
          <br />
          更新 {sr.updatedAt.slice(0, 19).replace('T', ' ')} by {sr.updatedBy}
        </div>
      </footer>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">returnAction 對照</summary>
        <ul className="ml-4 mt-2 list-disc">
          {Object.entries(RETURN_ACTION_LABEL).map(([k, v]) => (
            <li key={k}>{v}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function HeaderEditor({
  sr,
  editable,
  onSaved,
}: {
  sr: Sr;
  editable: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const [srDate, setSrDate] = useState(sr.srDate.slice(0, 10));
  const [remark, setRemark] = useState(sr.remark ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await updateSr(sr.id, { srDate, remark });
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
          <span className="block mb-1">銷退日</span>
          <input
            type="date"
            value={srDate}
            onChange={(e) => setSrDate(e.target.value)}
            disabled={!editable}
            className="w-full rounded border bg-background px-2 py-1 disabled:opacity-60"
          />
        </label>
        <label className="text-sm md:col-span-2">
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
  sr,
  items,
  editable,
  onChanged,
}: {
  sr: Sr;
  items: SrItem[];
  editable: boolean;
  onChanged: () => void | Promise<void>;
}) {
  // INSPECTING 階段給倉管填 dispositionFlag + locationId（單行 inline 編輯）
  const inspecting = sr.status === 'INSPECTING';

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">退貨明細（{items.length} 行）</h2>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">SO 明細 ID</th>
                <th className="px-3 py-2 text-left">料號 / 品名</th>
                <th className="px-3 py-2 text-right">數量</th>
                <th className="px-3 py-2 text-right">單價</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-left">退貨原因</th>
                <th className="px-3 py-2 text-left">好品 / 壞品 *</th>
                <th className="px-3 py-2 text-left">入庫庫位</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <SrItemRow
                  key={it.id}
                  sr={sr}
                  item={it}
                  editable={editable}
                  inspecting={inspecting}
                  onChanged={onChanged}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          尚無退貨明細。{editable ? '用下方表單新增。' : ''}
        </div>
      )}

      {editable && sr.status === 'DRAFT' ? (
        <AddItemForm srId={sr.id} onAdded={onChanged} />
      ) : null}
    </section>
  );
}

function SrItemRow({
  sr,
  item,
  editable,
  inspecting,
  onChanged,
}: {
  sr: Sr;
  item: SrItem;
  editable: boolean;
  inspecting: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [dispositionFlag, setDispositionFlag] = useState<'G' | 'B' | ''>(item.dispositionFlag ?? '');
  const [locationId, setLocationId] = useState(item.locationId ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    (dispositionFlag || null) !== item.dispositionFlag ||
    (locationId.trim() || null) !== item.locationId;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await patchSrItem(sr.id, item.id, {
        dispositionFlag: dispositionFlag || undefined,
        locationId: locationId.trim() || undefined,
      });
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  }

  const showDispositionEdit = inspecting && sr.returnMethod !== 'X';

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="px-3 py-2 text-xs text-muted-foreground">{item.lineNo}</td>
      <td className="px-3 py-2 text-xs font-mono">{item.soItemId}</td>
      <td className="px-3 py-2 text-xs">
        <div className="font-mono">{item.partNo}</div>
        <div className="text-muted-foreground">{item.partName}</div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{item.qty}</td>
      <td className="px-3 py-2 text-right tabular-nums">{item.unitPrice}</td>
      <td className="px-3 py-2 text-right tabular-nums">{item.lineAmount}</td>
      <td className="px-3 py-2 text-xs">{item.returnReason}</td>
      <td className="px-3 py-2 text-xs">
        {showDispositionEdit ? (
          <select
            value={dispositionFlag}
            onChange={(e) => setDispositionFlag(e.target.value as 'G' | 'B' | '')}
            disabled={busy}
            className="rounded border bg-background px-1 py-0.5"
          >
            <option value="">（未檢查）</option>
            <option value="G">G 好品</option>
            <option value="B">B 壞品</option>
          </select>
        ) : item.dispositionFlag ? (
          <span
            className={`rounded px-2 py-0.5 ${item.dispositionFlag === 'G' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}
          >
            {DISPOSITION_LABEL[item.dispositionFlag]}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs">
        {showDispositionEdit ? (
          <input
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={busy}
            placeholder="NX01LOCN..."
            className="w-32 rounded border bg-background px-1 py-0.5 font-mono"
          />
        ) : (
          <span className="font-mono">{item.locationId ?? '—'}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {showDispositionEdit && dirty ? (
          <button
            onClick={() => void save()}
            disabled={busy}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {busy ? '儲存中…' : '儲存'}
          </button>
        ) : null}
        {editable && sr.status === 'DRAFT' ? (
          <button
            onClick={async () => {
              if (!window.confirm(`刪除明細 ${item.lineNo}？`)) return;
              try {
                await removeSrItem(sr.id, item.id);
                await onChanged();
              } catch (e) {
                alert(e instanceof Error ? e.message : '刪除失敗');
              }
            }}
            className="ml-2 text-xs text-rose-700 hover:underline"
          >
            刪除
          </button>
        ) : null}
        {err ? <div className="mt-1 text-[10px] text-destructive">{err}</div> : null}
      </td>
    </tr>
  );
}

const RETURN_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'D', label: 'D 品質問題' },
  { value: 'E', label: 'E 客戶不要' },
  { value: 'W', label: 'W 規格錯誤' },
  { value: 'O', label: 'O 其他' },
];

const RETURN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'N', label: 'N 一般退貨' },
  { value: 'E', label: 'E 折讓（concession）' },
];

function AddItemForm({
  srId,
  onAdded,
}: {
  srId: string;
  onAdded: () => void | Promise<void>;
}) {
  const [soItemId, setSoItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [returnReason, setReturnReason] = useState('D');
  const [returnType, setReturnType] = useState('N');
  const [concessionReason, setConcessionReason] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!soItemId.trim() || Number(qty) <= 0) {
      setErr('soItemId / qty 必填');
      return;
    }
    if (returnType === 'E' && !concessionReason.trim()) {
      setErr('折讓 (returnType=E) 需填 concessionReason');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateSrItemPayload = {
        soItemId: soItemId.trim(),
        qty: Number(qty),
        returnReason,
        returnType,
        concessionReason: concessionReason.trim() || undefined,
        remark: remark.trim() || undefined,
      };
      await addSrItem(srId, payload);
      setSoItemId('');
      setQty('1');
      setReturnType('N');
      setConcessionReason('');
      setRemark('');
      await onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '新增失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">新增退貨明細（指定來源 SO 明細 ID）</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="block mb-1">🟢 SO 明細 ID *</span>
          <input
            value={soItemId}
            onChange={(e) => setSoItemId(e.target.value)}
            placeholder="NX04SOIT..."
            className="w-full rounded border bg-background px-2 py-1 font-mono"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟢 退貨數量 *</span>
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
          <span className="block mb-1">🟢 退貨原因 *</span>
          <select
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            required
          >
            {RETURN_REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟡 退貨類型</span>
          <select
            value={returnType}
            onChange={(e) => setReturnType(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          >
            {RETURN_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1">🟡 折讓理由（E 必填）</span>
          <input
            value={concessionReason}
            onChange={(e) => setConcessionReason(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
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
