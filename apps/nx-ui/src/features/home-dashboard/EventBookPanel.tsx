// apps/nx-ui/src/features/home-dashboard/EventBookPanel.tsx
// 首頁下方：右欄事件簿 — 顯示行事曆選取日當天事件

'use client';

import { FileText } from 'lucide-react';

import type { CalendarEvent } from './event-types';

type EventBookPanelProps = {
  events: CalendarEvent[];
  selectedDate: string;
  loading: boolean;
};

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  S: { label: '系統', cls: 'border-sky-700/50 bg-sky-900/30 text-sky-300' },
  C: { label: '公司', cls: 'border-amber-700/50 bg-amber-900/30 text-amber-300' },
  R: { label: '提醒', cls: 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300' },
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeOf(iso: string, allDay: boolean): string {
  if (allDay) return '全天';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function EventBookPanel({ events, selectedDate, loading }: EventBookPanelProps) {
  const todayEvents = events.filter((e) => {
    const dt = new Date(e.dateStart);
    if (Number.isNaN(dt.getTime())) return false;
    return ymd(dt) === selectedDate;
  });

  return (
    <div className="flex min-h-[280px] flex-col gap-2 rounded-xl border border-zinc-800 bg-[#11111A]/70 backdrop-blur-sm p-4">
      <header className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-zinc-400" strokeWidth={1.5} />
          <h3 className="text-sm font-medium tracking-wide text-zinc-100">事件簿</h3>
        </div>
        <span className="text-[10px] text-zinc-500">{selectedDate}</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-6 text-center text-[11px] text-zinc-600">載入中...</p>
        ) : todayEvents.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-zinc-600">當日無事件</p>
        ) : (
          <ul className="space-y-1">
            {todayEvents.map((e) => {
              const t = TYPE_LABEL[e.type] ?? { label: e.type, cls: 'border-zinc-700/50 bg-zinc-900 text-zinc-400' };
              return (
                <li
                  key={e.id}
                  className="rounded border border-transparent px-2 py-1.5 transition-colors hover:border-zinc-800 hover:bg-zinc-900/40"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded border px-1 py-px text-[9px] tracking-widest ${t.cls}`}>
                      {t.label}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-200">{e.title}</p>
                      <p className="text-[10px] text-zinc-600">
                        {timeOf(e.dateStart, e.isAllDay)}
                        {e.orderDocNo ? ` · ${e.orderDocNo}` : ''}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
