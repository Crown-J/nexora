/**
 * 首屏還原 data-nx-palette（與 Dashboard 內切換共用 localStorage），減少主題閃爍
 */

'use client';

import { useLayoutEffect } from 'react';
import {
  readPaletteAfterRetiringPro,
  type DashboardPalette,
} from '@/features/nx00/context/DashboardPaletteContext';

const VALID = new Set(['classic', 'steel', 'pro']);

export function NxPaletteHydration() {
  useLayoutEffect(() => {
    // ⭐ 2026-08-03 執行長拍板：預設改回 steel（鋼鐵星球）。與 DashboardPaletteContext 同步
    // ⚠️ 舊瀏覽器存著的 'pro' 會蓋過預設值，所以走同一支汰換函式清掉它
    const raw = readPaletteAfterRetiringPro();
    const v: DashboardPalette =
      raw && VALID.has(raw) ? (raw as DashboardPalette) : 'steel';
    document.documentElement.setAttribute('data-nx-palette', v);
    // 2026-06-28 統一墨藍×銀×白主題：不再分深淺、一律 light（native 控制項面板淺色 + 淺色 utility 規則）
    document.documentElement.classList.add('light');
  }, []);

  return null;
}
