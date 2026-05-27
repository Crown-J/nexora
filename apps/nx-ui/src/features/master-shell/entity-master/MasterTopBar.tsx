// apps/nx-ui/src/features/master-shell/entity-master/MasterTopBar.tsx
/**
 * MasterTopBar — 主檔頁共用置頂列（鋼鐵星球、簡約、桌面+手機+全鍵盤）
 *
 * 補回簡約版缺的 3 功能 + 使用者按鈕：
 *  1. 模組選單（小星球）：搜尋 + 7 大模組快跳 + 全主檔分區快跳（業務員 daily 不點 5 次）
 *  2. 公告（未讀紅點）
 *  3. 通知（未讀紅點）
 *  + 使用者按鈕（公司名 / 帳號 / 登出）
 *
 * 左→右：返回 · 模組選單 · 分類/標題（中段）· 計數 · 公告 · 通知 · 使用者
 * 全鍵盤：Alt+M 開模組選單；各 popover Esc 關、Tab 可達、Enter 觸發。
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, ChevronRight, LayoutGrid, LogOut, Megaphone, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { HOME_DOCK_ITEMS } from '@/components/home/dock';
import {
  MASTER_HUB_CARDS,
  MASTER_HUB_SECTION_ORDER,
  MASTER_HUB_SECTION_TITLES,
} from '@/features/base/config/master-cards';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';

/** 輕量 popover：點外關 + Esc 關，回傳容器 ref / 開關 state */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const PANEL =
  'absolute z-50 mt-2 rounded-xl border border-[#2A2A30] bg-[#131316]/97 shadow-2xl backdrop-blur-xl';

export function MasterTopBar({
  category,
  title,
  count,
  onBack,
  requestNavigate,
  unreadAnnouncements = 0,
  unreadNotifications = 0,
}: {
  category: string;
  title: string;
  count: string;
  onBack: () => void;
  /** 跳轉（由父層提供、含編輯 dirty 攔截） */
  requestNavigate: (href: string) => void;
  unreadAnnouncements?: number;
  unreadNotifications?: number;
}) {
  const router = useRouter();
  const { displayName, tenantNameZh, planCode, me, logout } = useSessionMe();

  const moduleMenu = usePopover();
  const announceMenu = usePopover();
  const notifyMenu = usePopover();
  const userMenu = usePopover();
  const [kw, setKw] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Alt+M 開模組選單
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        moduleMenu.setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moduleMenu]);

  useEffect(() => {
    if (moduleMenu.open) {
      setKw('');
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [moduleMenu.open]);

  const go = useCallback(
    (href: string) => {
      moduleMenu.setOpen(false);
      requestNavigate(href);
    },
    [moduleMenu, requestNavigate],
  );

  // 主檔清單（依搜尋過濾）
  const filteredCards = useMemo(() => {
    const s = kw.trim();
    if (!s) return MASTER_HUB_CARDS;
    return MASTER_HUB_CARDS.filter(
      (c) => c.title.includes(s) || c.description.includes(s),
    );
  }, [kw]);

  const sections = useMemo(
    () =>
      MASTER_HUB_SECTION_ORDER.map((sid) => ({
        id: sid,
        title: MASTER_HUB_SECTION_TITLES[sid],
        cards: filteredCards.filter((c) => c.section === sid),
      })).filter((s) => s.cards.length > 0),
    [filteredCards],
  );

  const userInitial = (displayName || me?.username || 'U').slice(0, 1).toUpperCase();

  return (
    <header
      className="flex items-center gap-2 border-b border-[#2A2A30] px-2 py-2 sm:gap-3 sm:px-4"
      style={{ backgroundImage: 'linear-gradient(180deg, #16161B 0%, #101014 100%)' }}
    >
      {/* 返回 */}
      <IconButton label="返回" onClick={onBack}>
        <ArrowLeft className="size-4" />
      </IconButton>

      {/* 模組選單 */}
      <div className="relative" ref={moduleMenu.ref}>
        <IconButton
          label="模組選單 (Alt+M)"
          active={moduleMenu.open}
          onClick={() => moduleMenu.setOpen((o) => !o)}
        >
          <LayoutGrid className="size-4" />
        </IconButton>
        {moduleMenu.open ? (
          <div className={cn(PANEL, 'left-0 w-[min(92vw,30rem)] p-3')}>
            {/* 搜尋 */}
            <div className="flex items-center gap-2 rounded-lg border border-[#2A2A30] bg-[#0A0A0C] px-2.5 py-1.5">
              <Search className="size-3.5 text-[#E8A020]" />
              <input
                ref={searchRef}
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder="搜尋主檔（職務 / 幣別 / 零件…）"
                className="flex-1 bg-transparent text-sm text-[#E8E8EB] outline-none placeholder:text-[#5A5A60]"
              />
            </div>

            {/* 模組快跳 */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {HOME_DOCK_ITEMS.map((m) => (
                <button
                  key={m.href}
                  type="button"
                  onClick={() => go(m.href)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-[#2A2A30] bg-[#0E0E12] px-1 py-2 text-[11px] text-[#B8B8C0] transition-colors hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/50"
                >
                  <m.icon className="size-4" />
                  {m.label}
                </button>
              ))}
            </div>

            {/* 主檔分區快跳 */}
            <div className="mt-3 max-h-[46vh] overflow-auto pr-1">
              {sections.length === 0 ? (
                <div className="px-1 py-6 text-center text-xs text-[#5A5A60]">查無主檔</div>
              ) : (
                sections.map((sec) => (
                  <div key={sec.id} className="mb-2">
                    <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A5A60]">
                      {sec.title}
                    </div>
                    {sec.cards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => go(c.href)}
                        className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-[#E8E8EB] transition-colors hover:bg-[#E8A020]/12 hover:text-[#E8A020] focus:outline-none focus-visible:bg-[#E8A020]/12"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0] group-hover:text-[#E8A020]">
                          <c.icon className="size-3.5" />
                        </span>
                        <span className="flex-1 truncate text-left">{c.title}</span>
                        <ChevronRight className="size-3.5 text-[#5A5A60] group-hover:text-[#E8A020]" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* 分類 / 標題 */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5A5A60]">
          {category}
        </div>
        <h1 className="truncate text-sm font-bold tracking-wide text-[#F0F0F3]">{title}</h1>
      </div>

      {/* 計數 */}
      <span className="hidden shrink-0 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1 text-[11px] font-mono tabular-nums text-[#B8B8C0] sm:inline">
        {count}
      </span>

      {/* 公告 */}
      <div className="relative" ref={announceMenu.ref}>
        <IconButton label="公司公告" badge={unreadAnnouncements} onClick={() => announceMenu.setOpen((o) => !o)}>
          <Megaphone className="size-4" />
        </IconButton>
        {announceMenu.open ? (
          <div className={cn(PANEL, 'right-0 w-[min(88vw,18rem)] p-3')}>
            <PanelTitle text="公司公告" />
            <p className="px-1 py-2 text-xs text-[#888892]">
              {unreadAnnouncements > 0 ? `有 ${unreadAnnouncements} 則未讀公告` : '目前沒有未讀公告'}
            </p>
            <button
              type="button"
              onClick={() => {
                announceMenu.setOpen(false);
                requestNavigate('/dashboard/base/bulletins');
              }}
              className="mt-1 w-full rounded-md border border-[#E8A020]/30 bg-[#E8A020]/10 px-3 py-1.5 text-xs font-medium text-[#E8A020] transition-colors hover:bg-[#E8A020]/20"
            >
              查看全部公告
            </button>
          </div>
        ) : null}
      </div>

      {/* 通知 */}
      <div className="relative" ref={notifyMenu.ref}>
        <IconButton label="系統通知" badge={unreadNotifications} onClick={() => notifyMenu.setOpen((o) => !o)}>
          <Bell className="size-4" />
        </IconButton>
        {notifyMenu.open ? (
          <div className={cn(PANEL, 'right-0 w-[min(88vw,18rem)] p-3')}>
            <PanelTitle text="系統通知" />
            <p className="px-1 py-2 text-xs text-[#888892]">
              {unreadNotifications > 0 ? `有 ${unreadNotifications} 則新通知` : '目前沒有新通知'}
            </p>
          </div>
        ) : null}
      </div>

      {/* 使用者 */}
      <div className="relative" ref={userMenu.ref}>
        <button
          type="button"
          onClick={() => userMenu.setOpen((o) => !o)}
          aria-label="使用者選單"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2A2A30] bg-[#1A1A1F] text-xs font-bold text-[#E8A020] transition-colors hover:border-[#E8A020]/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/50"
        >
          {userInitial}
        </button>
        {userMenu.open ? (
          <div className={cn(PANEL, 'right-0 w-[min(88vw,16rem)] p-3')}>
            <div className="px-1">
              <div className="truncate text-sm font-semibold text-[#F0F0F3]">{tenantNameZh || 'NEXORA'}</div>
              <div className="mt-0.5 truncate text-xs text-[#888892]">
                {displayName || me?.username}
                {planCode ? <span className="ml-1 text-[#E8A020]">· {planCode}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                userMenu.setOpen(false);
                void logout();
              }}
              className="mt-3 flex w-full items-center gap-2 rounded-md border border-[#2A2A30] bg-[#0E0E12] px-3 py-1.5 text-xs font-medium text-[#B8B8C0] transition-colors hover:border-[#E26060]/40 hover:bg-[#E26060]/10 hover:text-[#E26060]"
            >
              <LogOut className="size-3.5" />
              登出
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  active,
  badge,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/50',
        active
          ? 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]'
          : 'border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0] hover:border-[#E8A020]/40 hover:text-[#E8A020]',
      )}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#E26060] px-1 text-[9px] font-bold leading-[16px] text-white shadow-[0_0_6px_#E26060]">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}

function PanelTitle({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#2A2A30] pb-2">
      <span className="text-xs font-semibold tracking-wide text-[#F0F0F3]">{text}</span>
      <X className="size-3 text-[#5A5A60]" />
    </div>
  );
}
