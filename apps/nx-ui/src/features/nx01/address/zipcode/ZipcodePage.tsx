// apps/nx-ui/src/features/nx01/address/zipcode/ZipcodePage.tsx
// 郵遞區號基本資料（2026-06-28）：全國中華郵政 3 碼郵遞字典、唯讀參考頁
//   資料源 address-catalog（縣市 City → 鄉鎮市區 District.postalCode）；不可編（全國標準）
//   六層：L3 ErpToolbar（搜尋 + 重新整理 + 熱鍵）+ L4 兩分頁（Alt+1 縣市 / Alt+2 鄉鎮郵遞）+ L5 兩欄
//   搜尋：跨縣市比對 區名 / 縣市名 / 郵遞區號（輸入即過濾右欄）

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, HelpCircle, Keyboard, MapPin, Network, RefreshCw, Search } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { ToolbarPortal } from '@design/layout/workbench/WorkbenchToolbarSlot';
import { ToolbarButton, ToolbarSeparator } from '@/features/nx01/shell/ui/ErpToolbar';

import {
  listCities,
  listDistricts,
  type CityRow,
  type DistrictRow,
} from '@data/endpoints/shared/address/address-catalog-api';

type Focus = 'city' | 'district';
type DistrictWithCity = DistrictRow & { cityName: string; cityCode: string };

export function ZipcodePage() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [districts, setDistricts] = useState<DistrictWithCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const [cityId, setCityId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>('city');
  const [cityIdx, setCityIdx] = useState(0);
  const [districtIdx, setDistrictIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  // ---------- 載入（縣市 + 全部鄉鎮並行）----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const cityRows = await listCities();
        if (cancelled) return;
        const sortedCities = [...cityRows].sort((a, b) => a.sortOrder - b.sortOrder);
        setCities(sortedCities);
        const nested = await Promise.all(
          sortedCities.map(async (c) => {
            const ds = await listDistricts(c.id).catch(() => [] as DistrictRow[]);
            return ds.map((d) => ({ ...d, cityName: c.name, cityCode: c.code }));
          }),
        );
        if (cancelled) return;
        setDistricts(nested.flat());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const triggerReload = useCallback(() => setReloadTick((t) => t + 1), []);

  const searchActive = search.trim().length > 0;
  const kw = search.trim().toLowerCase();

  // 右欄：搜尋中→跨縣市比對；否則→所選縣市的鄉鎮
  const rightDistricts = useMemo(() => {
    if (searchActive) {
      return districts.filter(
        (d) =>
          d.name.toLowerCase().includes(kw) ||
          d.cityName.toLowerCase().includes(kw) ||
          (d.postalCode ?? '').includes(kw),
      );
    }
    return cityId ? districts.filter((d) => d.cityId === cityId) : [];
  }, [districts, searchActive, kw, cityId]);

  const selectedCity = cityId ? cities.find((c) => c.id === cityId) : null;

  // ---------- 鍵盤 ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (t as HTMLElement).blur();
        return;
      }
      if (helpOpen) {
        if (e.key === 'Escape') {
          setHelpOpen(false);
          e.preventDefault();
        }
        return;
      }
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setFocus('city');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setFocus('district');
        return;
      }
      if (e.code === 'Slash' && e.shiftKey) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocus('city');
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocus('district');
        return;
      }
      const count = focus === 'city' ? cities.length : rightDistricts.length;
      const idx = focus === 'city' ? cityIdx : districtIdx;
      const setIdx = focus === 'city' ? setCityIdx : setDistrictIdx;
      if (e.key === 'ArrowDown' && count > 0) {
        e.preventDefault();
        setIdx((idx + 1) % count);
        return;
      }
      if (e.key === 'ArrowUp' && count > 0) {
        e.preventDefault();
        setIdx((idx - 1 + count) % count);
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && focus === 'city' && cities[cityIdx]) {
        e.preventDefault();
        setCityId(cities[cityIdx].id);
        setDistrictIdx(0);
        setFocus('district');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, cities, rightDistricts, cityIdx, districtIdx, helpOpen]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── L3 情境工具列：搜尋 + 重新整理 + 熱鍵 ── */}
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋 區名 / 縣市 / 郵遞區號…"
              className="h-7 w-56 rounded-md border border-border/50 bg-[var(--nx-surface-input)] pl-7 pr-2 text-[12px] text-foreground outline-none focus:border-primary/60"
            />
          </div>
          {searchActive ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              清除
            </button>
          ) : null}
          <ToolbarSeparator />
          <ToolbarButton icon={RefreshCw} letter="R" label="重新整理" enabled onClick={triggerReload} />
          <ToolbarButton icon={Keyboard} letter="?" label="熱鍵" enabled onClick={() => setHelpOpen(true)} />
          <div className="flex-1" />
          <span className="hidden text-[11px] text-muted-foreground lg:inline">
            全國中華郵政 3 碼郵遞字典 · 唯讀
          </span>
        </div>
      </ToolbarPortal>

      {/* ── L4 頁內分頁 ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-background px-3 py-1">
        <ColTab label="縣市" count={cities.length} hint="1" active={focus === 'city'} onClick={() => setFocus('city')} />
        <ColTab
          label="鄉鎮郵遞"
          count={rightDistricts.length}
          hint="2"
          active={focus === 'district'}
          onClick={() => setFocus('district')}
        />
      </div>

      {/* ── L5 主內容：縣市 → 鄉鎮+郵遞 ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[280px_minmax(0,1fr)]">
        <ColumnPanel
          title="縣市"
          subtitle={`${cities.length} 縣市`}
          icon={Building2}
          active={focus === 'city'}
          onClick={() => setFocus('city')}
          shortcut="1"
        >
          {cities.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCityIdx(i);
                setCityId(c.id);
                setDistrictIdx(0);
                setFocus('district');
              }}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all',
                focus === 'city' && cityIdx === i
                  ? 'border-primary/70 bg-primary/12 shadow-md'
                  : cityId === c.id
                    ? 'border-primary/40 bg-primary/6'
                    : 'border-border/40 bg-card hover:border-border hover:bg-accent/15',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-foreground">{c.name}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">{c.code}</div>
              </div>
              <span className="flex-none rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                {districts.filter((d) => d.cityId === c.id).length} 區
              </span>
            </button>
          ))}
        </ColumnPanel>

        <ColumnPanel
          title="鄉鎮市區 · 郵遞區號"
          subtitle={
            searchActive
              ? `搜尋「${search.trim()}」▸ ${rightDistricts.length} 筆`
              : selectedCity
                ? `${selectedCity.name} ▸ ${rightDistricts.length} 區`
                : '請先選縣市、或直接搜尋'
          }
          icon={MapPin}
          active={focus === 'district'}
          onClick={() => setFocus('district')}
          shortcut="2"
        >
          {rightDistricts.length === 0 ? (
            <EmptyHint text={searchActive ? '查無符合的鄉鎮 / 郵遞區號' : '← 請先選縣市、或在上方搜尋'} />
          ) : (
            rightDistricts.map((d, i) => (
              <div
                key={d.id}
                onClick={() => {
                  setFocus('district');
                  setDistrictIdx(i);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-md border px-2.5 py-2 transition-all',
                  focus === 'district' && districtIdx === i
                    ? 'border-primary/70 bg-primary/12 shadow-md'
                    : 'border-border/40 bg-card hover:border-border hover:bg-accent/15',
                )}
              >
                <span className="grid h-8 w-12 flex-none place-items-center rounded-md bg-primary/12 font-mono text-[15px] font-bold tabular-nums text-primary">
                  {d.postalCode ?? '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">{d.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {searchActive ? `${d.cityName} · ` : ''}
                    {d.nameEn ?? d.code}
                  </div>
                </div>
              </div>
            ))
          )}
        </ColumnPanel>
      </div>

      {helpOpen ? <HelpOverlay onClose={() => setHelpOpen(false)} /> : null}
    </div>
  );
}

// ============ 子元件 ============

function ColTab({
  label,
  count,
  hint,
  active,
  onClick,
}: {
  label: string;
  count: number;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors',
        active
          ? 'border-primary/50 bg-primary/10 text-primary'
          : 'border-transparent text-muted-foreground hover:bg-accent/15 hover:text-foreground',
      )}
    >
      <span className="font-mono text-[10px] opacity-60">Alt+{hint}</span>
      {label}
      <span
        className={cn(
          'inline-flex min-w-4 items-center justify-center rounded px-1 text-[10px]',
          active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ColumnPanel({
  title,
  subtitle,
  icon: Icon,
  active,
  onClick,
  shortcut,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  shortcut: string;
  children: React.ReactNode;
}) {
  return (
    <section
      onClick={onClick}
      className={cn(
        // 手機逐層下鑽：只顯聚焦欄；桌面雙欄（md:flex）
        active ? 'flex' : 'hidden',
        'md:flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card transition-all',
        active ? 'border-primary/60' : 'border-border/50 hover:border-border',
      )}
    >
      <header
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2',
          active ? 'border-primary/40 bg-primary/8' : 'border-border/40 bg-muted/30',
        )}
      >
        <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {title}
            <kbd
              className={cn(
                'inline-block rounded border px-1 font-mono text-[10px]',
                active
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-border/50 bg-muted/40 text-muted-foreground',
              )}
            >
              {shortcut}
            </kbd>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </header>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-8 text-center text-[12px] text-muted-foreground">
      <Network className="mb-2 size-6 opacity-40" />
      {text}
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border/40 bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground">郵遞區號 · 鍵盤指南</h2>
        </header>
        <div className="space-y-2 text-[12px] text-foreground/85">
          <Row k="Alt+1 / Alt+2" desc="切到 縣市 / 鄉鎮郵遞 欄" />
          <Row k="← →" desc="左右切欄" />
          <Row k="↑ ↓" desc="欄內上下移動" />
          <Row k="Enter" desc="選定縣市、展開其鄉鎮" />
          <Row k="（工具列搜尋）" desc="跨縣市比對 區名 / 縣市 / 郵遞區號" />
          <Row k="?" desc="開 / 關 此指南" />
          <Row k="Esc" desc="關閉浮層" />
        </div>
        <footer className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border/50 bg-card px-3 py-1 text-[12px] text-foreground/80 hover:bg-accent/15"
          >
            關閉（Esc）
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <kbd className="inline-block min-w-[88px] rounded border border-border/50 bg-muted/40 px-2 py-0.5 text-center font-mono text-[11px] text-foreground">
        {k}
      </kbd>
      <span className="flex-1">{desc}</span>
    </div>
  );
}
