// apps/nx-ui/src/features/nx03/workstation/packing/PackingWorkbench.tsx
/**
 * 庫存中心 · 包貨台（平板/桌機、SALES-FLOW 階段 2）。
 *
 * 業務語意（2026-07-22 執行長拍板 D2）：撿貨池「已撿完」的貨進包貨台。以客戶為單位：
 *   同客戶已撿完貨疊一起 → 建包貨單（預設一箱一張銷貨單、自動產包裹號 BX）
 *   → 同客戶小件可併箱省包材 → 列印 BX 標籤貼箱 → 封箱。
 *   一張包貨單只含一種出貨方式（配送/自取/寄貨）。封箱不扣帳（扣庫存/開應收留階段3簽收）。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Merge, PackageCheck, Printer, RefreshCw, Search } from 'lucide-react';

import {
  createPacking,
  getPackPool,
  mergeParcels,
  sealPacking,
  type PackingDetail,
  type PackingParcel,
  type PackPoolGroup,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

const DELIVERY_TONE: Record<string, string> = {
  D: 'border-blue-500/40 bg-blue-500/10 text-blue-600',
  P: 'border-primary/40 bg-primary/10 text-primary',
  C: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
};

function printLabels(detail: PackingDetail) {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return;
  const rows = detail.parcels
    .map(
      (p) => `
      <div class="label">
        <div class="bx">${p.parcelNo}</div>
        <div class="cust">${detail.customerName}</div>
        <div class="meta">${detail.docNo} · ${p.lines.length} 項</div>
        <ul>${p.lines.map((l) => `<li>${l.partNo} ×${l.qty}</li>`).join('')}</ul>
      </div>`,
    )
    .join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>包裹標籤 ${detail.docNo}</title>
    <style>
      body{font-family:sans-serif;margin:0;padding:8px}
      .label{border:2px solid #000;border-radius:8px;padding:10px;margin-bottom:10px;page-break-inside:avoid}
      .bx{font-size:20px;font-weight:700;font-family:monospace}
      .cust{font-size:16px;margin-top:2px}
      .meta{font-size:12px;color:#555;margin:4px 0}
      ul{margin:4px 0 0;padding-left:18px;font-size:12px}
    </style></head><body>${rows}
    <script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
}

function ParcelCard({
  parcel,
  otherParcels,
  busy,
  onMergeInto,
}: {
  parcel: PackingParcel;
  otherParcels: PackingParcel[];
  busy: boolean;
  onMergeInto: (targetId: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-primary">{parcel.parcelNo}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{parcel.lines.length} 項</span>
      </div>
      <ul className="space-y-1">
        {parcel.lines.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">
              <span className="font-mono text-foreground">{l.partNo}</span>
              <span className="ml-2 text-muted-foreground">{l.partName}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-foreground">
              ×{l.qty}
              {l.soDocNo ? <span className="ml-2 text-muted-foreground">{l.soDocNo}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {otherParcels.length > 0 ? (
        <div className="flex items-center gap-1 border-t border-border/60 pt-2">
          <Merge className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <select
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onMergeInto(e.target.value);
              e.target.value = '';
            }}
            className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground focus:outline-none disabled:opacity-40"
          >
            <option value="" className="bg-background">
              併入其他箱…
            </option>
            {otherParcels.map((p) => (
              <option key={p.id} value={p.id} className="bg-background">
                併入 {p.parcelNo}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

function ActivePackingView({
  detail,
  busy,
  onMerge,
  onSeal,
  onBack,
}: {
  detail: PackingDetail;
  busy: boolean;
  onMerge: (sourceId: string, targetId: string) => void;
  onSeal: () => void;
  onBack: () => void;
}) {
  const sealed = detail.status === 'F' || detail.status === 'S';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">{detail.docNo}</span>
            <span className={cx('rounded px-1.5 py-0.5 text-[10px]', DELIVERY_TONE[detail.plType] ?? 'text-muted-foreground')}>
              {detail.plType === 'D' ? '配送' : detail.plType === 'P' ? '自取' : '寄貨'}
            </span>
            {sealed ? (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-600">已封箱</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{detail.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {detail.warehouseName} · {detail.parcels.length} 箱
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-border"
        >
          ← 返回包貨台
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {detail.parcels.map((p) => (
          <ParcelCard
            key={p.id}
            parcel={p}
            otherParcels={sealed ? [] : detail.parcels.filter((x) => x.id !== p.id)}
            busy={busy}
            onMergeInto={(targetId) => onMerge(p.id, targetId)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => printLabels(detail)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm text-foreground transition-colors hover:bg-card"
        >
          <Printer className="h-4 w-4" aria-hidden />
          列印 BX 標籤
        </button>
        {!sealed ? (
          <button
            type="button"
            disabled={busy}
            onClick={onSeal}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600/90 disabled:opacity-40"
          >
            <PackageCheck className="h-4 w-4" aria-hidden />
            封箱（包貨完成）
          </button>
        ) : null}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  busy,
  onBuild,
}: {
  group: PackPoolGroup;
  busy: boolean;
  onBuild: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm text-foreground">{group.customerName}</p>
          <p className="text-xs text-muted-foreground">{group.warehouseName}</p>
        </div>
        <span className={cx('shrink-0 rounded px-2 py-0.5 text-[10px]', DELIVERY_TONE[group.deliveryType] ?? 'text-muted-foreground')}>
          {group.deliveryLabel}
        </span>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {group.soCount} 張銷貨單 · {group.lineCount} 項待包
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onBuild}
        className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
      >
        <Boxes className="h-4 w-4" aria-hidden />
        建包貨單（預設一箱一單）
      </button>
    </div>
  );
}

export function PackingWorkbench() {
  const [groups, setGroups] = useState<PackPoolGroup[]>([]);
  const [active, setActive] = useState<PackingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await getPackPool({ search: search.trim() || undefined });
      setGroups(r.groups);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '包貨台載入失敗');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!active) void load();
  }, [load, active]);

  const build = async (g: PackPoolGroup) => {
    setBusy(true);
    setErr(null);
    try {
      const detail = await createPacking({
        customerId: g.customerId,
        warehouseId: g.warehouseId,
        deliveryType: g.deliveryType as 'D' | 'P' | 'C',
      });
      setActive(detail);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '建包貨單失敗');
    } finally {
      setBusy(false);
    }
  };

  const merge = async (sourceId: string, targetId: string) => {
    if (!active) return;
    setBusy(true);
    setErr(null);
    try {
      setActive(await mergeParcels({ plId: active.id, sourceParcelId: sourceId, targetParcelId: targetId }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '併箱失敗');
    } finally {
      setBusy(false);
    }
  };

  const seal = async () => {
    if (!active) return;
    setBusy(true);
    setErr(null);
    try {
      const sealed = await sealPacking(active.id);
      setActive(sealed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '封箱失敗');
    } finally {
      setBusy(false);
    }
  };

  const totalLines = useMemo(() => groups.reduce((n, g) => n + g.lineCount, 0), [groups]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-lg text-foreground">
            <Boxes className="h-5 w-5 text-primary" aria-hidden />
            庫存中心 · 包貨台
          </h1>
          <p className="text-xs text-muted-foreground">撿好的貨依客戶包箱；預設一箱一單、同客戶小件可併箱省包材</p>
        </div>
        {!active ? (
          <button
            type="button"
            onClick={() => void load()}
            aria-label="重新整理"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:border-border"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </header>

      {err ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{err}</div>
      ) : null}

      {active ? (
        <ActivePackingView detail={active} busy={busy} onMerge={merge} onSeal={seal} onBack={() => setActive(null)} />
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋 客戶 / 銷貨單號 / 料號"
              className="h-10 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="text-xs text-muted-foreground tabular-nums">
            {groups.length} 組待包 · 共 {totalLines} 項
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              載入中…
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              目前沒有撿好待包的貨
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((g) => (
                <GroupCard key={`${g.customerId}|${g.deliveryType}|${g.warehouseId}`} group={g} busy={busy} onBuild={() => build(g)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
