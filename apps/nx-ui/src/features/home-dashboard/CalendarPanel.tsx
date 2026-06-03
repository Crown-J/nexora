// apps/nx-ui/src/features/home-dashboard/CalendarPanel.tsx
// 首頁下方：中欄行事曆 — mini month grid
//
// 2026-06-03 對齊主檔中心：glass-card + Section header + token 化、滿版自適應

'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import { HomeSectionHeader } from './HomeSectionHeader';
import type { CalendarEvent } from './event-types';

const WEEK_HEAD = ['日', '一', '二', '三', '四', '五', '六'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: Array<{ date: Date | null; ymd: string | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null, ymd: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month0, d);
    cells.push({ date: dt, ymd: ymd(dt) });
  }
  while (cells.length < 42) cells.push({ date: null, ymd: null });
  return cells;
}

type CalendarPanelProps = {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (ymdStr: string) => void;
  onChangeMonth: (year: number, month0: number) => void;
};

export function CalendarPanel({
  events,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: CalendarPanelProps) {
  const init = useMemo(() => {
    const d = new Date(selectedDate || new Date());
    return { y: d.getFullYear(), m: d.getMonth() };
  }, [selectedDate]);

  const [view, setView] = useState<{ y: number; m: number }>(init);

  const todayYmd = ymd(new Date());

  const cells = useMemo(() => buildMonthGrid(view.y, view.m), [view]);

  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      const dt = new Date(e.dateStart);
      if (!Number.isNaN(dt.getTime())) set.add(ymd(dt));
    }
    return set;
  }, [events]);

  function shift(delta: number) {
    let y = view.y;
    let m = view.m + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setView({ y, m });
    onChangeMonth(y, m);
  }

  return (
    <div className="glass-card nx-glass-raised flex h-full min-h-0 flex-col gap-2 rounded-xl border border-border/80 p-4">
      <HomeSectionHeader
        Icon={CalendarDays}
        title="行事曆"
        count={`${view.y} / ${String(view.m + 1).padStart(2, '0')}`}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          aria-label="上月"
          onClick={() => shift(-1)}
          className="rounded p-0.5 hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em]">月曆</span>
        <button
          type="button"
          aria-label="下月"
          onClick={() => shift(1)}
          className="rounded p-0.5 hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-[10px] text-muted-foreground">
        {WEEK_HEAD.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px">
        {cells.map((c, i) => {
          if (!c.date || !c.ymd) {
            return <div key={i} className="bg-transparent" />;
          }
          const isToday = c.ymd === todayYmd;
          const isSelected = c.ymd === selectedDate;
          const hasEvent = eventDays.has(c.ymd);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(c.ymd!)}
              className={cn(
                'group relative flex flex-col items-center justify-center rounded text-[11px] transition-colors',
                isSelected
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/50'
                  : isToday
                    ? 'text-primary hover:bg-secondary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <span className="tabular-nums">{c.date.getDate()}</span>
              {hasEvent ? (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
