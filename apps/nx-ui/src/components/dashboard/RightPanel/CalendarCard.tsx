/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-016-F01
 */

'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { MockCalendarEvent } from '@/mocks/dashboard';
import { cx } from '@/shared/lib/cx';

type CalendarCardProps = {
  events: MockCalendarEvent[];
};

export function CalendarCard({ events }: CalendarCardProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const today = new Date();

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.date);
    return set;
  }, [events]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((d) => addMonths(d, -1))}
            className="rounded-lg border border-border/60 p-1 hover:bg-secondary"
            aria-label="上個月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor((d) => addMonths(d, 1))}
            className="rounded-lg border border-border/60 p-1 hover:bg-secondary"
            aria-label="下個月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">
            {format(cursor, 'yyyy年M月', { locale: zhTW })}
          </span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            新增
          </button>
          {addOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-border bg-popover py-1 text-xs shadow-lg">
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-secondary">
                申請排假
              </button>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-secondary">
                新增會議
              </button>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-secondary">
                新增活動
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {weekLabels.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const key = format(d, 'yyyy-MM-dd');
          const hasDot = eventDates.has(key);
          return (
            <div
              key={key}
              className={cx(
                'flex min-h-9 flex-col items-center justify-start rounded-lg py-1 text-xs tabular-nums',
                !inMonth && 'text-muted-foreground/40',
                inMonth && 'text-foreground',
                isToday && 'bg-[#e8a020] font-semibold text-primary-foreground',
              )}
            >
              <span>{format(d, 'd')}</span>
              {hasDot ? (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#e8a020]" />
              ) : (
                <span className="mt-0.5 h-1.5 w-1.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
