// apps/nx-ui/src/features/shared/tiered-form/TieredFormProvider.tsx
// LITE 階段 1 M5：漸進式三層欄位框架 Provider（context + Alt+L 鍵盤）

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { TieredDisplayMode } from './types';

export type TieredFormContextValue = {
  mode: TieredDisplayMode;
  setMode: (mode: TieredDisplayMode) => void;
  /** Alt+L 三段循環：lite → expanded → all → lite */
  cycleMode: () => void;
  /** 是否顯示 advanced 欄位（mode='all'） */
  isAdvancedVisible: boolean;
  /** 是否展開 recommended 欄位（mode='expanded' 或 'all'） */
  isRecommendedExpanded: boolean;
};

const TieredFormContext = createContext<TieredFormContextValue | null>(null);

const MODE_CYCLE: TieredDisplayMode[] = ['lite', 'expanded', 'all'];

export type TieredFormProviderProps = {
  children: ReactNode;
  /** 預設模式、LITE 預設值 'lite' */
  defaultMode?: TieredDisplayMode;
  /** 是否啟用 Alt+L 鍵盤切換（預設 true） */
  enableKeyboard?: boolean;
};

export function TieredFormProvider({
  children,
  defaultMode = 'lite',
  enableKeyboard = true,
}: TieredFormProviderProps) {
  const [mode, setMode] = useState<TieredDisplayMode>(defaultMode);

  const cycleMode = useCallback(() => {
    setMode((m) => {
      const idx = MODE_CYCLE.indexOf(m);
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
      return next;
    });
  }, []);

  // Alt+L 鍵盤監聽（對齊 NX01 既有鍵盤範式）
  useEffect(() => {
    if (!enableKeyboard) return;
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key !== 'l' && e.key !== 'L') return;
      // 排除 input/textarea 內按 Alt+L（避免衝突）
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
      cycleMode();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableKeyboard, cycleMode]);

  const value: TieredFormContextValue = useMemo(
    () => ({
      mode,
      setMode,
      cycleMode,
      isAdvancedVisible: mode === 'all',
      isRecommendedExpanded: mode === 'expanded' || mode === 'all',
    }),
    [mode, cycleMode],
  );

  return <TieredFormContext.Provider value={value}>{children}</TieredFormContext.Provider>;
}

export function useTieredForm(): TieredFormContextValue {
  const ctx = useContext(TieredFormContext);
  if (!ctx) {
    throw new Error('useTieredForm() must be used inside <TieredFormProvider>');
  }
  return ctx;
}

/** 安全版：沒在 Provider 內也不 throw、回傳 null */
export function useTieredFormSafe(): TieredFormContextValue | null {
  return useContext(TieredFormContext);
}
