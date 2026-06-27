// apps/nx-ui/src/design/layout/workbench/WorkbenchToolbarSlot.tsx
// 情境工具列插槽（執行長 2026-06-28 六層介面：工具列獨立成「選單列下方、內容分頁上方」一層）。
// - 外殼第 2 層放一個插槽 div；ToolbarSlotProvider 持有其 DOM 與「目前有幾個工具列掛著」計數
// - 頁面的 ErpToolbar 用 ToolbarPortal 把自己投影到插槽（DOM 換位、React tree 不動、狀態完全保留）
// - 無工具列頁面 → count=0 → 外殼把插槽收合
// - 無 Provider（非 workbench 場景）→ ToolbarPortal 退回原地 inline 渲染（向後相容）

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type ToolbarSlotValue = {
  slotEl: HTMLElement | null;
  setSlotEl: (el: HTMLElement | null) => void;
  /** 目前掛在插槽的工具列數（外殼用來決定收合） */
  count: number;
  /** 掛載時 +1、卸載時 -1；回傳 cleanup */
  register: () => () => void;
};

const Ctx = createContext<ToolbarSlotValue | null>(null);

export function WorkbenchToolbarSlotProvider({ children }: { children: ReactNode }) {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => Math.max(0, c - 1));
  }, []);
  const value = useMemo(
    () => ({ slotEl, setSlotEl, count, register }),
    [slotEl, count, register],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 外殼用：取插槽 ref setter 與計數 */
export function useWorkbenchToolbarSlot() {
  return useContext(Ctx);
}

/** 頁面工具列包這個 → 投影到外殼第 2 層插槽 */
export function ToolbarPortal({ children }: { children: ReactNode }) {
  const ctx = useContext(Ctx);
  const register = ctx?.register;

  useEffect(() => {
    if (!register) return;
    return register();
  }, [register]);

  // 無 Provider（非 workbench）→ 原地 inline，維持舊行為
  if (!ctx) return <>{children}</>;
  // 在 workbench 內但插槽尚未就緒 → 先不渲染（避免閃一下原位）
  if (!ctx.slotEl) return null;
  return createPortal(children, ctx.slotEl);
}
