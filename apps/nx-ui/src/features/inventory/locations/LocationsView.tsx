// apps/nx-ui/src/features/inventory/locations/LocationsView.tsx
// NX03-STOCK-LITE M3-2：庫位設定（CRUD、接 /nx01/locations）
//
// LITE 範式：list + inline create + inline edit + 停用（軟刪）
// 系統不刪資料：D 刪除實為 setActive=false、UI 用「停用」+ PowerOff

'use client';

import { PowerOff, Power } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { apiJson } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';

interface Location {
  id: string;
  tenantId: string;
  warehouseId: string;
  siteId: string | null;
  code: string;
  name: string | null;
  zone: string | null;
  rack: string | null;
  levelNo: number | null;
  binNo: string | null;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListResp {
  page: number;
  pageSize: number;
  total: number;
  items: Location[];
}

interface CreatePayload {
  warehouseId: string;
  code: string;
  name?: string;
  zone?: string;
  rack?: string;
  levelNo?: number;
  binNo?: string;
  remark?: string;
}

export function LocationsView() {
  const [rows, setRows] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString({ search: search.trim() || undefined, pageSize: '100' });
      const r = await apiJson<ListResp>(`/nx01/locations${qs}`);
      setRows(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [search]);

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

  async function toggleActive(loc: Location) {
    setError(null);
    try {
      if (loc.isActive) {
        await apiJson(`/nx01/locations/${encodeURIComponent(loc.id)}`, { method: 'DELETE' });
      } else {
        await apiJson(`/nx01/locations/${encodeURIComponent(loc.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: true }),
        });
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '停用/啟用失敗');
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · WAREHOUSE LOCATIONS</p>
        <h1 className="text-2xl font-semibold tracking-tight">庫位設定</h1>
        <p className="text-sm text-muted-foreground">
          倉內庫位主檔。停用實為 isActive=false（系統不刪資料）。鍵盤：
          <kbd className="rounded border px-1">N</kbd> 新增 ·
          <kbd className="ml-1 rounded border px-1">R</kbd> 重新整理
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          搜尋：
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void reload()}
            placeholder="code / name"
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
          {showNew ? '取消新增' : '新增庫位 (N)'}
        </button>
      </section>

      {showNew ? <CreateForm onCreated={() => { setShowNew(false); void reload(); }} /> : null}

      {error ? <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{error}</div> : null}
      {loading && !rows.length ? <div className="text-sm text-muted-foreground">載入中…</div> : null}
      {!loading && !rows.length && !error ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          尚無庫位。按 <kbd className="rounded border px-1">N</kbd> 新增。
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">code</th>
                <th className="px-3 py-2 text-left">name</th>
                <th className="px-3 py-2 text-left">warehouseId</th>
                <th className="px-3 py-2 text-left">區域</th>
                <th className="px-3 py-2 text-left">架/層/格</th>
                <th className="px-3 py-2 text-left">狀態</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t ${r.isActive ? '' : 'opacity-50'}`}>
                  <td className="px-3 py-1 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-1">{r.name ?? '—'}</td>
                  <td className="px-3 py-1 font-mono text-xs">{r.warehouseId}</td>
                  <td className="px-3 py-1 text-xs">{r.zone ?? '—'}</td>
                  <td className="px-3 py-1 text-xs">
                    {[r.rack, r.levelNo, r.binNo].filter((v) => v !== null && v !== undefined).join(' / ') || '—'}
                  </td>
                  <td className="px-3 py-1">
                    {r.isActive ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">啟用中</span>
                    ) : (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">已停用</span>
                    )}
                  </td>
                  <td className="px-3 py-1 text-right">
                    <button
                      onClick={() => void toggleActive(r)}
                      title={r.isActive ? '停用' : '啟用'}
                      className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-muted"
                    >
                      {r.isActive ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                      {r.isActive ? '停用' : '啟用'}
                    </button>
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

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [rack, setRack] = useState('');
  const [levelNo, setLevelNo] = useState('');
  const [binNo, setBinNo] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const payload: CreatePayload = {
        warehouseId: warehouseId.trim(),
        code: code.trim(),
        name: name.trim() || undefined,
        zone: zone.trim() || undefined,
        rack: rack.trim() || undefined,
        levelNo: levelNo.trim() ? Number(levelNo) : undefined,
        binNo: binNo.trim() || undefined,
        remark: remark.trim() || undefined,
      };
      await apiJson(`/nx01/locations`, { method: 'POST', body: JSON.stringify(payload) });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">新增庫位</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Input label="🟢 warehouseId *" value={warehouseId} onChange={setWarehouseId} required />
        <Input label="🟢 code *" value={code} onChange={setCode} placeholder="A-01-01" required />
        <Input label="🟡 name" value={name} onChange={setName} placeholder="例：靠門口" />
        <Input label="🟡 zone" value={zone} onChange={setZone} placeholder="例：A區" />
        <Input label="⚪ rack" value={rack} onChange={setRack} />
        <Input label="⚪ levelNo" value={levelNo} onChange={setLevelNo} type="number" />
        <Input label="⚪ binNo" value={binNo} onChange={setBinNo} />
        <Input label="⚪ 備註" value={remark} onChange={setRemark} />
      </div>
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
