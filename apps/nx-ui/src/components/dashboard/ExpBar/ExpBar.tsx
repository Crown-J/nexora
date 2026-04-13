/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-009-F01
 * PRO 限定 EXP BAR
 */

'use client';

import { useState } from 'react';
import { mockExpData } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';
import { MedalModal } from '@/components/dashboard/ExpBar/MedalModal';

export function ExpBar() {
  const [modalOpen, setModalOpen] = useState(false);
  const { currentLevel, currentExp, nextLevelExp, medalName, medalRank, userName } =
    mockExpData;
  const pct = Math.min(100, Math.round((currentExp / nextLevelExp) * 100));
  const need = nextLevelExp - currentExp;

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border/60 bg-gradient-to-r from-primary/10 via-card/80 to-card/40 px-4 py-3 backdrop-blur-sm">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#e8a020] bg-secondary text-sm font-bold text-foreground">
          {userName.slice(0, 1)}
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#e8a020] text-[10px] font-bold text-primary-foreground">
            {currentLevel}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {medalName} Lv.{currentLevel} <span className="text-[#e8a020]">★★★</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-2.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#e8a020] to-[#f5c842]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {currentExp.toLocaleString()} / {nextLevelExp.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            還需 {need.toLocaleString()} 經驗值升級
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cx(
            'shrink-0 rounded-xl border-2 border-[#e8a020]/70 bg-primary/10 px-4 py-2 text-xs font-semibold',
            'text-primary hover:bg-primary/15',
          )}
        >
          金牌 {medalRank}
        </button>
      </div>
      <MedalModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
