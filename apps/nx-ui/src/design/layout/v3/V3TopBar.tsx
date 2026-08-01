// apps/nx-ui/src/design/layout/v3/V3TopBar.tsx
//
// v3.0.0 唯一常駐橫列（階段 1 Step 3；2026-08-01 執行長拍板拿掉分頁層）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2 §6
//
//   ☰ │ 工作檯 │                                  🔔 👤 ⚙
//
// ⛔ 沒有選單列。熟手只記快捷鍵（恆迎用偉盟 30 年、至今不知功能在哪一組），
//    選單是備援不是導覽，不該常駐佔畫面。功能全部走 ☰ 或九宮格快捷鍵。
// ⛔ 沒有狀態列。租戶／使用者／工號收進右上角 👤，不另佔一條。
// ⛔ 沒有分頁列（執行長 2026-08-01 拍板拿掉）：開久了會越堆越長、實際不好用。
//    ⚠️ 這一條與規格 v1.1 §2／§2.1 相衝——規格說「常駐兩條、其中一條是分頁列」，
//       且 §2.1「不用彈跳視窗」的理由正是「不離開當前情境由分頁接手」。
//       分頁拿掉後那個理由不成立了，規格待執行長裁示後改版。
//
// 字級 15px（規格 §6 內文 15-16px 起跳）。⛔ 禁動畫（規格 §6）：不加 transition。

'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Home, LayoutGrid, Settings, User } from 'lucide-react';

export type V3TopBarProps = {
  /** 點 ☰ 開九宮格 */
  onOpenMenu: () => void;
  /** 回工作檯 */
  onGoHome: () => void;
  /** 開設定 */
  onOpenSettings: () => void;
  tenantName: string;
  displayName: string;
  employeeNo: string;
  onLogout: () => void;
};

export function V3TopBar({
  onOpenMenu,
  onGoHome,
  onOpenSettings,
  tenantName,
  displayName,
  employeeNo,
  onLogout,
}: V3TopBarProps) {
  return (
    <div className="flex items-stretch gap-1 border-b border-border bg-background px-2 py-1">
      {/* ☰ 九宮格入口。滑鼠使用者的入口，熟手直接按 F2 不必碰它 */}
      <button
        type="button"
        onClick={onOpenMenu}
        title="功能選單"
        aria-label="功能選單"
        className="grid w-10 place-items-center rounded-md border border-border bg-card hover:bg-accent"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {/* 回工作檯。分頁拿掉後這是唯一的「回家」入口，位置固定不動 */}
      <button
        type="button"
        onClick={onGoHome}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[15px] hover:bg-accent"
      >
        <Home className="h-4 w-4" />
        工作檯
      </button>

      <div className="min-w-0 flex-1" />

      {/* 右上角三顆 */}
      <div className="flex shrink-0 items-center gap-1">
        {/* 待辦鈴鐺：階段 3 接真資料。⛔ 簽核不進九宮格，它是狀態不是功能（規格 §3.4） */}
        <button
          type="button"
          title="待辦（建置中）"
          aria-label="待辦"
          disabled
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground/50"
        >
          <Bell className="h-5 w-5" />
        </button>

        <UserMenu
          tenantName={tenantName}
          displayName={displayName}
          employeeNo={employeeNo}
          onLogout={onLogout}
        />

        <button
          type="button"
          onClick={onOpenSettings}
          title="設定"
          aria-label="設定"
          className="grid h-9 w-9 place-items-center rounded-md hover:bg-accent"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/** 使用者選單：租戶／姓名／工號＋登出。取代舊外殼被砍掉的狀態列 */
function UserMenu({
  tenantName,
  displayName,
  employeeNo,
  onLogout,
}: {
  tenantName: string;
  displayName: string;
  employeeNo: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${displayName} ${employeeNo}`}
        aria-label="使用者"
        className="grid h-9 w-9 place-items-center rounded-md hover:bg-accent"
      >
        <User className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-border bg-card p-3 shadow-lg">
          <div className="text-base">{displayName}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {employeeNo ? `工號 ${employeeNo}` : null}
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">{tenantName}</div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-md border border-border px-3 py-2 text-base hover:bg-accent"
          >
            登出
          </button>
        </div>
      ) : null}
    </div>
  );
}
