// apps/nx-ui/src/app/lab/users/page.tsx
/**
 * NEXORA Lab：使用者主檔範式（Crown iterate v2）
 *
 * Crown 拍板（commit 41 iterate）：
 * - 移除 stat cards（卡片不需要）
 * - 縮減色彩（不要太花）
 * - 明細用舊 ERP 範式（tab「資料瀏覽 / 詳細資料」+ 工具列 + form + 項次）
 *
 * 路徑：/lab/users（避開 dashboard layout、純 root layout）
 */

'use client';

import { useState } from 'react';
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
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  Bell,
  Layers,
  Pencil,
  Save,
  X,
  Trash2,
  Printer,
  LogOut,
  Edit3,
} from 'lucide-react';

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
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
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

function LeftSidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border/40 bg-card/40 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#E8A020]/15 text-[#E8A020]">
          <Sparkles className="size-5" />
        </div>
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

/** 舊 ERP 工具列範式（A 新增 / M 更正 / F 查詢 / S 存檔 / C 取消 / D 刪除 / P 印表 / Q 結束）*/
function ErpToolbar({ activeRow }: { activeRow: UserRow | null }) {
  const hasRow = activeRow !== null;
  return (
    <div className="flex items-center gap-1 border-b border-border/40 bg-card/30 px-3 py-1.5">
      <ToolbarButton icon={Plus} letter="A" label="新增" enabled />
      <ToolbarButton icon={Pencil} letter="M" label="更正" enabled={hasRow} />
      <ToolbarButton icon={Search} letter="F" label="查詢" enabled />
      <ToolbarSeparator />
      <ToolbarButton icon={Save} letter="S" label="存檔" enabled={false} />
      <ToolbarButton icon={X} letter="C" label="取消" enabled={false} />
      <ToolbarSeparator />
      <ToolbarButton icon={Trash2} letter="D" label="刪除" enabled={hasRow} variant="danger" />
      <ToolbarButton icon={Printer} letter="P" label="印表" enabled />
      <div className="flex-1" />
      <ToolbarButton icon={Edit3} letter="E" label="編輯明細" enabled={hasRow} />
      <ToolbarButton icon={RefreshCcw} letter="R" label="重新整理" enabled />
      <ToolbarButton icon={LogOut} letter="Q" label="結束" enabled />
    </div>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-border/50" aria-hidden />;
}

function ToolbarButton({
  icon: Icon,
  letter,
  label,
  enabled,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  letter: string;
  label: string;
  enabled: boolean;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      title={`${label}（${letter}）`}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors',
        enabled
          ? variant === 'danger'
            ? 'border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
            : 'border-border/60 bg-card/60 text-foreground/85 hover:bg-white/5 hover:text-foreground'
          : 'cursor-not-allowed border-border/30 bg-card/30 text-muted-foreground/40',
      )}
    >
      <Icon className="size-3" />
      <span className="hidden sm:inline">
        <span className={cn('mr-0.5 font-mono', enabled && variant !== 'danger' && 'text-[#E8A020]')}>{letter}</span>
        {label}
      </span>
    </button>
  );
}

/** 舊 ERP 範式 tab bar（1 資料瀏覽 / 2 詳細資料）*/
function ErpTabBar({
  tab,
  onChange,
  hasSelected,
}: {
  tab: 'list' | 'detail';
  onChange: (next: 'list' | 'detail') => void;
  hasSelected: boolean;
}) {
  return (
    <div className="flex items-center border-b border-border/40 bg-background px-3">
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'list'
            ? 'border-[#E8A020] text-[#E8A020]'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
        <span className="rounded bg-muted/60 px-1 font-mono text-[10px]">1</span>
        資料瀏覽
      </button>
      <button
        type="button"
        onClick={() => onChange('detail')}
        disabled={!hasSelected}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
          tab === 'detail'
            ? 'border-[#E8A020] text-[#E8A020]'
            : hasSelected
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
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<'username' | 'displayName' | 'lastLoginAt'>('username');

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto nx-master-scroll">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
            <tr className="border-b border-border/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-2 py-2.5">
                <input type="checkbox" className="size-3.5 rounded border-border" aria-label="全選" />
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
            {USERS.map((row) => {
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
                      : isChecked
                        ? 'bg-[#E8A020]/8'
                        : 'hover:bg-white/3',
                  )}
                >
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(row.id)}
                      className="size-3.5 rounded border-border"
                      aria-label={`選取 ${row.username}`}
                    />
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
        <span>共 5 筆 · 顯示 5 筆 {selectedId ? '· 雙擊或按 E 編輯明細' : '· 點選列以啟用編輯'}</span>
        <span className="text-foreground/60">每頁 20 筆</span>
      </div>
    </div>
  );
}

/** 舊 ERP 範式詳細頁：上方 form fields + 下方明細項次（roles / warehouses）*/
function UserDetailView({ user }: { user: UserRow }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto nx-master-scroll">
      {/* 上方 form fields（grid 4-col、業界 ERP 範式緊湊 layout）*/}
      <div className="border-b border-border/40 bg-card/20 px-6 py-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="帳號" value={user.username} mono />
          <FormField label="姓名" value={user.displayName} />
          <FormField label="職務" value={user.jobTitle} />
          <FormField label="啟用狀態" value={user.isActive ? '啟用' : '停用'} tone={user.isActive ? 'green' : 'muted'} />

          <FormField label="信箱" value={user.email ?? '—'} dim={!user.email} />
          <FormField label="電話" value={user.phone ?? '—'} dim={!user.phone} />
          <FormField label="隸屬倉庫" value={user.warehouse ?? '—'} dim={!user.warehouse} />
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

  const selectedUser = selectedId ? USERS.find((u) => u.id === selectedId) ?? null : null;

  return (
    <div className="flex h-dvh bg-background text-foreground">
      <LeftSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <ErpToolbar activeRow={selectedUser} />
        <ErpTabBar
          tab={tab}
          onChange={setTab}
          hasSelected={selectedUser !== null}
        />
        {tab === 'list' ? (
          <UsersTable
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              setTab('detail');
            }}
          />
        ) : selectedUser ? (
          <UserDetailView user={selectedUser} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            請先於「資料瀏覽」選擇一筆資料
          </div>
        )}
      </main>
    </div>
  );
}
