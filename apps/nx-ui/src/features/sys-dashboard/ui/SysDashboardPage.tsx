/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-001-F01
 * 首頁儀表板 Phase 1：Mock Data + planCode 版型
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { MainShell } from '@/components/layout/MainShell';
import { ExpBar } from '@/components/dashboard/ExpBar/ExpBar';
import { CheckinCard } from '@/components/dashboard/LeftPanel/CheckinCard';
import { DailyGoalCard } from '@/components/dashboard/LeftPanel/DailyGoalCard';
import { MonthlyGoalCard } from '@/components/dashboard/LeftPanel/MonthlyGoalCard';
import { DailyReportBtn } from '@/components/dashboard/LeftPanel/DailyReportBtn';
import { CalendarCard } from '@/components/dashboard/RightPanel/CalendarCard';
import { TodayEventCard } from '@/components/dashboard/RightPanel/TodayEventCard';
import { TodayAttendanceCard } from '@/components/dashboard/RightPanel/TodayAttendanceCard';
import { TodayTaskList } from '@/components/dashboard/RightPanel/TodayTaskList';
import { ModuleMenuOverlay } from '@/components/dashboard/ModuleMenuOverlay';
import {
  mockAttendanceToday,
  mockBulletins,
  mockCalendarEvents,
  type MockCalendarEvent,
  mockCurrentUser,
  mockTasks,
  type MockBulletin,
  type MockTask,
  type PlanCode,
} from '@/mocks/dashboard';
import { useNxThemeMode } from '@/hooks/useNxThemeMode';
import { cx } from '@/shared/lib/cx';

export function SysDashboardPage() {
  const { logout, displayName, tenantNameZh } = useSessionMe();
  const { cycleThemeMode } = useNxThemeMode();
  const searchRef = useRef<HTMLInputElement>(null);

  const [planCode, setPlanCode] = useState<PlanCode>(mockCurrentUser.planCode);
  const [bulletins, setBulletins] = useState<MockBulletin[]>(() =>
    mockBulletins.map((b) => ({ ...b })),
  );
  const [tasks, setTasks] = useState<MockTask[]>(() => mockTasks.map((t) => ({ ...t })));

  const [bulletinOpen, setBulletinOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);

  const showExpBar = planCode === 'PRO';
  const showLeftPanel = planCode === 'PRO';
  const showAttendance = planCode === 'PLUS' || planCode === 'PRO';

  const markBulletinRead = useCallback((id: number) => {
    setBulletins((prev) => prev.map((b) => (b.id === id ? { ...b, isRead: true } : b)));
  }, []);

  const calendarEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasToday = mockCalendarEvents.some((e) => e.date === todayStr);
    if (hasToday) return mockCalendarEvents;
    const filler: MockCalendarEvent = {
      date: todayStr,
      type: 'LEAVE',
      title: '（Mock）排假示意',
      time: '全天',
    };
    return [...mockCalendarEvents, filler];
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.nx-sys-topbar')) return;
      setBulletinOpen(false);
      setUserOpen(false);
      setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setModuleOpen((o) => !o);
        return;
      }
      if (moduleOpen) return;
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setBulletinOpen((v) => !v);
        setUserOpen(false);
        setNotifOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setNotifOpen((v) => !v);
        setBulletinOpen(false);
        setUserOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setUserOpen((v) => !v);
        setBulletinOpen(false);
        setNotifOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        cycleThemeMode();
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const el = document.activeElement;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycleThemeMode, moduleOpen]);

  const userName = displayName || mockCurrentUser.name;
  const tenantName = tenantNameZh || mockCurrentUser.tenantName;

  return (
    <>
      <MainShell
        topBarProps={{
          planCode,
          moduleTitle: '首頁',
          tenantName,
          userName,
          roleLabel: mockCurrentUser.role,
          avatarInitial: mockCurrentUser.avatarInitial,
          bulletins,
          onMarkBulletinRead: markBulletinRead,
          bulletinOpen,
          onBulletinOpenChange: setBulletinOpen,
          userOpen,
          onUserOpenChange: setUserOpen,
          notifOpen,
          onNotifOpenChange: setNotifOpen,
          searchInputRef: searchRef,
          onLogout: () => logout(),
        }}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/60 bg-secondary/10 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Phase 1 版型切換（Mock）</span>
          {(['LITE', 'PLUS', 'PRO'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlanCode(p)}
              className={cx(
                'rounded-lg border px-2 py-1 transition',
                planCode === p
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border hover:bg-secondary/50',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {showExpBar ? <ExpBar /> : null}

        <div
          className={cx(
            'mt-4 grid gap-4',
            showLeftPanel ? 'lg:grid-cols-[minmax(240px,280px)_1fr]' : 'grid-cols-1',
          )}
        >
          {showLeftPanel ? (
            <aside className="hidden space-y-4 lg:block">
              <CheckinCard />
              <DailyGoalCard />
              <MonthlyGoalCard />
              <DailyReportBtn />
            </aside>
          ) : null}

          <div className="min-w-0 space-y-4">
            <div
              className={cx(
                'grid gap-4',
                showAttendance ? 'xl:grid-cols-2' : 'md:grid-cols-2',
              )}
            >
              <CalendarCard events={calendarEvents} />
              <div className="space-y-4">
                <TodayEventCard events={calendarEvents} />
                {showAttendance ? <TodayAttendanceCard people={mockAttendanceToday} /> : null}
              </div>
            </div>
            <TodayTaskList tasks={tasks} onTasksChange={setTasks} planCode={planCode} />
          </div>
        </div>

        {showLeftPanel ? (
          <div className="mt-4 space-y-4 border-t border-border/40 pt-4 lg:hidden">
            <p className="text-xs text-muted-foreground">PRO：小螢幕左欄改直向排列</p>
            <CheckinCard />
            <DailyGoalCard />
            <MonthlyGoalCard />
            <DailyReportBtn />
          </div>
        ) : null}

        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md md:hidden"
          aria-label="行動導覽"
        >
          <button type="button" className="px-3 py-1 text-xs" onClick={() => setModuleOpen(true)}>
            模組
          </button>
          <button
            type="button"
            className="px-3 py-1 text-xs"
            onClick={() => setNotifOpen((v) => !v)}
          >
            通知
          </button>
          <button type="button" className="px-3 py-1 text-xs" onClick={() => searchRef.current?.focus()}>
            搜尋
          </button>
        </nav>
        <div className="h-14 md:hidden" />
      </MainShell>

      <ModuleMenuOverlay open={moduleOpen} onClose={() => setModuleOpen(false)} planCode={planCode} />
    </>
  );
}
