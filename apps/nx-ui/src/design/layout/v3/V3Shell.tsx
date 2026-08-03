// apps/nx-ui/src/design/layout/v3/V3Shell.tsx
//
// v3.0.0 外殼（階段 1 Step 3）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2
//
// 與舊 WorkbenchShell 的差異：
//   ⛔ 移除頂部選單列（TopMenuBar）——功能改走九宮格
//   ⛔ 移除底部狀態列（WorkbenchStatusBar）——租戶/使用者/工號收進右上角 👤
//   ⛔ 移除分頁列（執行長 2026-08-01 拍板）——開久了越堆越長、實際不好用；
//      改成直接換頁。⚠️ 這與規格 v1.1 §2／§2.1 相衝，規格待改版（見 V3TopBar 檔頭）
//   ＝ 常駐只剩一條橫列，工作區多拿回兩條的高度（1366×768 的筆電差很多）
//
// WorkbenchTabsContext 封存不刪——舊 WorkbenchShell 還在用，回退才有得換。
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
  WorkbenchToolbarSlotProvider,
  useWorkbenchToolbarSlot,
} from '@design/layout/workbench/WorkbenchToolbarSlot';
import { NineGrid } from '@design/navigation/NineGrid';
// ⭐ 鋼鐵星球的小行星本體（軌道動畫）。封存的 Dock 裡撈回來、⛔ 沒有重畫一顆
import { PlanetOrbTrigger } from '@design/home/Dock';

// ⚠️ V3TopBar 2026-08-03 起不再掛上（執行長拍板拿掉常駐橫列）。
//    檔案封存不刪——回退時把 import 與 <V3TopBar …/> 兩行加回來即可。

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
  const router = useRouter();
  const { displayName, employeeNo, tenantName, onLogout } = useShellSession();
  const toolbarSlot = useWorkbenchToolbarSlot();

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
    // ⭐ 2026-08-03：拿掉 bg-background，讓全域 NxAppBackdrop 的星空／極光透上來。
    //    ⛔ 原本這裡是不透明底、把背景整片蓋掉，鋼鐵星球等於只剩配色。
    <div className="relative z-10 flex h-dvh flex-col text-foreground">
      {/* ⭐ 2026-08-03 執行長拍板：常駐橫列整條移除，畫面上⛔ 沒有任何常駐 chrome。
          導覽全部走 F2 九宮格。V3TopBar.tsx 封存不刪——要回退只要把這裡加回一行。 */}

      {/* ⭐ 小行星＝滑鼠使用者的九宮格入口（執行長 2026-08-03 指定固定左上角）。
          鍵盤走 F2、滑鼠點這顆，兩條路同一個面板。
          ⛔ 不做成一整條橫列——它只佔一顆按鈕的位置。 */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        title="功能選單（F2）"
        aria-label="功能選單"
        className="fixed left-3 top-3 z-[150] grid h-12 w-12 place-items-center rounded-full border border-primary/40 bg-card/70 backdrop-blur hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <PlanetOrbTrigger />
      </button>

      {/* 情境工具列插槽：頁面自帶的操作列投影至此；無工具列的頁面自動收合 */}
      <div ref={toolbarSlot?.setSlotEl} className={toolbarSlot?.count ? '' : 'hidden'} />

      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        {children}
        <AutoPageGuide />
      </main>

      <NineGrid
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        // 第一層按 0＝退到底：關掉九宮格、回工作檯（執行長 2026-08-03）
        onHome={() => {
          setMenuOpen(false);
          router.push('/dashboard');
        }}
        // 頂欄「使用者」搬進來：資訊 → 1 個人資訊，⭐ 登出的唯一入口
        session={{ displayName, employeeNo, tenantName, onLogout }}
        onPick={(t) => {
          if (t.station) {
            window.dispatchEvent(
              new CustomEvent(OPEN_STATION_EVENT, { detail: { no: t.station } }),
            );
            return;
          }
          // 分頁層拿掉後（執行長 2026-08-01）改直接換頁
          if (t.href) router.push(t.href);
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
          {/* ⚠️ 這是連線失敗畫面——出事的時候更要看得清楚。
              原本品牌字 12px、內文用灰字，兩者都違反 §6。 */}
          <div className="nx-hint tracking-[0.35em]">NEXORA</div>
          <div className="nx-t-sec mt-2">連線異常</div>
          <div className="nx-body mt-2 leading-relaxed">{view.errorMsg}</div>
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
          <WorkbenchToolbarSlotProvider>
            <V3Chrome>{children}</V3Chrome>
          </WorkbenchToolbarSlotProvider>
        </PageGuideProvider>
      </DashboardBulletinProvider>
    </DashboardPaletteProvider>
  );
}
