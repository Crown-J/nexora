/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-001-F01
 * 首頁儀表板 Phase 1：Mock Data + planCode 版型（外殼沿用 HomeLandingChrome / Dock / HomeTopBar）
 *
 * 大螢幕三欄：左（簽到／目標／日誌）｜中（行事曆不捲動、事件、出勤）｜右（今日工作）
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ExpBar } from '@/components/dashboard/ExpBar/ExpBar';
import { CheckinCard } from '@/components/dashboard/LeftPanel/CheckinCard';
import { DailyGoalCard } from '@/components/dashboard/LeftPanel/DailyGoalCard';
import { MonthlyGoalCard } from '@/components/dashboard/LeftPanel/MonthlyGoalCard';
import { DailyReportBtn } from '@/components/dashboard/LeftPanel/DailyReportBtn';
import { CalendarCard } from '@/components/dashboard/RightPanel/CalendarCard';
import { TodayEventCard } from '@/components/dashboard/RightPanel/TodayEventCard';
import { TodayAttendanceCard } from '@/components/dashboard/RightPanel/TodayAttendanceCard';
import { TodayTaskList } from '@/components/dashboard/RightPanel/TodayTaskList';
import {
  mockAttendanceToday,
  mockCalendarEvents,
  type MockCalendarEvent,
  mockTasks,
} from '@/mocks/dashboard';
import { useDashboardHomePlan } from '@/features/sys-dashboard/context/DashboardHomePlanContext';
import { cx } from '@/shared/lib/cx';

function LeftColumnCards() {
  return (
    <div className="flex flex-col gap-3">
      <CheckinCard />
      <DailyGoalCard />
      <MonthlyGoalCard />
      <DailyReportBtn />
    </div>
  );
}

type MiddleStackProps = {
  calendarEvents: MockCalendarEvent[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  showAttendance: boolean;
  /** 大螢幕：填滿中欄剩餘高度；小螢幕：僅垂直排列 */
  layout: 'scroll' | 'fill';
};

function MiddleStack({
  calendarEvents,
  selectedDate,
  onSelectDate,
  showAttendance,
  layout,
}: MiddleStackProps) {
  const attendanceBlock = showAttendance ? (
    <div
      className={cx(
        'pr-0.5',
        layout === 'fill' &&
          'nx-master-scroll min-h-0 max-h-[min(240px,32vh)] shrink-0 overflow-y-auto overscroll-contain',
      )}
    >
      <TodayAttendanceCard people={mockAttendanceToday} />
    </div>
  ) : null;

  if (layout === 'fill') {
    return (
      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <CalendarCard
            events={calendarEvents}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
        </div>
        <div className="nx-master-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          <TodayEventCard events={calendarEvents} focusDate={selectedDate} />
        </div>
        {attendanceBlock}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <CalendarCard
        events={calendarEvents}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
      <TodayEventCard events={calendarEvents} focusDate={selectedDate} />
      {showAttendance ? <TodayAttendanceCard people={mockAttendanceToday} /> : null}
    </div>
  );
}

export function SysDashboardPage() {
  const { planCode } = useDashboardHomePlan();
  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const tasks = useMemo(() => mockTasks.map((t) => ({ ...t })), []);

  const showExpBar = planCode === 'PRO';
  const showLeftPanel = planCode === 'PRO';
  /** 人資出勤為 PRO（NX07）；PLUS 與 LITE 皆不顯示今日上班 */
  const showAttendance = planCode === 'PRO';

  const calendarEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasToday = mockCalendarEvents.some((e) => e.date === todayStr);
    if (hasToday) return mockCalendarEvents;
    const filler: MockCalendarEvent = {
      date: todayStr,
      type: 'LEAVE',
      title: '（Mock）排假示意',
      time: '全天',
      creatorName: '系統',
    };
    return [...mockCalendarEvents, filler];
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const el = document.activeElement;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const middleProps = {
    calendarEvents,
    selectedDate,
    onSelectDate: setSelectedDate,
    showAttendance,
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <input
        ref={searchRef}
        type="search"
        tabIndex={-1}
        className="sr-only"
        aria-label="全域搜尋"
        placeholder="搜尋…"
      />

      <div className="nx-dash-frame flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
        {showExpBar ? (
          <div className="shrink-0">
            <ExpBar />
          </div>
        ) : null}

        <div
          className={cx(
            'flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden',
            showExpBar ? 'mt-2' : 'mt-0',
          )}
        >
          <div className="nx-master-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="space-y-3 pb-2">
              {showLeftPanel ? (
                <div className="space-y-3 border-b border-border/80 pb-3">
                  <LeftColumnCards />
                </div>
              ) : null}
              <MiddleStack {...middleProps} layout="scroll" />
              <TodayTaskList tasks={tasks} planCode={planCode} listScrollable={false} />
            </div>
          </div>
        </div>

        <div
          className={cx(
            'hidden min-h-0 flex-1 gap-4 overflow-hidden lg:grid',
            showExpBar ? 'mt-3' : 'mt-0',
            showLeftPanel
              ? 'lg:grid-cols-[minmax(220px,15vw)_minmax(0,1fr)_minmax(300px,24vw)]'
              : 'lg:grid-cols-[minmax(0,1fr)_minmax(300px,26vw)]',
          )}
        >
          {showLeftPanel ? (
            <aside className="nx-master-scroll min-h-0 overflow-y-auto overscroll-contain border-r border-border/80 pr-3">
              <LeftColumnCards />
            </aside>
          ) : null}

          <MiddleStack {...middleProps} layout="fill" />

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-border/80 pl-3 lg:min-w-[280px] lg:max-w-[420px] xl:max-w-[460px]">
            <TodayTaskList
              tasks={tasks}
              planCode={planCode}
              className="min-h-0 flex-1"
              listScrollable
            />
          </div>
        </div>
      </div>
    </div>
  );
}
