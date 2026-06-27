/**
 * 首屏還原 data-nx-palette（與 Dashboard 內切換共用 localStorage），減少主題閃爍
 */

'use client';

import { useLayoutEffect } from 'react';
import {
  NX_DASHBOARD_PALETTE_STORAGE_KEY,
  type DashboardPalette,
} from '@/features/nx00/context/DashboardPaletteContext';

const VALID = new Set(['classic', 'steel', 'pro']);

export function NxPaletteHydration() {
  useLayoutEffect(() => {
    const raw = window.localStorage.getItem(NX_DASHBOARD_PALETTE_STORAGE_KEY);
    const v: DashboardPalette =
      raw && VALID.has(raw) ? (raw as DashboardPalette) : 'pro';
    document.documentElement.setAttribute('data-nx-palette', v);
    // 2026-06-28 統一墨藍×銀×白主題：不再分深淺、一律 light（native 控制項面板淺色 + 淺色 utility 規則）
    document.documentElement.classList.add('light');
  }, []);

  return null;
}
