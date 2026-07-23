// apps/nx-ui/src/features/nx03/workstation/ship-zones/ShipZonesPage.tsx
/**
 * 庫存中心 · 出貨三區（桌機/平板、SALES-FLOW 階段 3b）。
 *
 * 封箱後依出貨方式路由三個工作佇列：
 *   · 自取區：客人來取核對後簽收 → 過帳完成
 *   · 寄貨區：交物流輸物流商+單號 → 視同送達過帳完成
 *   · 配送區：組長勾多張包貨單 + 選外務 → 配單成一趟；外務送達客人簽收（走配送單）→ 過帳完成
 *
 * 過帳（扣庫存+開應收）於各完成事件觸發（階段3a）。
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PackageCheck, Send, Truck, RefreshCw } from 'lucide-react';

import { listUsers, type UserDto } from '@data/endpoints/nx01/api/user';
import {
  createDeliveryRun,
  getShipZones,
  shipMail,
  signPickup,
  type ShipZoneItem,
  type ShipZones,
} from '@data/endpoints/nx03/workstation/api';
import { cx } from '@design/utils/cx';

type TabKey = 'pickup' | 'mail' | 'delivery';

const TABS: { id: TabKey; label: string; icon: typeof PackageCheck }[] = [
  { id: 'pickup', label: '自取區', icon: PackageCheck },
  { id: 'mail', label: '寄貨區', icon: Send },
  { id: 'delivery', label: '配送區', icon: Truck },
];

function ItemHeader({ item }: { item: ShipZoneItem }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">{item.docNo}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{item.parcelCount} 箱</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{item.customerName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{item.soDocNos.join('、')}</p>
      </div>
      <span className="shrink-0 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
        {item.warehouseCode}
      </span>
    </div>
  );
}

function PickupCard({ item, busy, onSign }: { item: ShipZoneItem; busy: boolean; onSign: (name: string) => void }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <ItemHeader item={item} />
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const name = window.prompt('簽收人姓名：', item.customerName);
          if (name?.trim()) onSign(name.trim());
        }}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-medium text-white transition-colors hover:bg-emerald-600/90 disabled:opacity-40"
      >
        <PackageCheck className="h-4 w-4" aria-hidden />
        簽收（客人已取）
      </button>
    </div>
  );
}

function MailCard({
  item,
  busy,
  onShip,
}: {
  item: ShipZoneItem;
  busy: boolean;
  onShip: (provider: string, tracking: string) => void;
}) {
  const [provider, setProvider] = useState('');
  const [tracking, setTracking] = useState('');
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <ItemHeader item={item} />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="物流公司"
          className="h-9 rounded border border-border bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="物流單號"
          className="h-9 rounded border border-border bg-transparent px-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      <button
        type="button"
        disabled={busy || !provider.trim() || !tracking.trim()}
        onClick={() => onShip(provider.trim(), tracking.trim())}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-medium text-white transition-colors hover:bg-emerald-600/90 disabled:opacity-40"
      >
        <Send className="h-4 w-4" aria-hidden />
        寄出（交物流）
      </button>
    </div>
  );
}

function DeliveryCard({
  item,
  checked,
  busy,
  onToggle,
}: {
  item: ShipZoneItem;
  checked: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
        checked ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-border',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={onToggle}
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">{item.docNo}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{item.parcelCount} 箱</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{item.customerName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{item.deliveryAddress ?? '（未填送貨地址）'}</p>
      </div>
    </label>
  );
}

export function ShipZonesPage() {
  const [zones, setZones] = useState<ShipZones>({ pickup: [], mail: [], delivery: [] });
  const [tab, setTab] = useState<TabKey>('pickup');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<UserDto[]>([]);
  const [driverId, setDriverId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setZones(await getShipZones());
    } catch (e) {
      setErr(e instanceof Error ? e.message : '出貨區載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listUsers({ isActive: true, pageSize: 100 })
      .then((r) => setDrivers(r.items))
      .catch(() => setDrivers([]));
  }, []);

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMsg: string, fallback: string) => {
      setBusy(true);
      setErr(null);
      setMsg(null);
      try {
        await fn();
        setMsg(okMsg);
        setSelected(new Set());
        await load();
      } catch (e) {
        setErr(e instanceof Error ? e.message : fallback);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const toggle = (plId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(plId)) next.delete(plId);
      else next.add(plId);
      return next;
    });

  const dispatchRun = () => {
    if (!selected.size || !driverId) return;
    void run(
      () => createDeliveryRun([...selected], driverId),
      `已配單 ${selected.size} 張包貨單`,
      '配單失敗',
    );
  };

  const counts = useMemo(
    () => ({ pickup: zones.pickup.length, mail: zones.mail.length, delivery: zones.delivery.length }),
    [zones],
  );

  return (
    <div className="w-full space-y-4 p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-lg text-foreground">
            <Truck className="h-5 w-5 text-primary" aria-hidden />
            庫存中心 · 出貨三區
          </h1>
          <p className="text-xs text-muted-foreground">封箱後依出貨方式：自取簽收 / 寄貨寄出 / 配送配單。完成即扣帳</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="重新整理"
          className="rounded-lg border border-border p-2 text-muted-foreground hover:border-border"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="flex max-w-2xl gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cx(
                'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm transition-colors',
                isActive
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t.label} <span className="tabular-nums">{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      {err ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{err}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600">{msg}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          載入中…
        </div>
      ) : tab === 'pickup' ? (
        zones.pickup.length === 0 ? (
          <EmptyZone text="自取區沒有待取的包裹" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {zones.pickup.map((it) => (
              <PickupCard
                key={it.plId}
                item={it}
                busy={busy}
                onSign={(name) => run(() => signPickup(it.plId, name), '已簽收完成', '簽收失敗')}
              />
            ))}
          </div>
        )
      ) : tab === 'mail' ? (
        zones.mail.length === 0 ? (
          <EmptyZone text="寄貨區沒有待寄的包裹" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {zones.mail.map((it) => (
              <MailCard
                key={it.plId}
                item={it}
                busy={busy}
                onShip={(p, t) => run(() => shipMail(it.plId, p, t), '已寄出完成', '寄出失敗')}
              />
            ))}
          </div>
        )
      ) : zones.delivery.length === 0 ? (
        <EmptyZone text="配送區沒有待配的包裹" />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">配單給外務：</span>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="h-9 flex-1 rounded border border-border bg-transparent px-2 text-sm text-foreground focus:outline-none"
            >
              <option value="" className="bg-background">
                選擇外務…
              </option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id} className="bg-background">
                  {d.displayName}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !selected.size || !driverId}
              onClick={dispatchRun}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Truck className="h-4 w-4" aria-hidden />
              配單成一趟（{selected.size}）
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {zones.delivery.map((it) => (
              <DeliveryCard
                key={it.plId}
                item={it}
                checked={selected.has(it.plId)}
                busy={busy}
                onToggle={() => toggle(it.plId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyZone({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{text}</div>
  );
}
