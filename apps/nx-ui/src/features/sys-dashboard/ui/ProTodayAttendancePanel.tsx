/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-025-F01
 * PRO 首頁：今日上班人員（頭像＋狀態點）
 */

'use client';

import { mockProAttendance } from '@/mocks/dashboard';
import type { MockProAttendancePerson, MockProAttendanceStatus } from '@/mocks/dashboard';
import { cx } from '@design/utils/cx';

const statusDot: Record<MockProAttendanceStatus, string> = {
  present: 'bg-[var(--color-success)]',
  leave: 'bg-[#E8A020]',
  absent: 'bg-muted-foreground/45',
};

const statusLabel: Record<MockProAttendanceStatus, string> = {
  present: '已出勤',
  leave: '請假',
  absent: '未打卡',
};

function counts(people: MockProAttendancePerson[]) {
  return {
    present: people.filter((p) => p.status === 'present').length,
    leave: people.filter((p) => p.status === 'leave').length,
    absent: people.filter((p) => p.status === 'absent').length,
  };
}

type Props = {
  className?: string;
};

export function ProTodayAttendancePanel({ className }: Props) {
  const people = mockProAttendance;
  const c = counts(people);
  const titleCount = people.length;

  return (
    <div className={cx('nx-dash-card flex min-h-0 flex-col p-3 sm:p-4', className)}>
      <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">今日上班</span>
        <span className="text-xs tabular-nums text-muted-foreground">{titleCount} 人</span>
      </div>
      <div className="nx-master-scroll flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto overscroll-contain">
        {people.map((p) => (
          <button
            key={p.name}
            type="button"
            title={`${p.name}：${statusLabel[p.status]}`}
            aria-label={`${p.name}，今日狀態：${statusLabel[p.status]}`}
            className="rounded-md p-1 pb-2 outline-none ring-offset-background transition hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/45"
          >
            <div className="relative flex flex-col items-center">
              <div
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/45 text-xs font-semibold text-foreground sm:h-10 sm:w-10',
                )}
              >
                {p.initial}
              </div>
              <span
                className={cx(
                  'absolute -bottom-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-card',
                  statusDot[p.status],
                )}
                aria-hidden
              />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3 shrink-0 border-t border-border/50 pt-2 text-[10px] leading-relaxed text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-success)]" aria-hidden />
          出勤 {c.present}
        </span>
        <span className="mx-2"> </span>
        <span className="inline-flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8A020]" aria-hidden />
          請假 {c.leave}
        </span>
        <span className="mx-2"> </span>
        <span className="inline-flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/45" aria-hidden />
          未打卡 {c.absent}
        </span>
      </div>
    </div>
  );
}
