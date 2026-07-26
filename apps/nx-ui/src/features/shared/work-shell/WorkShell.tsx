// apps/nx-ui/src/features/shared/work-shell/WorkShell.tsx
// 新殼・左側可收縮選單版面（執行長 2026-07-26 拍板：簡約、白紙起步、設計最後一步）
//
// 版面：左＝一列可收縮選單（展開 240px＝圖示+文字、收縮 56px＝僅圖示）、右＝內容區
// 收縮狀態存 localStorage（nx-work-shell-collapsed）；SSR 先渲染展開、掛載後補水（避免 hydration mismatch）
// 選單內容吃 work-menu-registry.ts（SSOT）：route 導頁、station 開即時工作檯的站

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { WORK_MENU, openInstantStation, type WorkMenuItem } from './work-menu-registry';

const COLLAPSE_KEY = 'nx-work-shell-collapsed';

export function WorkShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 掛載後讀偏好（SSR 無 localStorage、統一先展開再補水）
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
    } catch {
      /* localStorage 不可用（隱私模式等）→ 維持預設展開 */
    }
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        /* 同上、僅偏好不落地 */
      }
      return !v;
    });
  };

  const handleItem = (item: WorkMenuItem) => {
    if (item.action.kind === 'route') router.push(item.action.href);
    else openInstantStation(item.action.no);
  };

  return (
    // relative z-10：壓在全域 NxAppBackdrop（z-0 蜂巢背景）之上、bg-background 不透明蓋滿（同 WorkbenchShell 範式）
    <div className="relative z-10 flex h-dvh overflow-hidden bg-background text-foreground">
      {/* 左：可收縮選單 */}
      <aside
        className={`flex shrink-0 flex-col border-r border-border/60 bg-card/40 transition-[width] duration-200 ${
          collapsed ? 'w-14' : 'w-60'
        }`}
      >
        {/* 品牌列 */}
        <div className="flex h-12 items-center gap-2 border-b border-border/40 px-3">
          <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
          {!collapsed && <span className="truncate text-sm font-bold tracking-widest">NEXORA</span>}
        </div>

        {/* 入口清單（平鋪、SSOT：work-menu-registry） */}
        <nav className="flex-1 overflow-y-auto py-2">
          {WORK_MENU.map((item) => {
            const Icon = item.icon;
            const { action } = item;
            const active = action.kind === 'route' && pathname === action.href;
            const cls = `flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              active
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            } ${collapsed ? 'justify-center px-0' : ''}`;
            const inner = (
              <>
                <Icon className="size-4.5 shrink-0" strokeWidth={1.8} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            );
            return action.kind === 'route' ? (
              <Link key={item.id} href={action.href} className={cls} title={collapsed ? item.label : undefined}>
                {inner}
              </Link>
            ) : (
              <button key={item.id} type="button" onClick={() => handleItem(item)} className={cls} title={collapsed ? item.label : undefined}>
                {inner}
              </button>
            );
          })}
        </nav>

        {/* 底：收縮切換 */}
        <button
          type="button"
          onClick={toggle}
          className="flex h-11 items-center gap-3 border-t border-border/40 px-4 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={collapsed ? '展開選單' : '收合選單'}
        >
          {collapsed ? (
            <PanelLeftOpen className="mx-auto size-4.5" strokeWidth={1.8} />
          ) : (
            <>
              <PanelLeftClose className="size-4.5" strokeWidth={1.8} />
              <span className="text-xs">收合選單</span>
            </>
          )}
        </button>
      </aside>

      {/* 右：內容區 */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
