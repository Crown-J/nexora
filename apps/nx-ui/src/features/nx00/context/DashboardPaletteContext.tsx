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

export type DashboardPalette = 'classic' | 'steel';

const VALID: ReadonlySet<string> = new Set(['classic', 'steel']);

function readStoredPalette(): DashboardPalette {
  if (typeof window === 'undefined') return 'steel';
  const raw = window.localStorage.getItem(NX_DASHBOARD_PALETTE_STORAGE_KEY);
  if (raw && VALID.has(raw)) return raw as DashboardPalette;
  return 'steel';
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
