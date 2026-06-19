// apps/nx-ui/src/features/home/HomeView.tsx
// NX00 首頁儀表板：行事曆⇄事件簿（連動）+ 全體出勤 + 任務清單
// 對齊 Hana 成品 NEXORA 系統.html #view-home + dashboard.js
// LITE 範圍：不放營業額/毛利 BI、不放待辦摘要計數格

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronDown, Clock, FileText, MapPin, Plus } from 'lucide-react';
import {
  ATTENDANCE, ATTEND_STATUS, CALENDAR_EVENTS, DOC_TYPES, EVENT_TYPES, TASKS, TODAY,
  type DocType, type Task,
} from '@data/home/home-data';

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

function cmpKey(a: string, b: string) {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

// ============ CalendarCoverflow（7 卡輪轉） ============
function CalendarCoverflow({
  focus,
  onFocusChange,
}: {
  focus: Date;
  onFocusChange: (d: Date) => void;
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
          const evs = CALENDAR_EVENTS[key] || [];
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
                {types.map((t) => (
                  <span key={t} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_TYPES[t].color }} />
                ))}
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
function EventBookAndAttendance({ focusKey }: { focusKey: string }) {
  const p = focusKey.split('-').map(Number);
  const dateObj = new Date(p[0], p[1] - 1, p[2]);
  // React Compiler 自動 memo
  const evs = (CALENDAR_EVENTS[focusKey] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const present = ATTENDANCE.filter((a) => ['work', 'remote', 'trip'].includes(a.status)).length;

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
                const ty = EVENT_TYPES[e.type];
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
      {/* 全體出勤（右） */}
      <div className="flex flex-col min-w-0 min-h-0">
        <div className="flex items-baseline gap-2.5 border-b border-border/30 px-4 py-3.5">
          <span className="whitespace-nowrap text-[14px] font-semibold">全體出勤</span>
          <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">
            {present} / {ATTENDANCE.length} 在勤
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5">
          {ATTENDANCE.map((a) => {
            const s = ATTEND_STATUS[a.status];
            return (
              <div key={a.name} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-foreground/[0.04]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[12px] font-semibold text-[var(--nx-accent-strong)]">
                  {a.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] leading-tight">{a.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.role}</div>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 14%, transparent)` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============ TasksPanel ============
function TasksPanel() {
  const router = useRouter();
  const [filter, setFilter] = useState<DocType | 'all'>('all');
  const [taskState, setTaskState] = useState<Task[]>(TASKS);
  const filtered = taskState
    .filter((t) => filter === 'all' || t.type === filter)
    .slice()
    .sort((a, b) => Number(a.done) - Number(b.done) || cmpKey(a.due, b.due));

  const pending = taskState.filter((t) => !t.done).length;

  const dueLabel = (t: Task) => {
    const c = cmpKey(t.due, TODAY.key);
    const p = t.due.split('-');
    const ds = `${p[1]}/${p[2].padStart(2, '0')}`;
    if (t.done) return { txt: ds, over: false };
    if (c < 0) return { txt: `逾期 · ${ds}`, over: true };
    if (c === 0) return { txt: '今天到期', over: false };
    return { txt: `${ds} 到期`, over: false };
  };

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
        <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">{pending} 筆待處理</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {tabs.map(({ k, label }) => {
          const cnt = k === 'all' ? pending : taskState.filter((x) => !x.done && x.type === k).length;
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
              {cnt > 0 && <span className="ml-1 opacity-70">{cnt}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {filtered.length ? (
          <div className="flex flex-col gap-1.5">
            {filtered.map((t) => {
              const ty = DOC_TYPES[t.type];
              const dl = dueLabel(t);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    // 最簡 routing：依類型跳對應模組（暫時統一跳 /dashboard 不死掉）
                    const target =
                      t.type === 'quote' ? '/dashboard/sale/qt'
                      : t.type === 'sales' ? '/dashboard/sale/so'
                      : t.type === 'ship' ? '/dashboard/delivery'
                      : t.type === 'collect' ? '/dashboard/finance'
                      : '/dashboard/purchase';
                    router.push(target);
                  }}
                  className={`flex items-start gap-3 rounded-xl border border-transparent bg-foreground/[0.02] p-3 text-left transition hover:border-border/40 hover:bg-foreground/[0.05] ${
                    t.done ? 'opacity-60' : ''
                  }`}
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaskState((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
                    }}
                    className={`mt-0.5 grid h-[19px] w-[19px] flex-none place-items-center rounded-md border-[1.5px] transition cursor-pointer ${
                      t.done
                        ? 'border-[var(--warning)] bg-[var(--warning)]'
                        : 'border-muted-foreground/70 hover:border-[var(--warning)]'
                    }`}
                  >
                    {t.done && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0a1014" strokeWidth="3" className="h-3 w-3">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
                        style={{ color: ty.color, background: `color-mix(in srgb, ${ty.color} 15%, transparent)` }}
                      >
                        {ty.label}
                      </span>
                      <span className="font-mono text-[12px] text-foreground/90">{t.code}</span>
                      <span className="ml-auto font-mono text-[12px] tabular-nums text-foreground">{t.amount}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          t.status === '草稿'
                            ? 'text-muted-foreground bg-foreground/[0.05]'
                            : 'text-[var(--nx-accent-strong)] bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]'
                        }`}
                      >
                        {t.status}
                      </span>
                      <span className="text-muted-foreground">{t.partner}</span>
                      <span
                        className={`inline-flex items-center gap-1 ml-auto ${
                          dl.over ? 'text-[var(--color-danger,#e24b4a)]' : 'text-muted-foreground'
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {dl.txt}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[13px] text-muted-foreground/70">此分類沒有單據</div>
        )}
      </div>
    </section>
  );
}

// ============ HomeView 主元件 ============
export function HomeView({ displayName }: { displayName: string }) {
  const [focus, setFocus] = useState(() => new Date(TODAY.y, TODAY.m - 1, TODAY.d));
  const focusKey = dKeyOf(focus);

  // 時間敏感問候（first render 時鎖定一次、避免每秒重算）
  const [greet] = useState(() => {
    const h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 12) return '早安';
    if (h < 18) return '午安';
    return '晚安';
  });

  return (
    <div className="mx-auto w-full max-w-[1320px] flex flex-1 min-h-0 flex-col gap-3.5 p-4 lg:p-6">
      {/* D 段錯落 stagger 進場：greet 0.15s / card1 0.30s / task 0.38s / card2 0.46s */}
      <div data-nx-frame className="nx-stagger-greet flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-[27px] font-semibold tracking-tight m-0">
          {greet}，<span className="text-[var(--nx-accent-strong)]">{displayName}</span>
        </h1>
        <div className="text-[14px] text-muted-foreground">
          今天還有 <span className="font-semibold text-[var(--nx-accent-strong)]">{TASKS.filter((t) => !t.done && cmpKey(t.due, TODAY.key) <= 0).length}</span> 筆待處理單據
        </div>
      </div>
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1.72fr_1fr]">
        <div className="flex flex-col gap-3.5 min-h-0">
          <div data-nx-frame className="nx-stagger-card-1">
            <CalendarCoverflow focus={focus} onFocusChange={setFocus} />
          </div>
          <div data-nx-frame className="nx-stagger-card-2 flex flex-col flex-1 min-h-0">
            <EventBookAndAttendance focusKey={focusKey} />
          </div>
        </div>
        <div data-nx-frame className="nx-stagger-task flex flex-col min-h-0">
          <TasksPanel />
        </div>
      </div>
    </div>
  );
}
