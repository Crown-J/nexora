/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-001-F01
 * 首頁儀表板 Phase 1：Mock Data + planCode 版型
 *
 * LITE／PLUS：區塊一全寬快捷鍵 → 區塊二（行事曆＋事件簿）｜區塊三（任務清單）
 * PRO：上列 65/35（經驗條＋排位｜快捷鍵）；下列左 65% 內 35/65（簽到目標｜行事曆事件簿）＋右 35% 任務清單
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarCard } from '@/components/dashboard/RightPanel/CalendarCard';
import { EventBookCard } from '@/components/dashboard/RightPanel/EventBookCard';
import { TaskListCard } from '@/components/dashboard/RightPanel/TaskListCard';
import {
  mockCalendarEvents,
  mockTasks,
  type MockCalendarEvent,
  type MockTask,
  type PlanCode,
} from '@/mocks/dashboard';
import { useDashboardHomePlan } from '@/features/sys-dashboard/context/DashboardHomePlanContext';
import { getDashboardQuickShortcuts } from '@/features/sys-dashboard/config/dashboardQuickShortcuts';
import { DashboardQuickShortcuts } from '@/features/sys-dashboard/ui/DashboardQuickShortcuts';
import { ProExpRankBar } from '@/features/sys-dashboard/ui/ProExpRankBar';
import { ProNx10LeftPanel } from '@/features/sys-dashboard/ui/ProNx10LeftPanel';
import { cx } from '@/shared/lib/cx';

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

type ProHomeBodyProps = {
  calendarEvents: MockCalendarEvent[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  tasks: MockTask[];
  planCode: PlanCode;
  compact: boolean;
};

function ProHomeBody({
  calendarEvents,
  selectedDate,
  onSelectDate,
  tasks,
  planCode,
  compact,
}: ProHomeBodyProps) {
  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <ProExpRankBar />
        <DashboardQuickShortcuts />
        <ProNx10LeftPanel />
        <div className="flex shrink-0 flex-col gap-3">
          <CalendarCard
            events={calendarEvents}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            className="w-full max-w-[600px]"
          />
          <EventBookCard
            events={calendarEvents}
            focusDate={selectedDate}
            className="w-full max-w-[600px]"
          />
        </div>
        <TaskListCard tasks={tasks} planCode={planCode} listScrollable={false} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="grid shrink-0 grid-cols-[minmax(0,13fr)_minmax(0,7fr)] items-stretch gap-3">
        <ProExpRankBar className="h-full min-h-0" />
        <DashboardQuickShortcuts className="h-full min-h-0" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,13fr)_minmax(0,7fr)] gap-3 overflow-hidden">
        <div className="grid min-h-0 grid-cols-[minmax(0,7fr)_minmax(0,13fr)] gap-3 overflow-hidden">
          <ProNx10LeftPanel className="nx-master-scroll min-h-0 overflow-y-auto overscroll-contain pr-0.5" />
          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
            <div className="shrink-0">
              <CalendarCard
                events={calendarEvents}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
              />
            </div>
            <div className="nx-master-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
              <EventBookCard
                events={calendarEvents}
                focusDate={selectedDate}
                fillContainerHeight
                className="h-full min-h-0"
              />
            </div>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-border/60 pl-3 lg:min-w-[280px] lg:max-w-[420px] xl:max-w-[460px]">
          <TaskListCard
            tasks={tasks}
            planCode={planCode}
            fillColumnHeight
            listScrollable
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

  const showNx10 = planCode === 'PRO';

  const quickShortcuts = useMemo(() => getDashboardQuickShortcuts(planCode), [planCode]);

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
        const hit = quickShortcuts.find((s) => s.key === letter);
        if (hit) {
          e.preventDefault();
          router.push(hit.href);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, quickShortcuts, router]);

  const liteBodyProps = {
    calendarEvents,
    selectedDate,
    onSelectDate: setSelectedDate,
    tasks,
    planCode,
  };

  const proBodyProps = {
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
          <div className="nx-master-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="space-y-3 pb-2">
              {showNx10 ? (
                <ProHomeBody {...proBodyProps} compact />
              ) : (
                <LitePlusHomeBody {...liteBodyProps} compact />
              )}
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-hidden lg:block">
          {showNx10 ? (
            <ProHomeBody {...proBodyProps} compact={false} />
          ) : (
            <LitePlusHomeBody {...liteBodyProps} compact={false} />
          )}
        </div>
      </div>
    </div>
  );
}
