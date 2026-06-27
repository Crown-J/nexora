// apps/nx-ui/src/design/layout/workbench/WorkbenchShell.tsx
// 現代 ERP 外殼（2026-06-27 執行長拍板：偉盟太傳統 → 升級現代版面）：
//   頂部窄列 + 左側可收合側欄 + 分頁文件式工作區（Odoo / 正航雲 / SAP Fiori 風）
// 取代舊太空風外殼（DashboardShell / HomeShell，已封存）。
// - 沿用：登入守衛、modal-stack guard、PageGuide、料號搜尋、各 Provider
// - 配色：pro 專業版（palette 預設已改 pro）、預設淺色

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardBulletinProvider } from '@/features/nx00/context/DashboardBulletinContext';
import { DashboardPaletteProvider } from '@/features/nx00/context/DashboardPaletteContext';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { AutoPageGuide, PageGuideProvider } from '@/features/page-guide';
import { useModalStackGuard } from '@design/primitives/modal-stack';
import { WorkbenchTopBar } from './WorkbenchTopBar';
import { WorkbenchSidebar } from './WorkbenchSidebar';
import { WorkbenchTabStrip } from './WorkbenchTabStrip';
import { WorkbenchTabsProvider, useWorkbenchTabs } from './WorkbenchTabsContext';
import { BUSINESS_MENUS, type MenuNode } from './menu-data';
import { useUiTheme } from './useUiTheme';

type Props = { children: React.ReactNode };

const SIDEBAR_KEY = 'nx-workbench-sidebar-collapsed';

/** 內層：可用 useWorkbenchTabs（須在 Provider 內） */
function WorkbenchChrome({ children }: Props) {
  const router = useRouter();
  const { open, activeHref } = useWorkbenchTabs();
  const { light, toggle: toggleTheme } = useUiTheme();
  const { displayName, employeeNo, tenantName, onLogout } = useShellSession();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_KEY) === '1';
  });
  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const onSelect = useCallback(
    (node: MenuNode) => {
      if (node.href) open(node.href, `nav: ${node.label}`);
    },
    [open],
  );

  const onSearch = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
  }, []);

  return (
    // relative z-10：壓在全域 NxAppBackdrop（z-0）之上；bg-background 不透明蓋滿
    <div className="relative z-10 flex h-dvh flex-col bg-background text-foreground">
      <WorkbenchTopBar
        tenantName={tenantName}
        displayName={displayName}
        employeeNo={employeeNo}
        light={light}
        onToggleSidebar={toggleSidebar}
        onToggleTheme={toggleTheme}
        onSearch={onSearch}
        onHome={() => open('/dashboard', 'nav: 首頁')}
        onNavigate={(href) => router.push(href)}
        onLogout={onLogout}
      />
      <div className="flex min-h-0 flex-1">
        <WorkbenchSidebar
          collapsed={collapsed}
          items={BUSINESS_MENUS}
          activeHref={activeHref}
          onSelect={onSelect}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkbenchTabStrip />
          {/* flex 撐高容器：填滿視窗高度的主檔頁正常撐開，內容過高才捲動 */}
          <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-background px-4 py-4">
            {children}
            <AutoPageGuide />
          </main>
        </div>
      </div>
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
            <WorkbenchChrome>{children}</WorkbenchChrome>
          </WorkbenchTabsProvider>
        </PageGuideProvider>
      </DashboardBulletinProvider>
    </DashboardPaletteProvider>
  );
}
