// apps/nx-ui/src/design/layout/v3/WorkbenchCalendar.tsx
//
// 工作檯行事曆卡（執行長 2026-08-03：沿用鋼鐵星球的行事曆格式）
//
// ⚠️ 本輪先做「資料先接上、版面先站好」：日期橫排 ＋ 當天事件清單，接的是真實 API
//    （GET /nx01/calendar-event，封存的舊首頁 HomeView 用的是同一支）。
// ⚠️ 舊首頁那個 7 卡 3D 輪轉（CalendarCoverflow、滾輪換日）還沒搬過來——
//    它跟舊首頁的事件簿是綁在一起的 468 行，要拆一輪才乾淨。下一步做。
//
// ⛔ 不放假事件：沒有資料就說沒有。

'use client';

import { useEffect, useMemo, useState } from 'react';

import { listCalendarEvents, type CalendarEventDto } from '@data/endpoints/nx01/api/calendar-event';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hhmm(dto: CalendarEventDto): string {
  if (dto.isAllDay || !dto.dateStart) return '整天';
  const d = new Date(dto.dateStart);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function WorkbenchCalendar() {
  const [rows, setRows] = useState<CalendarEventDto[] | null>(null);
  const [pick, setPick] = useState<string>(() => ymd(new Date()));

  /** 抓當天起前後各七天——⚠️ 用 state 存基準日，⛔ 不在 render 裡 new Date()（每次都不同） */
  const [base] = useState(() => new Date());

  const days = useMemo(() => {
    const out: Date[] = [];
    for (let i = -1; i <= 5; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [base]);

  useEffect(() => {
    let alive = true;
    const from = new Date(base);
    from.setDate(from.getDate() - 7);
    const to = new Date(base);
    to.setDate(to.getDate() + 21);
    listCalendarEvents({ from: ymd(from), to: ymd(to) })
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [base]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEventDto[]>();
    for (const r of rows ?? []) {
      if (!r.dateStart) continue;
      const k = ymd(new Date(r.dateStart));
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return m;
  }, [rows]);

  const todayKey = ymd(base);
  const list = byDate.get(pick) ?? [];

  return (
    <>
      <span className="nx-t-sec">行事曆</span>

      {/* 日期橫排：今天有底色、選中的加圈；有事件的日期底下點一點 */}
      <div className="mt-3 flex gap-2">
        {days.map((d) => {
          const k = ymd(d);
          const on = k === pick;
          const isToday = k === todayKey;
          const has = (byDate.get(k)?.length ?? 0) > 0;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPick(k)}
              className={[
                'flex flex-1 flex-col items-center rounded-xl px-1 py-2',
                on ? 'bg-primary/20 ring-1 ring-primary/60' : 'bg-white/[0.04] hover:bg-white/[0.08]',
              ].join(' ')}
            >
              <span className="nx-hint">{WEEK[d.getDay()]}</span>
              <span className={isToday ? 'nx-num-md text-primary' : 'nx-num-md'}>{d.getDate()}</span>
              {/* 有事件的日子點一點，⛔ 不寫數字——那會讓整排變成數字牆 */}
              <span
                aria-hidden
                className={`mt-1 h-1.5 w-1.5 rounded-full ${has ? 'bg-primary' : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>

      {/* 當天事件 */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {rows === null ? (
          <p className="nx-body">載入中…</p>
        ) : list.length === 0 ? (
          <p className="nx-body">這一天沒有排定的事。</p>
        ) : (
          list.map((e) => (
            <div key={e.id} className="flex items-baseline gap-3 border-b border-white/10 py-2 last:border-b-0">
              <span className="nx-mono w-14 shrink-0">{hhmm(e)}</span>
              <span className="nx-body min-w-0 flex-1 truncate">{e.title}</span>
              {e.orderDocNo ? <span className="nx-hint shrink-0">{e.orderDocNo}</span> : null}
            </div>
          ))
        )}
      </div>
    </>
  );
}
