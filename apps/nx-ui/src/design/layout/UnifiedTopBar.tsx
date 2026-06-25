// apps/nx-ui/src/components/shell/UnifiedTopBar.tsx
// NX00 統一 TopBar（取代 HomeTopBar / MasterTopBar）
// 對齊 Hana 成品 NEXORA 系統.html .topbar 段：
// 左：dock 觸發（小星球）+ NEXORA GRID 品牌 + 租戶名
// 右：時鐘 + 公告 + 通知 + 環境設定 + 用戶選單
// 主題切換：localStorage 持久、即時 toggle html.light

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tryNavigate } from '@design/hooks/useDirtyGuard';
import {
  Bell, Building2, ChevronDown, HelpCircle, LayoutGrid, LogOut, Lock,
  Megaphone, Moon, Settings, Sun, User,
} from 'lucide-react';
// 2026-06-25 執行長拍板「測試資料移除」Phase 1：BULLETINS / NOTIFICATIONS / TENANT_NAME mock 全拆
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { listBulletins, type BulletinDto } from '@data/endpoints/nx01/api/bulletin';
import { PlanetSlot } from '@design/home/SharedPlanetRoot';

type BulletinVm = BulletinDto & { unread: boolean };

type TopBarProps = {
  displayName: string;
  employeeNo: string;
  onLogout: () => void;
  onDockToggle: () => void;
  onHome: () => void;
};

function useTheme() {
  // SSR 時無 window、lazy initializer 跑在 client 第一次 render、避免後續 setState-in-effect
  const [light, setLight] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('nx-theme') === 'light';
  });
  // useEffect 只負責同步 DOM、不 setState（保留 hydration 第一輪後 toggle）
  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
  }, [light]);
  const toggle = () => {
    setLight((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('nx-theme', next ? 'light' : 'dark');
      } catch {}
      return next;
    });
  };
  return { light, toggle };
}

function useClock() {
  // SSR 用 null 顯示 "—"、client mount 後 useEffect 啟 interval（setState-in-effect 用 disable、為 client-only setTimer 範式）
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only 時鐘初始化、必須在 effect 啟動
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function useOutsideClose(refs: React.RefObject<HTMLElement | null>[], onClose: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (refs.some((r) => r.current && r.current.contains(e.target as Node))) return;
      onClose();
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [refs, onClose]);
}

export function UnifiedTopBar({ displayName, employeeNo, onLogout, onDockToggle, onHome }: TopBarProps) {
  const router = useRouter();
  const { light, toggle: toggleTheme } = useTheme();
  const now = useClock();
  const { tenantNameZh } = useSessionMe();
  const tenantName = tenantNameZh || 'NEXORA';

  const [open, setOpen] = useState<null | 'bull' | 'noti' | 'set' | 'user'>(null);
  const bullRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useOutsideClose([bullRef, notiRef, setRef, userRef], () => setOpen(null));

  // 2026-06-25 Phase 1：接 listBulletins、isRead 暫一律 unread=true（Phase 2 接 :id/read tracking）
  const [bulletins, setBulletins] = useState<BulletinVm[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await listBulletins({ isActive: true, pageSize: 20 });
        if (!cancelled) setBulletins(res.items.map((b) => ({ ...b, unread: true })));
      } catch {
        if (!cancelled) setBulletins([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadBull = bulletins.filter((b) => b.unread).length;
  const pendingNoti = 0; // 2026-06-25：通知後端 endpoint 待開發、暫顯空狀態
  const initial = displayName.charAt(0);

  const dStr = now
    ? now.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })
    : '—';
  const tStr = now
    ? now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : '—';

  return (
    <header className="nx-topbar sticky top-0 z-50 border-b border-border/40 bg-[color-mix(in_oklch,var(--card)_72%,transparent)] backdrop-blur-md backdrop-saturate-150">
      <div className="flex h-14 items-center gap-3 px-4">
        {/* Dock 觸發按鈕（對齊 Hana demo .dock-trigger 規格 46×46、星球填滿）*/}
        <button
          type="button"
          onClick={onDockToggle}
          aria-label="導覽選單，快捷鍵 Alt+X"
          title="導覽 · Alt+X"
          className="relative grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl hover:bg-foreground/[0.06] transition"
        >
          <PlanetSlot id="topbar" className="absolute inset-0 rounded-full" />
        </button>

        {/* NEXORA GRID 品牌 → 點回首頁 */}
        <button
          type="button"
          onClick={onHome}
          title="回首頁"
          className="whitespace-nowrap text-[15px] font-bold tracking-wide text-foreground hover:opacity-80"
        >
          NEXORA <span className="text-[var(--warning)]">GRID</span>
        </button>

        {/* 租戶名 */}
        <span className="ml-1 flex items-center gap-1.5 border-l border-border/50 pl-3 text-xs text-muted-foreground whitespace-nowrap">
          <Building2 className="h-3.5 w-3.5 opacity-70" />
          {tenantName}
        </span>

        <div className="flex-1" />

        {/* 時鐘 */}
        <div className="mr-1 hidden text-right leading-tight md:block">
          <div className="text-[11px] tracking-wide text-muted-foreground">{dStr}</div>
          <div className="font-mono text-[13px] tabular-nums tracking-wide text-foreground">{tStr}</div>
        </div>

        {/* 公告 */}
        <div ref={bullRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(open === 'bull' ? null : 'bull');
            }}
            aria-label="公告"
            className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition"
          >
            <Megaphone className="h-[18px] w-[18px]" />
            {unreadBull > 0 && (
              <span className="absolute right-1 top-1 grid min-w-[15px] h-[15px] px-1 place-items-center rounded-full bg-[var(--color-danger,#e24b4a)] text-[9px] font-bold text-white">
                {unreadBull}
              </span>
            )}
          </button>
          {open === 'bull' && (
            <div className="nx-menu absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-border/40 bg-[color-mix(in_oklch,var(--popover)_92%,transparent)] backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3 text-xs font-semibold">
                公告通知
                <span className="ml-auto font-mono text-[10px] text-[var(--warning)]">未讀 {unreadBull}</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {bulletins.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    目前沒有公告
                  </div>
                ) : (
                  bulletins.map((b) => (
                    <div
                      key={b.id}
                      className="flex gap-2.5 border-b border-border/20 px-4 py-3 last:border-b-0 hover:bg-foreground/[0.04] cursor-pointer"
                    >
                      <span className="h-fit whitespace-nowrap rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wide text-muted-foreground">
                        {b.type || '一般'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] leading-snug">{b.title}</div>
                        <div className="mt-1 font-mono text-[10.5px] text-muted-foreground">
                          {b.createdAt ? new Date(b.createdAt).toLocaleDateString('zh-TW') : ''}
                        </div>
                      </div>
                      {b.unread && <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-danger,#e24b4a)]" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 通知 */}
        <div ref={notiRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(open === 'noti' ? null : 'noti');
            }}
            aria-label="通知"
            className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition"
          >
            <Bell className="h-[18px] w-[18px]" />
            {pendingNoti > 0 && (
              <span className="absolute right-1 top-1 grid min-w-[15px] h-[15px] px-1 place-items-center rounded-full bg-[var(--color-danger,#e24b4a)] text-[9px] font-bold text-white">
                {pendingNoti}
              </span>
            )}
          </button>
          {open === 'noti' && (
            <div className="nx-menu absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-border/40 bg-[color-mix(in_oklch,var(--popover)_92%,transparent)] backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3 text-xs font-semibold">
                通知 · 待我處理
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{pendingNoti} 件待處理</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* 2026-06-25：通知後端 endpoint 待開發、暫顯空狀態 */}
                <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                  <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  目前沒有通知
                  <div className="mt-1 text-[10px] text-muted-foreground/70">通知功能即將推出</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2026-06-18 頁面引導:dispatch CustomEvent → PageGuideHost 接 → 開 overlay */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('nx:page-guide-open'));
          }}
          aria-label="頁面引導"
          title="頁面引導"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        {/* 環境設定 */}
        <div ref={setRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(open === 'set' ? null : 'set');
            }}
            aria-label="環境設定"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
          {open === 'set' && (
            <div className="nx-menu absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-border/40 bg-[color-mix(in_oklch,var(--popover)_92%,transparent)] backdrop-blur-xl shadow-2xl">
              <div className="border-b border-border/30 px-4 py-3 text-xs font-semibold">環境設定</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[12.5px] hover:bg-foreground/[0.04]"
              >
                <span className="flex-1 flex items-center gap-2">
                  {light ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  深淺主題
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full border ${
                    light ? 'border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_55%,transparent)]' : 'border-border/60 bg-foreground/10'
                  } transition`}
                >
                  <span
                    className={`absolute top-[1.5px] h-3.5 w-3.5 rounded-full transition ${
                      light ? 'left-[16px] bg-[var(--nx-accent-strong)]' : 'left-[1.5px] bg-muted-foreground'
                    }`}
                  />
                </span>
              </button>
              <div className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] text-muted-foreground">
                <span className="flex-1">雙重驗證 2FA</span>
                <span className="font-mono text-[11px]">後端接入後啟用</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] text-muted-foreground">
                <span className="flex-1">語言</span>
                <span className="font-mono text-[11px]">繁體中文</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] text-muted-foreground">
                <span className="flex-1">字級密度</span>
                <span className="font-mono text-[11px]">標準</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] text-muted-foreground">
                <span className="flex-1">快捷鍵</span>
                <span className="font-mono text-[11px]">Alt+X / Alt+A</span>
              </div>
              <div className="h-px bg-border/30" />
              <div className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] text-muted-foreground">
                <span className="flex-1">版本</span>
                <span className="font-mono text-[11px]">v1.5.1 beta</span>
              </div>
            </div>
          )}
        </div>

        {/* 用戶 */}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(open === 'user' ? null : 'user');
            }}
            className="flex items-center gap-2 rounded-xl border border-border/40 px-2 py-1 hover:bg-foreground/[0.06] transition"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--warning)_22%,transparent)] text-[13px] font-semibold text-[var(--nx-accent-strong)]">
              {initial}
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[12.5px] font-medium">{displayName}</span>
              <span className="block text-[10px] text-muted-foreground">{employeeNo}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {open === 'user' && (
            <div className="nx-menu absolute right-0 top-12 w-52 overflow-hidden rounded-2xl border border-border/40 bg-[color-mix(in_oklch,var(--popover)_94%,transparent)] backdrop-blur-xl shadow-2xl p-1.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  tryNavigate(() => router.push('/dashboard/me'), 'topbar: 個人儀表板 → /dashboard/me');
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12.5px] hover:bg-foreground/[0.06]"
              >
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                個人儀表板（待開放）
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  tryNavigate(() => router.push('/dashboard/me/change-password'), 'topbar: 修改密碼 → /dashboard/me/change-password');
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12.5px] hover:bg-foreground/[0.06]"
              >
                <Lock className="h-4 w-4 text-muted-foreground" />
                修改密碼
              </button>
              <div className="my-1 h-px bg-border/30" />
              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12.5px] text-[var(--color-danger,#e24b4a)] hover:bg-foreground/[0.06]"
              >
                <LogOut className="h-4 w-4" />
                登出
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// 補避免 unused-import 警告（User icon 保留以備個人選單擴充）
void User;
