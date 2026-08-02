// apps/nx-ui/src/features/inventory/part-stock-setting/PartStockSettingView.tsx
// NX03-STOCK-LITE M3-2：產品設定（PartStockSetting CRUD）
//
// 接 /nx03/part-stock-setting
// 欄位：partId × warehouseId × minQty / maxQty / reorderQty / defaultLocationId
// warnings：minQty > maxQty 顯示提示（service 層 return warnings 陣列）

'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

interface Setting {
  id: string;
  tenantId: string;
  partId: string;
  warehouseId: string;
  minQty: string;
  maxQty: string;
  reorderQty: string;
  defaultLocationId: string | null;
  isActive: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  part?: { code: string; name: string };
  warehouse?: { code: string; name: string };
  warnings?: string[];
}

interface ListResp {
  page: number;
  pageSize: number;
  total: number;
  items: Setting[];
}

export function PartStockSettingView() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString({
        search: search.trim() || undefined,
        warehouseId: warehouseId.trim() || undefined,
        pageSize: '100',
      });
      const r = await apiJson<ListResp>(`/nx03/part-stock-setting${qs}`);
      setRows(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [search, warehouseId]);

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
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · PART STOCK SETTING</p>
        <h1 className="text-2xl font-semibold tracking-tight">產品設定</h1>
        <p className="text-sm text-muted-foreground">
          每件料件每倉的安全量 / 最高量 / 預設庫位（進貨上架建議）。鍵盤：
          <kbd className="rounded border px-1">N</kbd> 新增 ·
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          倉庫：
          <input
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reload()}
            placeholder="warehouseId (選填)"
            className="rounded border bg-background px-2 py-1 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          搜尋：
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reload()}
            placeholder="料號 / 品名"
            className="rounded border bg-background px-2 py-1"
          />
        </label>
        <button onClick={() => void reload()} className="rounded border px-3 py-1 text-sm hover:bg-muted">
          重新整理
        </button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          {showNew ? '取消新增' : '新增設定 (N)'}
        </button>
      </section>

      {showNew ? <CreateForm onCreated={() => { setShowNew(false); void reload(); }} /> : null}

      {error ? <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}
      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}
      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚無安全量設定。按 <kbd className="rounded border px-1">N</kbd> 為一個料件 × 倉庫 組合設定安全量 / 最高量。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">料號 / 品名</th>
                <th className="px-3 py-2 text-left">倉庫</th>
                <th className="px-3 py-2 text-right">安全量</th>
                <th className="px-3 py-2 text-right">最高量</th>
                <th className="px-3 py-2 text-right">補貨點</th>
                <th className="px-3 py-2 text-left">預設庫位</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2 text-left">提示</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <SettingRow key={r.id} row={r} onChanged={() => void reload()} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer className="text-xs text-muted-foreground">共 {total} 筆</footer>
    </div>
  );
}

function SettingRow({ row, onChanged }: { row: Setting; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [minQty, setMin] = useState(row.minQty);
  const [maxQty, setMax] = useState(row.maxQty);
  const [reorder, setReorder] = useState(row.reorderQty);
  const [defaultLoc, setDefaultLoc] = useState(row.defaultLocationId ?? '');
  const [warning, setWarning] = useState<string[] | null>(row.warnings ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const updated = await apiJson<Setting>(`/nx03/part-stock-setting/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          minQty: Number(minQty),
          maxQty: Number(maxQty),
          reorderQty: Number(reorder),
          defaultLocationId: defaultLoc.trim(),
        }),
      });
      setWarning(updated.warnings ?? null);
      setEditing(false);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className={`border-t ${row.isActive ? '' : 'opacity-50'}`}>
      <td className="px-3 py-1">
        <div className="font-mono text-[14px]">{row.part?.code ?? row.partId}</div>
        <div className="text-xs text-muted-foreground">{row.part?.name ?? '—'}</div>
      </td>
      <td className="px-3 py-1">
        <div className="font-mono text-[14px]">{row.warehouse?.code ?? row.warehouseId}</div>
        <div className="text-xs text-muted-foreground">{row.warehouse?.name ?? ''}</div>
      </td>
      <td className="px-3 py-1 text-right tabular-nums">
        {editing ? (
          <input type="number" step="0.0001" value={minQty} onChange={(e) => setMin(e.target.value)} className="w-24 rounded border bg-background px-1 text-right" />
        ) : (
          row.minQty
        )}
      </td>
      <td className="px-3 py-1 text-right tabular-nums">
        {editing ? (
          <input type="number" step="0.0001" value={maxQty} onChange={(e) => setMax(e.target.value)} className="w-24 rounded border bg-background px-1 text-right" />
        ) : (
          row.maxQty
        )}
      </td>
      <td className="px-3 py-1 text-right tabular-nums">
        {editing ? (
          <input type="number" step="0.0001" value={reorder} onChange={(e) => setReorder(e.target.value)} className="w-24 rounded border bg-background px-1 text-right" />
        ) : (
          row.reorderQty
        )}
      </td>
      <td className="px-3 py-1">
        {editing ? (
          <input
            value={defaultLoc}
            onChange={(e) => setDefaultLoc(e.target.value)}
            placeholder="locationId (清空 = 移除)"
            className="w-40 rounded border bg-background px-1 font-mono text-[14px]"
          />
        ) : (
          <span className="font-mono text-[14px]">{row.defaultLocationId ?? '—'}</span>
        )}
      </td>
      <td className="px-3 py-1">
        {row.isActive ? (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">啟用</span>
        ) : (
          <span className="rounded bg-muted px-2 py-0.5 text-xs">停用</span>
        )}
      </td>
      <td className="px-3 py-1 text-xs">
        {warning && warning.length > 0 ? (
          <span className="text-amber-600">⚠ {warning.join('；')}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        {err ? <div className="text-destructive">{err}</div> : null}
      </td>
      <td className="px-3 py-1 text-right">
        {editing ? (
          <>
            <button disabled={busy} onClick={() => void save()} className="mr-1 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground disabled:opacity-50">
              {busy ? '…' : '存'}
            </button>
            <button onClick={() => { setEditing(false); setMin(row.minQty); setMax(row.maxQty); setReorder(row.reorderQty); setDefaultLoc(row.defaultLocationId ?? ''); }} className="rounded border px-2 py-0.5 text-xs">
              取消
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="rounded border px-2 py-0.5 text-xs hover:bg-muted">
            編輯
          </button>
        )}
      </td>
    </tr>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [partId, setPartId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [minQty, setMin] = useState('0');
  const [maxQty, setMax] = useState('0');
  const [reorder, setReorder] = useState('0');
  const [defaultLoc, setDefaultLoc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warning, setWarning] = useState<string[] | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setWarning(null);
    try {
      const created = await apiJson<Setting>(`/nx03/part-stock-setting`, {
        method: 'POST',
        body: JSON.stringify({
          partId: partId.trim(),
          warehouseId: warehouseId.trim(),
          minQty: Number(minQty),
          maxQty: Number(maxQty),
          reorderQty: Number(reorder),
          defaultLocationId: defaultLoc.trim() || undefined,
        }),
      });
      setWarning(created.warnings ?? null);
      // 留 warning 顯示一下、若有警示但建立成功仍清表單
      setPartId('');
      setWarehouseId('');
      setMin('0');
      setMax('0');
      setReorder('0');
      setDefaultLoc('');
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增產品設定（料件 × 倉庫）</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Input label="🟢 partId *" value={partId} onChange={setPartId} required />
        <Input label="🟢 warehouseId *" value={warehouseId} onChange={setWarehouseId} required />
        <Input label="🟢 安全量 minQty" value={minQty} onChange={setMin} type="number" />
        <Input label="🟢 最高量 maxQty" value={maxQty} onChange={setMax} type="number" />
        <Input label="🟡 補貨點 reorderQty" value={reorder} onChange={setReorder} type="number" />
        <Input label="🟡 預設庫位 defaultLocationId" value={defaultLoc} onChange={setDefaultLoc} placeholder="進貨上架建議用" />
      </div>
      {warning && warning.length > 0 ? (
        <div className="text-xs text-amber-600">⚠ {warning.join('；')}</div>
      ) : null}
      {err ? <div className="text-xs text-destructive">{err}</div> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {busy ? '建立中…' : '建立'}
      </button>
    </form>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label className="text-sm">
      <span className="block mb-1">{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        className="w-full rounded border bg-background px-2 py-1"
      />
    </label>
  );
}
