// apps/nx-ui/src/features/home-dashboard/CalendarPanel.tsx
// 首頁下方：中欄行事曆 — 自寫 mini month grid（不引入新 lib）
//
// 上方：‹ 2026 / 06 ›（月份切換）
// 中間：7x6 日格、有事件當日以圓點標、選中日 highlight
// 點日 → 觸發 onSelectDate

'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

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
  const startWeekday = first.getDay(); // 0=Sun
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
    <div className="flex min-h-[280px] flex-col gap-2 rounded-xl border border-zinc-800 bg-[#11111A]/70 backdrop-blur-sm p-4">
      <header className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-zinc-400" strokeWidth={1.5} />
          <h3 className="text-sm font-medium tracking-wide text-zinc-100">行事曆</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="上月"
            onClick={() => shift(-1)}
            className="rounded p-0.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs tabular-nums text-zinc-300">
            {view.y} / {String(view.m + 1).padStart(2, '0')}
          </span>
          <button
            type="button"
            aria-label="下月"
            onClick={() => shift(1)}
            className="rounded p-0.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px text-center text-[10px] text-zinc-600">
        {WEEK_HEAD.map((w) => (
          <span key={w} className="py-1">{w}</span>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-px">
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
              className={[
                'group relative flex flex-col items-center justify-center rounded text-[11px] transition-colors',
                isSelected
                  ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/60'
                  : isToday
                    ? 'text-amber-300 hover:bg-zinc-900'
                    : 'text-zinc-400 hover:bg-zinc-900',
              ].join(' ')}
            >
              <span className="tabular-nums">{c.date.getDate()}</span>
              {hasEvent ? (
                <span className="absolute bottom-0.5 size-1 rounded-full bg-amber-400" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
