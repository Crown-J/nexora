/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-001-F01
 * 首頁儀表板 Phase 1：Mock Data + planCode 版型
 *
 * LITE／PLUS：區塊一全寬快捷鍵 → 區塊二（行事曆＋事件簿）｜區塊三（任務清單）
 * PRO：Grid 65fr／35fr；右欄同欄堆疊快捷＋任務寬度一致；左下列 KPI｜行事曆＋事件簿（60／40）｜今日上班
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
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

/**
 * 把後端回傳的 plan code string (e.g. 'NEXORA-PRO-XL', 'NEXORA-PLUS-L')
 * 收斂為 UI 使用的三段 PlanCode enum。
 */
function deriveTierFromPlanCode(planCodeStr: string | null | undefined): PlanCode {
  const s = String(planCodeStr ?? '').toUpperCase();
  if (s.includes('PRO')) return 'PRO';
  if (s.includes('PLUS')) return 'PLUS';
  return 'LITE';
}
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';
// HomeDashboardBody (21 卡版) + ModuleTilesBody (Win8 磚版) 都不用、留檔備查
// 本輪定案：HomeDashboardV2 = 上方 5 數據格 + 下方三欄
import { HomeDashboardV2 } from '@/features/home-dashboard/HomeDashboardV2';
import { ProExpRankBar } from '@/features/sys-dashboard/ui/ProExpRankBar';
import { ProNx10LeftPanel } from '@/features/sys-dashboard/ui/ProNx10LeftPanel';
import { ProTodayAttendancePanel } from '@/features/sys-dashboard/ui/ProTodayAttendancePanel';
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
      {/* QWERTY 快捷格已移除（鋼鐵星球範式不再需要、Alt+X 進星球模組選單）*/}
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
              className="w-full"
            />
          </div>
          <div className="min-h-0 w-full flex-1 overflow-hidden lg:min-h-[12rem]">
            <EventBookCard
              events={calendarEvents}
              focusDate={selectedDate}
              fillContainerHeight={!compact}
              className={cx('w-full', !compact && 'h-full min-h-0')}
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
        {/* QWERTY 快捷格已移除（鋼鐵星球範式不再需要、Alt+X 進星球模組選單）*/}
        <ProNx10LeftPanel />
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <CalendarCard
              events={calendarEvents}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              className="w-full"
            />
            <EventBookCard events={calendarEvents} focusDate={selectedDate} className="w-full" />
          </div>
          <ProTodayAttendancePanel className="min-h-0 sm:min-h-[12rem]" />
        </div>
        <TaskListCard tasks={tasks} planCode={planCode} listScrollable={false} />
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,65fr)_minmax(0,35fr)] grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <ProExpRankBar className="col-start-1 row-start-1 h-full min-h-0 self-stretch" />
      {/* QWERTY 已移除 */}
      <div className="col-start-1 row-start-2 grid h-full min-h-0 min-w-0 grid-cols-[minmax(0,35fr)_minmax(0,65fr)] gap-3 overflow-hidden">
        <ProNx10LeftPanel className="min-h-0 h-full min-w-0 overflow-hidden" />
        <div className="grid h-full min-h-0 min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 overflow-hidden">
          <div className="flex h-full min-h-0 min-w-0 w-full flex-col gap-3 overflow-hidden">
            <div className="flex min-h-0 min-w-0 w-full flex-[1.12] flex-col overflow-hidden">
              <CalendarCard
                events={calendarEvents}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
                fillContainerHeight
                className="h-full min-h-0 w-full"
              />
            </div>
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
              <EventBookCard
                events={calendarEvents}
                focusDate={selectedDate}
                fillContainerHeight
                className="h-full min-h-0 w-full flex-1"
              />
            </div>
          </div>
          <ProTodayAttendancePanel className="min-h-0 h-full min-w-0 overflow-hidden" />
        </div>
      </div>
      <div className="col-start-2 row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden">
        <TaskListCard
          tasks={tasks}
          planCode={planCode}
          fillColumnHeight
          listScrollable
          className="min-h-0 h-full w-full flex-1"
        />
      </div>
    </div>
  );
}

export function SysDashboardPage() {
  // 改用 session 實際 plan code 而非 mock context（R4-A：避免 TEST-PLUS 登入
  // 看到 PRO 區塊 — 原本 useDashboardHomePlan 預設 'PRO' 與登入租戶無關）
  const { planCode: sessionPlanCode } = useSessionMe();
  const planCode = deriveTierFromPlanCode(sessionPlanCode);
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const tasks = useMemo(() => mockTasks.map((t) => ({ ...t })), []);

  const showNx10 = planCode === 'PRO';

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

      // QWERTY 快捷格已移除（鋼鐵星球範式不再需要、模組導覽改走 MasterTopBar 星球選單 Alt+X）
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);

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
    <div
      className="flex h-dvh flex-col text-[#E8E8EB]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)',
      }}
    >
      {/* 鋼鐵星球範式置頂列：返回 · 星球模組選單(Alt+X) · 標題 · 公告 · 通知 · 使用者 */}
      <MasterTopBar
        category="首頁"
        title="個人儀表板"
        count=""
        requestNavigate={(href) => router.push(href)}
      />

      <input
        ref={searchRef}
        type="search"
        tabIndex={-1}
        className="sr-only"
        aria-label="全域搜尋"
        placeholder="搜尋…"
      />

      {/* Win8 磚式段①：6 模組磚主畫面
          - 業務中文名（絕不顯 NXxx）、依權限亮/反灰、靜態
          - 段② 補待辦角標數字（沿用 cards.config / api.ts 的列表 endpoint）
          - 段③ 公告收 topbar、段④ 待辦收 topbar、段⑤ 清下半部 mock */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden"><HomeDashboardV2 /></div>
      {/* 以下被替換的舊 mock 渲染區段（保留註解、Sub 3 整理清掉）*/}
      <div className="hidden">
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

        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden lg:flex">
          {showNx10 ? (
            <ProHomeBody {...proBodyProps} compact={false} />
          ) : (
            <LitePlusHomeBody {...liteBodyProps} compact={false} />
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
