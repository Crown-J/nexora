// apps/nx-ui/src/design/layout/workbench/WorkbenchShell.tsx
// 傳統 ERP 外殼（2026-06-27 執行長拍板「比照偉盟」大改版、新預設）：
//   頂部功能選單列 + 工具列 + 分頁文件式工作區 + 底部狀態列
// 取代舊太空風外殼（DashboardShell / HomeShell，已封存）。
// - 沿用：登入守衛、modal-stack guard、PageGuide、料號搜尋、各 Provider
// - 移除：小星球 Dock / 星空背景 / 登出星球飛行動畫
// - 配色：pro 專業版（palette 預設已改 pro）、預設淺色

'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardBulletinProvider } from '@/features/nx00/context/DashboardBulletinContext';
import { DashboardPaletteProvider } from '@/features/nx00/context/DashboardPaletteContext';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { AutoPageGuide, PageGuideProvider } from '@/features/page-guide';
import { useModalStackGuard } from '@design/primitives/modal-stack';
import { TopMenuBar } from './TopMenuBar';
import { WorkbenchTabStrip } from './WorkbenchTabStrip';
import { WorkbenchStatusBar } from './WorkbenchStatusBar';
import { WorkbenchTabsProvider, useWorkbenchTabs } from './WorkbenchTabsContext';
import {
  WorkbenchToolbarSlotProvider,
  useWorkbenchToolbarSlot,
} from './WorkbenchToolbarSlot';
import { BUSINESS_MENUS, SYSTEM_MENU, type MenuNode } from './menu-data';

type Props = { children: React.ReactNode };

/** 內層：可用 useWorkbenchTabs（須在 Provider 內） */
function WorkbenchChrome({ children }: Props) {
  const { open, closeAll } = useWorkbenchTabs();
  const { displayName, employeeNo, tenantName, onLogout } = useShellSession();
  const toolbarSlot = useWorkbenchToolbarSlot();

  const menus: MenuNode[] = [SYSTEM_MENU, ...BUSINESS_MENUS];

  const onSelect = useCallback(
    (node: MenuNode) => {
      if (node.action === 'logout') return onLogout();
      if (node.action === 'close-all') return closeAll();
      if (node.href) open(node.href, `menu: ${node.label}`);
    },
    [onLogout, closeAll, open],
  );

  const onSearch = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
  }, []);

  return (
    // relative z-10：壓在全域 NxAppBackdrop（z-0 星空/六角背景）之上；bg-background 不透明蓋滿
    <div className="relative z-10 flex h-dvh flex-col bg-background text-foreground">
      <TopMenuBar
        menus={menus}
        onSelect={onSelect}
        onHome={() => open('/dashboard', 'menu: 首頁')}
        onSearch={onSearch}
      />
      {/* 第 2 層：內容分頁（已開功能） */}
      <WorkbenchTabStrip />
      {/* 第 3 層：情境工具列插槽（頁面 ErpToolbar 投影至此；無工具列頁面自動收合） */}
      <div ref={toolbarSlot?.setSlotEl} className={toolbarSlot?.count ? '' : 'hidden'} />
      {/* 第 5 層：主內容（無邊距、表格完整全展開；需留白的頁面自帶內距，如 WorkbenchHome） */}
      <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        {children}
        <AutoPageGuide />
      </main>
      <WorkbenchStatusBar
        tenantName={tenantName}
        displayName={displayName}
        employeeNo={employeeNo}
      />
    </div>
  );
}

/** session 整理（displayName / 工號 / 租戶名 / 登出） */
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

export function WorkbenchShell({ children }: Props) {
  useModalStackGuard();
  const router = useRouter();
  const { me, view } = useSessionMe();

  useEffect(() => {
    if (!view.loading && !me) router.replace('/login');
  }, [me, router, view.loading]);

  if (view.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">載入中…</div>
      </div>
    );
  }

  if (view.errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-lg">
          <div className="text-xs tracking-[0.35em] text-muted-foreground">NEXORA</div>
          <div className="mt-2 text-lg font-semibold">連線異常</div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{view.errorMsg}</div>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="mt-5 rounded-md border border-border bg-secondary px-4 py-2 text-xs text-foreground transition hover:bg-secondary/80"
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
              <WorkbenchChrome>{children}</WorkbenchChrome>
            </WorkbenchToolbarSlotProvider>
          </WorkbenchTabsProvider>
        </PageGuideProvider>
      </DashboardBulletinProvider>
    </DashboardPaletteProvider>
  );
}
