// apps/nx-ui/src/features/home/HomeView.tsx
// NX00 首頁儀表板：行事曆⇄事件簿（連動）+ 全體出勤 + 任務清單
//
// 2026-06-25 執行長拍板「移除所有測試資料」Phase 1：
//   - 公告 / 行事曆 / 通知 改接真實 API（行事曆走 listCalendarEvents）
//   - 出勤 / 任務 暫顯空狀態（出勤 attendance endpoint 受 PRO 限制、任務需 NX02/04/05 聚合 endpoint、Phase 2 再做）
//   - 任務 panel 移除勾選 checkbox UI（單據完成自動消失、不需 user 勾）

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Clock, FileText, MapPin, Plus, Users } from 'lucide-react';
import {
  DOC_TYPES, EVENT_TYPES, TODAY,
  type DocType,
} from '@data/home/home-data';
import {
  listCalendarEvents,
  type CalendarEventDto,
} from '@data/endpoints/nx01/api/calendar-event';

const WD = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const dkey = (y: number, m: number, d: number) => `${y}-${m}-${d}`;

function dKeyOf(dt: Date) {
  return dkey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function addDays(dt: Date, n: number): Date {
  const d = new Date(dt);
  d.setDate(d.getDate() + n);
  return d;
}

/** 行事曆 view-model：依日期 group 後端 events */
type CalEventVm = {
  time: string;
  title: string;
  type: string;
  meta?: string;
};

function eventVmFromDto(dto: CalendarEventDto): CalEventVm {
  const start = dto.dateStart ? new Date(dto.dateStart) : null;
  const hh = start && !dto.isAllDay
    ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    : '00:00';
  return {
    time: hh,
    title: dto.title,
    type: dto.type || 'meeting',
    meta: dto.orderDocNo ?? undefined,
  };
}

// ============ CalendarCoverflow（7 卡輪轉） ============
function CalendarCoverflow({
  focus,
  onFocusChange,
  eventsByDate,
}: {
  focus: Date;
  onFocusChange: (d: Date) => void;
  eventsByDate: Map<string, CalEventVm[]>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastWheel = useRef(0);
  const [ympOpen, setYmpOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(focus.getFullYear());

  // 7 卡：中央 ±3 顯示、±4 緩衝
  const RANGE = 3;
  // React Compiler 自動 memo、不再 manual useMemo
  const cards: { off: number; dt: Date; key: string }[] = [];
  for (let o = -RANGE; o <= RANGE; o++) {
    const dt = addDays(focus, o);
    cards.push({ off: o, dt, key: dKeyOf(dt) });
  }

  const shiftDays = useCallback(
    (n: number) => {
      onFocusChange(addDays(focus, n));
    },
    [focus, onFocusChange],
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel.current < 140) return;
      lastWheel.current = now;
      shiftDays(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [shiftDays]);

  const transformFor = (off: number) => {
    const x = off * 104;
    const sc = off === 0 ? 1 : Math.max(0.5, 1 - Math.abs(off) * 0.16);
    const ry = off === 0 ? 0 : (off < 0 ? 1 : -1) * Math.min(40, Math.abs(off) * 24);
    const z = off === 0 ? 0 : -Math.abs(off) * 45;
    return `translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg) scale(${sc.toFixed(3)})`;
  };
  const opacityFor = (off: number) => [1, 0.9, 0.6, 0.32, 0][Math.min(4, Math.abs(off))];

  return (
    <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md">
      {/* 月份 + 動作 */}
      <div className="flex items-center gap-3 px-5 pb-2 pt-4 relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPickerYear(focus.getFullYear());
            setYmpOpen((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-[16px] font-semibold hover:bg-foreground/[0.04]"
        >
          <span>
            {focus.getFullYear()} 年 {focus.getMonth() + 1} 月
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            aria-label="新增事件"
            title="新增事件"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--warning)_40%,transparent)] text-[var(--warning)] hover:bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="回到今天"
            title="回到今天"
            onClick={() => onFocusChange(new Date(TODAY.y, TODAY.m - 1, TODAY.d))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border/40 text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>
        {ympOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-4 top-14 z-30 w-60 rounded-xl border border-border/40 bg-[color-mix(in_oklch,var(--popover)_94%,transparent)] p-3 backdrop-blur-xl shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="grid h-7 w-7 place-items-center rounded-md border border-border/40 text-muted-foreground hover:bg-foreground/[0.06]"
                aria-label="上一年"
              >
                ‹
              </button>
              <span className="font-mono text-[13px] font-semibold">{pickerYear} 年</span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="grid h-7 w-7 place-items-center rounded-md border border-border/40 text-muted-foreground hover:bg-foreground/[0.06]"
                aria-label="下一年"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const on = pickerYear === focus.getFullYear() && m === focus.getMonth() + 1;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const day = Math.min(focus.getDate(), new Date(pickerYear, m, 0).getDate());
                      onFocusChange(new Date(pickerYear, m - 1, day));
                      setYmpOpen(false);
                    }}
                    className={`rounded-lg border py-1.5 text-[12.5px] ${
                      on
                        ? 'border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--nx-accent-strong)] font-semibold'
                        : 'border-border/40 hover:bg-foreground/[0.04]'
                    }`}
                  >
                    {m}月
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* 7 卡 coverflow */}
      <div
        ref={trackRef}
        className="relative flex h-[206px] items-center justify-center overflow-hidden px-3.5 pb-3.5"
        style={{ perspective: '1200px' }}
      >
        {cards.map(({ off, dt, key }) => {
          const evs = eventsByDate.get(key) ?? [];
          const types = Array.from(new Set(evs.map((e) => e.type))).slice(0, 4);
          const isCenter = off === 0;
          const isToday = key === TODAY.key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFocusChange(dt)}
              style={{
                transform: transformFor(off),
                opacity: opacityFor(off),
                zIndex: 20 - Math.abs(off),
                pointerEvents: Math.abs(off) <= 3 ? 'auto' : 'none',
                transition: 'transform .44s cubic-bezier(.25,.8,.3,1), opacity .44s ease',
              }}
              className={`absolute left-1/2 top-1/2 -ml-[52px] -mt-[75px] flex h-[150px] w-[104px] flex-col items-center justify-center gap-1 rounded-2xl border bg-card/70 ${
                isCenter
                  ? 'border-[var(--warning)] shadow-[0_22px_48px_-18px_color-mix(in_srgb,var(--warning)_55%,transparent)] ring-1 ring-[var(--warning)]'
                  : 'border-border/40'
              }`}
            >
              <span className={`text-[12px] ${isCenter ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {WD[dt.getDay()].replace('星期', '週')}
              </span>
              <span
                className={`font-mono leading-none ${
                  isCenter
                    ? 'text-[36px] font-semibold text-[var(--nx-accent-strong)]'
                    : 'text-[30px] font-semibold text-foreground'
                }`}
              >
                {dt.getDate()}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground/80">{dt.getMonth() + 1} 月</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {types.map((t) => {
                  const meta = EVENT_TYPES[t as keyof typeof EVENT_TYPES];
                  const color = meta?.color ?? '#9aa0a6';
                  return <span key={t} className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />;
                })}
              </span>
              {evs.length ? (
                <span className="text-[10.5px] text-muted-foreground">{evs.length} 個行程</span>
              ) : (
                <span className="text-[10.5px] text-muted-foreground/50">無行程</span>
              )}
              {isToday && (
                <span className="rounded-full border border-[color-mix(in_srgb,var(--warning)_50%,transparent)] px-1.5 py-px text-[9px] font-bold tracking-[0.1em] text-[var(--nx-accent-strong)]">
                  今天
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============ EventBook + Attendance（3:2 split） ============
function EventBookAndAttendance({
  focusKey,
  eventsByDate,
}: {
  focusKey: string;
  eventsByDate: Map<string, CalEventVm[]>;
}) {
  const p = focusKey.split('-').map(Number);
  const dateObj = new Date(p[0], p[1] - 1, p[2]);
  // React Compiler 自動 memo
  const evs = (eventsByDate.get(focusKey) ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));

  return (
    <section className="grid grid-cols-[3fr_2fr] overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md flex-1 min-h-0">
      {/* 事件簿（左） */}
      <div className="flex flex-col min-w-0 min-h-0 border-r border-border/30">
        <div className="flex items-baseline gap-2.5 border-b border-border/30 px-4 py-3.5">
          <span className="whitespace-nowrap text-[15px] font-semibold">
            {p[1]} 月 {p[2]} 日
          </span>
          <span className="whitespace-nowrap text-[12px] text-muted-foreground">
            {WD[dateObj.getDay()]}
            {focusKey === TODAY.key && ' · 今天'}
          </span>
          <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">
            {evs.length ? `${evs.length} 個行程` : ''}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {evs.length ? (
            <div className="flex flex-col gap-1 p-2">
              {evs.map((e, i) => {
                const ty = EVENT_TYPES[e.type as keyof typeof EVENT_TYPES] ?? { label: e.type, color: '#9aa0a6' };
                return (
                  <button
                    key={i}
                    type="button"
                    className="flex gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-foreground/[0.04] cursor-pointer"
                  >
                    <span className="w-11 flex-none pt-0.5 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                      {e.time}
                    </span>
                    <span className="w-0.5 flex-none rounded-sm" style={{ background: ty.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] leading-snug">{e.title}</div>
                      {e.meta && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                          <MapPin className="h-3 w-3 opacity-70" />
                          {e.meta}
                        </div>
                      )}
                    </div>
                    <span
                      className="ml-1 self-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ color: ty.color, background: `color-mix(in srgb, ${ty.color} 15%, transparent)` }}
                    >
                      {ty.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-[13px] text-muted-foreground/70">
              <CalendarDays className="mx-auto mb-2.5 h-7 w-7 opacity-40" />
              這天沒有安排行程
            </div>
          )}
        </div>
      </div>
      {/* 全體出勤（右）—— 2026-06-25 Phase 1 暫顯空狀態
          理由：attendance endpoint 受 PRO 方案 + HR role 限定（apps/nx-api/src/nx07/attendance/）
          + status 對應 work/remote/trip/leave/sick 需與後端 schema 對齊 Phase 2 再接 */}
      <div className="flex flex-col min-w-0 min-h-0">
        <div className="flex items-baseline gap-2.5 border-b border-border/30 px-4 py-3.5">
          <span className="whitespace-nowrap text-[14px] font-semibold">全體出勤</span>
        </div>
        <div className="flex-1 min-h-0 grid place-items-center px-4 py-8 text-center">
          <div className="text-muted-foreground/80">
            <Users className="mx-auto mb-2 h-7 w-7 opacity-40" />
            <div className="text-[13px]">尚未啟用出勤記錄</div>
            <div className="mt-1 text-[11px] text-muted-foreground/70">出勤功能即將推出</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ TasksPanel ============
// 2026-06-25 執行長拍板：
//   - 拿掉勾選 checkbox（單據完成自動消失、不需 user 勾）
//   - 移除測試資料 TASKS、Phase 1 暫顯空狀態
//   - Phase 2 接 NX02 PO/PR + NX04 QT/SO/SR + NX05 應收應付 聚合 endpoint
function TasksPanel() {
  const [filter, setFilter] = useState<DocType | 'all'>('all');

  const tabs: { k: DocType | 'all'; label: string }[] = [
    { k: 'all', label: '全部' },
    { k: 'quote', label: '報價' },
    { k: 'sales', label: '銷貨' },
    { k: 'ship', label: '出貨' },
    { k: 'collect', label: '收款' },
    { k: 'purchase', label: '採購' },
  ];

  return (
    <section className="flex flex-col min-h-0 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md">
      <div className="flex items-center gap-2.5 border-b border-border/30 px-4 py-4">
        <FileText className="h-4 w-4 text-[var(--nx-accent-strong)]" />
        <span className="text-[14px] font-semibold">任務</span>
        <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">0 筆待處理</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {tabs.map(({ k, label }) => {
          const on = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-[12px] transition ${
                on
                  ? 'border-[color-mix(in_srgb,var(--warning)_50%,transparent)] bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--nx-accent-strong)] font-medium'
                  : 'border-border/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 grid place-items-center p-6 text-center">
        <div className="text-muted-foreground/80">
          <FileText className="mx-auto mb-2 h-7 w-7 opacity-40" />
          <div className="text-[13px]">目前沒有待處理單據</div>
          <div className="mt-1 text-[11px] text-muted-foreground/70">
            單據聚合功能即將推出（採購 / 銷貨 / 報價 / 出貨 / 收款）
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ HomeView 主元件 ============
export function HomeView({ displayName }: { displayName: string }) {
  const [focus, setFocus] = useState(() => new Date(TODAY.y, TODAY.m - 1, TODAY.d));
  const focusKey = dKeyOf(focus);
  // 2026-06-25 Phase 1：行事曆接 listCalendarEvents（一個月範圍）按 dateStart 分桶
  const [eventsByDate, setEventsByDate] = useState<Map<string, CalEventVm[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const from = new Date();
        from.setDate(from.getDate() - 15);
        const to = new Date();
        to.setDate(to.getDate() + 30);
        const rows = await listCalendarEvents({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        if (cancelled) return;
        const map = new Map<string, CalEventVm[]>();
        for (const dto of rows) {
          if (!dto.dateStart) continue;
          const d = new Date(dto.dateStart);
          const key = dkey(d.getFullYear(), d.getMonth() + 1, d.getDate());
          const arr = map.get(key) ?? [];
          arr.push(eventVmFromDto(dto));
          map.set(key, arr);
        }
        setEventsByDate(map);
      } catch {
        if (!cancelled) setEventsByDate(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2026-06-25 執行長：問候標題 + 待處理單據提示一律拿掉、首頁直接顯示行事曆 / 任務 區塊

  return (
    <div className="mx-auto w-full max-w-[1320px] flex flex-1 min-h-0 flex-col gap-3.5 p-4 lg:p-6">
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1.72fr_1fr]">
        <div className="flex flex-col gap-3.5 min-h-0">
          <div data-nx-frame className="nx-stagger-card-1">
            <CalendarCoverflow focus={focus} onFocusChange={setFocus} eventsByDate={eventsByDate} />
          </div>
          <div data-nx-frame className="nx-stagger-card-2 flex flex-col flex-1 min-h-0">
            <EventBookAndAttendance focusKey={focusKey} eventsByDate={eventsByDate} />
          </div>
        </div>
        <div data-nx-frame className="nx-stagger-task flex flex-col min-h-0">
          <TasksPanel />
        </div>
      </div>
    </div>
  );
}
