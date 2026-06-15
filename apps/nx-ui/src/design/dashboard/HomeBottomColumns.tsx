// apps/nx-ui/src/features/home-dashboard/HomeBottomColumns.tsx
// 首頁儀表板下方：三欄等寬（任務清單 / 行事曆 / 事件簿）
//
// 2026-06-03 滿版自適應：min-h-0 + flex-1、三欄繼承父高度撐滿；
//             手機單欄堆疊、桌面 3 欄

'use client';

import { useEffect, useMemo, useState } from 'react';

import { apiJson } from '@data/api/client';

import { CalendarPanel } from './CalendarPanel';
import { EventBookPanel } from './EventBookPanel';
import { TaskListPanel } from './TaskListPanel';
import type { CalendarEvent } from '@data/types/home-dashboard/event-types';

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthRange(year: number, month0: number): { from: string; to: string } {
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  return { from: ymd(first), to: ymd(last) };
}

type EventListResponse = {
  rows?: CalendarEvent[];
  total?: number;
};

export function HomeBottomColumns() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<string>(ymd(today));
  const [viewMonth, setViewMonth] = useState<{ y: number; m: number }>({
    y: today.getFullYear(),
    m: today.getMonth(),
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    const { from, to } = monthRange(viewMonth.y, viewMonth.m);
    apiJson<EventListResponse>(`/nx01/calendar-event?from=${from}&to=${to}`, { method: 'GET' })
      .then((res) => {
        if (cancelled) return;
        setEvents(Array.isArray(res.rows) ? res.rows : []);
        setEventsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMonth]);

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
      <TaskListPanel />
      <CalendarPanel
        events={events}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onChangeMonth={(y, m) => setViewMonth({ y, m })}
      />
      <EventBookPanel events={events} selectedDate={selectedDate} loading={eventsLoading} />
    </section>
  );
}
