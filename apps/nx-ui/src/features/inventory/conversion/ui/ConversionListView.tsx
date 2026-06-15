// apps/nx-ui/src/features/inventory/conversion/ui/ConversionListView.tsx
// NX03-STOCK-LITE M3-3b：重組 / 分解 - 列表 + 新增表單（一次性建好 inputs + outputs）
//
// LITE 範式：空畫面 + 全鍵盤 N/R + 三層欄位 🟢🟡⚪
// conversionType:
//   M 重組（N inputs → 1 output）：output.unitCost = Σ input.totalCost / output.qty
//   D 分解（1 input → N outputs）：costRatio auto 用 part.priceA / 全填 manual 模式

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createConversion, listConversion } from '@data/endpoints/inventory/conversion/api/conversion';
import type {
  Conversion,
  ConversionStatus,
  ConversionType,
  CreateConversionInputPayload,
  CreateConversionOutputPayload,
  CreateConversionPayload,
} from '@data/types/inventory/conversion';

const STATUS_OPTIONS: { value: ConversionStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'POSTED', label: '已過帳' },
  { value: 'VOIDED', label: '已作廢' },
];

export const CV_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  POSTED: '已過帳',
  VOIDED: '已作廢',
};

export const CV_TYPE_LABEL: Record<string, string> = {
  M: 'M 重組',
  D: 'D 分解',
};

export function ConversionListView() {
  const router = useRouter();
  const [rows, setRows] = useState<Conversion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversionStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listConversion({
        status: status || undefined,
        search: search.trim() || undefined,
        pageSize: 50,
      });
      setRows(resp.items);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'list 失敗');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowNew((v) => !v);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void reload();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reload]);

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · CONVERSION</p>
        <h1 className="text-2xl font-semibold tracking-tight">重組 / 分解</h1>
        <p className="text-sm text-muted-foreground">
          M 重組（N→1）/ D 分解（1→N）。建單後過帳寫帳、無法修改 inputs/outputs（要改作廢重建）。鍵盤：
          <kbd className="rounded border px-1">N</kbd> 新增 ·
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          狀態：
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ConversionStatus | '')}
            className="rounded border bg-background px-2 py-1"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          搜尋：
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reload()}
            placeholder="單號 / 備註"
            className="rounded border bg-background px-2 py-1"
          />
        </label>
        <button
          onClick={() => void reload()}
          className="rounded border px-3 py-1 text-sm hover:bg-muted"
        >
          重新整理
        </button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          {showNew ? '取消新增' : '新增轉換單 (N)'}
        </button>
      </section>

      {showNew ? (
        <CreateForm onCreated={(id) => router.push(`/dashboard/inventory/conversion/${id}`)} />
      ) : null}

      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div>
      ) : null}

      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}

      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚無轉換單。按 <kbd className="rounded border px-1">N</kbd> 新增一張。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">單號</th>
                <th className="px-3 py-2 text-left">日期</th>
                <th className="px-3 py-2 text-left">類型</th>
                <th className="px-3 py-2 text-left">倉庫</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2 text-left">備註</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/50">
                  <td className="px-3 py-2 font-mono">{r.docNo}</td>
                  <td className="px-3 py-2">{r.conversionDate.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {CV_TYPE_LABEL[r.conversionType] ?? r.conversionType}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.warehouseId}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {CV_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.remark ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/dashboard/inventory/conversion/${r.id}`}
                      className="text-primary hover:underline"
                    >
                      進入 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer className="text-xs text-muted-foreground">共 {total} 筆</footer>
    </div>
  );
}

interface RowDraft {
  key: string;
  partId: string;
  locationId: string;
  qty: string;
  costRatio: string; // only used for outputs in D mode
  remark: string;
}

function emptyRow(): RowDraft {
  return {
    key: Math.random().toString(36).slice(2, 8),
    partId: '',
    locationId: '',
    qty: '',
    costRatio: '',
    remark: '',
  };
}

function CreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [conversionType, setConversionType] = useState<ConversionType>('M');
  const [warehouseId, setWarehouseId] = useState('');
  const [conversionDate, setConversionDate] = useState(new Date().toISOString().slice(0, 10));
  const [remark, setRemark] = useState('');
  const [inputs, setInputs] = useState<RowDraft[]>([emptyRow()]);
  const [outputs, setOutputs] = useState<RowDraft[]>([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // M 重組：output 永遠 1 行；D 分解：input 永遠 1 行
  function changeType(t: ConversionType) {
    setConversionType(t);
    if (t === 'M') {
      setInputs((prev) => (prev.length ? prev : [emptyRow()]));
      setOutputs([emptyRow()]);
    } else {
      setInputs([emptyRow()]);
      setOutputs((prev) => (prev.length ? prev : [emptyRow()]));
    }
  }

  const inputsLocked = conversionType === 'D';
  const outputsLocked = conversionType === 'M';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId.trim()) {
      setErr('warehouseId 必填');
      return;
    }
    const buildLine = (r: RowDraft, allowCostRatio: boolean): CreateConversionInputPayload | CreateConversionOutputPayload | null => {
      if (!r.partId.trim() && !r.locationId.trim() && !r.qty.trim()) return null;
      if (!r.partId.trim() || !r.locationId.trim() || !r.qty.trim()) {
        throw new Error('每行的 partId / locationId / qty 都必填');
      }
      const qty = Number(r.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('qty 必須 > 0');
      const base = {
        partId: r.partId.trim(),
        locationId: r.locationId.trim(),
        qty,
        remark: r.remark.trim() || undefined,
      } as CreateConversionInputPayload;
      if (allowCostRatio && r.costRatio.trim()) {
        const cr = Number(r.costRatio);
        if (!Number.isFinite(cr) || cr < 0) throw new Error('costRatio 必須 ≥ 0');
        (base as CreateConversionOutputPayload).costRatio = cr;
      }
      return base;
    };

    setBusy(true);
    setErr(null);
    try {
      const cleanInputs = inputs.map((r) => buildLine(r, false)).filter(Boolean) as CreateConversionInputPayload[];
      const cleanOutputs = outputs
        .map((r) => buildLine(r, conversionType === 'D'))
        .filter(Boolean) as CreateConversionOutputPayload[];

      if (cleanInputs.length === 0) throw new Error('inputs 至少 1 行');
      if (cleanOutputs.length === 0) throw new Error('outputs 至少 1 行');
      if (conversionType === 'M' && cleanOutputs.length !== 1) {
        throw new Error('M 重組：outputs 必須恰好 1 行');
      }
      if (conversionType === 'D' && cleanInputs.length !== 1) {
        throw new Error('D 分解：inputs 必須恰好 1 行');
      }

      const payload: CreateConversionPayload = {
        warehouseId: warehouseId.trim(),
        conversionDate,
        conversionType,
        remark: remark.trim() || undefined,
        inputs: cleanInputs,
        outputs: cleanOutputs,
      };
      const cv = await createConversion(payload);
      onCreated(cv.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增轉換單（建單後 inputs/outputs 不可改、要改請作廢重建）</h2>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="block mb-1">🟢 轉換類型 *</span>
          <select
            value={conversionType}
            onChange={(e) => changeType(e.target.value as ConversionType)}
            className="w-full rounded border bg-background px-2 py-1"
          >
            <option value="M">M 重組（N inputs → 1 output）</option>
            <option value="D">D 分解（1 input → N outputs）</option>
          </select>
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
          <span className="block mb-1">🟢 轉換日期 *</span>
          <input
            type="date"
            value={conversionDate}
            onChange={(e) => setConversionDate(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">⚪ 備註</span>
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
          />
        </label>
      </div>

      <RowEditor
        title={`輸入 inputs${outputsLocked ? '（N 行）' : '（D 分解固定 1 行）'}`}
        rows={inputs}
        setRows={setInputs}
        canAdd={!inputsLocked}
        showCostRatio={false}
      />

      <RowEditor
        title={`輸出 outputs${inputsLocked ? '（N 行、D 分解可填 costRatio）' : '（M 重組固定 1 行）'}`}
        rows={outputs}
        setRows={setOutputs}
        canAdd={!outputsLocked}
        showCostRatio={conversionType === 'D'}
      />

      {conversionType === 'D' ? (
        <p className="text-xs text-muted-foreground">
          ⚠️ D 分解：outputs.costRatio <strong>全填</strong> = manual 模式（Σ 必須 = 1.0）/
          <strong>全空</strong> = auto 模式（按 part.priceA × qty 比例分攤）/ 混填會被後端擋下。
        </p>
      ) : null}

      {err ? <div className="text-xs text-destructive">{err}</div> : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {busy ? '建立中…' : '建立並進入（DRAFT）'}
      </button>
    </form>
  );
}

function RowEditor(props: {
  title: string;
  rows: RowDraft[];
  setRows: (rows: RowDraft[]) => void;
  canAdd: boolean;
  showCostRatio: boolean;
}) {
  const { title, rows, setRows, canAdd, showCostRatio } = props;
  const update = (idx: number, patch: Partial<RowDraft>) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeAt = (idx: number) => {
    if (rows.length === 1) {
      setRows([emptyRow()]);
    } else {
      setRows(rows.filter((_, i) => i !== idx));
    }
  };
  const add = () => setRows([...rows, emptyRow()]);

  return (
    <fieldset className="rounded border bg-background p-3">
      <legend className="px-2 text-xs text-muted-foreground">{title}</legend>
      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div
            key={r.key}
            className={`grid gap-2 ${showCostRatio ? 'md:grid-cols-[40px_1fr_1fr_120px_120px_1fr_60px]' : 'md:grid-cols-[40px_1fr_1fr_120px_1fr_60px]'}`}
          >
            <div className="self-center text-center text-xs text-muted-foreground">{idx + 1}</div>
            <input
              value={r.partId}
              onChange={(e) => update(idx, { partId: e.target.value })}
              placeholder="🟢 partId"
              className="rounded border bg-background px-2 py-1 text-sm font-mono"
            />
            <input
              value={r.locationId}
              onChange={(e) => update(idx, { locationId: e.target.value })}
              placeholder="🟢 locationId"
              className="rounded border bg-background px-2 py-1 text-sm font-mono"
            />
            <input
              type="number"
              step="0.0001"
              min="0"
              value={r.qty}
              onChange={(e) => update(idx, { qty: e.target.value })}
              placeholder="🟢 qty"
              className="rounded border bg-background px-2 py-1 text-sm tabular-nums"
            />
            {showCostRatio ? (
              <input
                type="number"
                step="0.0001"
                min="0"
                value={r.costRatio}
                onChange={(e) => update(idx, { costRatio: e.target.value })}
                placeholder="🟡 costRatio (可空)"
                className="rounded border bg-background px-2 py-1 text-sm tabular-nums"
              />
            ) : null}
            <input
              value={r.remark}
              onChange={(e) => update(idx, { remark: e.target.value })}
              placeholder="⚪ remark"
              className="rounded border bg-background px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
            >
              移除
            </button>
          </div>
        ))}
      </div>
      {canAdd ? (
        <button
          type="button"
          onClick={add}
          className="mt-2 rounded border px-3 py-1 text-xs hover:bg-muted"
        >
          + 新增一行
        </button>
      ) : null}
    </fieldset>
  );
}
