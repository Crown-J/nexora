// apps/nx-ui/src/design/layout/v3/V3Workbench.tsx
//
// v3.0.0 工作檯（＝登入落點首頁）。2026-08-03 執行長手繪配置。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.2 §3.3
//       docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// ⭐ 版面（桌機 12 欄 × 5 排，依執行長手繪）：
//
//   ┌─────────────┬───────────────┬──────────┬─────────┐
//   │ 簽到        │ 小行星         │ 業績     │         │
//   ├─────────────┤               │          │         │
//   │ 查價查貨    │               │          │ 備忘錄  │
//   ├───┬───┬─────┼───────────────┴──────────┤         │
//   │報價│銷貨│調貨│                          │         │
//   ├───┼───┼─────┤        行事曆             │         │
//   │採購│進貨│調撥│                          │         │
//   ├───┼───┼─────┤                          │         │
//   │撿貨│盤點│異常│                          │         │
//   └───┴───┴─────┴──────────────────────────┴─────────┘
//
// ⭐ 九張單據卡排成 3×3——與九宮格同一種形狀，兩邊的肌肉記憶互通。
// ⭐ 三條規矩：
//    1. 沒權限 → 變灰但仍佔位。⛔ 不隱藏、⛔ 不重排
//    2. 有待處理 → 紅點＋數字。0 的不上色，⛔ 不製造假的緊迫感
//    3. 位置寫死、⛔ 不隨資料變動——會跳就失去肌肉記憶
//
// ⚠️ 小螢幕不套這張圖：xl 以下退回單純流排（手機 2 欄、平板 3 欄）。
//    手繪配置是給有寬度的螢幕看的，硬塞進 375px 只會擠爛。
//
// ⚠️ 玻璃感三層：半透明底 + backdrop-blur + 內側白色細框。⛔ 不用陰影（黑底上看不出來）。
// ⚠️ Hover 反光是指標驅動的回饋，⛔ 不是會自己動的動畫（規格 §6 禁的是後者）。
//
// ⚠️ 本輪仍是殼：簽到、業績目標、備忘錄只有卡片、⛔ 還沒接功能。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, StickyNote } from 'lucide-react';

import { PlanetSlot } from '@design/home/SharedPlanetRoot';
import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { useV3Menu } from './v3-menu-context';
import { WorkbenchCalendar } from './WorkbenchCalendar';
import { WORKBENCH_TILES, type WorkbenchTile } from './workbench-tiles';

/** 玻璃卡：半透明底 + 毛玻璃 + 內側細框。⛔ 不用陰影，黑底上看不出來 */
const GLASS =
  'relative overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-inset ring-white/10 backdrop-blur-xl';
const HOVER = 'hover:bg-white/[0.08] hover:ring-white/20';
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';

/**
 * 桌機格位（xl 以上才套）。⛔ 寫死不隨資料變動。
 * 用 arbitrary property 直接寫 grid-column / grid-row，
 * ⛔ 不依賴 col-start-N 那組工具類（欄數到 12 時哪些數字有被產出來不一定）。
 */
const AT: Record<string, string> = {
  checkin: 'xl:[grid-column:1/span_3] xl:[grid-row:1]',
  search: 'xl:[grid-column:1/span_3] xl:[grid-row:2]',
  planet: 'xl:[grid-column:4/span_3] xl:[grid-row:1/span_2]',
  kpi: 'xl:[grid-column:7/span_2] xl:[grid-row:1/span_2]',
  memo: 'xl:[grid-column:9/span_4] xl:[grid-row:1/span_5]',
  calendar: 'xl:[grid-column:4/span_5] xl:[grid-row:3/span_3]',
  // 九張單據＝3×3，與九宮格同形狀
  qt: 'xl:[grid-column:1] xl:[grid-row:3]',
  so: 'xl:[grid-column:2] xl:[grid-row:3]',
  ti: 'xl:[grid-column:3] xl:[grid-row:3]',
  po: 'xl:[grid-column:1] xl:[grid-row:4]',
  rr: 'xl:[grid-column:2] xl:[grid-row:4]',
  st: 'xl:[grid-column:3] xl:[grid-row:4]',
  pk: 'xl:[grid-column:1] xl:[grid-row:5]',
  stocktake: 'xl:[grid-column:2] xl:[grid-row:5]',
  ir: 'xl:[grid-column:3] xl:[grid-row:5]',
};

/** 紅點＋數字。⛔ 0 不顯示——沒事就不要製造緊迫感 */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex items-center gap-1.5">
      {/* 紅點：手遊那一套，人看到就想清掉 */}
      <span className="h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden />
      <span className="nx-num-lg text-destructive">{count}</span>
    </span>
  );
}

/** 卡面反光：跟著游標跑。⚠️ 座標走 CSS 變數，⛔ 不 setState（整面牆會重畫） */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
      style={{
        background:
          'radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.12), transparent 60%)',
      }}
    />
  );
}

function Card({
  at,
  onClick,
  label,
  className = '',
  children,
}: {
  at: string;
  onClick?: () => void;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = `group flex min-h-[7.5rem] flex-col p-4 text-left ${GLASS} ${HOVER} ${FOCUS} ${at} ${className}`;
  const body = (
    <>
      <Sheen />
      <span className="relative flex min-h-0 flex-1 flex-col">{children}</span>
    </>
  );
  if (!onClick) {
    return (
      <div data-tile className={cls}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" data-tile aria-label={label} onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export function V3Workbench() {
  const router = useRouter();
  const menu = useV3Menu();
  const [term, setTerm] = useState('');
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    for (const t of WORKBENCH_TILES) {
      if (!t.load) continue;
      t.load()
        .then((n) => alive && setCounts((p) => ({ ...p, [t.key]: n })))
        .catch(() => alive && setCounts((p) => ({ ...p, [t.key]: 0 })));
    }
    return () => {
      alive = false;
    };
  }, []);

  /** 一個 handler 服務整面牆：把游標位置寫進該張卡的 CSS 變數 */
  const onWallMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-tile]');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, []);

  // 規則 1：搜尋框永遠聚焦。⚠️ 雙螢幕切走再切回也要能立刻定位。
  useEffect(() => {
    searchRef.current?.focus();
    const refocus = () => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      searchRef.current?.focus();
    };
    window.addEventListener('focus', refocus);
    return () => window.removeEventListener('focus', refocus);
  }, []);

  const go = useCallback(
    (href: string, label: string) => tryNavigate(() => router.push(href), `工作檯：${label}`),
    [router],
  );

  /** Enter → 開查價查貨站、把打好的字一起帶進去（⛔ 不讓使用者重打一次） */
  const submit = useCallback(() => {
    const kw = term.trim();
    if (!kw) return;
    openPartQuickSearch({ entry: 'sales', initialKeyword: kw });
  }, [term]);

  const tile = (key: string): WorkbenchTile | undefined =>
    WORKBENCH_TILES.find((t) => t.key === key);

  const docCard = (key: string) => {
    const t = tile(key);
    if (!t) return null;
    const Icon = t.icon;
    const n = counts[key] ?? null;
    return (
      <Card key={key} at={AT[key] ?? ''} label={t.label} onClick={() => go(t.href!, t.label)}>
        <span className="flex items-start justify-between gap-2">
          <Icon className="h-6 w-6 text-primary" aria-hidden />
          {n === null ? <span className="nx-hint">—</span> : <Badge count={n} />}
        </span>
        <span className="mt-auto">
          <span className="nx-t-sec block">{t.label}</span>
          <span className="nx-hint block">{n === 0 ? '沒有待處理的' : t.hint}</span>
        </span>
      </Card>
    );
  };

  const checkin = tile('checkin')!;
  const search = tile('search')!;
  const kpi = tile('kpi')!;
  const CheckinIcon = checkin.icon;
  const SearchIcon = search.icon;
  const KpiIcon = kpi.icon;

  return (
    // ⭐ 滿版：⛔ 不設 max-width，卡片牆吃滿整個工作區
    <div className="h-full w-full p-3 sm:p-4">
      <div
        onMouseMove={onWallMove}
        // 手機 2 欄／平板 3 欄＝單純流排；xl 以上才套執行長手繪的 12 欄配置
        className="grid h-full auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-12 xl:grid-rows-5"
      >
        {/* 小行星＝九宮格入口。被編進版面，⛔ 不再浮在牆外面 */}
        <Card
          at={AT.planet}
          label="功能選單"
          onClick={() => menu?.openMenu()}
          className="items-center justify-center"
        >
          <span className="flex h-full flex-col items-center justify-center gap-2">
            {/* ⚠️ 星球會放大成停泊點的兩倍（SharedPlanetRoot 對 topbar 的既有規則） */}
            <PlanetSlot id="topbar" className="h-12 w-12" />
            <span className="nx-hint">功能選單　F2</span>
          </span>
        </Card>

        <Card at={AT.checkin}>
          <span className="flex items-center gap-2">
            <CheckinIcon className="h-6 w-6 text-primary" aria-hidden />
            <span className="nx-t-sec">{checkin.label}</span>
          </span>
          <span className="nx-hint mt-1">{checkin.hint}　·　建置中</span>
        </Card>

        <Card at={AT.search}>
          <span className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5 text-primary" aria-hidden />
            <span className="nx-t-sec">{search.label}</span>
          </span>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground"
              aria-hidden
            />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={search.hint}
              aria-label={search.label}
              // 搜尋框永遠聚焦，⛔ 不套「未輸入退成灰底」那套
              className="nx-field-lg h-12 w-full rounded-xl bg-black/25 pl-11 ring-1 ring-inset ring-white/10"
            />
          </div>
        </Card>

        <Card at={AT.kpi}>
          <span className="flex items-center gap-2">
            <KpiIcon className="h-6 w-6 text-primary" aria-hidden />
            <span className="nx-t-sec">{kpi.label}</span>
          </span>
          <span className="nx-hint mt-1">{kpi.hint}</span>
          <span className="nx-body mt-auto">建置中</span>
        </Card>

        {/* 九張單據＝3×3 */}
        {['qt', 'so', 'ti', 'po', 'rr', 'st', 'pk', 'stocktake', 'ir'].map(docCard)}

        <Card at={AT.calendar}>
          <WorkbenchCalendar />
        </Card>

        <Card at={AT.memo}>
          <span className="flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-primary" aria-hidden />
            <span className="nx-t-sec">備忘錄</span>
          </span>
          <span className="nx-hint mt-1">誰交代了什麼事要處理</span>
          <span className="nx-body mt-auto">建置中</span>
        </Card>
      </div>
    </div>
  );
}
