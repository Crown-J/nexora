/**
 * File: apps/nx-ui/src/app/dashboard/master/page.tsx
 *
 * [1-1] 2026-06-05：主檔中心 hub 頁已移除（NX-MANUAL-02 v2.0 對齊）。
 *
 * 為什麼：左上星球選單（Alt+X）已能直接到任何主檔、不再需要中間 hub 頁
 * 的 6 區卡片牆 / 版本鎖徽章 / 升級提示 Dialog。
 *
 * 行為：訪問 /dashboard/master 自動 redirect 回首頁、進主檔走星球選單。
 * dock 內的「主檔」項仍可用（NavPlanetMenu contextual trigger 展開 25 主檔）。
 */

import { redirect } from 'next/navigation';

export default function BaseDashboardPage(): never {
  redirect('/dashboard');
}
