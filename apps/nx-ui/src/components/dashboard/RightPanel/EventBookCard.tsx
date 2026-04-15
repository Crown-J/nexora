/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-017-F02
 * 事件簿：依行事曆選定日顯示事件列表
 */

'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { CalendarEventType, MockCalendarEvent } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

const typeLabel: Record<CalendarEventType, string> = {
  MEETING: '會議',
  EVENT: '活動',
  LEAVE: '排假',
  DEADLINE: '截止',
};

const badgeClassByType: Record<CalendarEventType, string> = {
  MEETING: 'bg-[#378ADD] text-white',
  EVENT: 'bg-[#E8A020] text-white',
  LEAVE: 'bg-[#1D9E75] text-white',
  DEADLINE: 'bg-[#E24B4A] text-white',
};

function formatEventTimeRange(ev: MockCalendarEvent): string {
  if (ev.isAllDay) return '全天';

  const { startTime, endTime, time, type } = ev;
  const trimmed = time.trim();

  if (startTime != null && endTime != null) {
    return `${startTime} - ${endTime}`;
  }
  if (startTime != null && endTime == null) {
    return type === 'DEADLINE' ? `— - ${startTime}` : `${startTime} - —`;
  }
  if (startTime == null && endTime == null && trimmed === '') return '全天';

  if (trimmed === '全天') return '全天';

  const dashParts = trimmed.split(/\s*-\s*|\s*–\s*/u).map((s) => s.trim());
  if (dashParts.length >= 2 && dashParts[0] && dashParts[1]) {
    return `${dashParts[0]} - ${dashParts[1]}`;
  }
  if (type === 'DEADLINE') return `— - ${trimmed}`;
  return `${trimmed} - ${trimmed}`;
}

export type EventBookCardProps = {
  events: MockCalendarEvent[];
  focusDate: Date;
  className?: string;
  fillContainerHeight?: boolean;
};

export function EventBookCard({ events, focusDate, className, fillContainerHeight }: EventBookCardProps) {
  const dayStr = format(focusDate, 'yyyy-MM-dd');
  const dayEvents = useMemo(
    () => events.filter((e) => e.date === dayStr),
    [events, dayStr],
  );
  const dateLine = `${format(focusDate, 'yyyy-MM-dd')}  ${format(focusDate, 'EEEE', { locale: zhTW })}`;

  const [rsvp, setRsvp] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [detail, setDetail] = useState<MockCalendarEvent | null>(null);

  return (
    <>
      <div
        className={cx(
          'nx-dash-card w-full min-w-0 max-w-full p-4',
          fillContainerHeight && 'flex h-full min-h-0 flex-col overflow-hidden',
          className,
        )}
      >
        <div className="mb-3 shrink-0">
          <div className="text-sm font-medium tracking-wide text-foreground">事件簿</div>
          <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{dateLine}</div>
        </div>
        <ul
          className={cx(
            'space-y-2',
            fillContainerHeight && 'nx-master-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5',
          )}
        >
          {dayEvents.length === 0 ? (
            <li className="text-xs text-muted-foreground">此日無事件</li>
          ) : (
            dayEvents.map((ev) => (
              <li
                key={`${ev.type}-${ev.title}-${ev.time}`}
                className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2 transition hover:border-primary/35 hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => setDetail(ev)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{ev.title}</span>
                    <span
                      className={cx(
                        'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium leading-none',
                        badgeClassByType[ev.type] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {typeLabel[ev.type] ?? ev.type}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatEventTimeRange(ev)}</span>
                    <span className="text-foreground/85">{ev.creatorName ?? '—'}</span>
                  </div>
                </button>
                {ev.requireRsvp ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRsvp((s) => ({ ...s, [ev.title]: 'yes' }))}
                      className={cx(
                        'rounded-lg border px-2 py-0.5 text-[10px] transition',
                        rsvp[ev.title] === 'yes'
                          ? 'border-[var(--color-success)] bg-[var(--color-success)]/15 shadow-[0_0_8px_rgba(34,197,94,0.2)]'
                          : 'border-border hover:border-primary/30',
                      )}
                    >
                      ✓ 出席
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsvp((s) => ({ ...s, [ev.title]: 'no' }))}
                      className={cx(
                        'rounded-lg border px-2 py-0.5 text-[10px] transition',
                        rsvp[ev.title] === 'no'
                          ? 'border-[var(--color-danger)] bg-[var(--color-danger)]/15 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                          : 'border-border hover:border-primary/30',
                      )}
                    >
                      ✗ 婉拒
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>

      {detail ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg">
            <div className="text-sm font-medium text-foreground">{detail.title}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>時間：{formatEventTimeRange(detail)}</div>
              {detail.location ? <div>地點：{detail.location}</div> : null}
              <div>類型：{typeLabel[detail.type] ?? detail.type}</div>
              {detail.creatorName ? <div>建立人：{detail.creatorName}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-4 w-full rounded-lg border border-border bg-secondary/60 py-2 text-xs text-foreground transition hover:bg-secondary"
            >
              關閉
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
