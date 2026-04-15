/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-001-F01
 * 首頁儀表板 Phase 1：Mock Data + planCode 版型
 *
 * LITE／PLUS：區塊一全寬快捷鍵 → 區塊二（行事曆＋事件簿）｜區塊三（任務清單）
 * PRO：左欄簽到等｜中欄行事曆＋事件簿＋出勤｜右欄任務清單
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ExpBar } from '@/components/dashboard/ExpBar/ExpBar';
import { CheckinCard } from '@/components/dashboard/LeftPanel/CheckinCard';
import { DailyGoalCard } from '@/components/dashboard/LeftPanel/DailyGoalCard';
import { MonthlyGoalCard } from '@/components/dashboard/LeftPanel/MonthlyGoalCard';
import { DailyReportBtn } from '@/components/dashboard/LeftPanel/DailyReportBtn';
import { CalendarCard } from '@/components/dashboard/RightPanel/CalendarCard';
import { EventBookCard } from '@/components/dashboard/RightPanel/EventBookCard';
import { TodayAttendanceCard } from '@/components/dashboard/RightPanel/TodayAttendanceCard';
import { TaskListCard } from '@/components/dashboard/RightPanel/TaskListCard';
import {
  mockAttendanceToday,
  mockCalendarEvents,
  mockTasks,
  type MockCalendarEvent,
  type MockTask,
  type PlanCode,
} from '@/mocks/dashboard';
import { useDashboardHomePlan } from '@/features/sys-dashboard/context/DashboardHomePlanContext';
import { DASHBOARD_QUICK_SHORTCUTS } from '@/features/sys-dashboard/config/dashboardQuickShortcuts';
import { DashboardQuickShortcuts } from '@/features/sys-dashboard/ui/DashboardQuickShortcuts';
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
          <EventBookCard events={calendarEvents} focusDate={selectedDate} />
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
      <EventBookCard events={calendarEvents} focusDate={selectedDate} />
      {showAttendance ? <TodayAttendanceCard people={mockAttendanceToday} /> : null}
    </div>
  );
}

type LitePlusHomeBodyProps = {
  calendarEvents: MockCalendarEvent[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  tasks: MockTask[];
  planCode: PlanCode;
  /** 手機：外層捲動；大螢幕：任務欄內捲動 */
  compact: boolean;
};

function LitePlusHomeBody({
  calendarEvents,
  selectedDate,
  onSelectDate,
  tasks,
  planCode,
  compact,
}: LitePlusHomeBodyProps) {
  return (
    <div
      className={cx(
        'flex flex-col gap-3',
        compact ? 'min-h-0' : 'min-h-0 flex-1 overflow-hidden',
      )}
    >
      <DashboardQuickShortcuts />
      <div
        className={cx(
          'flex min-h-0 gap-3',
          compact ? 'flex-col' : 'flex-1 flex-col lg:flex-row lg:gap-4',
        )}
      >
        <div className="flex w-full max-w-[600px] shrink-0 flex-col gap-3 overflow-hidden">
          <div className="shrink-0">
            <CalendarCard
              events={calendarEvents}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              className="w-full max-w-[600px]"
            />
          </div>
          <div className="min-h-0 w-full max-w-[600px] flex-1 overflow-hidden lg:min-h-[12rem]">
            <EventBookCard
              events={calendarEvents}
              focusDate={selectedDate}
              fillContainerHeight={!compact}
              className={cx('w-full max-w-[600px]', !compact && 'h-full min-h-0')}
            />
          </div>
        </div>
        <div
          className={cx(
            'flex min-h-0 min-w-0 flex-1 flex-col border-t border-border/60 pt-3',
            !compact && 'lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0',
          )}
        >
          <TaskListCard
            tasks={tasks}
            planCode={planCode}
            fillColumnHeight={!compact}
            listScrollable={!compact}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}

export function SysDashboardPage() {
  const { planCode } = useDashboardHomePlan();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const tasks = useMemo(() => mockTasks.map((t) => ({ ...t })), []);

  const showExpBar = planCode === 'PRO';
  const showLeftPanel = planCode === 'PRO';
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
      isAllDay: true,
      creatorName: '系統',
    };
    return [...mockCalendarEvents, filler];
  }, []);

  useEffect(() => {
    const isTypingContext = (t: EventTarget | null) => {
      if (!t || !(t instanceof HTMLElement)) return false;
      if (t.isContentEditable) return true;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingContext(e.target)) return;

      if (e.key === '/') {
        if (pathname !== '/dashboard') return;
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (pathname !== '/dashboard') return;

      if (e.key.length === 1) {
        const letter = e.key.toLowerCase();
        const hit = DASHBOARD_QUICK_SHORTCUTS.find((s) => s.key === letter);
        if (hit) {
          e.preventDefault();
          router.push(hit.href);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  const middleProps = {
    calendarEvents,
    selectedDate,
    onSelectDate: setSelectedDate,
    showAttendance,
  };

  const liteBodyProps = {
    calendarEvents,
    selectedDate,
    onSelectDate: setSelectedDate,
    tasks,
    planCode,
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
              {showLeftPanel ? (
                <MiddleStack {...middleProps} layout="scroll" />
              ) : (
                <LitePlusHomeBody {...liteBodyProps} compact />
              )}
              {showLeftPanel ? (
                <TaskListCard tasks={tasks} planCode={planCode} listScrollable={false} />
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={cx(
            'hidden min-h-0 flex-1 gap-4 overflow-hidden lg:grid',
            showExpBar ? 'mt-3' : 'mt-0',
            showLeftPanel
              ? 'lg:grid-cols-[minmax(220px,15vw)_minmax(0,1fr)_minmax(300px,24vw)]'
              : 'lg:grid-cols-[minmax(0,1fr)]',
          )}
        >
          {showLeftPanel ? (
            <aside className="nx-master-scroll min-h-0 overflow-y-auto overscroll-contain border-r border-border/80 pr-3">
              <LeftColumnCards />
            </aside>
          ) : null}

          {showLeftPanel ? (
            <MiddleStack {...middleProps} layout="fill" />
          ) : (
            <LitePlusHomeBody {...liteBodyProps} compact={false} />
          )}

          {showLeftPanel ? (
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-border/80 pl-3 lg:min-w-[280px] lg:max-w-[420px] xl:max-w-[460px]">
              <TaskListCard
                tasks={tasks}
                planCode={planCode}
                fillColumnHeight
                className="min-h-0 flex-1"
                listScrollable
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
