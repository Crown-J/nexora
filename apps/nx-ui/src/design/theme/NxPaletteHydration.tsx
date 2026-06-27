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
      raw && VALID.has(raw) ? (raw as DashboardPalette) : 'steel';
    document.documentElement.setAttribute('data-nx-palette', v);
  }, []);

  return null;
}
