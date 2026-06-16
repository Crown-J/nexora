/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-013-F01
 */

'use client';

import { useMemo, useState } from 'react';
import { mockDailyGoals } from '@data/mocks/dashboard';
import { cx } from '@design/utils/cx';

type Goal = (typeof mockDailyGoals)[number] & { done: boolean };

export function DailyGoalCard() {
  const [goals, setGoals] = useState<Goal[]>(() =>
    mockDailyGoals.map((g) => ({ ...g, done: g.done })),
  );

  const { earned, totalXp } = useMemo(() => {
    const earnedXp = goals.filter((g) => g.done).reduce((s, g) => s + g.xp, 0);
    const maxXp = goals.reduce((s, g) => s + g.xp, 0);
    return { earned: earnedXp, totalXp: maxXp };
  }, [goals]);

  const doneCount = goals.filter((g) => g.done).length;
  const donePct = goals.length ? Math.round((doneCount / goals.length) * 100) : 0;

  const toggle = (id: string) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  };

  return (
    <div className="nx-dash-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-600/50" />
          <span className="text-sm font-semibold text-foreground">本日目標</span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {earned} / {totalXp} XP
        </span>
      </div>
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>完成度</span>
          <span className="tabular-nums font-medium text-foreground">{donePct}%</span>
        </div>
        <div className="nx-goal-bar-track w-full">
          <div className="nx-goal-bar-fill transition-all" style={{ width: `${donePct}%` }} />
        </div>
      </div>
      <ul className="space-y-2">
        {goals.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => toggle(g.id)}
              className={cx(
                'flex w-full items-start gap-2 rounded-lg border border-transparent px-1 py-1 text-left text-sm transition hover:border-border/40 hover:bg-secondary/30',
                g.done && 'opacity-70',
              )}
            >
              <span
                className={cx(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]',
                  g.done
                    ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                    : 'border-border',
                )}
              >
                {g.done ? '✓' : ''}
              </span>
              <span className={cx('min-w-0 flex-1', g.done && 'line-through')}>{g.label}</span>
              {g.time ? (
                <span className="shrink-0 text-xs text-muted-foreground">⏰{g.time}</span>
              ) : null}
              <span className="shrink-0 text-xs text-primary">+{g.xp}</span>
            </button>
            <div className="nx-goal-bar-track ml-6 mt-1 w-[calc(100%-1.5rem)]">
              <div
                className="nx-goal-bar-fill transition-all"
                style={{ width: g.done ? '100%' : '0%' }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-xs text-muted-foreground">
        已完成 {doneCount} / {goals.length} 項
      </div>
    </div>
  );
}
