// apps/nx-ui/src/features/master-shell/ui/MasterShell.tsx
/**
 * NEXORA Master Shell — 外殼容器（LeftSidebar + TopHeader + main 容器）
 *
 * 抽自 lab/users（commit 41-48 鋼鐵星球範式）。
 *
 * 設計：
 * - 頁面 radial-gradient 背景（#11111A 頂 → #06060A 底，鋼鐵 + 太空感）
 * - 左側 MasterSidebar：星球選單 + 多 section nav 配置
 * - 右側 main：MasterTopHeader（標題 + 通知/公告/日期時間）+ children（toolbar / table / detail）
 * - sidebarRef：給外部用於 Alt+Q 焦點轉移
 * - onReturnToTable：sidebar nav item 點擊或 Enter 觸發（回到表格 + 第一筆）
 *
 * Sidebar 配置採資料驅動，各主檔頁面定義自己的 SidebarConfig。
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  ChevronDown,
  Clock,
  Megaphone,
  Plus,
  type LucideIcon,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HOME_DOCK_ITEMS, PlanetOrbTrigger } from '@/components/home/dock';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type SidebarNavItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  count?: number;
};

export type SidebarSection = {
  id: string;
  label: string;
  items: SidebarNavItem[];
  /** 右側「+ 新增」action（小 icon button，純視覺，無 callback）*/
  hasAddAction?: boolean;
};

export type SidebarConfig = {
  brandTitle: string;        // 「NEXORA GRID」
  brandSubtitle: string;     // 「測試公司（LITE）」
  sections: SidebarSection[];
  userInitial: string;       // 「管」
  userName: string;          // 「測試租戶管理員（LITE）」
  userMeta: string;          // 「admin · 使用者」
};

export type HeaderCountBadge = {
  icon: LucideIcon;
  text: string;              // 「5 位使用者」
};

export type HeaderConfig = {
  category: string;          // 「帳號與權限」
  title: string;             // 「使用者主檔」
  countBadge?: HeaderCountBadge;
  notificationBadge?: number;
  announcementBadge?: number;
};

// ──────────────────────────────────────────────────────────────
// MasterShell（外殼容器）
// ──────────────────────────────────────────────────────────────

export function MasterShell({
  sidebarRef,
  sidebarConfig,
  headerConfig,
  onReturnToTable,
  onNotification,
  onAnnouncement,
  children,
}: {
  sidebarRef: React.RefObject<HTMLElement | null>;
  sidebarConfig: SidebarConfig;
  headerConfig: HeaderConfig;
  onReturnToTable: () => void;
  onNotification: () => void;
  onAnnouncement: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-dvh text-[#E8E8EB]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)',
      }}
    >
      <MasterSidebar sidebarRef={sidebarRef} config={sidebarConfig} onReturnToTable={onReturnToTable} />
      <main className="flex min-w-0 flex-1 flex-col">
        <MasterTopHeader config={headerConfig} onNotification={onNotification} onAnnouncement={onAnnouncement} />
        {children}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// MasterSidebar
// ──────────────────────────────────────────────────────────────

function PlanetModuleMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="開啟模組選單"
          title="模組選單"
          className="group flex size-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all hover:border-[#E8A020]/30 hover:bg-[#E8A020]/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/40 data-[state=open]:border-[#E8A020]/40 data-[state=open]:bg-[#E8A020]/10"
        >
          <PlanetOrbTrigger className="scale-90" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-[14rem] border-[#2A2A30] bg-[#131316]/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal uppercase tracking-[0.18em] text-[#5A5A60]">
          NEXORA 模組
        </DropdownMenuLabel>
        {HOME_DOCK_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.href}
            asChild
            className="cursor-pointer rounded-md p-0 focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
          >
            <Link
              href={item.href}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-[#E8E8EB]"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0]">
                <item.icon className="size-3.5" />
              </span>
              <span className="flex-1 truncate font-medium">{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-nav-item
      style={
        active
          ? {
              backgroundImage:
                'linear-gradient(90deg, rgba(232,160,32,0.18) 0%, rgba(232,160,32,0.06) 60%, transparent 100%)',
              boxShadow:
                'inset 3px 0 0 0 #E8A020, inset 0 1px 0 0 rgba(232,160,32,0.15)',
            }
          : undefined
      }
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-all',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/50 focus-visible:bg-[#E8A020]/10',
        active
          ? 'text-[#E8A020] font-medium'
          : 'text-[#B8B8C0] hover:bg-[#1A1A1F] hover:text-[#E8E8EB]',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          active ? 'text-[#E8A020]' : 'text-[#888892] group-hover:text-[#E8E8EB]',
        )}
      />
      <span className="flex-1 truncate text-left">{label}</span>
      {count != null ? (
        <span
          className={cn(
            'rounded-md px-1.5 py-0.5 text-[10px] font-mono tabular-nums',
            active ? 'bg-[#E8A020]/15 text-[#E8A020]/85' : 'text-[#5A5A60]',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SectionLabel({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A5A60]">
        {label}
      </span>
      {action}
    </div>
  );
}

function MasterSidebar({
  sidebarRef,
  config,
  onReturnToTable,
}: {
  sidebarRef: React.RefObject<HTMLElement | null>;
  config: SidebarConfig;
  onReturnToTable: () => void;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-nav-item]'),
    );
    if (items.length === 0) return;
    const active = document.activeElement as HTMLButtonElement | null;
    const idx = active ? items.indexOf(active) : -1;
    let nextIdx: number;
    if (e.key === 'ArrowDown') nextIdx = idx < 0 ? 0 : Math.min(items.length - 1, idx + 1);
    else nextIdx = idx <= 0 ? 0 : idx - 1;
    e.preventDefault();
    items[nextIdx]?.focus();
  };

  return (
    <aside
      ref={sidebarRef}
      onKeyDown={handleKey}
      className="relative flex w-60 shrink-0 flex-col border-r border-[#2A2A30]"
      style={{
        backgroundImage: 'linear-gradient(180deg, #14141A 0%, #101014 50%, #0C0C10 100%)',
        boxShadow:
          'inset -1px 0 0 0 rgba(255,255,255,0.03), 1px 0 0 0 #000000, inset 0 1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-2.5 border-b border-[#2A2A30]/80 px-4 py-3.5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]">
        <PlanetModuleMenu />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[0.04em] text-[#F0F0F3]">
            {config.brandTitle}
          </p>
          <p className="truncate text-[11px] text-[#888892]">{config.brandSubtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 nx-master-scroll">
        {config.sections.map((section) => (
          <div key={section.id}>
            <SectionLabel
              label={section.label}
              action={
                section.hasAddAction ? (
                  <button
                    type="button"
                    className="rounded p-0.5 text-[#888892] transition-colors hover:bg-[#1A1A1F] hover:text-[#E8E8EB]"
                    aria-label="新增"
                  >
                    <Plus className="size-3.5" />
                  </button>
                ) : undefined
              }
            />
            <div className="space-y-0.5 px-1">
              {section.items.map((item) => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  count={item.count}
                  active={item.active}
                  onClick={onReturnToTable}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-2.5 border-t border-[#2A2A30] px-3 py-3"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(10,10,12,0.3) 0%, rgba(10,10,12,0.6) 100%)',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex size-8 items-center justify-center rounded-full border border-[#2A2A30] bg-gradient-to-b from-[#22222A] to-[#16161A] text-xs font-medium text-[#E8E8EB] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          {config.userInitial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[#E8E8EB]">{config.userName}</p>
          <p className="truncate text-[10px] text-[#5A5A60]">{config.userMeta}</p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-[#888892] transition-colors hover:bg-[#1A1A1F] hover:text-[#E8E8EB]"
          aria-label="使用者選單"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────
// MasterTopHeader
// ──────────────────────────────────────────────────────────────

function MasterTopHeader({
  config,
  onNotification,
  onAnnouncement,
}: {
  config: HeaderConfig;
  onNotification: () => void;
  onAnnouncement: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const timeText = now
    ? `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`
    : '--:--:--';
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const dateText = now
    ? `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${weekdays[now.getDay()]}`
    : '----/--/-- ---';

  const CountBadgeIcon = config.countBadge?.icon;

  return (
    <div
      className="relative flex items-center justify-between border-b border-[#2A2A30] px-6 py-4"
      style={{
        backgroundImage:
          'linear-gradient(180deg, #0D0D11 0%, #0A0A0C 100%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 1px)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 #000000',
      }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
          {config.category}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="relative pb-1 text-xl font-bold tracking-[-0.01em] text-[#F0F0F3]">
            {config.title}
            <span
              aria-hidden
              className="absolute -bottom-0 left-0 h-px w-12 bg-gradient-to-r from-[#E8A020] via-[#E8A020]/40 to-transparent"
            />
          </h1>
          {config.countBadge && CountBadgeIcon ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8A020]/30 bg-gradient-to-b from-[#E8A020]/12 to-[#E8A020]/6 px-2.5 py-0.5 text-[10px] font-medium text-[#E8A020] shadow-[inset_0_1px_0_0_rgba(232,160,32,0.15)]">
              <CountBadgeIcon className="size-3" />
              {config.countBadge.text}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TopHeaderIconButton
          icon={Bell}
          badge={config.notificationBadge}
          badgeTone="red"
          title="通知"
          onClick={onNotification}
        />
        <TopHeaderIconButton
          icon={Megaphone}
          badge={config.announcementBadge}
          badgeTone="amber"
          title="公告"
          onClick={onAnnouncement}
        />
        <div className="mx-1 h-7 w-px bg-[#2A2A30]" aria-hidden />
        <div className="flex items-center gap-2.5">
          <Clock className="size-3.5 text-[#5A5A60]" />
          <div className="flex flex-col items-end font-mono leading-tight tabular-nums">
            <span className="text-sm font-semibold text-[#E8E8EB] [text-shadow:0_0_8px_rgba(232,160,32,0.15)]">
              {timeText}
            </span>
            <span className="text-[10px] tracking-wider text-[#5A5A60]">{dateText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopHeaderIconButton({
  icon: Icon,
  badge,
  badgeTone,
  title,
  onClick,
}: {
  icon: LucideIcon;
  badge?: number;
  badgeTone?: 'red' | 'amber';
  title: string;
  onClick: () => void;
}) {
  const badgeColor =
    badgeTone === 'red'
      ? 'bg-[#E26060] text-white shadow-[0_0_8px_#E26060]'
      : 'bg-[#E8A020] text-[#0A0A0C] shadow-[0_0_8px_#E8A020]';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="relative rounded-lg border border-transparent p-2 text-[#888892] transition-all hover:border-[#2A2A30] hover:bg-[#1A1A1F] hover:text-[#E8E8EB]"
    >
      <Icon className="size-4" />
      {badge != null && badge > 0 ? (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none',
            badgeColor,
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}

