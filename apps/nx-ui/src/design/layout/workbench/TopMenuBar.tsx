// apps/nx-ui/src/design/layout/workbench/TopMenuBar.tsx
// 傳統 ERP 頂部功能選單列（偉盟風）：系統 / 主檔 / 採購 / 銷貨 / 庫存 / 財務 / 報表 / 視窗
// - 點頂層展開下拉、展開後滑過其他頂層即切換
// - 多層子選單向右飛出（主檔六分區 → 各主檔）
// - 點外面 / Esc 關閉；選擇葉節點 → onSelect

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

function SubMenu({ items, onPick }: { items: MenuNode[]; onPick: (n: MenuNode) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="min-w-[13rem] py-1">
      {items.map((it) =>
        it.children?.length ? (
          <div
            key={it.key}
            className="relative"
            onMouseEnter={() => setOpenKey(it.key)}
            onMouseLeave={() => setOpenKey(null)}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12.5px] text-popover-foreground hover:bg-primary/10"
            >
              <span>{it.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {openKey === it.key && (
              <div className="absolute left-full top-0 -mt-1 z-10 rounded-sm border border-border bg-popover shadow-lg">
                <SubMenu items={it.children} onPick={onPick} />
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
            type="button"
            onClick={() => onPick(it)}
            className="block w-full px-3 py-1.5 text-left text-[12.5px] text-popover-foreground hover:bg-primary/10"
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

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
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
        setOpen((cur) => (cur === m.key ? null : m.key));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menus]);

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
              type="button"
              onClick={() => {
                if (hasChildren) setOpen(isOpen ? null : m.key);
                else pick(m);
              }}
              onMouseEnter={() => {
                if (open && hasChildren) setOpen(m.key);
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
                  <SubMenu items={m.children!} onPick={pick} />
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
