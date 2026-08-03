// apps/nx-ui/src/design/layout/v3/V3Workbench.tsx
//
// v3.0.0 工作檯（＝登入落點首頁）。2026-08-03 改成執行長拍板的卡片牆。
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.2 §3.3
//       docs/專案/介面規格/NEXORA-外殼規格-v3.0.0.md §3（殼 1）
//
// ⭐ 十一張卡片（執行長 2026-08-03 逐張點名）：
//    簽到 · 查價查貨 · 業績目標 · 銷貨單 · 報價單 · 採購單 · 進貨單
//    撿貨單 · 盤點單 · 調撥單 · 異常回報
//
// ⭐ 三條規矩：
//    1. 沒權限 → 變灰但仍佔位。⛔ 不隱藏、⛔ 不重排——位置固定是肌肉記憶的前提
//    2. 有待處理 → 紅點＋數字。0 的不上色，⛔ 不製造假的緊迫感
//    3. 卡片大小可以不同，但⛔ 不留空格（bento 拼盤）
//
// ⭐ 為什麼是卡片不是表格（執行長 2026-08-03）：
//    工作檯是入口不是內容。紅點的作用是「讓人想清掉」，
//    而人會想清掉的前提是那個數字他真的動得了——所以數字只算「現在要動手的」。
//    要看單號與客戶請點進去，那是清單殼的事。
//
// ⚠️ 本輪仍是殼：簽到與業績目標只有卡片、⛔ 還沒接功能（執行長指示先畫殼）。
// ⚠️ 權限目前全開（開發期免登入），灰卡的判定已寫好但實際不會觸發。
//
// ⛔ 不放圖表、⛔ 不用灰字、⛔ 禁動畫（規格 §6）。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { openPartQuickSearch } from '@design/components/quick-search/GlobalPartQuickSearch';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { WORKBENCH_TILES, type WorkbenchTile } from './workbench-tiles';

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
  const base =
    'flex min-h-[7.5rem] flex-col justify-between rounded-2xl p-4 text-left backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
  // ⛔ 沒權限變灰但仍佔位（規格 §3.1 同一條鐵則）
  const skin = disabled
    ? 'cursor-not-allowed bg-card/30 text-muted-foreground'
    : 'bg-card/70 hover:bg-primary/[0.08]';
  const cls = `${base} ${skin} ${tile.wide ? 'sm:col-span-2' : ''}`;

  if (!onClick) return <div className={cls}>{children}</div>;
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function V3Workbench() {
  const router = useRouter();
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

  // 規則 1：搜尋框永遠聚焦。
  // ⚠️ 不只是開頁聚焦——雙螢幕切走再切回也要能立刻定位。
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
    // ⚠️ 給左上角星球讓位：桌機往右讓、手機往下讓（手機只有 375 寬，橫向讓會擠爛）
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-20 sm:px-6 lg:pl-24 lg:pt-6">
      {/* bento 拼盤：手機 2 欄、平板 3 欄、桌機 4 欄。⛔ 不留空格 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {WORKBENCH_TILES.map((t) => {
          if (t.kind === 'search') {
            return (
              <TileShell key={t.key} tile={t}>
                <span className="nx-hint">{t.label}</span>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" />
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
                    className="nx-field-lg h-12 w-full rounded-xl bg-background/60 pl-11"
                  />
                </div>
              </TileShell>
            );
          }

          if (t.kind === 'action') {
            return (
              <TileShell key={t.key} tile={t}>
                <span className="nx-t-sec">{t.label}</span>
                <span className="nx-hint">{t.hint}</span>
                {/* ⚠️ 只有卡片、還沒接功能（執行長指示先畫殼） */}
                <span className="nx-hint mt-2">建置中</span>
              </TileShell>
            );
          }

          const n = counts[t.key] ?? null;
          return (
            <TileShell key={t.key} tile={t} onClick={() => go(t.href!, t.label)}>
              <div className="flex items-start justify-between gap-2">
                <span className="nx-t-sec">{t.label}</span>
                {n === null ? <span className="nx-hint">—</span> : <Badge count={n} />}
              </div>
              <span className="nx-hint">{n === 0 ? '沒有待處理的' : t.hint}</span>
            </TileShell>
          );
        })}
      </div>

      <p className="nx-hint mt-4">
        數字只算「現在輪到我們動手的」。等客戶簽收、等廠商交期、等帳期的⛔ 不在這裡——點進去看得到。
      </p>
    </div>
  );
}
