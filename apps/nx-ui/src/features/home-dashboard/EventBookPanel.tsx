// apps/nx-ui/src/features/home-dashboard/EventBookPanel.tsx
// 首頁下方：右欄事件簿 — 顯示行事曆選取日當天事件
//
// 2026-06-03 對齊主檔中心：glass-card + Section header + token 化

'use client';

import { FileText } from 'lucide-react';

import { HomeSectionHeader } from './HomeSectionHeader';
import type { CalendarEvent } from './event-types';

type EventBookPanelProps = {
  events: CalendarEvent[];
  selectedDate: string;
  loading: boolean;
};

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  S: { label: '系統', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  C: { label: '公司', cls: 'border-primary/40 bg-primary/10 text-primary' },
  R: { label: '提醒', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
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
    <div className="glass-card nx-glass-raised flex h-full min-h-0 flex-col gap-2 rounded-xl border border-border/80 p-4">
      <HomeSectionHeader Icon={FileText} title="事件簿" count={selectedDate} />

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        {loading ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">載入中...</p>
        ) : todayEvents.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">當日無事件</p>
        ) : (
          <ul className="space-y-1">
            {todayEvents.map((e) => {
              const t = TYPE_LABEL[e.type] ?? { label: e.type, cls: 'border-border/60 bg-secondary text-muted-foreground' };
              return (
                <li
                  key={e.id}
                  className="rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border/60 hover:bg-secondary/40"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded border px-1 py-px text-[9px] tracking-widest ${t.cls}`}>
                      {t.label}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-foreground">{e.title}</p>
                      <p className="text-[10px] text-muted-foreground">
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
