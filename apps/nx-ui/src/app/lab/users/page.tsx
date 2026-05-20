// apps/nx-ui/src/app/lab/users/page.tsx
/**
 * NEXORA Lab：使用者主檔範式套用實驗頁（Crown 拍板「套上 USER 試試看」）
 *
 * 路徑：/lab/users（避開 dashboard layout TopBar wrap、純 root layout）
 *
 * 範式延續 /lab/accounts（commit 39）：
 * - 左側 sidebar（取代 TopBar）
 * - 頂部 stat cards 4 個業務 metric（總用戶 / 啟用 / 職務分布 / 最近登入）
 * - 表格（mock 5 個 user：admin / finance1 / purchase1 / sales1 / warehouse1）
 *
 * 設計差異 vs /lab/accounts：
 * - sidebar 主要 nav 改主檔系（主檔中心 / 帳號權限 / 產品料號 / 車型字典 等）
 * - 「使用者主檔」active 高亮
 * - stat cards 改 user 業務數據
 * - 表格欄位對齊既有 user 主檔
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
  Download,
  MoreHorizontal,
  Filter as FilterIcon,
  Info,
  ChevronDown,
  ChevronRight,
  Plus,
  Bell,
  Mail,
  Phone,
  Hash,
  Layers,
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

type StatCard = {
  title: string;
  info: string;
  bigValue: string;
  badge: string;
  badgeTone: 'amber' | 'sky' | 'green' | 'rose';
  segments: { label: string; value: string; pct: number }[];
};

const STAT_CARDS: StatCard[] = [
  {
    title: '使用者總數',
    info: '租戶內所有使用者帳號',
    bigValue: '5',
    badge: '本租戶',
    badgeTone: 'amber',
    segments: [
      { label: '已啟用', value: '5', pct: 100 },
      { label: '已停用', value: '0', pct: 0 },
    ],
  },
  {
    title: '職務分布',
    info: '依主要職務統計',
    bigValue: '5',
    badge: '5 種職務',
    badgeTone: 'sky',
    segments: [
      { label: '系統管理員', value: '1', pct: 20 },
      { label: '財務', value: '1', pct: 20 },
      { label: '其他職務', value: '3', pct: 60 },
    ],
  },
  {
    title: '最近登入',
    info: '7 日內登入次數',
    bigValue: '1',
    badge: '今日',
    badgeTone: 'green',
    segments: [
      { label: '今日活躍', value: '1', pct: 20 },
      { label: '本週活躍', value: '0', pct: 0 },
      { label: '從未登入', value: '4', pct: 80 },
    ],
  },
  {
    title: '據點覆蓋',
    info: '使用者隸屬倉庫數',
    bigValue: '0',
    badge: '待設定',
    badgeTone: 'rose',
    segments: [
      { label: '未指派', value: '5', pct: 100 },
      { label: '單一據點', value: '0', pct: 0 },
      { label: '多據點', value: '0', pct: 0 },
    ],
  },
];

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  jobTitle: string;
  jobColor: string;
  email: string | null;
  phone: string | null;
  warehouse: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdBy: string;
};

const USERS: UserRow[] = [
  {
    id: '1',
    username: 'admin',
    displayName: '測試租戶管理員（LITE）',
    jobTitle: '系統管理員',
    jobColor: 'bg-amber-500/20 text-amber-300',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: '2026-05-20 12:29',
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
  },
  {
    id: '2',
    username: 'finance1',
    displayName: '黃志豪（財務專員）',
    jobTitle: '財務',
    jobColor: 'bg-emerald-500/20 text-emerald-300',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
  },
  {
    id: '3',
    username: 'purchase1',
    displayName: '王小明(採購專員)',
    jobTitle: '採購',
    jobColor: 'bg-sky-500/20 text-sky-300',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
  },
  {
    id: '4',
    username: 'sales1',
    displayName: '陳美玲(業務專員)',
    jobTitle: '業務',
    jobColor: 'bg-violet-500/20 text-violet-300',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
  },
  {
    id: '5',
    username: 'warehouse1',
    displayName: '林大偉(倉管專員)',
    jobTitle: '倉管',
    jobColor: 'bg-rose-500/20 text-rose-300',
    email: null,
    phone: null,
    warehouse: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-05-06 10:16',
    createdBy: '系統管理員',
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
      {/* Brand */}
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
        {/* 主導覽 */}
        <div className="space-y-0.5 px-1 pt-1">
          {NAV_TOP.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} badge={item.badge} />
          ))}
        </div>

        {/* ACCOUNT section */}
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

        {/* PRODUCT section */}
        <SectionLabel label="產品與料號" />
        <div className="space-y-0.5 px-1">
          {NAV_PRODUCT.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        {/* VEHICLE section */}
        <SectionLabel label="車型字典" />
        <div className="space-y-0.5 px-1">
          {NAV_VEHICLE.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        {/* ORG section */}
        <SectionLabel label="組織架構" />
        <div className="space-y-0.5 px-1">
          {NAV_ORG.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        {/* PARTNER section */}
        <SectionLabel label="交易對象" />
        <div className="space-y-0.5 px-1">
          {NAV_PARTNER.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} />
          ))}
        </div>

        {/* SYSTEM section */}
        <SectionLabel label="系統設定" />
        <div className="space-y-0.5 px-1">
          <NavItem icon={Settings} label="基礎設定" />
        </div>
      </div>

      {/* User footer */}
      <div className="flex items-center gap-2.5 border-t border-border/40 px-3 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-medium text-amber-300">
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
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
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
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E8A020]/40 bg-[#E8A020]/10 px-2.5 text-xs font-medium text-[#E8A020] hover:bg-[#E8A020]/20"
        >
          <Plus className="size-3.5" />
          新增使用者
        </button>
      </div>
    </div>
  );
}

function FilterToolbar() {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-6 py-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 text-xs text-foreground hover:bg-white/5"
        >
          <FilterIcon className="size-3.5" />
          篩選條件
          <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] tabular-nums text-foreground">
            2
          </span>
        </button>
        <div className="ml-2 flex items-center gap-1">
          <span className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-300">
            啟用 = 是
            <button className="ml-0.5 opacity-70 hover:opacity-100">×</button>
          </span>
          <span className="inline-flex h-7 items-center gap-1 rounded-md border border-sky-400/30 bg-sky-500/10 px-1.5 text-[10px] text-sky-300">
            本租戶
            <button className="ml-0.5 opacity-70 hover:opacity-100">×</button>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 text-xs text-foreground hover:bg-white/5"
        >
          <RefreshCcw className="size-3.5" />
          重新整理
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 text-xs text-foreground hover:bg-white/5"
        >
          <Download className="size-3.5" />
          匯出
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="更多動作"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}

function StatBar({ segments, tone }: { segments: StatCard['segments']; tone: StatCard['badgeTone'] }) {
  const colorByTone: Record<StatCard['badgeTone'], string[]> = {
    amber: ['bg-[#E8A020]', 'bg-[#E8A020]/60', 'bg-[#E8A020]/30'],
    sky: ['bg-sky-400', 'bg-sky-400/60', 'bg-sky-400/30'],
    green: ['bg-emerald-400', 'bg-emerald-400/60', 'bg-emerald-400/30'],
    rose: ['bg-rose-400', 'bg-rose-400/60', 'bg-rose-400/30'],
  };
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
      {segments.map((s, i) => (
        <div
          key={i}
          style={{ width: `${s.pct}%` }}
          className={cn('h-full transition-all', colorByTone[tone][i] ?? 'bg-muted')}
        />
      ))}
    </div>
  );
}

function StatBadge({ tone, children }: { tone: StatCard['badgeTone']; children: React.ReactNode }) {
  const cls: Record<StatCard['badgeTone'], string> = {
    amber: 'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]',
    sky: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
    green: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
    rose: 'border-rose-400/40 bg-rose-500/10 text-rose-300',
  };
  return (
    <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium', cls[tone])}>
      {children}
    </span>
  );
}

function StatCardItem({ card }: { card: StatCard }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/40 bg-card/40 p-3.5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {card.title}
          </span>
          <Info className="size-3 text-muted-foreground/60" />
        </div>
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground"
          aria-label="更多"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {card.bigValue}
        </span>
        <StatBadge tone={card.badgeTone}>{card.badge}</StatBadge>
      </div>

      <StatBar segments={card.segments} tone={card.badgeTone} />

      <div className="space-y-1 pt-0.5">
        {card.segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className="tabular-nums text-foreground">{s.value}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCardsRow() {
  return (
    <div className="grid grid-cols-1 gap-3 px-6 pt-4 pb-3 sm:grid-cols-2 lg:grid-cols-4">
      {STAT_CARDS.map((card) => (
        <StatCardItem key={card.title} card={card} />
      ))}
    </div>
  );
}

function UsersTable() {
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/40">
      <div className="flex-1 overflow-auto nx-master-scroll">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
            <tr className="border-b border-border/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-3 py-2.5">
                <ChevronRight className="size-3.5 opacity-50" />
              </th>
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
              <th className="w-12 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {USERS.map((row) => {
              const isChecked = checked.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border/30 transition-colors',
                    isChecked ? 'bg-[#E8A020]/8' : 'hover:bg-white/3',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </td>
                  <td className="px-2 py-2.5">
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
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary/80 text-xs font-medium text-foreground">
                        {row.displayName.charAt(0)}
                      </div>
                      <span className="truncate font-medium text-foreground">{row.displayName}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', row.jobColor)}>
                      {row.jobTitle}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">
                    {row.email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3 opacity-60" />
                        {row.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">
                    {row.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3 opacity-60" />
                        {row.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">
                    {row.warehouse ?? <span className="text-muted-foreground/40">—</span>}
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
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {/* 空白列補滿到 20 列（commit 29 範式）*/}
            {Array.from({ length: Math.max(0, 20 - USERS.length) }).map((_, i) => (
              <tr key={`__placeholder_${i}`} aria-hidden className="pointer-events-none select-none border-b border-border/20">
                <td className="px-3 py-2.5">&nbsp;</td>
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
                <td className="px-2 py-2.5">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部 status bar */}
      <div className="flex items-center justify-between border-t border-border/40 bg-card/30 px-6 py-2 text-[11px] text-muted-foreground">
        <span>共 5 筆 · 顯示 5 筆</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Hash className="size-3" />
            列高 緊湊
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="size-3" />
            11 欄
          </span>
          <span className="text-foreground/60">每頁 20 筆</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function LabUsersPage() {
  return (
    <div className="flex h-dvh bg-background text-foreground">
      <LeftSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <FilterToolbar />
        <StatCardsRow />
        <UsersTable />
      </main>
    </div>
  );
}
