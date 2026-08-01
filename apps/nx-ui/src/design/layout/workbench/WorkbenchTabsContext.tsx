// apps/nx-ui/src/design/layout/workbench/WorkbenchTabsContext.tsx
// 傳統 ERP 外殼：分頁文件式工作區的「已開啟分頁」狀態（路由驅動）。
// - 點選單／進頁 → 自動把該功能加入分頁列；目前路由 = 作用中分頁
// - 明細頁（/.../[id]）對映到其清單分頁（取最長前綴），避免分頁爆量
// - sessionStorage 持久，重整保留已開分頁
// 分頁標籤來源：DOCK_NAV（與小星球 Dock 同一導覽單一來源）攤平

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
import { usePathname, useRouter } from 'next/navigation';
import { tryNavigate } from '@design/hooks/useDirtyGuard';
import { DOCK_NAV, type DockItem } from '@data/home/home-data';
import { ROLES, type GridCell } from '@design/navigation/role-registry';
import { MENU_BAR, type MenuNode } from './menu-data';

export type WorkbenchTab = { href: string; label: string };

export const HOME_HREF = '/dashboard';
const STORAGE_KEY = 'nx-workbench-tabs';

// href → label：攤平 DOCK_NAV 樹
function buildLabelMap(): Record<string, string> {
  const map: Record<string, string> = { [HOME_HREF]: '首頁' };
  const walk = (items: DockItem[]) => {
    for (const it of items) {
      if (it.href) map[it.href] = it.label;
      if (it.sub) walk(it.sub);
    }
  };
  walk(DOCK_NAV);
  // 新選單登錄表（權威來源）後跑、覆蓋 DOCK_NAV，補上新路由標籤（如 權限設定/權限等級）
  const walkMenu = (items: MenuNode[]) => {
    for (const it of items) {
      if (it.href) map[it.href] = it.label;
      if (it.children) walkMenu(it.children);
    }
  };
  walkMenu(MENU_BAR);
  // v3.0.0 九宮格登錄表最後跑＝最權威：九宮格開的頁面要用九宮格上的名字當分頁標籤，
  // 否則使用者按「查價查貨」開出來的分頁會叫成舊選單的「零件即時查詢」。
  const walkCells = (cells: GridCell[]) => {
    for (const c of cells) {
      if (c.href) map[c.href] = c.label;
      if (c.children) walkCells(c.children);
    }
  };
  for (const r of ROLES) walkCells(r.cells);
  return map;
}
const LABEL_MAP = buildLabelMap();

/** 把任意路由解析成一個分頁（明細頁歸到其清單分頁） */
export function resolveTab(pathname: string): WorkbenchTab {
  if (pathname === HOME_HREF) return { href: HOME_HREF, label: '首頁' };
  if (LABEL_MAP[pathname]) return { href: pathname, label: LABEL_MAP[pathname] };
  let best = '';
  for (const k of Object.keys(LABEL_MAP)) {
    if (k !== HOME_HREF && pathname.startsWith(k) && k.length > best.length) best = k;
  }
  if (best) return { href: best, label: LABEL_MAP[best] };
  const seg = pathname.split('/').filter(Boolean).pop() ?? '';
  return { href: pathname, label: seg || '頁面' };
}

type WorkbenchTabsValue = {
  /** 動態分頁（不含首頁；首頁固定釘在分頁列最前） */
  tabs: WorkbenchTab[];
  activeHref: string;
  open: (href: string, reason?: string) => void;
  close: (href: string) => void;
  closeAll: () => void;
};

const Ctx = createContext<WorkbenchTabsValue | null>(null);

function loadStored(): WorkbenchTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as WorkbenchTab[];
    return Array.isArray(arr) ? arr.filter((t) => t?.href && t?.label) : [];
  } catch {
    return [];
  }
}

export function WorkbenchTabsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? HOME_HREF;
  const [tabs, setTabs] = useState<WorkbenchTab[]>(() => loadStored());

  const active = useMemo(() => resolveTab(pathname), [pathname]);

  // 目前路由若不在分頁列且非首頁 → 自動補一個分頁
  useEffect(() => {
    if (active.href === HOME_HREF) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 路由變更同步分頁列、非 cascade
    setTabs((prev) => (prev.some((t) => t.href === active.href) ? prev : [...prev, active]));
  }, [active]);

  // 持久化
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      /* ignore */
    }
  }, [tabs]);

  const open = useCallback(
    (href: string, reason?: string) => {
      tryNavigate(() => router.push(href), reason ?? `workbench: 開啟分頁 → ${href}`);
    },
    [router],
  );

  const close = useCallback(
    (href: string) => {
      // 先算剩餘分頁（純）、再 setState；跳頁（副作用）放在更新函式外、避免「render 中改 Router」
      const remaining = tabs.filter((t) => t.href !== href);
      setTabs(remaining);
      if (href === active.href) {
        const fallback = remaining.length ? remaining[remaining.length - 1].href : HOME_HREF;
        tryNavigate(() => router.push(fallback), 'workbench: 關閉分頁後切換');
      }
    },
    [tabs, active.href, router],
  );

  const closeAll = useCallback(() => {
    setTabs([]);
    tryNavigate(() => router.push(HOME_HREF), 'workbench: 全部關閉');
  }, [router]);

  const value = useMemo(
    () => ({ tabs, activeHref: active.href, open, close, closeAll }),
    [tabs, active.href, open, close, closeAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkbenchTabs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkbenchTabs must be used within WorkbenchTabsProvider');
  return ctx;
}
