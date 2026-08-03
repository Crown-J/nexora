// apps/nx-ui/src/design/layout/v3/V3Workbench.tsx
//
// v3.0.0 工作檯（＝登入落點首頁）。2026-08-03 執行長拍板的卡片牆。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.2 §3.3
//       docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// ⭐ 卡片＝小行星 ＋ 十一張（執行長 2026-08-03 逐張點名）：
//    簽到 · 查價查貨 · 業績目標 · 銷貨單 · 報價單 · 採購單 · 進貨單
//    撿貨單 · 盤點單 · 調撥單 · 異常回報
//
// ⭐ 四條規矩：
//    1. 沒權限 → 變灰但仍佔位。⛔ 不隱藏、⛔ 不重排——位置固定是肌肉記憶的前提
//    2. 有待處理 → 紅點＋數字。0 的不上色，⛔ 不製造假的緊迫感
//    3. 滿版鋪滿、⛔ 不留孤兒格：手機 2 欄 · 平板 3 欄 · 桌機 4 欄（⛔ 不再開到 6 欄）
//       算式：星球／簽到／查價／業績 各跨兩欄（4×2＝8 格）＋ 八張單據各一格（8 格）
//       ＝16 格，4 欄剛好 4 排整齊，⛔ 沒有半排孤兒。
//       每排等高（auto-rows-fr）＋牆吃滿高度，畫面下半⛔ 不再空一大片
//    4. ⭐ 小行星是第一張卡，⛔ 不是浮在牆外面的東西
//       （執行長：「不然那顆小行星變得好突兀」——根因就是它沒有被編進版面）
//
// ⚠️ 玻璃感靠三層疊出來：半透明底 + backdrop-blur + 內側白色細框（ring-inset）。
//    ⛔ 不用 box-shadow 做假立體——黑底上陰影看不出來，只會糊掉。
//
// ⚠️ Hover 反光：跟著游標跑的高光，⛔ 不是會自己動的動畫。
//    規格 §6 禁的是「畫面自己在動」（長輩會問剛剛怎麼了）；
//    指標驅動的回饋不在此列。仍然尊重系統的「減少動態」設定。
//
// ⚠️ 本輪仍是殼：簽到與業績目標只有卡片、⛔ 還沒接功能。
// ⚠️ 權限目前全開（開發期免登入），灰卡的判定已寫好但實際不會觸發。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { PlanetSlot } from '@design/home/SharedPlanetRoot';
import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { useV3Menu } from './v3-menu-context';
import { WORKBENCH_TILES, type WorkbenchTile } from './workbench-tiles';

/** 玻璃卡：半透明底 + 毛玻璃 + 內側細框。⛔ 不用陰影，黑底上看不出來 */
const GLASS =
  'relative overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-inset ring-white/10 backdrop-blur-xl';

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

/**
 * 卡面反光。跟著游標的位置移動，離開就消失。
 * ⚠️ 用 CSS 變數餵座標，⛔ 不每次 setState——一格一個 state 會讓整面牆重畫。
 */
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

function TileShell({
  tile,
  disabled,
  onClick,
  children,
}: {
  tile: WorkbenchTile;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const base = `group flex min-h-[8.5rem] flex-col justify-between p-4 text-left ${GLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`;
  // ⛔ 沒權限變灰但仍佔位（規格 §3.1 同一條鐵則）
  const skin = disabled
    ? 'cursor-not-allowed opacity-40'
    : 'hover:bg-white/[0.08] hover:ring-white/20';
  const cls = `${base} ${skin} ${tile.wide ? 'xl:col-span-2' : ''}`;

  const body = (
    <>
      {!disabled ? <Sheen /> : null}
      <span className="relative flex h-full flex-col justify-between">{children}</span>
    </>
  );

  if (!onClick) return <div data-tile className={cls}>{body}</div>;
  return (
    <button type="button" data-tile disabled={disabled} onClick={onClick} className={cls}>
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
  const wallRef = useRef<HTMLDivElement>(null);

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

  return (
    // ⭐ 滿版：⛔ 不設 max-width，卡片牆吃滿整個工作區
    <div className="flex h-full w-full flex-col gap-2 px-3 py-3 sm:px-4 sm:py-4">
      <div
        ref={wallRef}
        onMouseMove={onWallMove}
        className="grid h-full auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
      >
        {/* ⭐ 第一張卡＝小行星（九宮格入口）。它被編進版面，就不再是浮在外面的異物 */}
        <button
          type="button"
          data-tile
          onClick={() => menu?.openMenu()}
          title="功能選單（F2）"
          aria-label="功能選單"
          className={`group flex min-h-[8.5rem] flex-col items-center justify-center gap-2 p-4 xl:col-span-2 ${GLASS} hover:bg-white/[0.08] hover:ring-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
        >
          <Sheen />
          {/* 星球停泊點：本體是 root layout 那顆，飛過來停在這。
              ⚠️ 星球會縮到「停泊點尺寸的兩倍」（SharedPlanetRoot 對 topbar 的既有規則），
                 所以這裡給 36px＝星球實際 72px，才不會壓到底下的字。 */}
          <PlanetSlot id="topbar" className="relative h-9 w-9" />
          <span className="nx-hint relative">功能選單　F2</span>
        </button>

        {WORKBENCH_TILES.map((t) => {
          const Icon = t.icon;

          if (t.kind === 'search') {
            return (
              <TileShell key={t.key} tile={t}>
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <span className="nx-t-sec">{t.label}</span>
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
                    placeholder={t.hint}
                    aria-label={t.label}
                    // 搜尋框永遠聚焦，⛔ 不套「未輸入退成灰底」那套
                    className="nx-field-lg h-12 w-full rounded-xl bg-black/25 pl-11 ring-1 ring-inset ring-white/10"
                  />
                </div>
              </TileShell>
            );
          }

          if (t.kind === 'action') {
            return (
              <TileShell key={t.key} tile={t}>
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                <span>
                  <span className="nx-t-sec block">{t.label}</span>
                  <span className="nx-hint block">{t.hint}</span>
                  {/* ⚠️ 只有卡片、還沒接功能（執行長指示先畫殼） */}
                  <span className="nx-hint mt-1 block">建置中</span>
                </span>
              </TileShell>
            );
          }

          const n = counts[t.key] ?? null;
          return (
            <TileShell key={t.key} tile={t} onClick={() => go(t.href!, t.label)}>
              <span className="flex items-start justify-between gap-2">
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                {n === null ? <span className="nx-hint">—</span> : <Badge count={n} />}
              </span>
              <span>
                <span className="nx-t-sec block">{t.label}</span>
                <span className="nx-hint block">{n === 0 ? '沒有待處理的' : t.hint}</span>
              </span>
            </TileShell>
          );
        })}
      </div>

      <p className="nx-hint mt-3">
        數字只算「現在輪到我們動手的」。等客戶簽收、等廠商交期、等帳期的⛔ 不在這裡——點進去看得到。
      </p>
    </div>
  );
}
