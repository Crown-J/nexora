// apps/nx-ui/src/design/layout/workbench/WorkbenchTopBar.tsx
// 現代 ERP 頂部窄列：☰ 收合側欄 + 品牌 + 租戶 ｜ 搜尋 / 深淺 / 使用者選單。
// 系統類動作（個人/密碼/設定/登出）收進使用者下拉。

'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react';

type Props = {
  tenantName: string;
  displayName: string;
  employeeNo: string;
  light: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onSearch: () => void;
  onHome: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
};

export function WorkbenchTopBar({
  tenantName,
  displayName,
  employeeNo,
  light,
  onToggleSidebar,
  onToggleTheme,
  onSearch,
  onHome,
  onNavigate,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  const initial = displayName.charAt(0) || 'U';

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-2.5">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="收合／展開側欄"
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      <button
        type="button"
        onClick={onHome}
        title="首頁"
        className="whitespace-nowrap text-[15px] font-bold tracking-wide text-foreground hover:opacity-80"
      >
        NEXORA <span className="text-primary">GRID</span>
      </button>

      <span className="ml-1 hidden items-center gap-1.5 border-l border-border pl-3 text-xs text-muted-foreground sm:flex">
        {tenantName}
      </span>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onSearch}
        title="料號即時查詢（F2）"
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Search className="h-[17px] w-[17px]" />
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        title={light ? '切換深色' : '切換淺色'}
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        {light ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
      </button>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-border px-1.5 py-1 hover:bg-foreground/[0.06]"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">
            {initial}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[12px] font-medium">{displayName}</span>
            <span className="block text-[10px] text-muted-foreground">{employeeNo}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-xl">
            <MenuItem
              icon={<User className="h-4 w-4 text-muted-foreground" />}
              label="個人資料"
              onClick={() => {
                setMenuOpen(false);
                onNavigate('/dashboard/me');
              }}
            />
            <MenuItem
              icon={<Lock className="h-4 w-4 text-muted-foreground" />}
              label="修改密碼"
              onClick={() => {
                setMenuOpen(false);
                onNavigate('/dashboard/me/change-password');
              }}
            />
            <MenuItem
              icon={<Settings className="h-4 w-4 text-muted-foreground" />}
              label="環境設定"
              onClick={() => {
                setMenuOpen(false);
                onNavigate('/dashboard/settings');
              }}
            />
            <div className="my-1 h-px bg-border" />
            <MenuItem
              icon={<LogOut className="h-4 w-4" />}
              label="登出"
              danger
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[12.5px] hover:bg-foreground/[0.06] ${
        danger ? 'text-destructive' : 'text-popover-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
