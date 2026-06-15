/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-018-F01
 */

'use client';

import { useState } from 'react';
import type { MockAttendanceUser } from '@/mocks/dashboard';
import { cx } from '@design/utils/cx';

type Props = { people: MockAttendanceUser[] };

const dotCls: Record<MockAttendanceUser['status'], string> = {
  in: 'bg-[var(--color-success)]',
  leave: 'bg-[#e8a020]',
  absent: 'bg-muted-foreground/50',
};

const label: Record<MockAttendanceUser['status'], string> = {
  in: '已出勤',
  leave: '請假',
  absent: '未打卡',
};

export function TodayAttendanceCard({ people }: Props) {
  const [tip, setTip] = useState<string | null>(null);

  const present = people.filter((p) => p.status === 'in').length;

  return (
    <div className="nx-dash-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">今日上班</span>
        <span className="text-xs text-muted-foreground">{present}人</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className="relative flex flex-col items-center gap-1"
            onMouseEnter={() => setTip(`${p.name}：${label[p.status]}`)}
            onMouseLeave={() => setTip(null)}
            onFocus={() => setTip(`${p.name}：${label[p.status]}`)}
            onBlur={() => setTip(null)}
          >
            <div
              className={cx(
                'flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-secondary/40 text-xs font-semibold',
              )}
            >
              {p.initials}
            </div>
            <span
              className={cx(
                'absolute -bottom-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-card',
                dotCls[p.status],
              )}
            />
          </button>
        ))}
      </div>
      {tip ? (
        <div className="mt-2 text-center text-[10px] text-muted-foreground">{tip}</div>
      ) : null}
    </div>
  );
}
