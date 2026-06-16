/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-003-F01
 * SYS_DASHBOARD 頂欄（Phase 1 Mock）
 */

'use client';

import { useEffect, useState, type RefObject } from 'react';
import { ChevronDown, Moon, Sun, ChevronRight } from 'lucide-react';
import { useNxThemeMode } from '@design/hooks/useNxThemeMode';
import { cx } from '@design/utils/cx';
import type { MockBulletin, PlanCode } from '@/mocks/dashboard';

const NOTIF_MOCK = [
  { id: 1, title: '新訂單通知', time: '5 分鐘前' },
  { id: 2, title: '庫存警示', time: '30 分鐘前' },
];

export type TopBarProps = {
  planCode: PlanCode;
  moduleTitle: string;
  tenantName: string;
  userName: string;
  roleLabel: string;
  avatarInitial: string;
  bulletins: MockBulletin[];
  onMarkBulletinRead: (id: number) => void;
  bulletinOpen: boolean;
  onBulletinOpenChange: (v: boolean) => void;
  userOpen: boolean;
  onUserOpenChange: (v: boolean) => void;
  notifOpen: boolean;
  onNotifOpenChange: (v: boolean) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onLogout: () => void;
};

function useTwLineClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const timeStr = now.toLocaleTimeString('zh-TW', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return { dateStr, timeStr };
}

function planBadgeClass(code: PlanCode) {
  return cx(
    'rounded-md border-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
    code === 'LITE' && 'border-[#e8a020] text-[#e8a020]',
    code === 'PLUS' && 'border-[#e8a020] text-[#f5c842]',
    code === 'PRO' && 'border-[#e8a020] bg-[var(--color-primary-bg)] text-[#f5c842]',
  );
}

function bulletinTypeLabel(t: MockBulletin['type']) {
  if (t === 'URGENT') return '緊急';
  if (t === 'COMPANY') return '公司';
  return '系統';
}

export function TopBar({
  planCode,
  moduleTitle,
  tenantName,
  userName,
  roleLabel,
  avatarInitial,
  bulletins,
  onMarkBulletinRead,
  bulletinOpen,
  onBulletinOpenChange,
  userOpen,
  onUserOpenChange,
  notifOpen,
  onNotifOpenChange,
  searchInputRef,
  onLogout,
}: TopBarProps) {
  const { dateStr, timeStr } = useTwLineClock();
  const { themeMode, cycleThemeMode } = useNxThemeMode();
  const unread = bulletins.filter((b) => !b.isRead).length;
  const isLight = themeMode === 'light';

  return (
    <header className="nx-sys-topbar sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <input
        ref={searchInputRef}
        type="search"
        tabIndex={-1}
        className="sr-only"
        aria-label="全域搜尋"
        placeholder="搜尋…"
      />
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <a href="/dashboard" className="shrink-0 text-sm font-bold tracking-tight text-foreground">
            NEXORA GRID
          </a>
          <span className={planBadgeClass(planCode)}>{planCode}</span>
          <span className="truncate text-xs text-muted-foreground">{tenantName}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">·</span>
          <span className="hidden text-xs font-medium text-foreground sm:inline">{moduleTitle}</span>
        </div>

        <div className="hidden shrink-0 text-center text-xs leading-tight text-muted-foreground md:block">
          <div>{dateStr}</div>
          <div className="tabular-nums text-foreground">{timeStr}</div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                onBulletinOpenChange(!bulletinOpen);
                onUserOpenChange(false);
                onNotifOpenChange(false);
              }}
              className="relative rounded-xl p-2 text-lg hover:bg-secondary"
              aria-label="公告"
            >
              📢
              {unread > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
            </button>
            {bulletinOpen ? (
              <div className="absolute right-0 z-[60] mt-1 w-80 rounded-xl border border-border bg-popover shadow-xl">
                <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold">
                  公告 · 未讀 {unread}
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                  {bulletins.slice(0, 5).map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2 border-b border-border/30 px-3 py-2 text-xs last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground">
                            {bulletinTypeLabel(b.type)}
                          </span>
                          {!b.isRead ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
                          ) : null}
                        </div>
                        <div className="mt-0.5 font-medium text-foreground">{b.title}</div>
                        <div className="text-[10px] text-muted-foreground">{b.date}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onMarkBulletinRead(b.id)}
                        className="shrink-0 rounded-lg p-1 hover:bg-secondary"
                        aria-label="標記已讀"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border/60 px-3 py-2">
                  <a
                    href="/dashboard/bulletin"
                    className="text-xs text-primary hover:underline"
                  >
                    查看所有公告 →
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                onNotifOpenChange(!notifOpen);
                onBulletinOpenChange(false);
                onUserOpenChange(false);
              }}
              className="relative rounded-xl p-2 text-lg hover:bg-secondary"
              aria-label="通知"
            >
              🔔
            </button>
            {notifOpen ? (
              <div className="absolute right-0 z-[60] mt-1 w-72 rounded-xl border border-border bg-popover py-2 shadow-xl">
                <div className="px-3 pb-2 text-xs font-semibold">通知</div>
                <ul className="max-h-56 overflow-y-auto">
                  {NOTIF_MOCK.map((n) => (
                    <li key={n.id} className="px-3 py-2 text-xs hover:bg-secondary/50">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-[10px] text-muted-foreground">{n.time}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => cycleThemeMode()}
            className="rounded-xl p-2 text-lg hover:bg-secondary"
            aria-label="切換深淺模式"
          >
            {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                onUserOpenChange(!userOpen);
                onBulletinOpenChange(false);
                onNotifOpenChange(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-border/60 px-2 py-1.5 hover:bg-secondary"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                {avatarInitial.slice(0, 1)}
              </span>
              <span className="hidden max-w-[100px] truncate text-left text-xs sm:block">
                <span className="block font-medium text-foreground">{userName}</span>
                <span className="block text-[10px] text-muted-foreground">{roleLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {userOpen ? (
              <div className="absolute right-0 z-[60] mt-1 w-48 rounded-xl border border-border bg-popover py-1 shadow-xl">
                <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary">
                  個人設定
                </button>
                <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-secondary">
                  系統設定
                </button>
                <div className="my-1 border-t border-border/60" />
                <button
                  type="button"
                  onClick={() => onLogout()}
                  className="block w-full px-3 py-2 text-left text-xs text-[var(--color-danger)] hover:bg-secondary"
                >
                  登出系統
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
