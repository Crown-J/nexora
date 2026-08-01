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
 * 九宮格開關鍵。
 * ⚠️ Step 4 改成 'F2'：F2 目前是即時工作檯的鍵、五個站靠它進入，
 *    現在搶過來那五站會進不去，等站台一起遷移時再換（規格 §3.1 最終鍵位是 F2）。
 */
const MENU_KEY = 'F4';

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
        onNavigate={(href, label) => openTab(href, `九宮格：${label}`)}
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

  useEffect(() => {
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
