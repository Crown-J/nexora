// apps/nx-ui/src/features/inventory/stock-query/StockQueryView.tsx
// NX03-STOCK-LITE M3-2：庫存查詢三維度（料號 / 庫位 / 倉庫）
//
// 對應後端 /nx03/stock-query/{by-part,by-location,by-warehouse}
// Crown 拍板 B 方案 C：庫位維度純從 ledger aggregate、不改 balance schema
//
// LITE 範式：3 tab + ID 輸入 + fetch 按鈕。
// FU：後續上 partId/locationId/warehouseId autocomplete picker（FU-stock-lite-01）

'use client';

import { useCallback, useEffect, useState } from 'react';
import { PackageSearch } from 'lucide-react';

import { apiJson } from '@data/api/client';
import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';

type Tab = 'part' | 'location' | 'warehouse';

interface PartQueryResp {
  part: { id: string; code: string; name: string };
  warehouses: Array<{
    warehouseId: string;
    warehouseCode: string | null;
    warehouseName: string | null;
    onHandQty: string;
    reservedQty: string;
    availableQty: string;
    avgCost: string;
    stockValue: string;
    lastMoveAt: string | null;
    locations: Array<{
      locationId: string;
      locationCode: string | null;
      locationName: string | null;
      zone: string | null;
      onHandQty: string;
    }>;
  }>;
}

interface LocationQueryResp {
  location: {
    id: string;
    code: string;
    name: string | null;
    zone: string | null;
    warehouseId: string;
    warehouse: { code: string; name: string } | null;
  };
  items: Array<{
    partId: string;
    partNo: string | null;
    partName: string | null;
    onHandQty: string;
    avgCost: string;
    lastMoveAt: string | null;
  }>;
}

interface WarehouseQueryResp {
  warehouse: { id: string; code: string; name: string };
  summary: { total: number; inStock: number; zero: number; negative: number; totalStockValue: string };
  items: Array<{
    partId: string;
    partNo: string | null;
    partName: string | null;
    onHandQty: string;
    reservedQty: string;
    availableQty: string;
    avgCost: string;
    stockValue: string;
    lastMoveAt: string | null;
  }>;
}

export function StockQueryView() {
  const [tab, setTab] = useState<Tab>('part');
  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">INVENTORY · STOCK QUERY</p>
          <h1 className="text-2xl font-semibold tracking-tight">庫存查詢</h1>
          <p className="text-sm text-muted-foreground">
            三維度：料號（哪幾倉幾庫位）/ 庫位（此位有哪些料）/ 倉庫（整倉 + 4 KPI）
          </p>
        </div>
        {/* F2 改版 Step 5（交接 §1 §4）：倉管入口＝嵌庫存管理；開窗自動展開各倉、本倉 pin 頂 */}
        <button
          type="button"
          onClick={() => openPartQuickSearch({ entry: 'warehouse' })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:border-primary/50"
          title="料號即時搜尋（F2）：自動展開各倉分布、本倉置頂"
        >
          <PackageSearch className="size-4" />
          料號查詢
          <kbd className="rounded border border-border/50 bg-muted/40 px-1 py-px font-mono text-[10px]">F2</kbd>
        </button>
      </header>

      <nav className="flex gap-2 border-b">
        {(['part', 'location', 'warehouse'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === k
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {k === 'part' ? '🔍 料號維度' : k === 'location' ? '📦 庫位維度' : '🏢 倉庫維度'}
          </button>
        ))}
      </nav>

      {tab === 'part' ? <ByPartTab /> : null}
      {tab === 'location' ? <ByLocationTab /> : null}
      {tab === 'warehouse' ? <ByWarehouseTab /> : null}
    </div>
  );
}

function useQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await apiJson<T>(path);
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : '查詢失敗');
    } finally {
      setLoading(false);
    }
  }, [path]);
  return { data, loading, error, fetch };
}

function ByPartTab() {
  const [partId, setPartId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const path = submitted ? `/nx03/stock-query/by-part/${encodeURIComponent(submitted)}` : null;
  const { data, loading, error, fetch } = useQuery<PartQueryResp>(path);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <section className="space-y-4">
      <QueryBar
        label="🟢 partId"
        value={partId}
        onChange={setPartId}
        onSubmit={() => setSubmitted(partId.trim() || null)}
      />
      {error ? <ErrorBox msg={error} /> : null}
      {loading ? <div className="text-sm text-muted-foreground">載入中…</div> : null}
      {data ? (
        <div className="space-y-4">
          <div className="rounded border p-4">
            <p className="text-xs text-muted-foreground">料號</p>
            <h2 className="font-mono text-lg">{data.part.code}</h2>
            <p className="text-sm text-muted-foreground">{data.part.name}</p>
          </div>
          {data.warehouses.length === 0 ? (
            <EmptyBox msg="此料件在所有倉庫均無庫存記錄" />
          ) : null}
          {data.warehouses.map((w) => (
            <div key={w.warehouseId} className="rounded border">
              <div className="flex flex-wrap gap-3 border-b bg-muted/30 px-3 py-2 text-sm">
                <span className="font-semibold">{w.warehouseCode}</span>
                <span className="text-muted-foreground">{w.warehouseName}</span>
                <span className="ml-auto tabular-nums">現存 {w.onHandQty}</span>
                <span className="tabular-nums text-muted-foreground">預留 {w.reservedQty}</span>
                <span className="tabular-nums">可用 {w.availableQty}</span>
                <span className="tabular-nums text-xs text-muted-foreground">avgCost {w.avgCost}</span>
              </div>
              {w.locations.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">無庫位拆解（onHand 為 0 之庫位已過濾）</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1 text-left">庫位碼</th>
                      <th className="px-3 py-1 text-left">名稱</th>
                      <th className="px-3 py-1 text-left">區域</th>
                      <th className="px-3 py-1 text-right">在庫量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {w.locations.map((l) => (
                      <tr key={l.locationId} className="border-t">
                        <td className="px-3 py-1 font-mono text-xs">{l.locationCode}</td>
                        <td className="px-3 py-1">{l.locationName ?? '—'}</td>
                        <td className="px-3 py-1 text-xs">{l.zone ?? '—'}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{l.onHandQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ByLocationTab() {
  const [locationId, setLocationId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const path = submitted ? `/nx03/stock-query/by-location/${encodeURIComponent(submitted)}` : null;
  const { data, loading, error, fetch } = useQuery<LocationQueryResp>(path);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <section className="space-y-4">
      <QueryBar
        label="🟢 locationId"
        value={locationId}
        onChange={setLocationId}
        onSubmit={() => setSubmitted(locationId.trim() || null)}
      />
      {error ? <ErrorBox msg={error} /> : null}
      {loading ? <div className="text-sm text-muted-foreground">載入中…</div> : null}
      {data ? (
        <div className="space-y-4">
          <div className="rounded border p-4">
            <p className="text-xs text-muted-foreground">庫位</p>
            <h2 className="font-mono text-lg">{data.location.code}</h2>
            <p className="text-sm text-muted-foreground">
              {data.location.name ?? '—'} · 區域 {data.location.zone ?? '—'} · 倉庫{' '}
              {data.location.warehouse?.code ?? data.location.warehouseId}
            </p>
          </div>
          {data.items.length === 0 ? (
            <EmptyBox msg="此庫位無庫存料件（onHandQty=0 已過濾、來自 ledger aggregate）" />
          ) : (
            <table className="w-full rounded border text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">料號</th>
                  <th className="px-3 py-2 text-left">品名</th>
                  <th className="px-3 py-2 text-right">在庫量</th>
                  <th className="px-3 py-2 text-right">avgCost</th>
                  <th className="px-3 py-2 text-left">最後異動</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.partId} className="border-t">
                    <td className="px-3 py-1 font-mono text-xs">{it.partNo}</td>
                    <td className="px-3 py-1">{it.partName}</td>
                    <td className="px-3 py-1 text-right tabular-nums">{it.onHandQty}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-xs">{it.avgCost}</td>
                    <td className="px-3 py-1 text-xs text-muted-foreground">
                      {it.lastMoveAt ? new Date(it.lastMoveAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ByWarehouseTab() {
  const [warehouseId, setWarehouseId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const path = submitted ? `/nx03/stock-query/by-warehouse/${encodeURIComponent(submitted)}` : null;
  const { data, loading, error, fetch } = useQuery<WarehouseQueryResp>(path);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <section className="space-y-4">
      <QueryBar
        label="🟢 warehouseId"
        value={warehouseId}
        onChange={setWarehouseId}
        onSubmit={() => setSubmitted(warehouseId.trim() || null)}
      />
      {error ? <ErrorBox msg={error} /> : null}
      {loading ? <div className="text-sm text-muted-foreground">載入中…</div> : null}
      {data ? (
        <div className="space-y-4">
          <div className="rounded border p-4">
            <p className="text-xs text-muted-foreground">倉庫</p>
            <h2 className="font-mono text-lg">{data.warehouse.code}</h2>
            <p className="text-sm text-muted-foreground">{data.warehouse.name}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <KpiCard label="總品項" value={String(data.summary.total)} />
            <KpiCard label="有庫存" value={String(data.summary.inStock)} tone="positive" />
            <KpiCard label="缺料 (零)" value={String(data.summary.zero)} tone="neutral" />
            <KpiCard label="負庫存" value={String(data.summary.negative)} tone="danger" />
            <KpiCard label="庫存總值" value={`NT$ ${data.summary.totalStockValue}`} />
          </div>
          <table className="w-full rounded border text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">料號</th>
                <th className="px-3 py-2 text-left">品名</th>
                <th className="px-3 py-2 text-right">現存</th>
                <th className="px-3 py-2 text-right">預留</th>
                <th className="px-3 py-2 text-right">可用</th>
                <th className="px-3 py-2 text-right">avgCost</th>
                <th className="px-3 py-2 text-right">stockValue</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.partId} className="border-t">
                  <td className="px-3 py-1 font-mono text-xs">{it.partNo}</td>
                  <td className="px-3 py-1">{it.partName}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{it.onHandQty}</td>
                  <td className="px-3 py-1 text-right tabular-nums text-xs">{it.reservedQty}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{it.availableQty}</td>
                  <td className="px-3 py-1 text-right tabular-nums text-xs">{it.avgCost}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{it.stockValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function QueryBar(props: { label: string; value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
      className="flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-3"
    >
      <label className="flex items-center gap-2 text-sm">
        {props.label}：
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="輸入 ID 後按 Enter 或 查詢"
          className="w-72 rounded border bg-background px-2 py-1 font-mono text-sm"
          autoFocus
        />
      </label>
      <button type="submit" className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
        查詢
      </button>
    </form>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'danger' | 'neutral' }) {
  const color =
    tone === 'positive'
      ? 'text-green-600'
      : tone === 'danger'
        ? 'text-destructive'
        : tone === 'neutral'
          ? 'text-muted-foreground'
          : 'text-foreground';
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{msg}</div>;
}

function EmptyBox({ msg }: { msg: string }) {
  return <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">{msg}</div>;
}
