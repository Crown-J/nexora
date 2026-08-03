// apps/nx-ui/src/design/layout/v3/v3-menu-context.tsx
//
// 九宮格開關的共享入口。
//
// ⚠️ 為什麼要這支：外殼（V3Shell）握著九宮格的開關狀態，但執行長 2026-08-03 要求
//    小行星「要跟卡片搭配、不然很突兀」——星球得長在工作檯的卡片牆裡，
//    而卡片牆是另一個元件。與其把狀態往上搬或往下傳，開一個 context 最小。
//
// 其他頁面沒有卡片牆，外殼仍然自己畫一顆浮在左上角的星球（唯一的滑鼠入口）。

'use client';

import { createContext, useContext } from 'react';

export type V3MenuCtx = { openMenu: () => void };

const Ctx = createContext<V3MenuCtx | null>(null);

export const V3MenuProvider = Ctx.Provider;

/** 拿不到 context 就回 null——⛔ 不丟例外，讓元件自己決定要不要畫入口 */
export function useV3Menu(): V3MenuCtx | null {
  return useContext(Ctx);
}
