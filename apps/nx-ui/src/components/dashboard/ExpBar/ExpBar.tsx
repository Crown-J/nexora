/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-009-F01
 * PRO 限定 EXP BAR：綠色流動經驗條＋放大頭像／勳章入口（與主題 primary 分離）
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
  const initial = userName.slice(0, 1);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-border/80 bg-card/50 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        <div
          className={cx(
            'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border',
            'bg-secondary text-sm font-semibold text-foreground tabular-nums',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]',
          )}
        >
          {initial}
          <span
            className={cx(
              'absolute -bottom-0.5 -right-0.5 rounded border border-border bg-card px-1 py-px',
              'text-[9px] font-bold tabular-nums text-primary shadow-sm',
            )}
          >
            {currentLevel}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">{medalName}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
              Lv.{currentLevel}
            </span>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2.5">
            <div
              className={cx(
                'relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted',
                'shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]',
              )}
            >
              <div
                className={cx(
                  'nx-exp-bar-fill absolute inset-y-0 left-0 overflow-hidden rounded-full',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:text-xs">
              {currentExp.toLocaleString()} / {nextLevelExp.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-[10px] tracking-wide text-muted-foreground sm:text-xs">
            還需 {need.toLocaleString()} 經驗值升級
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cx(
            'shrink-0 rounded-lg border border-border bg-secondary/90 px-3 py-2 text-xs font-semibold',
            'text-foreground transition sm:px-3.5 sm:py-2 sm:text-sm',
            'hover:border-primary/35 hover:bg-secondary',
          )}
        >
          勳章 · {medalRank}
        </button>
      </div>
      <MedalModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
