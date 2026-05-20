// apps/nx-ui/src/app/lab/accounts/page.tsx
/**
 * NEXORA Lab：Accounts 範式實驗頁（全新嘗試、不動既有）
 *
 * 路徑：/lab/accounts（避開 dashboard layout 的 TopBar wrap、純 root layout）
 *
 * 範式對齊 Crown 揭露圖（Clay / Apollo 風格）：
 * - 左側 nav sidebar（取代 TopBar）
 * - 頂部 stat cards 4 個 metric
 * - 大表格（mock 資料）
 *
 * 設計：
 * - NEXORA dark theme + amber accent（取代圖中紫色）
 * - 全 viewport（self-contained、無 DashboardShell）
 * - mock 資料 inline、後續軌串 API
 */

'use client';

import { useState } from 'react';
import {
  Bell,
  Cpu,
  Star,
  Users,
  UserCircle,
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
  List,
  Lock,
  Copy,
  Building2,
  Globe2,
  Package,
  Hash,
} from 'lucide-react';

import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// Mock data
// ──────────────────────────────────────────────────────────────

const NAV_TOP = [
  { id: 'notif', icon: Bell, label: '通知', badge: 10 },
  { id: 'tech', icon: Cpu, label: '技術棧', badge: null },
  { id: 'fav', icon: Star, label: '我的最愛', badge: null },
];

type ListItem = { id: string; icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean };

const NAV_ACCOUNTS: ListItem[] = [
  { id: 'all', icon: Users, label: '所有客戶' },
  { id: 'my-first', icon: List, label: '我的清單 #1', active: true },
  { id: 'private', icon: Lock, label: '我的私人清單' },
  { id: 'copy', icon: Copy, label: 'Default 清單副本' },
];

const NAV_CUSTOMERS: ListItem[] = [
  { id: 'all-customers', icon: Building2, label: '所有交易客戶' },
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
    title: '客戶總數',
    info: '所有 CRM 同步客戶',
    bigValue: '37,433',
    badge: '本月 CRM',
    badgeTone: 'amber',
    segments: [
      { label: '已同步', value: '23,954', pct: 64 },
      { label: '待同步', value: '13,479', pct: 36 },
    ],
  },
  {
    title: '規模',
    info: '依員工數估計',
    bigValue: '25,513',
    badge: '大型',
    badgeTone: 'sky',
    segments: [
      { label: '大型', value: '25,513', pct: 68 },
      { label: '中型', value: '9,272', pct: 24 },
      { label: '小型', value: '3,452', pct: 8 },
    ],
  },
  {
    title: '成長性',
    info: '營收 YoY 趨勢',
    bigValue: '17,513',
    badge: '穩定',
    badgeTone: 'green',
    segments: [
      { label: '穩定', value: '17,513', pct: 55 },
      { label: '高成長', value: '14,618', pct: 30 },
      { label: '低成長', value: '9,432', pct: 15 },
    ],
  },
  {
    title: '契合度',
    info: 'AI 評估配適度',
    bigValue: '25,433',
    badge: '低',
    badgeTone: 'rose',
    segments: [
      { label: '低', value: '25,433', pct: 60 },
      { label: '完美', value: '8,954', pct: 25 },
      { label: '中等', value: '4,642', pct: 15 },
    ],
  },
];

type AccountRow = {
  id: string;
  initial: string;
  initialColor: string;
  name: string;
  website: string;
  segments: string[];
  competitors: { initial: string; color: string; name: string }[];
};

const ACCOUNTS: AccountRow[] = [
  {
    id: '1',
    initial: '∞',
    initialColor: 'bg-sky-500/20 text-sky-300',
    name: 'Infinity Payroll Services',
    website: 'statholdings.com',
    segments: ['企業客戶', '製造業'],
    competitors: [
      { initial: 'P', color: 'bg-amber-500/20 text-amber-300', name: 'Pushpay' },
    ],
  },
  {
    id: '2',
    initial: '12',
    initialColor: 'bg-orange-500/20 text-orange-300',
    name: '12Stone 教會',
    website: '12stone.comflowery-branch.io',
    segments: ['宗教組織', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-sky-500/20 text-sky-300', name: 'Planning Center' },
    ],
  },
  {
    id: '3',
    initial: '12',
    initialColor: 'bg-orange-500/20 text-orange-300',
    name: '12Stone 教會（分點）',
    website: '12stone.comhamilton-mill.com',
    segments: ['宗教組織', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-amber-500/20 text-amber-300', name: 'Pushpay' },
      { initial: 'G', color: 'bg-violet-500/20 text-violet-300', name: 'Genius' },
    ],
  },
  {
    id: '4',
    initial: '14',
    initialColor: 'bg-rose-500/20 text-rose-300',
    name: '14th Avenue Church',
    website: '14avecoc.org',
    segments: ['宗教組織', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-sky-500/20 text-sky-300', name: 'Planning Center' },
    ],
  },
  {
    id: '5',
    initial: '15',
    initialColor: 'bg-emerald-500/20 text-emerald-300',
    name: 'Old Mount Zion Church',
    website: '1527astor.com',
    segments: ['基督教', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-sky-500/20 text-sky-300', name: 'Planning Center' },
    ],
  },
  {
    id: '6',
    initial: '16',
    initialColor: 'bg-violet-500/20 text-violet-300',
    name: 'Twin Cities Baptist Church',
    website: '1611twincities.org',
    segments: ['浸信會', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-amber-500/20 text-amber-300', name: 'Pushpay' },
      { initial: 'G', color: 'bg-violet-500/20 text-violet-300', name: 'Genius' },
    ],
  },
  {
    id: '7',
    initial: '16',
    initialColor: 'bg-amber-500/20 text-amber-300',
    name: '16th Ave Church',
    website: '16avechurch.com',
    segments: ['教會', '非營利'],
    competitors: [
      { initial: 'G', color: 'bg-violet-500/20 text-violet-300', name: 'Genius' },
      { initial: 'S', color: 'bg-sky-500/20 text-sky-300', name: 'SignIn' },
    ],
  },
  {
    id: '8',
    initial: '18',
    initialColor: 'bg-emerald-500/20 text-emerald-300',
    name: '180 Church',
    website: '180church.com',
    segments: ['Foursquare', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-sky-500/20 text-sky-300', name: 'Planning Center' },
    ],
  },
  {
    id: '9',
    initial: 'T',
    initialColor: 'bg-rose-500/20 text-rose-300',
    name: 'Torrance First Presbyterian',
    website: '1church.com',
    segments: ['長老教會', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-sky-500/20 text-sky-300', name: 'Planning Center' },
    ],
  },
  {
    id: '10',
    initial: 'F',
    initialColor: 'bg-orange-500/20 text-orange-300',
    name: 'First General Baptist Church',
    website: '1gbmalden.org',
    segments: ['浸信會', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-sky-500/20 text-sky-300', name: 'Planning Center' },
    ],
  },
  {
    id: '11',
    initial: 'F',
    initialColor: 'bg-violet-500/20 text-violet-300',
    name: 'First Korean American Baptist',
    website: '1kabc.com',
    segments: ['浸信會', '非營利'],
    competitors: [
      { initial: 'P', color: 'bg-sky-500/20 text-sky-300', name: 'Planning Center' },
    ],
  },
];

// ──────────────────────────────────────────────────────────────
// 子元件
// ──────────────────────────────────────────────────────────────

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number | null;
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
          <p className="truncate text-sm font-semibold text-foreground">Serenity Technologies</p>
          <p className="truncate text-[11px] text-muted-foreground">Base Plan</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 nx-master-scroll">
        {/* 主導覽 */}
        <div className="space-y-0.5 px-1 pt-1">
          {NAV_TOP.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} badge={item.badge} />
          ))}
        </div>

        {/* ACCOUNTS section */}
        <SectionLabel
          label="客戶清單"
          action={
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="新增清單"
            >
              <Plus className="size-3.5" />
            </button>
          }
        />
        <div className="space-y-0.5 px-1">
          {NAV_ACCOUNTS.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={item.active} />
          ))}
        </div>

        {/* CUSTOMERS section */}
        <SectionLabel
          label="交易客戶"
          action={
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="新增交易客戶清單"
            >
              <Plus className="size-3.5" />
            </button>
          }
        />
        <div className="space-y-0.5 px-1">
          {NAV_CUSTOMERS.map((item) => (
            <NavItem key={item.id} icon={item.icon} label={item.label} />
          ))}
        </div>
      </div>

      {/* User footer */}
      <div className="flex items-center gap-2.5 border-t border-border/40 px-3 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-secondary/80 text-xs font-medium text-foreground">
          C
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">Crown</p>
          <p className="truncate text-[10px] text-muted-foreground">crown@nexora.dev</p>
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
          客戶清單
        </p>
        <div className="mt-0.5 flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">我的清單 #1</h1>
          <span className="inline-flex items-center gap-1 rounded-md border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
            <Users className="size-3" />
            團隊
          </span>
          <div className="flex -space-x-1.5">
            <div className="flex size-5 items-center justify-center rounded-full border-2 border-background bg-amber-500/40 text-[9px] font-medium">
              C
            </div>
            <div className="flex size-5 items-center justify-center rounded-full border-2 border-background bg-sky-500/40 text-[9px] font-medium">
              A
            </div>
            <div className="flex size-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500/40 text-[9px] font-medium">
              H
            </div>
          </div>
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
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 text-xs text-foreground hover:bg-white/5"
        >
          <Sparkles className="size-3.5" />
          動態
          <span className="ml-1 rounded-md bg-[#E8A020]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8A020]">
            +5
          </span>
        </button>
      </div>
    </div>
  );
}

function FilterToolbar() {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-6 py-2">
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 text-xs text-foreground hover:bg-white/5"
      >
        <FilterIcon className="size-3.5" />
        篩選欄位
        <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] tabular-nums text-foreground">
          8
        </span>
      </button>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 text-xs text-foreground hover:bg-white/5"
        >
          <RefreshCcw className="size-3.5" />
          同步
          <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
            15 分前
          </span>
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
      {/* Header */}
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

      {/* Big number + badge */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {card.bigValue}
        </span>
        <StatBadge tone={card.badgeTone}>{card.badge}</StatBadge>
      </div>

      {/* Bar */}
      <StatBar segments={card.segments} tone={card.badgeTone} />

      {/* Mini metric rows */}
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

function AccountsTable() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
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
              <th className="min-w-[260px] whitespace-nowrap px-2 py-2.5">
                <span className="inline-flex items-center gap-1">
                  公司名稱
                  <ChevronDown className="size-3" />
                </span>
              </th>
              <th className="min-w-[200px] whitespace-nowrap px-2 py-2.5">網址</th>
              <th className="min-w-[260px] whitespace-nowrap px-2 py-2.5">分類</th>
              <th className="min-w-[200px] whitespace-nowrap px-2 py-2.5">競品與整合</th>
              <th className="w-12 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {ACCOUNTS.map((row) => {
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
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(row.id)}
                      className="size-3.5 rounded border-border"
                      aria-label={`選取 ${row.name}`}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-medium', row.initialColor)}>
                        {row.initial}
                      </div>
                      <span className="truncate font-medium text-foreground">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <a
                      href={`https://${row.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline"
                    >
                      <Globe2 className="size-3 opacity-60" />
                      <span className="truncate">{row.website}</span>
                    </a>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {row.segments.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[10px] text-foreground/85"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {row.competitors.map((c, i) => (
                        <span
                          key={i}
                          title={c.name}
                          className={cn(
                            'inline-flex size-5 items-center justify-center rounded-md text-[10px] font-semibold',
                            c.color,
                          )}
                        >
                          {c.initial}
                        </span>
                      ))}
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {row.competitors.map((c) => c.name).join('、')}
                      </span>
                    </div>
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
          </tbody>
        </table>
      </div>

      {/* 底部 status bar */}
      <div className="flex items-center justify-between border-t border-border/40 bg-card/30 px-6 py-2 text-[11px] text-muted-foreground">
        <span>共 11 筆 · 顯示 11 筆</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Hash className="size-3" />
            列高 緊湊
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="size-3" />
            6 欄
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function LabAccountsPage() {
  return (
    <div className="flex h-dvh bg-background text-foreground">
      <LeftSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <FilterToolbar />
        <StatCardsRow />
        <AccountsTable />
      </main>
    </div>
  );
}
