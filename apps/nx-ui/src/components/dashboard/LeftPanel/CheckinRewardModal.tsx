/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-011-F01
 * 簽到獎勵：遊戲化 7 日格＋額外里程碑（深色黃框／反應爐金）
 */

'use client';

import { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import {
  mockCheckinMilestones,
  mockCheckinWeekRewards,
} from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

type Props = { open: boolean; onClose: () => void; streakDays: number };

export function CheckinRewardModal({ open, onClose, streakDays }: Props) {
  const [weekPage, setWeekPage] = useState(0);
  if (!open) return null;

  const weekLabel = weekPage === 0 ? '第 1 週（第 1–7 天）' : `第 ${weekPage + 1} 週（Mock）`;
  const isClaimed = (day: number) =>
    streakDays >= 7 ? true : day <= Math.min(streakDays, 7);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div
        className={cx(
          'relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl',
          'border-border bg-card text-card-foreground',
          'dark:border-primary/45 dark:bg-gradient-to-b dark:from-[#0e0e12] dark:to-[#14141a] dark:text-[#e8eaed]',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-reward-title"
      >
        <div
          className={cx(
            'flex items-start justify-between gap-2 border-b px-4 py-3',
            'border-border dark:border-primary/30',
          )}
        >
          <div>
            <h2
              id="checkin-reward-title"
              className={cx(
                'flex items-center gap-2 text-sm font-bold sm:text-base',
                'text-foreground dark:text-[#fff8e6]',
              )}
            >
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              簽到獎勵
            </h2>
            <p className="mt-1 text-[10px] text-muted-foreground dark:text-slate-400 sm:text-xs">
              目前連續簽到 {streakDays} 天（Mock）
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold',
                'border-primary/45 bg-primary/12 text-primary',
                'dark:border-primary/55 dark:bg-primary/18 dark:text-[#ffe9a8]',
              )}
            >
              <Flame className="h-3.5 w-3.5" aria-hidden />
              連續 {streakDays} 天
            </span>
            <button
              type="button"
              onClick={onClose}
              className={cx(
                'rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground',
                'dark:hover:bg-white/10 dark:hover:text-white',
              )}
              aria-label="關閉"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={weekPage <= 0}
              onClick={() => setWeekPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-border p-1 text-muted-foreground transition enabled:hover:bg-secondary disabled:opacity-30 dark:border-white/15 dark:enabled:hover:bg-white/10"
              aria-label="上一週"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-center text-[11px] font-medium text-muted-foreground dark:text-slate-300 sm:text-xs">
              {weekLabel}
            </span>
            <button
              type="button"
              disabled={weekPage >= 1}
              onClick={() => setWeekPage((p) => p + 1)}
              className="rounded-lg border border-border p-1 text-muted-foreground transition enabled:hover:bg-secondary disabled:opacity-30 dark:border-white/15 dark:enabled:hover:bg-white/10"
              aria-label="下一週"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {mockCheckinWeekRewards.map((cell) => {
              const claimed = isClaimed(cell.day);
              const isJackpot = cell.day === 7;
              return (
                <div
                  key={cell.day}
                  className={cx(
                    'relative flex min-h-[4.5rem] flex-col items-center justify-between rounded-lg border px-0.5 py-1.5 text-center sm:min-h-[5.25rem] sm:py-2',
                    isJackpot && claimed
                      ? 'border-primary/55 bg-gradient-to-b from-primary/28 to-primary/10 shadow-[0_0_16px_rgba(234,179,8,0.22)] dark:border-primary/70 dark:from-[#3d2f08] dark:to-[#1a1408] dark:shadow-[0_0_22px_rgba(255,184,0,0.28)]'
                      : claimed
                        ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/8 dark:border-emerald-500/35 dark:bg-emerald-950/40'
                        : 'border-border/80 bg-muted/30 dark:border-white/10 dark:bg-black/35',
                  )}
                >
                  {claimed ? (
                    <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-success)] text-[9px] text-white dark:bg-emerald-500">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                  <span className="text-[9px] font-medium text-muted-foreground dark:text-slate-400">
                    第{cell.day}天
                  </span>
                  {isJackpot ? (
                    <Trophy
                      className={cx(
                        'h-5 w-5 sm:h-6 sm:w-6',
                        claimed ? 'text-primary' : 'text-muted-foreground opacity-40',
                      )}
                      aria-hidden
                    />
                  ) : (
                    <Star
                      className={cx(
                        'h-4 w-4 sm:h-5 sm:w-5',
                        claimed ? 'text-primary' : 'text-muted-foreground opacity-40',
                      )}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cx(
                      'text-[9px] font-bold tabular-nums sm:text-[10px]',
                      claimed ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    +{cell.xp} XP
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-foreground dark:text-[#fff8e6] sm:text-xs">
              <Star className="h-3.5 w-3.5 text-primary" aria-hidden />
              額外獎勵
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {mockCheckinMilestones.map((m) => {
                const done = streakDays >= m.days;
                const partial = !done && m.days === 14 && streakDays > 0;
                const pct = partial ? Math.min(100, Math.round((streakDays / 14) * 100)) : done ? 100 : 0;
                return (
                  <div
                    key={m.days}
                    className={cx(
                      'relative flex flex-col rounded-xl border p-2 text-center',
                      done
                        ? 'border-[var(--color-success)]/45 bg-[var(--color-success)]/10 dark:border-emerald-500/40 dark:bg-emerald-950/35'
                        : 'border-border/80 bg-muted/25 opacity-90 dark:border-white/10 dark:bg-black/30 dark:opacity-100',
                    )}
                  >
                    {done ? (
                      <span className="absolute right-1 top-1 text-[var(--color-success)] dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    ) : null}
                    <span className="text-[10px] font-semibold text-foreground dark:text-slate-200">{m.label}</span>
                    <span className="mt-1 text-[9px] text-muted-foreground dark:text-slate-500">{m.days} 日</span>
                    <div className="mt-2 text-[10px] font-bold text-primary">+{m.xp} XP</div>
                    {partial ? (
                      <div className="nx-goal-bar-track mt-2 w-full">
                        <div className="nx-goal-bar-fill transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    ) : null}
                    {!done && !partial ? (
                      <div className="mt-2 text-[9px] text-muted-foreground dark:text-slate-500">未達成</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
