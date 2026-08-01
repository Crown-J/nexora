// apps/nx-ui/src/design/layout/v3/V3Shell.tsx
//
// v3.0.0 外殼（階段 1 Step 3）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2
//
// 與舊 WorkbenchShell 的差異：
//   ⛔ 移除頂部選單列（TopMenuBar）——功能改走九宮格
//   ⛔ 移除底部狀態列（WorkbenchStatusBar）——租戶/使用者/工號收進右上角 👤
//   ＝ 常駐只剩一條橫列，工作區多拿回兩條的高度（1366×768 的筆電差很多）
//
// 保留不動：登入守衛、modal-stack guard、PageGuide、各 Provider、工具列插槽。
// 舊 WorkbenchShell 封存不刪——出問題只要把 dashboard/layout.tsx 換回去一行。

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardBulletinProvider } from '@/features/nx00/context/DashboardBulletinContext';
import { DashboardPaletteProvider } from '@/features/nx00/context/DashboardPaletteContext';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { isDevOpenAuth } from '@data/auth/dev-open';
import { AutoPageGuide, PageGuideProvider } from '@/features/page-guide';
import { useModalStackGuard } from '@design/primitives/modal-stack';
import {
  WorkbenchTabsProvider,
  useWorkbenchTabs,
} from '@design/layout/workbench/WorkbenchTabsContext';
import {
  WorkbenchToolbarSlotProvider,
  useWorkbenchToolbarSlot,
} from '@design/layout/workbench/WorkbenchToolbarSlot';
import { NineGrid } from '@design/navigation/NineGrid';

import { V3TopBar } from './V3TopBar';

/**
 * 九宮格開關鍵＝全系統唯一的全域鍵（規格 §7.3）。
 * Step 4 起接管 F2：原本的即時工作檯選單已退場，五個站改由九宮格的格子進入
 * （銷售作業 2-5 的第三層）。鍵位登記見 design/keyboard/keymap-registry.ts。
 */
const MENU_KEY = 'F2';

/** 開既有浮層工作站的事件（InstantWorkbench 監聽）。⚠️ 過渡做法，階段 4 改一頁式分頁 */
const OPEN_STATION_EVENT = 'nx-instant-station-open';

type Props = { children: React.ReactNode };

function V3Chrome({ children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { displayName, employeeNo, tenantName, onLogout } = useShellSession();
  const toolbarSlot = useWorkbenchToolbarSlot();
  const { open: openTab } = useWorkbenchTabs();

  // window capture：搶在頁面與 modal-stack 的 guard 之前
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== MENU_KEY || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen((v) => !v);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []);

  return (
    // relative z-10：壓在全域 NxAppBackdrop（z-0）之上；bg-background 不透明蓋滿
    <div className="relative z-10 flex h-dvh flex-col bg-background text-foreground">
      <V3TopBar
        onOpenMenu={() => setMenuOpen(true)}
        tenantName={tenantName}
        displayName={displayName}
        employeeNo={employeeNo}
        onLogout={onLogout}
      />

      {/* 情境工具列插槽：頁面自帶的操作列投影至此；無工具列的頁面自動收合 */}
      <div ref={toolbarSlot?.setSlotEl} className={toolbarSlot?.count ? '' : 'hidden'} />

      <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        {children}
        <AutoPageGuide />
      </main>

      <NineGrid
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPick={(t) => {
          if (t.station) {
            window.dispatchEvent(
              new CustomEvent(OPEN_STATION_EVENT, { detail: { no: t.station } }),
            );
            return;
          }
          if (t.href) openTab(t.href, `九宮格：${t.label}`);
        }}
      />
    </div>
  );
}

/** session 整理（沿用舊外殼同一套邏輯） */
function useShellSession() {
  const { me, displayName, logout, tenantNameZh } = useSessionMe();
  const onLogout = useCallback(() => logout(), [logout]);
  return {
    displayName: displayName || me?.username || '系統管理員',
    employeeNo: me?.username ?? '',
    tenantName: tenantNameZh || 'NEXORA',
    onLogout,
  };
}

export function V3Shell({ children }: Props) {
  useModalStackGuard();
  const router = useRouter();
  const { me, view } = useSessionMe();

  // v3.0.0 開發期免登入：不踢回登入頁（後端會注入身分；真的失敗就讓下面的錯誤畫面顯示）
  useEffect(() => {
    if (isDevOpenAuth()) return;
    if (!view.loading && !me) router.replace('/login');
  }, [me, router, view.loading]);

  if (view.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-base text-muted-foreground">載入中…</div>
      </div>
    );
  }

  if (view.errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-lg">
          <div className="text-xs tracking-[0.35em] text-muted-foreground">NEXORA</div>
          <div className="mt-2 text-lg">連線異常</div>
          <div className="mt-2 text-base leading-relaxed text-muted-foreground">{view.errorMsg}</div>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="mt-5 rounded-md border border-border bg-secondary px-4 py-2 text-base text-foreground hover:bg-secondary/80"
          >
            前往登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardPaletteProvider>
      <DashboardBulletinProvider>
        <PageGuideProvider>
          <WorkbenchTabsProvider>
            <WorkbenchToolbarSlotProvider>
              <V3Chrome>{children}</V3Chrome>
            </WorkbenchToolbarSlotProvider>
          </WorkbenchTabsProvider>
        </PageGuideProvider>
      </DashboardBulletinProvider>
    </DashboardPaletteProvider>
  );
}
