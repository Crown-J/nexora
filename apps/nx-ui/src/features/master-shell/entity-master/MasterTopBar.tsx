// apps/nx-ui/src/features/master-shell/entity-master/MasterTopBar.tsx
/**
 * MasterTopBar — 主檔頁共用置頂列（鋼鐵星球、簡約、桌面+手機+全鍵盤）
 *
 * 左→右：返回 · 小星球模組選單 · 分類/標題（中段）· 計數 · 公告 · 通知 · 使用者
 *
 * 4 大功能（對齊 Crown 認可範式）：
 *  1. 模組選單 = NEXORA 小星球（PlanetOrbTrigger）；Alt+X 開、階層式側欄：
 *     左欄 7 大模組、滑過/點擊 → 右欄展開該模組子分頁（主檔列分區+主檔、其他模組佔位）。
 *  2. 公告（Megaphone、琥珀 badge）/ 3. 通知（Bell、紅 badge）= 使用者主檔頁質感 + glow
 *  4. 使用者 = 頭像 + 公司名 + 帳號 + 下拉箭頭（首頁 TopBar 範式）
 *
 * 全鍵盤（小星球）：Alt+X 開 · ↑↓ 左欄選模組 · → 進右欄子選單 · ← 回左欄 ·
 *   子選單 ↑↓ · Enter 跳該主檔頁（左欄 Enter = 進模組首頁）· Esc 關。
 * 公告/通知/使用者：Tab 切到 + Enter 開（不另設快捷鍵）。
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, ChevronRight, ClipboardList, LogOut, Megaphone, Search, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { HOME_DOCK_ITEMS, PlanetOrbTrigger } from '@design/home/dock';
import {
  MASTER_HUB_CARDS,
  MASTER_HUB_SECTION_ORDER,
  MASTER_HUB_SECTION_TITLES,
  canAccessMasterCard,
  normalizePlanCode,
  type MasterHubMinPlan,
} from '@/features/base/config/master-cards';
import { useSessionMe } from '@/features/auth/hooks/useSessionMe';
import { apiJson } from '@data/api/client';

const MASTER_HREF = '/dashboard/base';
const MASTER_MODULE_IDX = HOME_DOCK_ITEMS.findIndex((m) => m.href === MASTER_HREF);

type NavLink = { label: string; href: string };
type NavGroup = { title: string; items: NavLink[] };

/** 模組 → 子分頁。主檔列出分區 + 主檔；其他模組先佔位（之後做該模組再填）。
 *  [4-1] 2026-06-05：依使用者方案 filter 套件 / 高版本主檔、LITE 客戶不渲染（NX-MANUAL-02 v2.0 §④）。 */
function moduleGroups(moduleHref: string, userPlan: MasterHubMinPlan): NavGroup[] {
  if (moduleHref === MASTER_HREF) {
    return MASTER_HUB_SECTION_ORDER.map((sid) => ({
      title: MASTER_HUB_SECTION_TITLES[sid],
      items: MASTER_HUB_CARDS.filter(
        (c) => c.section === sid && canAccessMasterCard(userPlan, c.minPlan),
      ).map((c) => ({
        label: c.title,
        href: c.href,
      })),
    })).filter((g) => g.items.length > 0);
  }
  return [];
}

/** 輕量 popover：點外關 + Esc 關 */
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

type TopBarBulletinRow = {
  id: string;
  title: string;
  importance?: string | null;
};

type TopBarTaskRow = {
  id: string;
  title: string;
  priority?: string | null;
  dueDate?: string | null;
  status?: string | null;
};

export function MasterTopBar({
  category,
  title,
  count,
  requestNavigate,
  unreadAnnouncements,
  unreadNotifications = 0,
}: {
  category: string;
  title: string;
  count: string;
  /** 跳轉（由父層提供、含編輯 dirty 攔截） */
  requestNavigate: (href: string) => void;
  /** 覆寫公告未讀數；未傳則內部自動拉 /nx01/bulletins */
  unreadAnnouncements?: number;
  unreadNotifications?: number;
}) {
  const { displayName, tenantNameZh, planCode, me, view, logout } = useSessionMe();
  const pathname = usePathname();

  const moduleMenu = usePopover();
  const announceMenu = usePopover();
  const notifyMenu = usePopover();
  const taskMenu = usePopover();
  const userMenu = usePopover();

  // 公告 / 任務 未讀數：等 session 就緒後拉一次（race fix 同 TaskListPanel）
  const [bulletinCount, setBulletinCount] = useState<number>(0);
  const [taskCount, setTaskCount] = useState<number>(0);
  const [taskRows, setTaskRows] = useState<TopBarTaskRow[]>([]);
  const [bulletinRows, setBulletinRows] = useState<TopBarBulletinRow[]>([]);

  useEffect(() => {
    if (view.loading || !me) return;
    let cancelled = false;
    apiJson<{ rows?: TopBarBulletinRow[]; total?: number }>(
      '/nx01/bulletins?status=published&pageSize=10',
      { method: 'GET' },
    )
      .then((res) => {
        if (cancelled) return;
        setBulletinRows(Array.isArray(res.rows) ? res.rows : []);
        setBulletinCount(typeof res.total === 'number' ? res.total : (res.rows?.length ?? 0));
      })
      .catch(() => {
        if (cancelled) return;
        setBulletinRows([]);
        setBulletinCount(0);
      });
    apiJson<{ rows?: TopBarTaskRow[]; total?: number }>(
      '/nx98/task-pool?pageSize=10',
      { method: 'GET' },
    )
      .then((res) => {
        if (cancelled) return;
        setTaskRows(Array.isArray(res.rows) ? res.rows : []);
        setTaskCount(typeof res.total === 'number' ? res.total : (res.rows?.length ?? 0));
      })
      .catch(() => {
        if (cancelled) return;
        setTaskRows([]);
        setTaskCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [view.loading, me]);

  const effectiveAnnouncements = unreadAnnouncements ?? bulletinCount;

  const [kw, setKw] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 小星球鍵盤導航：左欄模組 / 右欄子選單
  const [moduleIdx, setModuleIdx] = useState(MASTER_MODULE_IDX < 0 ? 0 : MASTER_MODULE_IDX);
  const [navCol, setNavCol] = useState<'module' | 'sub'>('module');
  const [subIdx, setSubIdx] = useState(0);

  const activeModule = HOME_DOCK_ITEMS[moduleIdx]?.href ?? MASTER_HREF;
  const activeItem = HOME_DOCK_ITEMS[moduleIdx];
  // [4-1] 2026-06-05：依使用者方案 filter 套件 / 高版本主檔（不渲染）
  const userPlan = useMemo(() => normalizePlanCode(planCode), [planCode]);
  const groups = useMemo(() => moduleGroups(activeModule, userPlan), [activeModule, userPlan]);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Alt+X 開模組選單
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        moduleMenu.setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moduleMenu]);

  // 開啟時重置：高亮跟著「當前頁面」對應的主檔項（不黏第一項）
  useEffect(() => {
    if (moduleMenu.open) {
      setKw('');
      const masterFlat = moduleGroups(MASTER_HREF, userPlan).flatMap((g) => g.items);
      const curIdx = masterFlat.findIndex((it) => it.href === pathname);
      setModuleIdx(MASTER_MODULE_IDX < 0 ? 0 : MASTER_MODULE_IDX);
      if (curIdx >= 0) {
        setNavCol('sub');
        setSubIdx(curIdx);
      } else {
        setNavCol('module');
        setSubIdx(0);
      }
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [moduleMenu.open, pathname]);

  const go = useCallback(
    (href: string) => {
      moduleMenu.setOpen(false);
      requestNavigate(href);
    },
    [moduleMenu, requestNavigate],
  );

  // 小星球鍵盤導航（搜尋模式不攔截，交給搜尋結果）
  useEffect(() => {
    if (!moduleMenu.open) return;
    const onNav = (e: KeyboardEvent) => {
      if (kw.trim()) return;
      // 小星球開啟時，方向鍵 / Enter 焦點鎖在面板（capture + stopPropagation，
      // 不讓 EntityMasterPage 的整頁 ↑↓ 切表格列）
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) return;
      e.stopPropagation();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const d = e.key === 'ArrowDown' ? 1 : -1;
        if (navCol === 'module') {
          setModuleIdx((i) => Math.min(HOME_DOCK_ITEMS.length - 1, Math.max(0, i + d)));
          setSubIdx(0);
        } else {
          setSubIdx((s) => Math.min(Math.max(0, flatItems.length - 1), Math.max(0, s + d)));
        }
      } else if (e.key === 'ArrowRight') {
        if (navCol === 'module' && flatItems.length > 0) {
          e.preventDefault();
          setNavCol('sub');
          setSubIdx(0);
        }
      } else if (e.key === 'ArrowLeft') {
        if (navCol === 'sub') {
          e.preventDefault();
          setNavCol('module');
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (navCol === 'sub' && flatItems[subIdx]) go(flatItems[subIdx].href);
        else go(activeModule);
      }
    };
    window.addEventListener('keydown', onNav, true);
    return () => window.removeEventListener('keydown', onNav, true);
  }, [moduleMenu.open, kw, navCol, subIdx, flatItems, activeModule, go]);

  // 子選單鍵盤移動時捲入視野
  useEffect(() => {
    if (!moduleMenu.open || navCol !== 'sub') return;
    panelRef.current
      ?.querySelector(`[data-sub-idx="${subIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [subIdx, navCol, moduleMenu.open]);

  // 搜尋結果（跨主檔）。[4-1] 2026-06-05：依使用者方案 filter（不渲染 LITE 不能用的）
  const searchHits = useMemo(() => {
    const s = kw.trim();
    if (!s) return [];
    return MASTER_HUB_CARDS.filter(
      (c) =>
        canAccessMasterCard(userPlan, c.minPlan) &&
        (c.title.includes(s) || c.description.includes(s)),
    );
  }, [kw, userPlan]);

  const userInitial = (displayName || me?.username || 'U').slice(0, 1).toUpperCase();

  return (
    <header
      className="flex items-center gap-2 border-b border-[#2A2A30] px-2 py-2 sm:gap-3 sm:px-4"
      style={{ backgroundImage: 'linear-gradient(180deg, #16161B 0%, #101014 100%)' }}
    >
      {/* 模組選單（小星球）— 可跳任何頁，故不再放返回箭頭（瀏覽器上一頁、或星球選單切走） */}
      <div className="relative" ref={moduleMenu.ref}>
        <button
          type="button"
          onClick={() => moduleMenu.setOpen((o) => !o)}
          aria-label="模組選單 (Alt+X)"
          title="模組選單 (Alt+X)"
          className={cn(
            'group flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/40',
            moduleMenu.open
              ? 'border-[#E8A020]/40 bg-[#E8A020]/10'
              : 'border-transparent hover:border-[#E8A020]/30 hover:bg-[#E8A020]/10',
          )}
        >
          <PlanetOrbTrigger className="scale-90" />
        </button>

        {moduleMenu.open ? (
          <div className={cn(PANEL, 'left-0 w-[min(94vw,40rem)] p-3')} ref={panelRef}>
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
              <kbd className="hidden rounded border border-[#2A2A30] px-1 text-[9px] text-[#5A5A60] sm:inline">↑↓→← Enter</kbd>
            </div>

            {kw.trim() ? (
              /* 搜尋結果 */
              <div className="mt-3 max-h-[52vh] overflow-auto pr-1">
                {searchHits.length === 0 ? (
                  <div className="px-1 py-6 text-center text-xs text-[#5A5A60]">查無主檔</div>
                ) : (
                  searchHits.map((c) => (
                    <NavRow key={c.id} icon={c.icon} label={c.title} onClick={() => go(c.href)} />
                  ))
                )}
              </div>
            ) : (
              /* 階層式：左模組 + 右子分頁 */
              <div className="mt-3 flex gap-2">
                {/* 左：模組 */}
                <div className="flex w-[5.5rem] shrink-0 flex-col gap-1 border-r border-[#2A2A30] pr-2 sm:w-28">
                  {HOME_DOCK_ITEMS.map((m, i) => {
                    const on = i === moduleIdx;
                    const focused = on && navCol === 'module';
                    return (
                      <button
                        key={m.href}
                        type="button"
                        onMouseEnter={() => {
                          setModuleIdx(i);
                          setNavCol('module');
                        }}
                        onClick={() => {
                          setModuleIdx(i);
                          setNavCol('module');
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors focus:outline-none',
                          on ? 'bg-[#E8A020]/12 text-[#E8A020]' : 'text-[#B8B8C0] hover:bg-[#1A1A1F] hover:text-[#E8E8EB]',
                          focused && 'ring-1 ring-[#E8A020]/60',
                        )}
                      >
                        <m.icon className="size-4 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 右：子分頁 */}
                <div className="min-h-[14rem] max-h-[52vh] flex-1 overflow-auto pl-1">
                  <button
                    type="button"
                    onClick={() => go(activeModule)}
                    className="mb-2 flex w-full items-center justify-between rounded-md border border-[#2A2A30] bg-[#0E0E12] px-2.5 py-1.5 text-xs font-medium text-[#B8B8C0] transition-colors hover:border-[#E8A020]/40 hover:text-[#E8A020]"
                  >
                    進入{activeItem?.label ?? ''}首頁
                    <ChevronRight className="size-3.5" />
                  </button>

                  {groups.length > 0 ? (
                    (() => {
                      let fi = -1;
                      return groups.map((g) => (
                        <div key={g.title} className="mb-2">
                          <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A5A60]">
                            {g.title}
                          </div>
                          {g.items.map((it) => {
                            fi += 1;
                            const idx = fi;
                            return (
                              <NavRow
                                key={it.href}
                                label={it.label}
                                subIndex={idx}
                                active={navCol === 'sub' && idx === subIdx}
                                onClick={() => go(it.href)}
                              />
                            );
                          })}
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center gap-1 px-2 text-center">
                      <span className="text-xs text-[#888892]">{activeItem?.label} 子分頁建置中</span>
                      <span className="text-[10px] text-[#5A5A60]">之後做這個模組時會補上</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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

      {/* 公告（琥珀 badge） */}
      <div className="relative" ref={announceMenu.ref}>
        <NotifyButton
          icon={Megaphone}
          badge={effectiveAnnouncements}
          badgeTone="amber"
          label="公司公告"
          active={announceMenu.open}
          onClick={() => announceMenu.setOpen((o) => !o)}
        />
        {announceMenu.open ? (
          <div className={cn(PANEL, 'right-0 w-[min(88vw,20rem)] p-3')}>
            <PanelTitle text="公司公告" />
            {bulletinRows.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-[#888892]">目前沒有公告</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {bulletinRows.map((r) => (
                  <li key={r.id} className="border-t border-[#22222A] px-2 py-1.5 first:border-t-0">
                    <p className="text-xs text-[#E8E8EB]">{r.title}</p>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => {
                announceMenu.setOpen(false);
                requestNavigate('/dashboard/base/bulletins');
              }}
              className="mt-2 w-full rounded-md border border-[#E8A020]/30 bg-[#E8A020]/10 px-3 py-1.5 text-xs font-medium text-[#E8A020] transition-colors hover:bg-[#E8A020]/20"
            >
              查看全部公告
            </button>
          </div>
        ) : null}
      </div>

      {/* 任務（琥珀 badge、未完成數量） */}
      <div className="relative" ref={taskMenu.ref}>
        <NotifyButton
          icon={ClipboardList}
          badge={taskCount}
          badgeTone="amber"
          label="待辦任務"
          active={taskMenu.open}
          onClick={() => taskMenu.setOpen((o) => !o)}
        />
        {taskMenu.open ? (
          <div className={cn(PANEL, 'right-0 w-[min(88vw,20rem)] p-3')}>
            <PanelTitle text="待辦任務" />
            {taskRows.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-[#888892]">目前沒有待辦</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {taskRows.map((r) => (
                  <li key={r.id} className="border-t border-[#22222A] px-2 py-1.5 first:border-t-0">
                    <p className="text-xs text-[#E8E8EB]">{r.title}</p>
                    {r.dueDate ? (
                      <p className="mt-0.5 text-[10px] text-[#888892]">{r.dueDate.slice(0, 10)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {/* 通知（紅色 badge） */}
      <div className="relative" ref={notifyMenu.ref}>
        <NotifyButton
          icon={Bell}
          badge={unreadNotifications}
          badgeTone="red"
          label="系統通知"
          active={notifyMenu.open}
          onClick={() => notifyMenu.setOpen((o) => !o)}
        />
        {notifyMenu.open ? (
          <div className={cn(PANEL, 'right-0 w-[min(88vw,18rem)] p-3')}>
            <PanelTitle text="系統通知" />
            <p className="px-1 py-2 text-xs text-[#888892]">
              {unreadNotifications > 0 ? `有 ${unreadNotifications} 則新通知` : '目前沒有新通知'}
            </p>
          </div>
        ) : null}
      </div>

      {/* 使用者（頭像 + 公司名 + 帳號 + 箭頭） */}
      <div className="relative" ref={userMenu.ref}>
        <button
          type="button"
          onClick={() => userMenu.setOpen((o) => !o)}
          aria-label="使用者選單"
          className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#1A1A1F] pl-1 pr-2 transition-colors hover:border-[#E8A020]/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/50"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#E8A020]/30 bg-gradient-to-br from-[#E8A020]/30 to-[#E8A020]/10 text-xs font-bold text-[#E8A020]">
            {userInitial}
          </span>
          <span className="hidden flex-col text-left leading-tight lg:flex">
            <span className="max-w-[9rem] truncate text-xs font-semibold text-[#F0F0F3]">
              {tenantNameZh || 'NEXORA'}
            </span>
            <span className="max-w-[9rem] truncate text-[10px] text-[#888892]">
              {displayName || me?.username}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-[#5A5A60] lg:block" />
        </button>
        {userMenu.open ? (
          <div className={cn(PANEL, 'right-0 w-[min(88vw,16rem)] p-3')}>
            <div className="flex items-center gap-3 px-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#E8A020]/30 bg-gradient-to-br from-[#E8A020]/30 to-[#E8A020]/10 text-[#E8A020]">
                <User className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#F0F0F3]">{tenantNameZh || 'NEXORA'}</div>
                <div className="mt-0.5 truncate text-xs text-[#888892]">
                  {displayName || me?.username}
                  {planCode ? <span className="ml-1 text-[#E8A020]">· {planCode}</span> : null}
                </div>
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

/** 公告 / 通知按鈕（對齊使用者主檔頁 TopHeaderIconButton 質感、glow badge） */
function NotifyButton({
  icon: Icon,
  badge,
  badgeTone,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  badge?: number;
  badgeTone: 'red' | 'amber';
  label: string;
  active?: boolean;
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
      title={label}
      aria-label={label}
      className={cn(
        'relative rounded-lg border p-2 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/50',
        active
          ? 'border-[#2A2A30] bg-[#1A1A1F] text-[#E8E8EB]'
          : 'border-transparent text-[#888892] hover:border-[#2A2A30] hover:bg-[#1A1A1F] hover:text-[#E8E8EB]',
      )}
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

/** 模組選單裡的一列連結（active = 鍵盤導航選中、琥珀 highlight） */
function NavRow({
  icon: Icon,
  label,
  active,
  subIndex,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  active?: boolean;
  subIndex?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-sub-idx={subIndex}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors focus:outline-none',
        active
          ? 'bg-[#E8A020]/15 text-[#E8A020] ring-1 ring-[#E8A020]/50'
          : 'text-[#E8E8EB] hover:bg-[#E8A020]/12 hover:text-[#E8A020]',
      )}
    >
      {Icon ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0] group-hover:text-[#E8A020]">
          <Icon className="size-3.5" />
        </span>
      ) : (
        <span className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-[#E8A020]' : 'bg-[#3A3A42] group-hover:bg-[#E8A020]')} />
      )}
      <span className="flex-1 truncate text-left">{label}</span>
      <ChevronRight className={cn('size-3.5', active ? 'text-[#E8A020]' : 'text-[#5A5A60] group-hover:text-[#E8A020]')} />
    </button>
  );
}

function PanelTitle({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#2A2A30] pb-2">
      <span className="text-xs font-semibold tracking-wide text-[#F0F0F3]">{text}</span>
    </div>
  );
}
