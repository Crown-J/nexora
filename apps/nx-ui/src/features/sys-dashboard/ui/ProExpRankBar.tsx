/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-022-F01
 * PRO 首頁區塊一：圓頭像＋勳章角標、稱號／等級、金色經驗條、排位 Modal
 */

'use client';

import { useState } from 'react';
import { Award } from 'lucide-react';
import { mockNx10 } from '@/mocks/dashboard';
import { MedalModal } from '@/components/dashboard/ExpBar/MedalModal';
import { cx } from '@/shared/lib/cx';

type Props = {
  className?: string;
};

export function ProExpRankBar({ className }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const {
    avatarInitial,
    medalName,
    medalRank,
    currentLevel,
    currentExp,
    nextLevelExp,
  } = mockNx10;
  const pct = Math.min(100, Math.round((currentExp / nextLevelExp) * 100));
  const need = nextLevelExp - currentExp;

  return (
    <>
      <div
        className={cx(
          'nx-dash-card flex flex-wrap items-center gap-3 p-3 sm:gap-4 sm:p-4',
          className,
        )}
      >
        <div className="relative shrink-0">
          <div
            className={cx(
              'flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/35',
              'bg-gradient-to-br from-amber-100/90 to-amber-200/40 text-base font-bold text-amber-950',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:from-amber-900/50 dark:to-amber-950/40 dark:text-amber-50',
            )}
          >
            {avatarInitial}
          </div>
          <span
            className={cx(
              'absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full',
              'border-2 border-background bg-gradient-to-br from-[#E8A020] to-[#F5C842] text-amber-950 shadow-sm',
            )}
            aria-hidden
          >
            <Award className="h-3 w-3" strokeWidth={2.2} />
          </span>
        </div>

        <div className="flex min-w-[8rem] shrink-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">{medalName}</span>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              Lv.{currentLevel}
            </span>
          </div>
        </div>

        <div className="min-w-0 w-full flex-[1_1_220px] sm:w-auto">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div
              className={cx(
                'relative h-2.5 min-w-0 w-full overflow-hidden rounded-full',
                'bg-gradient-to-r from-amber-200/35 via-amber-100/25 to-amber-200/30',
                'shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] dark:from-amber-900/40 dark:via-amber-950/30 dark:to-amber-900/35',
              )}
            >
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #E8A020 0%, #F5C842 55%, #E8A020 100%)',
                }}
              />
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[11px] tabular-nums sm:text-xs">
              <span className="font-medium text-foreground">
                {currentExp.toLocaleString()} / {nextLevelExp.toLocaleString()}
              </span>
              <span className="text-muted-foreground">還需 {need.toLocaleString()} 經驗值</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cx(
            'ml-auto shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold',
            'text-amber-950 transition hover:border-amber-500/60 hover:bg-amber-500/15 dark:text-amber-50 sm:px-3.5 sm:py-2 sm:text-sm',
          )}
        >
          排位 · {medalRank}
        </button>
      </div>
      <MedalModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
