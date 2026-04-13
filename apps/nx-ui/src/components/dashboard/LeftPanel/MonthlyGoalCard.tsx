/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-014-F01
 */

'use client';

import { useState } from 'react';
import { mockMonthlyKpi, type KpiScope } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

const tabs: { key: KpiScope; label: string }[] = [
  { key: 'company', label: '公司' },
  { key: 'team', label: '團隊' },
  { key: 'personal', label: '個人' },
];

export function MonthlyGoalCard() {
  const [scope, setScope] = useState<KpiScope>('company');
  const k = mockMonthlyKpi[scope];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#e8a020]" />
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
      <ul className="space-y-2 text-sm">
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">月營收目標</span>
          <span className="tabular-nums font-medium">
            {k.revenue.cur} / {k.revenue.max}萬 <span className="text-[var(--color-success)]">↑</span>
          </span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">客戶滿意度</span>
          <span className="tabular-nums font-medium">
            {k.satisfaction.cur} / {k.satisfaction.max}%{' '}
            <span className="text-[var(--color-success)]">↑</span>
          </span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">新客戶開發</span>
          <span className="tabular-nums font-medium">
            {k.newCustomers.cur} / {k.newCustomers.max} 家{' '}
            <span className="text-[var(--color-success)]">↑</span>
          </span>
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
