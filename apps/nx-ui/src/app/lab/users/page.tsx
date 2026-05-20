// apps/nx-ui/src/app/lab/users/page.tsx
/**
 * NEXORA Lab：使用者主檔範式（Crown iterate v4 / commit 44）
 *
 * Crown 拍板（commit 44 iterate）：鋼鐵星球主題色升級
 * - 取消深淺主題切換、鎖定深灰 + 琥珀單一質感
 * - 4 階灰：
 *   #0A0A0C (base)        — 頁面底
 *   #131316 (surface)     — sidebar / card / toolbar 底
 *   #1A1A1F (elevated)    — hover / dropdown content / 卡片內層
 *   #2A2A30 (border)      — 邊框
 *   #3A3A42 (border-hi)   — 邊框加強（hover/focus）
 * - 文字 4 階：
 *   #E8E8EB (primary)     — 主文
 *   #B8B8C0 (secondary)   — 次文
 *   #888892 (muted)       — 描述
 *   #5A5A60 (dim)         — 占位
 * - 琥珀點綴：#E8A020 + 透明階 (/8 /10 /15 /20 /30 /40)
 * - 移除 emerald 啟用 chip → 琥珀小圓點
 * - Danger（刪除）改鋼鐵紅：#C84A4A 字 + 深棕底，不飽和
 * - Toast：保留 success/info/danger 區分，但全部降飽和度貼合鋼鐵風
 *
 * 累積 lab 沿革：
 * - commit 41：v2 — 移除卡片、明細用舊 ERP 範式
 * - commit 42：v3 — 星球選單、分頁鈕、序號欄、選取 toggle
 * - commit 43：v3.1 — 工具列 10 改革 + 瀏覽/編輯模式 + Alt 快捷鍵
 * - commit 43.1-43.3：Toast 反饋 / Q-Exit Enter-Return / 表格 ↑↓ Enter 鍵盤導航
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
  Megaphone,
  Clock,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HOME_DOCK_ITEMS, PlanetOrbTrigger } from '@/components/home/dock';
import { FormField, FormInput, FormSelect } from '@/features/master-shell/ui/FormField';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// Mock data
// ──────────────────────────────────────────────────────────────

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
      <Icon className={cn('size-4 shrink-0', active ? 'text-[#E8A020]' : 'text-[#888892] group-hover:text-[#E8E8EB]')} />
      <span className="flex-1 truncate text-left">{label}</span>
      {badge != null ? (
        <span className="rounded-md bg-[#1A1A1F] px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-[#888892]">
          {badge}
        </span>
      ) : count != null ? (
        <span className={cn(
          'rounded-md px-1.5 py-0.5 text-[10px] font-mono tabular-nums',
          active ? 'bg-[#E8A020]/15 text-[#E8A020]/85' : 'text-[#5A5A60]',
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
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A5A60]">
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

function LeftSidebar({
  sidebarRef,
  onReturnToTable,
}: {
  sidebarRef: React.RefObject<HTMLElement | null>;
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
        backgroundImage:
          'linear-gradient(180deg, #14141A 0%, #101014 50%, #0C0C10 100%)',
        boxShadow:
          'inset -1px 0 0 0 rgba(255,255,255,0.03), 1px 0 0 0 #000000, inset 0 1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-2.5 border-b border-[#2A2A30]/80 px-4 py-3.5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]">
        <PlanetModuleMenu />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[0.04em] text-[#F0F0F3]">NEXORA GRID</p>
          <p className="truncate text-[11px] text-[#888892]">測試公司（LITE）</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 nx-master-scroll">
        <SectionLabel
          label="帳號與權限"
          action={
            <button
              type="button"
              className="rounded p-0.5 text-[#888892] transition-colors hover:bg-[#1A1A1F] hover:text-[#E8E8EB]"
              aria-label="新增"
            >
              <Plus className="size-3.5" />
            </button>
          }
        />
        <div className="space-y-0.5 px-1">
          {NAV_ACCOUNT.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={item.active}
              count={item.count}
              onClick={onReturnToTable}
            />
          ))}
        </div>

        <SectionLabel label="產品與料號" />
        <div className="space-y-0.5 px-1">
          {NAV_PRODUCT.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} onClick={onReturnToTable} />
          ))}
        </div>

        <SectionLabel label="車型字典" />
        <div className="space-y-0.5 px-1">
          {NAV_VEHICLE.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} onClick={onReturnToTable} />
          ))}
        </div>

        <SectionLabel label="組織架構" />
        <div className="space-y-0.5 px-1">
          {NAV_ORG.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} onClick={onReturnToTable} />
          ))}
        </div>

        <SectionLabel label="交易對象" />
        <div className="space-y-0.5 px-1">
          {NAV_PARTNER.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} onClick={onReturnToTable} />
          ))}
        </div>

        <SectionLabel label="系統設定" />
        <div className="space-y-0.5 px-1">
          <NavItem icon={Settings} label="基礎設定" onClick={onReturnToTable} />
        </div>
      </div>

      <div
        className="flex items-center gap-2.5 border-t border-[#2A2A30] px-3 py-3"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(10,10,12,0.3) 0%, rgba(10,10,12,0.6) 100%)',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex size-8 items-center justify-center rounded-full border border-[#2A2A30] bg-gradient-to-b from-[#22222A] to-[#16161A] text-xs font-medium text-[#E8E8EB] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          管
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[#E8E8EB]">測試租戶管理員（LITE）</p>
          <p className="truncate text-[10px] text-[#5A5A60]">admin · 使用者</p>
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

function TopHeader({ onNotification, onAnnouncement }: { onNotification: () => void; onAnnouncement: () => void }) {
  // 日期時間 live clock（避免 SSR hydration mismatch：初始 null，useEffect 內賦值）
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const timeText = now ? `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}` : '--:--:--';
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const dateText = now
    ? `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${weekdays[now.getDay()]}`
    : '----/--/-- ---';

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
          帳號與權限
        </p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="relative pb-1 text-xl font-bold tracking-[-0.01em] text-[#F0F0F3]">
            使用者主檔
            <span
              aria-hidden
              className="absolute -bottom-0 left-0 h-px w-12 bg-gradient-to-r from-[#E8A020] via-[#E8A020]/40 to-transparent"
            />
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8A020]/30 bg-gradient-to-b from-[#E8A020]/12 to-[#E8A020]/6 px-2.5 py-0.5 text-[10px] font-medium text-[#E8A020] shadow-[inset_0_1px_0_0_rgba(232,160,32,0.15)]">
            <Users className="size-3" />
            5 位使用者
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TopHeaderIconButton
          icon={Bell}
          badge={3}
          badgeTone="red"
          title="通知"
          onClick={onNotification}
        />
        <TopHeaderIconButton
          icon={Megaphone}
          badge={2}
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
  icon: React.ComponentType<{ className?: string }>;
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
      <div className="flex items-center gap-1 border-b border-[#E8A020]/30 bg-gradient-to-r from-[#E8A020]/6 to-[#E8A020]/3 px-3 py-1.5">
        <ToolbarButton icon={Check} label="完成選取" enabled onClick={onToggleSelection} accent />
        <ToolbarSeparator />
        <span className="px-1 text-[11px] text-[#888892]">
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
      <div className="flex items-center gap-1 border-b border-[#E8A020]/30 bg-gradient-to-r from-[#E8A020]/6 to-[#E8A020]/3 px-3 py-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2 py-0.5 text-[11px] font-medium text-[#E8A020]">
          <Pencil className="size-3" />
          編輯中
        </span>
        <ToolbarSeparator />
        <ToolbarButton icon={Save} letter="S" label="存檔" enabled onClick={onSave} accent />
        <ToolbarButton icon={X} letter="C" label="取消" enabled onClick={onCancel} />
        <div className="flex-1" />
        <span className="px-1 text-[11px] text-[#888892]">
          編輯模式 · Alt+S 存檔 / Alt+C 取消
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 border-b border-[#2A2A30] px-3 py-2"
      style={{
        backgroundImage:
          'linear-gradient(180deg, #16161B 0%, #101014 100%)',
        boxShadow:
          'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 #000000',
      }}
    >
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
            'inline-flex h-7 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-2 text-[11px] font-medium text-[#B8B8C0] transition-all hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]',
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
        className="min-w-[10rem] border-[#2A2A30] bg-[#131316]/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        <DropdownMenuItem
          onClick={() => onSelect('csv')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-[#E8E8EB] focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <FileSpreadsheet className="mr-2 size-3.5" />
          匯出 CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('pdf')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-[#E8E8EB] focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <FileText className="mr-2 size-3.5" />
          匯出 PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect('print')}
          className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-[#E8E8EB] focus:bg-[#E8A020]/12 focus:text-[#E8A020] data-[highlighted]:bg-[#E8A020]/12 data-[highlighted]:text-[#E8A020]"
        >
          <Printer className="mr-2 size-3.5" />
          列印
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-[#2A2A30]" aria-hidden />;
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
        'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all',
        disabled
          ? 'cursor-not-allowed border-[#2A2A30]/60 bg-[#131316] text-[#5A5A60]'
          : 'border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0] hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]',
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
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-all',
        enabled
          ? variant === 'danger'
            ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]'
            : accent
              ? 'border-[#E8A020]/40 bg-[#E8A020]/12 text-[#E8A020] hover:bg-[#E8A020]/20'
              : 'border-[#2A2A30] bg-[#1A1A1F] text-[#B8B8C0] hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]'
          : 'cursor-not-allowed border-[#2A2A30]/60 bg-[#131316] text-[#5A5A60]',
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
    <div
      className="flex items-center border-b border-[#2A2A30] px-3"
      style={{
        backgroundImage: 'linear-gradient(180deg, #0E0E12 0%, #08080A 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        disabled={editMode}
        title={editMode ? '編輯模式無法切換' : '資料瀏覽（Alt+1）'}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'list'
            ? 'border-[#E8A020] text-[#E8A020] [text-shadow:0_0_12px_rgba(232,160,32,0.4)]'
            : editMode
              ? 'cursor-not-allowed border-transparent text-[#5A5A60]'
              : 'border-transparent text-[#888892] hover:text-[#E8E8EB]',
        )}
      >
        <span className="rounded bg-[#1A1A1F] px-1 font-mono text-[10px] text-[#888892]">1</span>
        資料瀏覽
      </button>
      <button
        type="button"
        onClick={() => onChange('detail')}
        disabled={!hasSelected || editMode}
        title={editMode ? '編輯模式無法切換' : '詳細資料（Alt+2）'}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'detail'
            ? 'border-[#E8A020] text-[#E8A020] [text-shadow:0_0_12px_rgba(232,160,32,0.4)]'
            : hasSelected && !editMode
              ? 'border-transparent text-[#888892] hover:text-[#E8E8EB]'
              : 'cursor-not-allowed border-transparent text-[#5A5A60]',
        )}
      >
        <span className="rounded bg-[#1A1A1F] px-1 font-mono text-[10px] text-[#888892]">2</span>
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

  // ↑↓ 在表格內 = 切換 row 焦點（攔下預設頁面捲動）；Enter 在 row = 進入編輯（雙擊等價）
  const handleTableKey = (e: React.KeyboardEvent) => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || !active.hasAttribute('data-row-id')) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const rows = Array.from(
        e.currentTarget.querySelectorAll<HTMLTableRowElement>('[data-row-id]'),
      );
      if (rows.length === 0) return;
      const idx = rows.indexOf(active as HTMLTableRowElement);
      const nextIdx =
        e.key === 'ArrowDown'
          ? Math.min(rows.length - 1, idx + 1)
          : Math.max(0, idx - 1);
      e.preventDefault();
      const nextRow = rows[nextIdx];
      nextRow?.focus();
      const nextId = nextRow?.getAttribute('data-row-id');
      if (nextId) onSelect(nextId);
    } else if (e.key === 'Enter') {
      const id = active.getAttribute('data-row-id');
      if (id) {
        e.preventDefault();
        onOpenDetail(id);
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto nx-master-scroll" onKeyDown={handleTableKey}>
        <table className="w-full border-collapse text-sm">
          <thead
            className="sticky top-0 z-10 backdrop-blur-xl"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(20,20,26,0.95) 0%, rgba(16,16,20,0.95) 100%)',
              boxShadow:
                'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 #000000',
            }}
          >
            <tr className="border-b border-[#2A2A30] text-left text-[11px] font-bold uppercase tracking-[0.16em] text-[#C8C8D0]">
              <th className="w-12 px-2 py-2.5">
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={checked.size === USERS.length && USERS.length > 0}
                    onChange={toggleAll}
                    className="size-3.5 rounded border-[#3A3A42] bg-[#1A1A1F] accent-[#E8A020]"
                    aria-label="全選"
                  />
                ) : (
                  <span className="font-medium">序號</span>
                )}
              </th>
              <th className="min-w-[140px] whitespace-nowrap px-2 py-2.5">
                <button
                  type="button"
                  onClick={() => setSortKey('username')}
                  className="inline-flex items-center gap-1 transition-colors hover:text-[#F0F0F3]"
                >
                  帳號
                  <ChevronDown className={cn('size-3', sortKey === 'username' && 'text-[#E8A020]')} />
                </button>
              </th>
              <th className="min-w-[200px] whitespace-nowrap px-2 py-2.5">
                <button
                  type="button"
                  onClick={() => setSortKey('displayName')}
                  className="inline-flex items-center gap-1 transition-colors hover:text-[#F0F0F3]"
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
                  className="inline-flex items-center gap-1 transition-colors hover:text-[#F0F0F3]"
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
              const isEvenRow = i % 2 === 1; // 顯示序號 0002 / 0004 為偶數列
              return (
                <tr
                  key={row.id}
                  data-row-id={row.id}
                  tabIndex={0}
                  onClick={() => onSelect(row.id)}
                  onDoubleClick={() => onOpenDetail(row.id)}
                  style={
                    isSelected
                      ? {
                          backgroundImage:
                            'linear-gradient(90deg, rgba(232,160,32,0.18) 0%, rgba(232,160,32,0.08) 100%)',
                          boxShadow:
                            'inset 0 0 0 1px rgba(232,160,32,0.45), inset 3px 0 0 0 #E8A020',
                        }
                      : undefined
                  }
                  className={cn(
                    'cursor-pointer border-b border-[#1A1A1F]/70 transition-all outline-none',
                    'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#E8A020]/60',
                    !isSelected &&
                      (selectionMode && isChecked
                        ? 'bg-[#E8A020]/6'
                        : cn(isEvenRow ? 'bg-[#101015]' : 'bg-transparent', 'hover:bg-[#1A1A22]')),
                  )}
                >
                  <td className="px-2 py-2.5" onClick={(e) => selectionMode && e.stopPropagation()}>
                    {selectionMode ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(row.id)}
                        className="size-3.5 rounded border-[#3A3A42] bg-[#1A1A1F] accent-[#E8A020]"
                        aria-label={`選取 ${row.username}`}
                      />
                    ) : (
                      <span className="font-mono text-[11px] tabular-nums text-[#5A5A60]">
                        {String(i + 1).padStart(4, '0')}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="font-mono text-xs tracking-wide text-[#E8E8EB]">{row.username}</span>
                  </td>
                  <td className="px-2 py-2.5 font-medium text-[#F0F0F3]">{row.displayName}</td>
                  <td className="px-2 py-2.5">
                    <span className="inline-flex items-center rounded-md border border-[#2A2A30] bg-gradient-to-b from-[#1A1A1F] to-[#131316] px-2 py-0.5 text-[11px] text-[#B8B8C0] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                      {row.jobTitle}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-[#5A5A60]">
                    {row.email ?? '—'}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-[#5A5A60]">
                    {row.phone ?? '—'}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-[#5A5A60]">
                    {row.warehouse ?? '—'}
                  </td>
                  <td className="px-2 py-2.5">
                    {row.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22D88F]/35 bg-gradient-to-b from-[#22D88F]/14 to-[#22D88F]/6 px-2 py-0.5 text-[10px] font-medium text-[#22D88F] shadow-[inset_0_1px_0_0_rgba(34,216,143,0.18)]">
                        <span className="relative flex size-1.5">
                          <span className="absolute inset-0 animate-ping rounded-full bg-[#22D88F]/60" />
                          <span className="relative size-1.5 rounded-full bg-[#22D88F] shadow-[0_0_8px_#22D88F]" />
                        </span>
                        啟用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E26060]/35 bg-gradient-to-b from-[#E26060]/14 to-[#E26060]/6 px-2 py-0.5 text-[10px] font-medium text-[#E26060] shadow-[inset_0_1px_0_0_rgba(226,96,96,0.15)]">
                        <span className="relative flex size-1.5">
                          <span className="absolute inset-0 animate-ping rounded-full bg-[#E26060]/50" />
                          <span className="relative size-1.5 rounded-full bg-[#E26060] shadow-[0_0_8px_#E26060]" />
                        </span>
                        未啟用
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-xs tabular-nums text-[#888892]">
                    {row.lastLoginAt ?? <span className="text-[#5A5A60]">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-xs tabular-nums text-[#888892]">
                    {row.createdAt}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: Math.max(0, 20 - USERS.length) }).map((_, i) => {
              const visualIdx = USERS.length + i;
              const isEvenRow = visualIdx % 2 === 1;
              return (
                <tr
                  key={`__placeholder_${i}`}
                  aria-hidden
                  className={cn(
                    'pointer-events-none select-none border-b border-[#1A1A1F]/40',
                    isEvenRow && 'bg-[#101015]',
                  )}
                >
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
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center justify-between border-t border-[#2A2A30] px-6 py-2 text-[11px] text-[#888892]"
        style={{
          backgroundImage: 'linear-gradient(180deg, #101014 0%, #0A0A0C 100%)',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
        }}
      >
        <span>共 5 筆 · 顯示 5 筆 {selectedId ? '· 雙擊或 Alt+E 進入編輯' : '· 點選列以啟用更正/刪除'}</span>
        <span className="text-[#5A5A60]">每頁 20 筆</span>
      </div>
    </div>
  );
}

/** 詳細資料：滿版單欄滾動（commit 47.3 — 拿掉左側索引）
 *
 * 設計：
 * - 滿版單欄：所有 section 直接滾動陳列，章節間細分隔線
 * - 無 card 邊框、無左側索引（小規模關聯表時索引多餘；零件主檔等大規模再考慮加回）
 * - 模式語意：
 *   瀏覽模式 = read-only：form 不可改、不顯示「新增職務 / 新增倉庫據點」按鈕
 *   編輯模式 = write：form 變 input、顯示新增按鈕
 * - 擴充：新增關聯表只需多寫一個 <section>；若某主檔關聯表 ≥ 6+ 再評估加回索引列
 */
function UserDetailView({
  user,
  editMode,
  editForm,
  onEditChange,
  onAddRole,
  onAddWarehouse,
}: {
  user: UserRow;
  editMode: boolean;
  editForm: EditFormState | null;
  onEditChange: (next: EditFormState) => void;
  onAddRole: () => void;
  onAddWarehouse: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    if (!editForm) return;
    onEditChange({ ...editForm, [key]: value });
  };

  // 切換使用者時 scroll 回頂
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [user.id]);

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-auto nx-master-scroll bg-[#0A0A0C]">
        {/* 基本資料 */}
        <section className="border-b border-[#1A1A1F] px-8 py-6">
          <SectionHeader title="基本資料" subtitle="User Profile" />
          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
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
                value={editForm.isActive ? '啟用' : '未啟用'}
                options={['啟用', '未啟用']}
                onChange={(v) => update('isActive', v === '啟用')}
              />
            ) : (
              <FormField label="啟用狀態" value={user.isActive ? '啟用' : '未啟用'} tone={user.isActive ? 'green' : 'red'} />
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
        </section>

        {/* 擔任職務 */}
        <section className="border-b border-[#1A1A1F] px-8 py-6">
          <SectionHeader
            title="擔任職務"
            count={user.roles.length}
            subtitle="Assigned Roles"
            action={editMode ? <SectionAddButton label="新增職務" onClick={onAddRole} /> : null}
          />
          <div className="mt-4">
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
          </div>
        </section>

        {/* 隸屬倉庫 */}
        <section className="px-8 py-6">
          <SectionHeader
            title="隸屬倉庫"
            count={user.warehouses.length}
            subtitle="Assigned Warehouses"
            action={editMode ? <SectionAddButton label="新增倉庫據點" onClick={onAddWarehouse} /> : null}
          />
          <div className="mt-4">
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
          </div>
        </section>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  subtitle,
  action,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
      <h2 className="text-base font-bold tracking-wide text-[#F0F0F3]">{title}</h2>
      {count != null ? (
        <span className="rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-0.5 text-[11px] font-mono tabular-nums text-[#B8B8C0]">
          {count}
        </span>
      ) : null}
      {subtitle ? (
        <span className="ml-3 hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60] sm:inline">
          {subtitle}
        </span>
      ) : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

function SectionAddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 min-w-[8rem] items-center justify-center gap-1.5 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-[11px] font-medium text-[#B8B8C0] transition-colors hover:border-[#E8A020]/40 hover:bg-[#E8A020]/10 hover:text-[#E8A020]"
    >
      <Plus className="size-3" />
      {label}
    </button>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-40 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.variant === 'success' ? CheckCircle2 : t.variant === 'danger' ? XCircle : Info;
        // success / info 都收斂到琥珀；danger 用鋼鐵紅（不飽和）
        const tone =
          t.variant === 'danger'
            ? 'border-[#5A2A2A] text-[#E26060]'
            : 'border-[#E8A020]/40 text-[#E8A020]';
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border bg-[#131316]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#2A2A30] bg-[#131316] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl border',
              isDanger
                ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A]'
                : 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]',
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#E8E8EB]">{state.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#888892]">{state.message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] transition-colors hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]"
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
                ? 'border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:border-[#7A3A3A] hover:bg-[#2A1818] hover:text-[#E26060]'
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

function DetailTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#B8B8C0]">
          {headers.map((h) => (
            <th key={h} className="border-b border-[#2A2A30] px-2 py-2 whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isEvenRow = i % 2 === 1;
          return (
            <tr
              key={i}
              className={cn(
                'border-b border-[#1A1A1F]/70 transition-colors',
                isEvenRow ? 'bg-[#101015]' : 'bg-transparent',
                'hover:bg-[#1A1A22]',
              )}
            >
              {row.map((cell, j) => (
                <td key={j} className={cn('px-2 py-1.5 text-xs', j === 0 ? 'font-mono text-[#5A5A60]' : 'text-[#E8E8EB]')}>
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EmptyDetail({ message }: { message: string }) {
  return (
    <div className="py-6 text-center text-[11px] text-[#5A5A60]">{message}</div>
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
    // 焦點離開表格 → 同步清掉琥珀選列（視覺上也離開）
    setSelectedId(null);
    const first = sidebarRef.current?.querySelector<HTMLButtonElement>('[data-nav-item]');
    first?.focus();
    showToast('焦點已轉至左側模組列表（↑↓ 切換、Enter 返回表格）', 'info');
  }, [showToast]);

  const handleReturnToTable = useCallback(() => {
    if (USERS.length === 0) return;
    const firstId = USERS[0].id;
    setSelectedId(firstId);
    // 下一個 tick 等 React render 完再聚焦 DOM
    setTimeout(() => {
      const row = document.querySelector<HTMLTableRowElement>(`[data-row-id="${firstId}"]`);
      row?.focus();
    }, 0);
    showToast(`已聚焦第一筆：${USERS[0].username}`, 'info');
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

  const handleNotification = useCallback(() => {
    showToast('通知中心 · 3 則未讀（lab mock）', 'info');
  }, [showToast]);

  const handleAnnouncement = useCallback(() => {
    showToast('公告 · 2 則最新（lab mock）', 'info');
  }, [showToast]);

  const handleAddRole = useCallback(() => {
    showToast('新增職務 · 待接職務選擇器（lab mock）', 'info');
  }, [showToast]);

  const handleAddWarehouse = useCallback(() => {
    showToast('新增倉庫據點 · 待接倉庫選擇器（lab mock）', 'info');
  }, [showToast]);

  // ── Alt+letter 快捷鍵 ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const k = e.key.toLowerCase();

      // Alt+1 / Alt+2：Tab 切換（瀏覽 + 選取模式可用，編輯模式禁用）
      if ((k === '1' || k === '2') && mode !== 'edit') {
        e.preventDefault();
        if (k === '1') {
          setTab('list');
        } else if (selectedUser) {
          setTab('detail');
        } else {
          showToast('請先點選一筆資料才能切換至詳細資料', 'danger');
        }
        return;
      }

      if (selectionMode) return; // selectionMode 不接其他 Alt 快捷
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
    <div
      className="flex h-dvh text-[#E8E8EB]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)',
      }}
    >
      <LeftSidebar sidebarRef={sidebarRef} onReturnToTable={handleReturnToTable} />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopHeader onNotification={handleNotification} onAnnouncement={handleAnnouncement} />
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
            onAddRole={handleAddRole}
            onAddWarehouse={handleAddWarehouse}
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
