// apps/nx-ui/src/design/layout/v3/V3TopBar.tsx
//
// v3.0.0 唯一常駐橫列（階段 1 Step 3；2026-08-01 拿掉分頁層；2026-08-03 右上三顆搬進九宮格）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2 §6
//
//   ☰ │ 工作檯 │
//
// ⭐ 2026-08-03 執行長拍板「畫面要乾淨」：右上角 🔔 👤 ⚙ 三顆全部收進九宮格的數字鍵盤——
//    ＋＝任務／通知、.＝資訊（個人資訊含登出）、−＝設定。
//    ⚠️ 登出的唯一入口因此變成「F2 → . → 1」，⛔ 不可再被拿掉（見 NineGrid 的 ProfilePanel）。
// ⛔ 左邊兩顆刻意留著：☰ 是滑鼠使用者唯一的入口、工作檯是一鍵回家。
//    規格 §6 明訂「滑過才出現的按鈕一律要有常駐替代」，全部藏起來會違規。
//
// ⛔ 沒有選單列。熟手只記快捷鍵（恆迎用偉盟 30 年、至今不知功能在哪一組），
//    選單是備援不是導覽，不該常駐佔畫面。功能全部走 ☰ 或九宮格快捷鍵。
// ⛔ 沒有狀態列。租戶／使用者／工號收進九宮格的「. 資訊 → 1 個人資訊」，不另佔一條。
// ⛔ 沒有分頁列（執行長 2026-08-01 拍板拿掉）：開久了會越堆越長、實際不好用。
//    ⚠️ 這一條與規格 v1.1 §2／§2.1 相衝——規格說「常駐兩條、其中一條是分頁列」，
//       且 §2.1「不用彈跳視窗」的理由正是「不離開當前情境由分頁接手」。
//       分頁拿掉後那個理由不成立了，規格待執行長裁示後改版。
//
// 字級 15px（規格 §6 內文 15-16px 起跳）。⛔ 禁動畫（規格 §6）：不加 transition。

'use client';

import { Home, LayoutGrid } from 'lucide-react';

export type V3TopBarProps = {
  /** 點 ☰ 開九宮格 */
  onOpenMenu: () => void;
  /** 回工作檯 */
  onGoHome: () => void;
};

export function V3TopBar({ onOpenMenu, onGoHome }: V3TopBarProps) {
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

      {/* 回工作檯。滑鼠使用者的一鍵回家；鍵盤走 F2 → 0（第一層的 0 就是回首頁）*/}
      <button
        type="button"
        onClick={onGoHome}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[15px] hover:bg-accent"
      >
        <Home className="h-4 w-4" />
        工作檯
      </button>
    </div>
  );
}
