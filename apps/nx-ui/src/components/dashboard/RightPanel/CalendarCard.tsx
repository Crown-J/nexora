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
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  className?: string;
  /** 父層固定高度時撐滿；月曆格維持固定 cell 高，底部可留白 */
  fillContainerHeight?: boolean;
};

export function CalendarCard({
  events,
  selectedDate,
  onSelectDate,
  className,
  fillContainerHeight,
}: CalendarCardProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(selectedDate));
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
    <div
      className={cx(
        'nx-dash-card relative w-full min-w-0 overflow-hidden p-2.5 sm:p-3',
        fillContainerHeight && 'flex h-full min-h-0 flex-col',
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((d) => addMonths(d, -1))}
            className="rounded-lg border border-border bg-secondary/50 p-1 text-foreground transition hover:border-primary/40 hover:bg-secondary"
            aria-label="上個月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor((d) => addMonths(d, 1))}
            className="rounded-lg border border-border bg-secondary/50 p-1 text-foreground transition hover:border-primary/40 hover:bg-secondary"
            aria-label="下個月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium tracking-wide text-foreground">
            {format(cursor, 'yyyy年M月', { locale: zhTW })}
          </span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            新增
          </button>
          {addOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-border bg-popover py-1 text-xs text-popover-foreground shadow-lg backdrop-blur-md">
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-muted">
                申請排假
              </button>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-muted">
                新增會議
              </button>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-muted">
                新增活動
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-0.5 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {weekLabels.map((w) => (
          <div key={w} className="py-0.5">
            {w}
          </div>
        ))}
      </div>
      <div
        className={cx(
          'grid grid-cols-7 gap-0.5',
          fillContainerHeight && 'min-h-0 flex-1 content-start',
        )}
      >
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selectedDate);
          const key = format(d, 'yyyy-MM-dd');
          const hasDot = eventDates.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSelectDate(d);
                setCursor(startOfMonth(d));
              }}
              className={cx(
                'flex h-9 max-h-9 min-h-9 flex-col items-center justify-center gap-px rounded-lg border px-0.5 text-[11px] tabular-nums transition outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                !inMonth && 'border-transparent text-muted-foreground/35',
                inMonth && !isSelected && 'border-transparent text-foreground/90 hover:border-primary/35 hover:bg-primary/10',
                isToday &&
                  !isSelected &&
                  'border border-primary/50 bg-primary/10 font-medium text-foreground',
                isSelected &&
                  'border border-primary bg-primary/18 font-medium text-foreground',
              )}
            >
              <span className="leading-none">{format(d, 'd')}</span>
              {hasDot ? (
                <span className="h-1 w-1 shrink-0 rounded-full bg-primary/75" />
              ) : (
                <span className="h-1 w-1 shrink-0" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
