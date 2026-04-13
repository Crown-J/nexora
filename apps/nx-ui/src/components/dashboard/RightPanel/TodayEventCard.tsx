/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-017-F01
 */

'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
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
};

export function TodayEventCard({ events }: TodayEventCardProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEvents = useMemo(
    () => events.filter((e) => e.date === todayStr),
    [events, todayStr],
  );
  const [rsvp, setRsvp] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [detail, setDetail] = useState<MockCalendarEvent | null>(null);

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 text-sm font-semibold text-foreground">今日事件</div>
        <ul className="space-y-2">
          {todayEvents.length === 0 ? (
            <li className="text-xs text-muted-foreground">今日無事件</li>
          ) : (
            todayEvents.map((ev) => (
              <li
                key={`${ev.type}-${ev.title}`}
                className={cx(
                  'rounded-xl border border-border/50 border-l-4 bg-secondary/20 px-3 py-2',
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
                        'rounded-lg border px-2 py-0.5 text-[10px]',
                        rsvp[ev.title] === 'yes'
                          ? 'border-[var(--color-success)] bg-[var(--color-success)]/15'
                          : 'border-border',
                      )}
                    >
                      ✓ 出席
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsvp((s) => ({ ...s, [ev.title]: 'no' }))}
                      className={cx(
                        'rounded-lg border px-2 py-0.5 text-[10px]',
                        rsvp[ev.title] === 'no'
                          ? 'border-[var(--color-danger)] bg-[var(--color-danger)]/15'
                          : 'border-border',
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
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg">
            <div className="text-sm font-semibold">{detail.title}</div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>時間：{detail.time}</div>
              {detail.location ? <div>地點：{detail.location}</div> : null}
              <div>類型：{detail.type}</div>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-4 w-full rounded-xl border border-border py-2 text-xs"
            >
              關閉
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
