// apps/nx-ui/src/app/lab/users/page.tsx
/**
 * NEXORA Lab：使用者主檔範式（Crown iterate v3 / commit 42）
 *
 * Crown 拍板（commit 42 iterate）：
 * - 左側 sidebar 上方 icon → 改為 NEXORA 星球（PlanetOrbTrigger）；點擊展開 6 模組選單（不擴展主檔，因左側已列出）
 * - 工具列最左加分頁鈕（┃◀ ◀ 1/1 ▶ ▶┃）對齊舊 ERP 圖一
 * - 表格左側 checkbox 欄位 → 序號（0001 / 0002...）4 位數零填
 * - 新增「選取」toggle 按鈕（CheckSquare）：開啟後序號欄變回 checkbox，工具列切換為批次操作（完成選取 / 批次啟用 / 批次停用 / 批次刪除）
 *
 * 路徑：/lab/users（避開 dashboard layout、純 root layout）
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCog,
  Briefcase,
  Shield,
  MapPin,
  Package,
  Car,
  Building2,
  Handshake,
  Settings,
  Search,
  Sparkles,
  RefreshCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Bell,
  Layers,
  Pencil,
  Save,
  X,
  Trash2,
  Printer,
  LogOut,
  CheckSquare,
  Check,
  Power,
  PowerOff,
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
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
// Mock data
// ──────────────────────────────────────────────────────────────

const NAV_TOP = [
  { id: 'notif', icon: Bell, label: '通知', badge: 3 },
  { id: 'recent', icon: Sparkles, label: '最近操作', badge: null },
];

type ListItem = { id: string; icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; count?: number };

const NAV_ACCOUNT: ListItem[] = [
  { id: 'user', icon: Users, label: '使用者', active: true, count: 5 },
  { id: 'role', icon: Briefcase, label: '職務主檔', count: 6 },
  { id: 'user-role', icon: UserCog, label: '使用者職務設定', count: 5 },
  { id: 'user-warehouse', icon: MapPin, label: '使用者據點設定', count: 5 },
  { id: 'role-view', icon: Shield, label: '職務權限設定', count: 12 },
];

const NAV_PRODUCT: ListItem[] = [
  { id: 'part', icon: Package, label: '零件主檔', count: 256 },
  { id: 'brand', icon: Layers, label: '汽車／零件廠牌', count: 48 },
];

const NAV_VEHICLE: ListItem[] = [
  { id: 'engine', icon: Car, label: '引擎主檔', count: 32 },
  { id: 'model', icon: Car, label: '車型主檔', count: 128 },
];

const NAV_ORG: ListItem[] = [
  { id: 'warehouse', icon: Building2, label: '倉庫主檔', count: 4 },
];

const NAV_PARTNER: ListItem[] = [
  { id: 'partner', icon: Handshake, label: '客戶主檔', count: 87 },
];

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  jobTitle: string;
  email: string | null;
  phone: string | null;
  warehouse: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  /** detail：擔任職務（多項）*/
  roles: { code: string; name: string; isPrimary: boolean; assignedAt: string; assignedBy: string }[];
  /** detail：隸屬倉庫（多項）*/
  warehouses: { code: string; name: string; assignedAt: string; assignedBy: string }[];
};

const USERS: UserRow[] = [
  {
    id: '1',
    username: 'admin',
    displayName: '測試租戶管理員（LITE）',
    jobTitle: '系統管理員',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: '2026-05-20 12:29',
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
    updatedAt: '2026-05-20 12:29',
    updatedBy: '系統管理員',
    roles: [
      { code: 'SYSADMIN', name: '系統管理員', isPrimary: true, assignedAt: '2026-05-06 10:16', assignedBy: '系統' },
    ],
    warehouses: [],
  },
  {
    id: '2',
    username: 'finance1',
    displayName: '黃志豪（財務專員）',
    jobTitle: '財務',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
    updatedAt: '2026-05-06 10:16',
    updatedBy: '系統管理員',
    roles: [
      { code: 'FINANCE', name: '財務', isPrimary: true, assignedAt: '2026-05-06 10:16', assignedBy: '系統' },
    ],
    warehouses: [],
  },
  {
    id: '3',
    username: 'purchase1',
    displayName: '王小明(採購專員)',
    jobTitle: '採購',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
    updatedAt: '2026-05-06 10:16',
    updatedBy: '系統管理員',
    roles: [
      { code: 'PURCHASE', name: '採購', isPrimary: true, assignedAt: '2026-05-06 10:16', assignedBy: '系統' },
    ],
    warehouses: [],
  },
  {
    id: '4',
    username: 'sales1',
    displayName: '陳美玲(業務專員)',
    jobTitle: '業務',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
    updatedAt: '2026-05-06 10:16',
    updatedBy: '系統管理員',
    roles: [
      { code: 'SALES', name: '業務', isPrimary: true, assignedAt: '2026-05-06 10:16', assignedBy: '系統' },
    ],
    warehouses: [],
  },
  {
    id: '5',
    username: 'warehouse1',
    displayName: '林大偉(倉管專員)',
    jobTitle: '倉管',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
    updatedAt: '2026-05-06 10:16',
    updatedBy: '系統管理員',
    roles: [
      { code: 'WAREHOUSE', name: '倉管', isPrimary: true, assignedAt: '2026-05-06 10:16', assignedBy: '系統' },
    ],
    warehouses: [],
  },
];

const JOB_TITLES = ['系統管理員', '財務', '採購', '業務', '倉管'] as const;

type Mode = 'browse' | 'edit';

type EditFormState = {
  username: string;
  displayName: string;
  jobTitle: string;
  isActive: boolean;
  email: string;
  phone: string;
  warehouse: string;
};

function makeEditForm(user: UserRow): EditFormState {
  return {
    username: user.username,
    displayName: user.displayName,
    jobTitle: user.jobTitle,
    isActive: user.isActive,
    email: user.email ?? '',
    phone: user.phone ?? '',
    warehouse: user.warehouse ?? '',
  };
}

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
};

type ToastVariant = 'info' | 'success' | 'danger';

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

// ──────────────────────────────────────────────────────────────
// 子元件
// ──────────────────────────────────────────────────────────────

function NavItem({
  icon: Icon,
  label,
  badge,
  count,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number | null;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-nav-item
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/50 focus-visible:bg-[#E8A020]/10',
        active
          ? 'bg-[#E8A020]/15 text-[#E8A020] font-medium'
          : 'text-foreground/85 hover:bg-white/5',
      )}
    >
      <Icon className={cn('size-4 shrink-0', active ? 'text-[#E8A020]' : 'text-muted-foreground group-hover:text-foreground')} />
      <span className="flex-1 truncate text-left">{label}</span>
      {badge != null ? (
        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
          {badge}
        </span>
      ) : count != null ? (
        <span className={cn(
          'rounded-md px-1.5 py-0.5 text-[10px] font-mono tabular-nums',
          active ? 'bg-[#E8A020]/15 text-[#E8A020]/80' : 'text-muted-foreground/60',
        )}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SectionLabel({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {action}
    </div>
  );
}

function PlanetModuleMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="開啟模組選單"
          title="模組選單"
          className="group flex size-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-colors hover:border-[#E8A020]/30 hover:bg-[#E8A020]/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A020]/40 data-[state=open]:border-[#E8A020]/40 data-[state=open]:bg-[#E8A020]/10"
        >
          <PlanetOrbTrigger className="scale-90" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-[14rem] border-border/80 bg-popover/95 p-1 shadow-lg backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
          NEXORA 模組
        </DropdownMenuLabel>
        {HOME_DOCK_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.href}
            asChild
            className="cursor-pointer rounded-md p-0 focus:bg-[#E8A020]/15 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/15 data-[highlighted]:text-[#E8A020]"
          >
            <Link
              href={item.href}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground/90"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-secondary/40 text-foreground/80">
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

function LeftSidebar({ sidebarRef }: { sidebarRef: React.RefObject<HTMLElement | null> }) {
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
      className="flex w-60 shrink-0 flex-col border-r border-border/40 bg-card/40 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <PlanetModuleMenu />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">NEXORA GRID</p>
          <p className="truncate text-[11px] text-muted-foreground">測試公司（LITE）</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 nx-master-scroll">
        <div className="space-y-0.5 px-1 pt-1">
          {NAV_TOP.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} badge={item.badge} />
          ))}
        </div>

        <SectionLabel
          label="帳號與權限"
          action={
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="新增"
            >
              <Plus className="size-3.5" />
            </button>
          }
        />
        <div className="space-y-0.5 px-1">
          {NAV_ACCOUNT.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={item.active} count={item.count} />
          ))}
        </div>

        <SectionLabel label="產品與料號" />
        <div className="space-y-0.5 px-1">
          {NAV_PRODUCT.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        <SectionLabel label="車型字典" />
        <div className="space-y-0.5 px-1">
          {NAV_VEHICLE.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        <SectionLabel label="組織架構" />
        <div className="space-y-0.5 px-1">
          {NAV_ORG.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        <SectionLabel label="交易對象" />
        <div className="space-y-0.5 px-1">
          {NAV_PARTNER.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        <SectionLabel label="系統設定" />
        <div className="space-y-0.5 px-1">
          <NavItem icon={Settings} label="基礎設定" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-border/40 px-3 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground/80">
          管
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">測試租戶管理員（LITE）</p>
          <p className="truncate text-[10px] text-muted-foreground">admin · 使用者</p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="使用者選單"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}

function TopHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-6 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          帳號與權限
        </p>
        <div className="mt-0.5 flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">使用者主檔</h1>
          <span className="inline-flex items-center gap-1 rounded-md border border-[#E8A020]/30 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#E8A020]">
            <Users className="size-3" />
            5 位使用者
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="搜尋"
        >
          <Search className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** 舊 ERP 工具列範式（三分支：browse / edit / selection）
 *
 * Browse: A 新增 / E 更正 / F 查詢 / D 刪除 / P 匯出 / R 重新整理 / 選取 / Q 結束
 * Edit:   S 存檔 / C 取消
 * Selection: 完成選取 / 批次啟用 / 批次停用 / 批次刪除
 *
 * 全部 letter 對應 Alt+letter 快捷鍵（document-level keydown）。
 */
function ErpToolbar({
  mode,
  activeRow,
  selectionMode,
  onToggleSelection,
  selectedCount,
  page,
  totalPages,
  onPageChange,
  onCreate,
  onEdit,
  onSearch,
  onDelete,
  onExport,
  onRefresh,
  onExit,
  onSave,
  onCancel,
}: {
  mode: Mode;
  activeRow: UserRow | null;
  selectionMode: boolean;
  onToggleSelection: () => void;
  selectedCount: number;
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  onCreate: () => void;
  onEdit: () => void;
  onSearch: () => void;
  onDelete: () => void;
  onExport: (format: 'csv' | 'pdf' | 'print') => void;
  onRefresh: () => void;
  onExit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const hasRow = activeRow !== null;

  if (selectionMode) {
    const hasChecked = selectedCount > 0;
    return (
      <div className="flex items-center gap-1 border-b border-[#E8A020]/30 bg-[#E8A020]/8 px-3 py-1.5">
        <ToolbarButton icon={Check} label="完成選取" enabled onClick={onToggleSelection} accent />
        <ToolbarSeparator />
        <span className="px-1 text-[11px] text-muted-foreground">
          已選 <span className="font-mono text-[#E8A020]">{selectedCount}</span> 筆
        </span>
        <div className="flex-1" />
        <ToolbarButton icon={Power} label="批次啟用" enabled={hasChecked} />
        <ToolbarButton icon={PowerOff} label="批次停用" enabled={hasChecked} />
        <ToolbarButton icon={Trash2} label="批次刪除" enabled={hasChecked} variant="danger" />
      </div>
    );
  }

  if (mode === 'edit') {
    return (
      <div className="flex items-center gap-1 border-b border-[#E8A020]/30 bg-[#E8A020]/8 px-3 py-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-2 py-0.5 text-[11px] font-medium text-[#E8A020]">
          <Pencil className="size-3" />
          編輯中
        </span>
        <ToolbarSeparator />
        <ToolbarButton icon={Save} letter="S" label="存檔" enabled onClick={onSave} accent />
        <ToolbarButton icon={X} letter="C" label="取消" enabled onClick={onCancel} />
        <div className="flex-1" />
        <span className="px-1 text-[11px] text-muted-foreground">
          編輯模式 · Alt+S 存檔 / Alt+C 取消
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 border-b border-border/40 bg-card/30 px-3 py-1.5">
      <PaginationButton icon={ChevronsLeft} disabled={page <= 1} onClick={() => onPageChange(1)} title="第一頁" />
      <PaginationButton icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="上一頁" />
      <span className="min-w-[2.5rem] px-1 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
        {page}/{totalPages}
      </span>
      <PaginationButton icon={ChevronRight} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="下一頁" />
      <PaginationButton icon={ChevronsRight} disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} title="最末頁" />
      <ToolbarSeparator />
      <ToolbarButton icon={Plus} letter="A" label="新增" enabled onClick={onCreate} />
      <ToolbarButton icon={Pencil} letter="E" label="更正" enabled={hasRow} onClick={onEdit} />
      <ToolbarButton icon={Search} letter="F" label="查詢" enabled onClick={onSearch} />
      <ToolbarSeparator />
      <ToolbarButton icon={Trash2} letter="D" label="刪除" enabled={hasRow} variant="danger" onClick={onDelete} />
      <ExportMenuButton onSelect={onExport} />
      <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled onClick={onRefresh} />
      <div className="flex-1" />
      <ToolbarButton icon={CheckSquare} label="選取" enabled onClick={onToggleSelection} />
      <ToolbarButton icon={LogOut} letter="Q" label="結束" enabled onClick={onExit} />
    </div>
  );
}

function ExportMenuButton({ onSelect }: { onSelect: (format: 'csv' | 'pdf' | 'print') => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="匯出（P）"
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md border border-border/60 bg-card/60 px-2 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-white/5 hover:text-foreground',
            'data-[state=open]:border-[#E8A020]/40 data-[state=open]:bg-[#E8A020]/10 data-[state=open]:text-[#E8A020]',
          )}
        >
          <Download className="size-3" />
          <span className="hidden sm:inline">
            <span className="mr-0.5 font-mono text-[#E8A020]">P</span>
            匯出
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-[10rem] border-border/80 bg-popover/95 p-1 shadow-lg backdrop-blur-xl"
      >
        <DropdownMenuItem
          onClick={() => onSelect('csv')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm focus:bg-[#E8A020]/15 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/15 data-[highlighted]:text-[#E8A020]"
        >
          <FileSpreadsheet className="mr-2 size-3.5" />
          匯出 CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('pdf')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm focus:bg-[#E8A020]/15 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/15 data-[highlighted]:text-[#E8A020]"
        >
          <FileText className="mr-2 size-3.5" />
          匯出 PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('print')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm focus:bg-[#E8A020]/15 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/15 data-[highlighted]:text-[#E8A020]"
        >
          <Printer className="mr-2 size-3.5" />
          列印
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-border/50" aria-hidden />;
}

function PaginationButton({
  icon: Icon,
  disabled,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
        disabled
          ? 'cursor-not-allowed border-border/30 bg-card/30 text-muted-foreground/40'
          : 'border-border/60 bg-card/60 text-foreground/85 hover:bg-white/5 hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function ToolbarButton({
  icon: Icon,
  letter,
  label,
  enabled,
  variant = 'default',
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  letter?: string;
  label: string;
  enabled: boolean;
  variant?: 'default' | 'danger';
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      title={letter ? `${label}（${letter}）` : label}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors',
        enabled
          ? variant === 'danger'
            ? 'border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
            : accent
              ? 'border-[#E8A020]/40 bg-[#E8A020]/15 text-[#E8A020] hover:bg-[#E8A020]/20'
              : 'border-border/60 bg-card/60 text-foreground/85 hover:bg-white/5 hover:text-foreground'
          : 'cursor-not-allowed border-border/30 bg-card/30 text-muted-foreground/40',
      )}
    >
      <Icon className="size-3" />
      <span className="hidden sm:inline">
        {letter ? (
          <span className={cn('mr-0.5 font-mono', enabled && variant !== 'danger' && !accent && 'text-[#E8A020]')}>{letter}</span>
        ) : null}
        {label}
      </span>
    </button>
  );
}

/** 舊 ERP 範式 tab bar（1 資料瀏覽 / 2 詳細資料）；編輯模式下 list 鎖定 */
function ErpTabBar({
  tab,
  onChange,
  hasSelected,
  editMode,
}: {
  tab: 'list' | 'detail';
  onChange: (next: 'list' | 'detail') => void;
  hasSelected: boolean;
  editMode: boolean;
}) {
  return (
    <div className="flex items-center border-b border-border/40 bg-background px-3">
      <button
        type="button"
        onClick={() => onChange('list')}
        disabled={editMode}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'list'
            ? 'border-[#E8A020] text-[#E8A020]'
            : editMode
              ? 'cursor-not-allowed border-transparent text-muted-foreground/40'
              : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
        <span className="rounded bg-muted/60 px-1 font-mono text-[10px]">1</span>
        資料瀏覽
      </button>
      <button
        type="button"
        onClick={() => onChange('detail')}
        disabled={!hasSelected || editMode}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'detail'
            ? 'border-[#E8A020] text-[#E8A020]'
            : hasSelected && !editMode
              ? 'border-transparent text-muted-foreground hover:text-foreground'
              : 'cursor-not-allowed border-transparent text-muted-foreground/40',
        )}
      >
        <span className="rounded bg-muted/60 px-1 font-mono text-[10px]">2</span>
        詳細資料
      </button>
    </div>
  );
}

function UsersTable({
  selectedId,
  onSelect,
  onOpenDetail,
  selectionMode,
  checked,
  setChecked,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail: (id: string) => void;
  selectionMode: boolean;
  checked: Set<string>;
  setChecked: (next: Set<string>) => void;
}) {
  const [sortKey, setSortKey] = useState<'username' | 'displayName' | 'lastLoginAt'>('username');

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const toggleAll = () => {
    if (checked.size === USERS.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(USERS.map((u) => u.id)));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto nx-master-scroll">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
            <tr className="border-b border-border/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-12 px-2 py-2.5">
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={checked.size === USERS.length && USERS.length > 0}
                    onChange={toggleAll}
                    className="size-3.5 rounded border-border"
                    aria-label="全選"
                  />
                ) : (
                  <span className="font-medium uppercase tracking-wider">序號</span>
                )}
              </th>
              <th className="min-w-[140px] whitespace-nowrap px-2 py-2.5">
                <button
                  type="button"
                  onClick={() => setSortKey('username')}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  帳號
                  <ChevronDown className={cn('size-3', sortKey === 'username' && 'text-[#E8A020]')} />
                </button>
              </th>
              <th className="min-w-[200px] whitespace-nowrap px-2 py-2.5">
                <button
                  type="button"
                  onClick={() => setSortKey('displayName')}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  姓名
                  <ChevronDown className={cn('size-3', sortKey === 'displayName' && 'text-[#E8A020]')} />
                </button>
              </th>
              <th className="min-w-[120px] whitespace-nowrap px-2 py-2.5">職務</th>
              <th className="min-w-[200px] whitespace-nowrap px-2 py-2.5">信箱</th>
              <th className="min-w-[140px] whitespace-nowrap px-2 py-2.5">電話</th>
              <th className="min-w-[140px] whitespace-nowrap px-2 py-2.5">隸屬倉庫</th>
              <th className="min-w-[80px] whitespace-nowrap px-2 py-2.5">啟用</th>
              <th className="min-w-[160px] whitespace-nowrap px-2 py-2.5">
                <button
                  type="button"
                  onClick={() => setSortKey('lastLoginAt')}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  最後登入
                  <ChevronDown className={cn('size-3', sortKey === 'lastLoginAt' && 'text-[#E8A020]')} />
                </button>
              </th>
              <th className="min-w-[160px] whitespace-nowrap px-2 py-2.5">建立時間</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((row, i) => {
              const isChecked = checked.has(row.id);
              const isSelected = selectedId === row.id;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.id)}
                  onDoubleClick={() => onOpenDetail(row.id)}
                  className={cn(
                    'cursor-pointer border-b border-border/30 transition-colors',
                    isSelected
                      ? 'bg-[#E8A020]/15 ring-1 ring-inset ring-[#E8A020]/40'
                      : selectionMode && isChecked
                        ? 'bg-[#E8A020]/8'
                        : 'hover:bg-white/3',
                  )}
                >
                  <td className="px-2 py-2.5" onClick={(e) => selectionMode && e.stopPropagation()}>
                    {selectionMode ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(row.id)}
                        className="size-3.5 rounded border-border"
                        aria-label={`選取 ${row.username}`}
                      />
                    ) : (
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                        {String(i + 1).padStart(4, '0')}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="font-mono text-xs text-foreground">{row.username}</span>
                  </td>
                  <td className="px-2 py-2.5 text-foreground/90">{row.displayName}</td>
                  <td className="px-2 py-2.5">
                    <span className="inline-flex items-center rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] text-foreground/85">
                      {row.jobTitle}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground/40">
                    {row.email ?? '—'}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground/40">
                    {row.phone ?? '—'}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground/40">
                    {row.warehouse ?? '—'}
                  </td>
                  <td className="px-2 py-2.5">
                    {row.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        啟用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-muted-foreground/30 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        停用
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-xs tabular-nums text-muted-foreground">
                    {row.lastLoginAt ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-xs tabular-nums text-muted-foreground">
                    {row.createdAt}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: Math.max(0, 20 - USERS.length) }).map((_, i) => (
              <tr key={`__placeholder_${i}`} aria-hidden className="pointer-events-none select-none border-b border-border/20">
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
                <td className="px-2 py-2.5">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 bg-card/30 px-6 py-2 text-[11px] text-muted-foreground">
        <span>共 5 筆 · 顯示 5 筆 {selectedId ? '· 雙擊或 Alt+E 進入編輯' : '· 點選列以啟用更正/刪除'}</span>
        <span className="text-foreground/60">每頁 20 筆</span>
      </div>
    </div>
  );
}

/** 舊 ERP 範式詳細頁：上方 form fields + 下方明細項次（roles / warehouses）
 * 編輯模式下：form fields → 可編輯 input / select。
 */
function UserDetailView({
  user,
  editMode,
  editForm,
  onEditChange,
}: {
  user: UserRow;
  editMode: boolean;
  editForm: EditFormState | null;
  onEditChange: (next: EditFormState) => void;
}) {
  const update = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    if (!editForm) return;
    onEditChange({ ...editForm, [key]: value });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto nx-master-scroll">
      {/* 上方 form fields（grid 4-col、業界 ERP 範式緊湊 layout）*/}
      <div className="border-b border-border/40 bg-card/20 px-6 py-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="帳號" value={user.username} mono />
          {editMode && editForm ? (
            <FormInput label="姓名" value={editForm.displayName} onChange={(v) => update('displayName', v)} />
          ) : (
            <FormField label="姓名" value={user.displayName} />
          )}
          {editMode && editForm ? (
            <FormSelect
              label="職務"
              value={editForm.jobTitle}
              options={JOB_TITLES as unknown as string[]}
              onChange={(v) => update('jobTitle', v)}
            />
          ) : (
            <FormField label="職務" value={user.jobTitle} />
          )}
          {editMode && editForm ? (
            <FormSelect
              label="啟用狀態"
              value={editForm.isActive ? '啟用' : '停用'}
              options={['啟用', '停用']}
              onChange={(v) => update('isActive', v === '啟用')}
            />
          ) : (
            <FormField label="啟用狀態" value={user.isActive ? '啟用' : '停用'} tone={user.isActive ? 'green' : 'muted'} />
          )}

          {editMode && editForm ? (
            <FormInput label="信箱" value={editForm.email} onChange={(v) => update('email', v)} placeholder="—" />
          ) : (
            <FormField label="信箱" value={user.email ?? '—'} dim={!user.email} />
          )}
          {editMode && editForm ? (
            <FormInput label="電話" value={editForm.phone} onChange={(v) => update('phone', v)} placeholder="—" />
          ) : (
            <FormField label="電話" value={user.phone ?? '—'} dim={!user.phone} />
          )}
          {editMode && editForm ? (
            <FormInput label="隸屬倉庫" value={editForm.warehouse} onChange={(v) => update('warehouse', v)} placeholder="—" />
          ) : (
            <FormField label="隸屬倉庫" value={user.warehouse ?? '—'} dim={!user.warehouse} />
          )}
          <FormField label="最後登入" value={user.lastLoginAt ?? '從未登入'} dim={!user.lastLoginAt} />

          <FormField label="建立時間" value={user.createdAt} mono />
          <FormField label="建立人員" value={user.createdBy} />
          <FormField label="修改時間" value={user.updatedAt} mono />
          <FormField label="修改人員" value={user.updatedBy} />
        </div>
      </div>

      {/* 下方明細項次（擔任職務 + 隸屬倉庫）*/}
      <div className="flex-1 px-6 py-4">
        <DetailSection title="擔任職務" count={user.roles.length}>
          {user.roles.length > 0 ? (
            <DetailTable
              headers={['項次', '職務代碼', '職務名稱', '主要', '指派時間', '指派人員']}
              rows={user.roles.map((r, i) => [
                String(i + 1).padStart(4, '0'),
                r.code,
                r.name,
                r.isPrimary ? '✓' : '',
                r.assignedAt,
                r.assignedBy,
              ])}
            />
          ) : (
            <EmptyDetail message="尚未指派職務" />
          )}
        </DetailSection>

        <div className="h-4" />

        <DetailSection title="隸屬倉庫" count={user.warehouses.length}>
          {user.warehouses.length > 0 ? (
            <DetailTable
              headers={['項次', '倉庫代碼', '倉庫名稱', '指派時間', '指派人員']}
              rows={user.warehouses.map((w, i) => [
                String(i + 1).padStart(4, '0'),
                w.code,
                w.name,
                w.assignedAt,
                w.assignedBy,
              ])}
            />
          ) : (
            <EmptyDetail message="尚未指派倉庫據點" />
          )}
        </DetailSection>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  mono,
  dim,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  dim?: boolean;
  tone?: 'green' | 'muted';
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          'rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5 text-sm',
          mono && 'font-mono text-xs',
          dim && 'text-muted-foreground/50',
          tone === 'green' && 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
          tone === 'muted' && 'border-muted-foreground/30 text-muted-foreground',
          !tone && !dim && 'text-foreground/90',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-[#E8A020]/30 bg-background/60 px-2.5 py-1.5 text-sm text-foreground/95 outline-none transition-colors focus:border-[#E8A020]/60 focus:bg-background/80 focus:ring-1 focus:ring-[#E8A020]/40"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-md border border-[#E8A020]/30 bg-background/60 px-2.5 py-1.5 text-sm text-foreground/95 outline-none transition-colors focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-background text-foreground">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-40 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.variant === 'success' ? CheckCircle2 : t.variant === 'danger' ? XCircle : Info;
        const tone =
          t.variant === 'success'
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
            : t.variant === 'danger'
              ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
              : 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]';
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 text-xs shadow-xl backdrop-blur-md',
              'bg-card/85',
              tone,
            )}
          >
            <Icon className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 leading-relaxed">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState | null;
  onClose: () => void;
}) {
  if (!state) return null;
  const isDanger = state.variant === 'danger';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl',
              isDanger ? 'bg-rose-500/15 text-rose-300' : 'bg-[#E8A020]/15 text-[#E8A020]',
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{state.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{state.message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-md border border-border/60 bg-secondary/40 px-3 text-xs font-medium text-foreground/85 transition-colors hover:bg-secondary/60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={cn(
              'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors',
              isDanger
                ? 'border-rose-400/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                : 'border-[#E8A020]/40 bg-[#E8A020]/15 text-[#E8A020] hover:bg-[#E8A020]/25',
            )}
          >
            {state.confirmLabel ?? '確認'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/20">
      <div className="flex items-center justify-between border-b border-border/40 bg-card/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{title}</span>
          <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 px-1.5 text-[10px] hover:bg-white/5"
          >
            <Plus className="size-3" />
            新增項次
          </button>
        </div>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function DetailTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {headers.map((h) => (
            <th key={h} className="border-b border-border/30 px-2 py-1.5 whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border/20 hover:bg-white/3">
            {row.map((cell, j) => (
              <td key={j} className={cn('px-2 py-1.5 text-xs', j === 0 ? 'font-mono text-muted-foreground' : 'text-foreground/90')}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyDetail({ message }: { message: string }) {
  return (
    <div className="py-6 text-center text-[11px] text-muted-foreground/60">{message}</div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function LabUsersPage() {
  const [tab, setTab] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<Mode>('browse');
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const sidebarRef = useRef<HTMLElement>(null);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  const selectedUser = useMemo(
    () => (selectedId ? USERS.find((u) => u.id === selectedId) ?? null : null),
    [selectedId],
  );
  // 假分頁：固定每頁 20 筆，當前 USERS 共 5 筆 → 1/1
  const totalPages = Math.max(1, Math.ceil(USERS.length / 20));

  const handleToggleSelection = () => {
    setSelectionMode((prev) => {
      if (prev) setChecked(new Set());
      return !prev;
    });
  };

  // ── ERP 工具列動作（lab：多為 mock，皆透過 toast 給可見反饋）─────
  const handleCreate = useCallback(() => {
    showToast('新增（Alt+A） · 待接 API', 'info');
  }, [showToast]);

  const handleEdit = useCallback(() => {
    if (!selectedUser) {
      showToast('請先點選一筆資料才能更正', 'danger');
      return;
    }
    setMode('edit');
    setTab('detail');
    setEditForm(makeEditForm(selectedUser));
    showToast(`進入編輯模式：${selectedUser.username}`, 'info');
  }, [selectedUser, showToast]);

  const handleSearch = useCallback(() => {
    showToast('查詢（Alt+F） · 待接搜尋面板', 'info');
  }, [showToast]);

  const handleDelete = useCallback(() => {
    if (!selectedUser) {
      showToast('請先點選一筆資料才能刪除', 'danger');
      return;
    }
    setConfirmState({
      title: '確認刪除',
      message: `確定要刪除「${selectedUser.displayName}（${selectedUser.username}）」？此動作無法復原。`,
      confirmLabel: '刪除',
      variant: 'danger',
      onConfirm: () => {
        const name = selectedUser.username;
        setSelectedId(null);
        showToast(`已刪除 ${name}`, 'danger');
      },
    });
  }, [selectedUser, showToast]);

  const handleExport = useCallback(
    (format: 'csv' | 'pdf' | 'print') => {
      const label = format === 'csv' ? 'CSV' : format === 'pdf' ? 'PDF' : '列印';
      showToast(`匯出 ${label} · lab mock`, 'success');
    },
    [showToast],
  );

  const handleRefresh = useCallback(() => {
    showToast('已重新整理（Alt+R）', 'success');
  }, [showToast]);

  const handleExit = useCallback(() => {
    const first = sidebarRef.current?.querySelector<HTMLButtonElement>('[data-nav-item]');
    first?.focus();
    showToast('焦點已轉至左側模組列表（↑↓ 切換）', 'info');
  }, [showToast]);

  const handleSave = useCallback(() => {
    setConfirmState({
      title: '確認存檔',
      message: '是否確認將變更寫入此筆資料？',
      confirmLabel: '存檔',
      onConfirm: () => {
        setMode('browse');
        setEditForm(null);
        showToast('已存檔（lab mock）', 'success');
      },
    });
  }, [showToast]);

  const handleCancel = useCallback(() => {
    setMode('browse');
    setEditForm(null);
    showToast('已取消編輯', 'info');
  }, [showToast]);

  // ── Alt+letter 快捷鍵 ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (selectionMode) return; // selectionMode 不接 Alt 快捷
      if (mode === 'edit') {
        if (k === 's') {
          e.preventDefault();
          handleSave();
        } else if (k === 'c') {
          e.preventDefault();
          handleCancel();
        }
        return;
      }
      // browse mode
      switch (k) {
        case 'a':
          e.preventDefault();
          handleCreate();
          break;
        case 'e':
          if (selectedUser) {
            e.preventDefault();
            handleEdit();
          }
          break;
        case 'f':
          e.preventDefault();
          handleSearch();
          break;
        case 'd':
          if (selectedUser) {
            e.preventDefault();
            handleDelete();
          }
          break;
        case 'p':
          // 匯出 dropdown 由使用者點開（mock 一個快速 print）
          e.preventDefault();
          handleExport('csv');
          break;
        case 'r':
          e.preventDefault();
          handleRefresh();
          break;
        case 'q':
          e.preventDefault();
          handleExit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mode,
    selectionMode,
    selectedUser,
    handleCreate,
    handleEdit,
    handleSearch,
    handleDelete,
    handleExport,
    handleRefresh,
    handleExit,
    handleSave,
    handleCancel,
  ]);

  return (
    <div className="flex h-dvh bg-background text-foreground">
      <LeftSidebar sidebarRef={sidebarRef} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <ErpToolbar
          mode={mode}
          activeRow={selectedUser}
          selectionMode={selectionMode}
          onToggleSelection={handleToggleSelection}
          selectedCount={checked.size}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onSearch={handleSearch}
          onDelete={handleDelete}
          onExport={handleExport}
          onRefresh={handleRefresh}
          onExit={handleExit}
          onSave={handleSave}
          onCancel={handleCancel}
        />
        <ErpTabBar
          tab={tab}
          onChange={setTab}
          hasSelected={selectedUser !== null}
          editMode={mode === 'edit'}
        />
        {tab === 'list' ? (
          <UsersTable
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              setTab('detail');
              // 雙擊 = 進入編輯（對齊 footer 文案）
              const u = USERS.find((u) => u.id === id);
              if (u) {
                setMode('edit');
                setEditForm(makeEditForm(u));
              }
            }}
            selectionMode={selectionMode}
            checked={checked}
            setChecked={setChecked}
          />
        ) : selectedUser ? (
          <UserDetailView
            user={selectedUser}
            editMode={mode === 'edit'}
            editForm={editForm}
            onEditChange={setEditForm}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            請先於「資料瀏覽」選擇一筆資料
          </div>
        )}
      </main>
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
      <ToastStack toasts={toasts} />
    </div>
  );
}
