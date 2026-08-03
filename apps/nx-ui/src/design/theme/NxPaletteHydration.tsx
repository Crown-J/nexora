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
    // ⭐ 2026-08-03 執行長要看鋼鐵星球「原本的樣子」：steel 改走深色。
    //    理由：純黑底＋鐵灰卡＋金色發光（--nx-glow-primary）全部掛在 html:not(.light) 底下，
    //    寫死 light 的話那些東西一個都出不來，淺色版只是把藍換成橘而已。
    // ⚠️ 代價：最近一個月做的頁面都是在淺色下驗收的，深色下會有零星地方對比不足。
    //    ⛔ 回退只要把下面兩行換回無條件 add('light')。
    const dark = v === 'steel';
    document.documentElement.classList.toggle('light', !dark);
  }, []);

  return null;
}
