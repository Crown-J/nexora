/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-014-F01
 */

'use client';

import { useState } from 'react';
import { mockMonthlyKpi, type KpiScope } from '@data/mocks/dashboard';
import { cx } from '@design/utils/cx';

const tabs: { key: KpiScope; label: string }[] = [
  { key: 'company', label: '公司' },
  { key: 'team', label: '團隊' },
  { key: 'personal', label: '個人' },
];

function pct(cur: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((cur / max) * 100));
}

export function MonthlyGoalCard() {
  const [scope, setScope] = useState<KpiScope>('company');
  const k = mockMonthlyKpi[scope];
  const revP = pct(k.revenue.cur, k.revenue.max);
  const satP = pct(k.satisfaction.cur, k.satisfaction.max);
  const ncP = pct(k.newCustomers.cur, k.newCustomers.max);

  return (
    <div className="nx-dash-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-600/50" />
          <span className="text-sm font-semibold text-foreground">本月目標</span>
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setScope(t.key)}
              className={cx(
                'rounded-lg px-2 py-0.5 text-[10px] font-medium transition',
                scope === t.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-3 text-sm">
        <li>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">月營收目標</span>
            <span className="tabular-nums font-medium">
              {k.revenue.cur} / {k.revenue.max}萬 <span className="text-[var(--color-success)]">↑</span>
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="nx-goal-bar-track min-w-0 flex-1">
              <div className="nx-goal-bar-fill transition-all" style={{ width: `${revP}%` }} />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{revP}%</span>
          </div>
        </li>
        <li>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">客戶滿意度</span>
            <span className="tabular-nums font-medium">
              {k.satisfaction.cur} / {k.satisfaction.max}%{' '}
              <span className="text-[var(--color-success)]">↑</span>
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="nx-goal-bar-track min-w-0 flex-1">
              <div className="nx-goal-bar-fill transition-all" style={{ width: `${satP}%` }} />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{satP}%</span>
          </div>
        </li>
        <li>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">新客戶開發</span>
            <span className="tabular-nums font-medium">
              {k.newCustomers.cur} / {k.newCustomers.max} 家{' '}
              <span className="text-[var(--color-success)]">↑</span>
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="nx-goal-bar-track min-w-0 flex-1">
              <div className="nx-goal-bar-fill transition-all" style={{ width: `${ncP}%` }} />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{ncP}%</span>
          </div>
        </li>
      </ul>
      <button
        type="button"
        className="mt-3 w-full text-left text-xs text-primary hover:underline"
      >
        查看詳細目標 &gt;
      </button>
    </div>
  );
}
