// apps/nx-ui/src/design/layout/workbench/TopMenuBar.tsx
// 傳統 ERP 頂部功能選單列（偉盟風）：系統 / 主檔 / 銷貨 / 採購 / 庫存 / 財務 / 報表 / 簽核
// - 點頂層展開下拉、展開後滑過其他頂層即切換
// - 多層子選單向右飛出（主檔七分區 → 各主檔）
// - 點外面 / Esc 關閉；選擇葉節點 → onSelect
// - 全鍵盤（2026-07-11 執行長拍板鍵盤軌）：Alt+字母/↓ 開組並聚焦首項、↑↓ 移動、
//   Home/End 首尾、→ 進子層、← 退子層（根層 ←→ 換頂層選單）、Enter 選、Esc 關並還焦點

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Home, Layers, Menu, Search } from 'lucide-react';
import type { MenuNode } from './menu-data';
import { BrandLogo } from '@design/brand/BrandLogo';
import { useWorkbenchTabs } from './WorkbenchTabsContext';
import { MobileNavDrawer } from './MobileNavDrawer';
import { MobileTabSwitcher } from './MobileTabSwitcher';

type Props = {
  menus: MenuNode[];
  onSelect: (node: MenuNode) => void;
  onHome: () => void;
  /** 全域料號搜尋（F2） */
  onSearch: () => void;
  /** 手機抽屜底部狀態資訊（公司/使用者）*/
  status?: { tenantName: string; displayName: string; employeeNo: string };
};

function SubMenu({
  items,
  onPick,
  autoFocus,
  onCloseLevel,
}: {
  items: MenuNode[];
  onPick: (n: MenuNode) => void;
  /** 開啟時聚焦第一項（鍵盤開啟路徑用、滑鼠 hover 不搶焦點） */
  autoFocus?: boolean;
  /** ← 收合本層並把焦點還給父項；根層不傳（← 交給選單列換頂層） */
  onCloseLevel?: () => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openedByKey = useRef(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (autoFocus) itemRefs.current.find(Boolean)?.focus();
  }, [autoFocus]);

  const focusAt = (idx: number) => itemRefs.current[idx]?.focus();
  // pending 項無 ref、自動跳過；環狀 wrap
  const focusSibling = (idx: number, delta: 1 | -1) => {
    const n = items.length;
    for (let step = 1; step <= n; step++) {
      const j = (((idx + delta * step) % n) + n) % n;
      if (itemRefs.current[j]) return focusAt(j);
    }
  };
  const focusEdge = (last: boolean) => {
    for (let i = 0; i < items.length; i++) {
      const j = last ? items.length - 1 - i : i;
      if (itemRefs.current[j]) return focusAt(j);
    }
  };

  /** 共用鍵盤導航；→ 只在群組項展開子層；葉節點的 ←→ 放行冒泡給選單列換頂層 */
  const navKeys = (e: React.KeyboardEvent, idx: number, hasKids: boolean) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation(); focusSibling(idx, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation(); focusSibling(idx, -1);
    } else if (e.key === 'Home') {
      e.preventDefault(); e.stopPropagation(); focusEdge(false);
    } else if (e.key === 'End') {
      e.preventDefault(); e.stopPropagation(); focusEdge(true);
    } else if (e.key === 'ArrowRight' && hasKids) {
      e.preventDefault(); e.stopPropagation();
      openedByKey.current = true;
      setOpenKey(items[idx]!.key);
    } else if (e.key === 'ArrowLeft' && onCloseLevel) {
      e.preventDefault(); e.stopPropagation();
      onCloseLevel();
    }
  };

  return (
    <div className="min-w-[13rem] py-1">
      {items.map((it, idx) =>
        it.children?.length ? (
          <div
            key={it.key}
            className="relative"
            onMouseEnter={() => {
              openedByKey.current = false;
              setOpenKey(it.key);
            }}
            onMouseLeave={() => setOpenKey(null)}
          >
            <button
              ref={(el) => { itemRefs.current[idx] = el; }}
              type="button"
              onClick={(e) => {
                // e.detail===0 = 鍵盤觸發的 click（Enter/Space）→ 子層要自動聚焦
                openedByKey.current = e.detail === 0;
                setOpenKey((k) => (k === it.key ? null : it.key));
              }}
              onKeyDown={(e) => navKeys(e, idx, true)}
              className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12.5px] text-popover-foreground hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
            >
              <span>{it.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {openKey === it.key && (
              <div className="absolute left-full top-0 -mt-1 z-10 rounded-sm border border-border bg-popover shadow-lg">
                <SubMenu
                  items={it.children}
                  onPick={onPick}
                  autoFocus={openedByKey.current}
                  onCloseLevel={() => {
                    setOpenKey(null);
                    focusAt(idx);
                  }}
                />
              </div>
            )}
          </div>
        ) : it.pending ? (
          <div
            key={it.key}
            title="功能建置中"
            className="flex w-full cursor-not-allowed items-center justify-between gap-4 px-3 py-1.5 text-left text-[12.5px] text-popover-foreground/40"
          >
            <span>{it.label}</span>
            <span className="rounded bg-muted px-1 py-px text-[9px] text-muted-foreground">建置中</span>
          </div>
        ) : (
          <button
            key={it.key}
            ref={(el) => { itemRefs.current[idx] = el; }}
            type="button"
            onClick={() => onPick(it)}
            onKeyDown={(e) => navKeys(e, idx, false)}
            className="block w-full px-3 py-1.5 text-left text-[12.5px] text-popover-foreground hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
          >
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}

export function TopMenuBar({ menus, onSelect, onHome, onSearch, status }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { tabs } = useWorkbenchTabs();
  const ref = useRef<HTMLDivElement>(null);
  // 鍵盤軌：頂層按鈕 ref（Esc/換組還焦點用）+「這次開啟是否鍵盤觸發」（是→下拉自動聚焦首項）
  const topBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const openedByKeyTop = useRef(false);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        topBtnRefs.current[open]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // Alt+字母 快捷：直接開對應頂層選單（字母為 Z/Y/X/W/V/U/Q/N、不撞工具列）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toUpperCase();
      const m = menus.find((mm) => mm.accel === k && mm.children?.length);
      if (m) {
        e.preventDefault();
        openedByKeyTop.current = true;
        setOpen((cur) => (cur === m.key ? null : m.key));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menus]);

  /** 鍵盤軌：開著的狀態下 ←→（含葉節點冒泡上來的）換上/下一個頂層選單 */
  const switchOpen = useCallback(
    (dir: 1 | -1) => {
      if (!open) return;
      const openables = menus.filter((mm) => mm.children?.length);
      const i = openables.findIndex((mm) => mm.key === open);
      const next = openables[(((i + dir) % openables.length) + openables.length) % openables.length]!;
      openedByKeyTop.current = true;
      setOpen(next.key);
      topBtnRefs.current[next.key]?.focus();
    },
    [open, menus],
  );

  const pick = useCallback(
    (node: MenuNode) => {
      if (node.pending) return;
      close();
      onSelect(node);
    },
    [close, onSelect],
  );

  return (
    <>
    <div
      ref={ref}
      onKeyDown={(e) => {
        if (!open) return;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          switchOpen(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          switchOpen(-1);
        }
      }}
      className="hidden items-center gap-0.5 border-b border-black/20 bg-[var(--nx-menubar-bg)] px-1.5 text-[var(--nx-menubar-fg)] md:flex"
    >
      <button
        type="button"
        onClick={onHome}
        title="首頁"
        className="grid h-7 w-7 place-items-center rounded-sm text-[var(--nx-menubar-fg)] hover:bg-white/10 hover:text-white"
      >
        <Home className="h-[15px] w-[15px]" />
      </button>
      <span className="mx-1 h-4 w-px bg-white/15" />
      {menus.map((m) => {
        const hasChildren = !!m.children?.length;
        const isOpen = open === m.key;
        return (
          <div key={m.key} className="relative">
            <button
              ref={(el) => { topBtnRefs.current[m.key] = el; }}
              type="button"
              onClick={(e) => {
                openedByKeyTop.current = e.detail === 0;
                if (hasChildren) setOpen(isOpen ? null : m.key);
                else pick(m);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && hasChildren && !isOpen) {
                  e.preventDefault();
                  openedByKeyTop.current = true;
                  setOpen(m.key);
                }
              }}
              onMouseEnter={() => {
                if (open && hasChildren) {
                  openedByKeyTop.current = false;
                  setOpen(m.key);
                }
              }}
              className={`rounded-sm px-3 py-1.5 text-[13px] transition ${
                isOpen
                  ? 'bg-white/15 text-white'
                  : `text-[var(--nx-menubar-fg-strong)] hover:bg-white/10 ${m.comingSoon ? 'opacity-55' : ''}`
              }`}
            >
              {m.label}
              {m.accel ? <span className="ml-0.5 opacity-50">({m.accel})</span> : null}
            </button>
            {isOpen && hasChildren && (
              <div className="absolute left-0 top-full z-30 mt-px rounded-sm border border-border bg-popover shadow-xl">
                {m.comingSoon ? (
                  <div className="min-w-[12rem] px-4 py-3 text-[12.5px] text-muted-foreground">
                    此模組即將推出
                  </div>
                ) : (
                  <SubMenu items={m.children!} onPick={pick} autoFocus={openedByKeyTop.current} />
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onSearch}
        title="料號即時查詢（F2）"
        className="grid h-7 w-7 place-items-center rounded-sm text-[var(--nx-menubar-fg)] hover:bg-white/10 hover:text-white"
      >
        <Search className="h-[15px] w-[15px]" />
      </button>
    </div>

    {/* ── 手機版 L1：漢堡 + 品牌 + 分頁切換器 + 搜尋 ── */}
    <div className="flex items-center gap-1.5 border-b border-black/20 bg-[var(--nx-menubar-bg)] px-2 py-1.5 text-[var(--nx-menubar-fg)] md:hidden">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="選單"
        className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/10 hover:text-white"
      >
        <Menu className="h-5 w-5" />
      </button>
      <BrandLogo size={24} className="rounded-md ring-1 ring-white/15" />
      <span className="text-[14px] font-bold tracking-wide text-white">NEXORA</span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => setSwitcherOpen(true)}
        aria-label="已開啟分頁"
        className="relative grid h-8 w-8 place-items-center rounded-md hover:bg-white/10 hover:text-white"
      >
        <Layers className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#7fa7d6] px-1 text-[9px] font-bold text-[#16223b]">
          {tabs.length + 1}
        </span>
      </button>
      <button
        type="button"
        onClick={onSearch}
        aria-label="料號查詢"
        className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/10 hover:text-white"
      >
        <Search className="h-5 w-5" />
      </button>
    </div>

    <MobileNavDrawer
      open={drawerOpen}
      menus={menus}
      onClose={() => setDrawerOpen(false)}
      onSelect={onSelect}
      onHome={onHome}
      status={status}
    />
    <MobileTabSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </>
  );
}
