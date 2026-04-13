/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-017-F01
 */

'use client';

import { useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { MockCalendarEvent } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

const borderByType: Record<string, string> = {
  MEETING: 'border-l-[var(--color-meeting)]',
  EVENT: 'border-l-[#e8a020]',
  LEAVE: 'border-l-[var(--color-success)]',
  DEADLINE: 'border-l-[var(--color-danger)]',
};

type TodayEventCardProps = {
  events: MockCalendarEvent[];
  /** 與行事曆選定日同步；預設可由父層傳入 `new Date()` */
  focusDate: Date;
};

export function TodayEventCard({ events, focusDate }: TodayEventCardProps) {
  const dayStr = format(focusDate, 'yyyy-MM-dd');
  const dayEvents = useMemo(
    () => events.filter((e) => e.date === dayStr),
    [events, dayStr],
  );
  const isToday = isSameDay(focusDate, new Date());
  const heading = isToday
    ? '今日事件'
    : `${format(focusDate, 'M月d日 EEEE', { locale: zhTW })} · 事件`;

  const [rsvp, setRsvp] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [detail, setDetail] = useState<MockCalendarEvent | null>(null);

  return (
    <>
      <div className={cx('nx-dash-card p-4')}>
        <div className="mb-3 text-sm font-medium tracking-wide text-foreground">{heading}</div>
        <ul className="space-y-2">
          {dayEvents.length === 0 ? (
            <li className="text-xs text-muted-foreground">此日無事件</li>
          ) : (
            dayEvents.map((ev) => (
              <li
                key={`${ev.type}-${ev.title}-${ev.time}`}
                className={cx(
                  'rounded-xl border border-border/70 border-l-4 bg-muted/35 px-3 py-2 transition hover:border-primary/35 hover:bg-muted/50',
                  borderByType[ev.type] || 'border-l-muted-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => setDetail(ev)}
                  className="w-full text-left"
                >
                  <div className="text-sm font-medium text-foreground">{ev.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ev.time}
                    {ev.location ? ` · ${ev.location}` : ''}
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
              <div>時間：{detail.time}</div>
              {detail.location ? <div>地點：{detail.location}</div> : null}
              <div>類型：{detail.type}</div>
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
