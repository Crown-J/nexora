/**
 * @FUNCTION_CODE NX99-SYS-DASH-CTX-003-F01
 * 全站配色：html data-nx-palette + localStorage（預設 steel；無 UI 切換時仍可手動改 key）
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const NX_DASHBOARD_PALETTE_STORAGE_KEY = 'nx-dashboard-palette';

export type DashboardPalette = 'classic' | 'steel' | 'pro';

const VALID: ReadonlySet<string> = new Set(['classic', 'steel', 'pro']);

function readStoredPalette(): DashboardPalette {
  // 2026-06-27 大改版：配色預設 pro 專業版（steel/classic 太空風封存）
  // ⭐ 2026-08-03 執行長拍板改回 steel（鋼鐵星球）：暖米白底＋純白卡＋金黃主色。
  //    pro 的深藏青主色暗到跟正文一樣重、失去「這裡可以動作」的指示作用。
  //    ⛔ pro / classic 兩套變數沒刪，把下面兩個 'steel' 改回去就還原。
  if (typeof window === 'undefined') return 'steel';
  const raw = readPaletteAfterRetiringPro();
  if (raw && VALID.has(raw)) return raw as DashboardPalette;
  return 'steel';
}

/**
 * 一次性汰換：舊瀏覽器裡存著的 'pro' 一律當成沒設定，並就地清掉。
 *
 * ⚠️ 為什麼要這段：配色存在瀏覽器、優先權高過程式預設，所以改預設值對
 *    「曾經開過舊版的機器」完全沒作用——執行長 2026-08-03 就是這樣看不到改版。
 * ⛔ 這裡只清 'pro'（它是被退役的舊預設，不是任何人主動選的——當時根本沒有切換 UI）。
 *    'classic' 與 'steel' 是使用者真的選過的，⛔ 不動。
 */
export function readPaletteAfterRetiringPro(): string | null {
  try {
    const raw = window.localStorage.getItem(NX_DASHBOARD_PALETTE_STORAGE_KEY);
    if (raw === 'pro') {
      window.localStorage.removeItem(NX_DASHBOARD_PALETTE_STORAGE_KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function applyPaletteToDocument(p: DashboardPalette) {
  document.documentElement.setAttribute('data-nx-palette', p);
}

type DashboardPaletteContextValue = {
  palette: DashboardPalette;
  setPalette: (p: DashboardPalette) => void;
};

const DashboardPaletteContext = createContext<DashboardPaletteContextValue | null>(null);

export function DashboardPaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<DashboardPalette>(() => readStoredPalette());

  useLayoutEffect(() => {
    applyPaletteToDocument(palette);
  }, [palette]);

  const setPalette = useCallback((p: DashboardPalette) => {
    setPaletteState(p);
    try {
      window.localStorage.setItem(NX_DASHBOARD_PALETTE_STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
    applyPaletteToDocument(p);
  }, []);

  const value = useMemo(() => ({ palette, setPalette }), [palette, setPalette]);

  return (
    <DashboardPaletteContext.Provider value={value}>{children}</DashboardPaletteContext.Provider>
  );
}

export function useDashboardPalette() {
  const ctx = useContext(DashboardPaletteContext);
  if (!ctx) {
    throw new Error('useDashboardPalette must be used within DashboardPaletteProvider');
  }
  return ctx;
}
