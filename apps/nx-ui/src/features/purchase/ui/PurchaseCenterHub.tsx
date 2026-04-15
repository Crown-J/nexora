/**
 * @FUNCTION_CODE NX02-DASH-UI-001-F01
 * 採購中心首頁：主檔風格卡片 + 流程虛線連接 + 子功能 Dropdown
 */

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileText,
  Package,
  PackageCheck,
  RotateCcw,
  Shield,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockPurchaseCounts } from '@/mocks/purchase-hub';
import { cn } from '@/lib/utils';

const FLOW = 'rgba(232,160,32,0.4)';
const FLOW_TEXT = '#E8A020';

type SubItem = { label: string; href: string };

type PurchaseCardConfig = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  subItems: SubItem[];
  countKind: 'pending' | 'total';
  countKey: keyof typeof mockPurchaseCounts;
};

const CARD_BASE = cn(
  'group relative glass-card w-full max-w-[280px] rounded-2xl border border-border/80 p-5 text-left shadow-sm',
  'transition-all duration-300 ease-out',
  'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'data-[state=open]:border-primary/45 data-[state=open]:shadow-md',
);

const managementCards: PurchaseCardConfig[] = [
  {
    id: 'product',
    title: '產品管理',
    description: '零件定價／安全量',
    icon: Package,
    countKind: 'total',
    countKey: 'product',
    subItems: [
      { label: '📋 新增料號', href: '/dashboard/base/parts' },
      { label: '📋 料號列表', href: '/dashboard/base/parts' },
      { label: '📋 定價管理', href: '/dashboard/purchase/product' },
      { label: '📋 安全量設定', href: '/dashboard/purchase/product' },
    ],
  },
  {
    id: 'vendor',
    title: '廠商管理',
    description: '廠商新增／評鑑／談判',
    icon: Building2,
    countKind: 'total',
    countKey: 'vendor',
    subItems: [
      { label: '📋 新增廠商', href: '/dashboard/base/partners' },
      { label: '📋 廠商列表', href: '/dashboard/base/partners' },
      { label: '📋 季度評鑑', href: '/dashboard/purchase/vendor' },
    ],
  },
];

const domesticMain: PurchaseCardConfig[] = [
  {
    id: 'domestic-rfq',
    title: '詢價單',
    description: '供應商詢價與報價彙整',
    icon: ClipboardList,
    countKind: 'pending',
    countKey: 'rfq',
    subItems: [
      { label: '📋 新增詢價單', href: '/dashboard/nx01/rfq/new' },
      { label: '📋 查看詢價單列表', href: '/dashboard/nx01/rfq' },
      {
        label: `📋 待回覆詢價單（${mockPurchaseCounts.rfq.pending}）`,
        href: '/dashboard/nx01/rfq',
      },
    ],
  },
  {
    id: 'domestic-po',
    title: '進貨單',
    description: '採購訂單與交期追蹤',
    icon: FileText,
    countKind: 'pending',
    countKey: 'po',
    subItems: [
      { label: '📋 新增進貨單', href: '/dashboard/nx01/po/new' },
      { label: '📋 進貨單列表', href: '/dashboard/nx01/po' },
      {
        label: `📋 待確認進貨單（${mockPurchaseCounts.po.pending}）`,
        href: '/dashboard/nx01/po',
      },
    ],
  },
  {
    id: 'domestic-receipt',
    title: '驗收入庫',
    description: '到貨驗收與入帳',
    icon: PackageCheck,
    countKind: 'pending',
    countKey: 'receipt',
    subItems: [
      { label: '📋 待驗收列表', href: '/dashboard/nx01/rr' },
      { label: '📋 驗收作業', href: '/dashboard/nx01/rr' },
      { label: '📋 已驗收記錄', href: '/dashboard/nx01/rr' },
    ],
  },
];

const domesticBranchReturn: PurchaseCardConfig = {
  id: 'domestic-return',
  title: '退貨',
  description: '退供應商',
  icon: RotateCcw,
  countKind: 'pending',
  countKey: 'return',
  subItems: [
    { label: '📋 新增退貨單', href: '/dashboard/nx01/pr/new' },
    { label: '📋 退貨單列表', href: '/dashboard/nx01/pr' },
  ],
};

const domesticBranchWarranty: PurchaseCardConfig = {
  id: 'domestic-warranty',
  title: '保固申請',
  description: '向廠商申請保固',
  icon: Shield,
  countKind: 'pending',
  countKey: 'warranty',
  subItems: [
    { label: '📋 新增保固申請', href: '/dashboard/purchase/domestic?focus=warranty' },
    { label: '📋 保固申請列表', href: '/dashboard/purchase/domestic?focus=warranty' },
  ],
};

const specialMain: PurchaseCardConfig[] = domesticMain.map((c) => ({
  ...c,
  id: c.id.replace('domestic-', 'special-'),
}));

const specialReturn: PurchaseCardConfig = {
  ...domesticBranchReturn,
  id: 'special-return',
};

function countBadge(c: PurchaseCardConfig): string {
  const row = mockPurchaseCounts[c.countKey];
  if (c.countKind === 'total' && 'total' in row) return `${row.total}`;
  if ('pending' in row) return `${row.pending}`;
  return '—';
}

function FlowArrowH({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'hidden min-h-[44px] min-w-[1.5rem] flex-1 flex-row items-center md:flex',
        'max-w-[3.5rem] justify-center gap-0.5 px-1',
        className,
      )}
      aria-hidden
    >
      <div className="h-px min-w-0 flex-1 border-t border-dashed" style={{ borderColor: FLOW }} />
      <span className="shrink-0 text-xs font-semibold" style={{ color: FLOW_TEXT }}>
        →
      </span>
      <div className="h-px min-w-0 flex-1 border-t border-dashed" style={{ borderColor: FLOW }} />
    </div>
  );
}

function FlowArrowV({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center py-1', className)} aria-hidden>
      <span className="text-xs font-semibold leading-none" style={{ color: FLOW_TEXT }}>
        ↓
      </span>
      <div className="mt-0.5 min-h-[1.25rem] w-px flex-1 border-l border-dashed" style={{ borderColor: FLOW }} />
    </div>
  );
}

function PurchaseMenuCard({ card }: { card: PurchaseCardConfig }) {
  const Icon = card.icon;
  const badge = countBadge(card);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={CARD_BASE}>
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/80',
                'bg-secondary/50 text-primary',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
          </div>
          <div className="mt-4 space-y-1 pr-14">
            <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {card.countKind === 'pending' ? '待處理' : '總筆數'}
            </p>
          </div>
          <span
            className={cn(
              'pointer-events-none absolute bottom-4 right-4 rounded-full border border-primary/35',
              'bg-primary/12 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary',
            )}
          >
            {badge}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={8} className="glass-card w-60 border-border/80 p-1 shadow-lg">
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        {card.subItems.map((item) => (
          <DropdownMenuItem key={item.label} asChild className="cursor-pointer">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-border/50" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupHeader({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2 text-sm font-semibold tracking-wide text-foreground"
    >
      {children}
    </div>
  );
}

function DomesticFlow() {
  const [a, b, c] = domesticMain;
  return (
    <div className="space-y-2">
      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-start md:justify-center">
        <div className="flex flex-col items-center md:flex-1 md:max-w-[280px]">
          <PurchaseMenuCard card={a} />
        </div>
        <FlowArrowH className="hidden md:flex" />
        <div className="flex justify-center md:hidden">
          <FlowArrowV />
        </div>
        <div className="flex flex-col items-center md:flex-1 md:max-w-[280px]">
          <PurchaseMenuCard card={b} />
        </div>
        <FlowArrowH className="hidden md:flex" />
        <div className="flex justify-center md:hidden">
          <FlowArrowV />
        </div>
        <div className="flex w-full max-w-[280px] flex-col items-center md:flex-[1.15]">
          <PurchaseMenuCard card={c} />
          <FlowArrowV />
          <div className="mt-1 flex w-full flex-row flex-wrap justify-center gap-6 md:gap-10">
            <PurchaseMenuCard card={domesticBranchReturn} />
            <PurchaseMenuCard card={domesticBranchWarranty} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecialFlow() {
  const [a, b, c] = specialMain;
  return (
    <div className="space-y-2">
      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-start md:justify-center">
        <div className="flex flex-col items-center md:flex-1 md:max-w-[280px]">
          <PurchaseMenuCard card={a} />
        </div>
        <FlowArrowH className="hidden md:flex" />
        <div className="flex justify-center md:hidden">
          <FlowArrowV />
        </div>
        <div className="flex flex-col items-center md:flex-1 md:max-w-[280px]">
          <PurchaseMenuCard card={b} />
        </div>
        <FlowArrowH className="hidden md:flex" />
        <div className="flex justify-center md:hidden">
          <FlowArrowV />
        </div>
        <div className="flex w-full max-w-[280px] flex-col items-center md:flex-[1.15]">
          <PurchaseMenuCard card={c} />
          <FlowArrowV />
          <div className="mt-1 flex justify-center">
            <PurchaseMenuCard card={specialReturn} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PurchaseCenterHub() {
  return (
    <div className="w-full min-w-0 space-y-8">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">採購中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          依業務分區排列；點選卡片進入各採購流程。
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="purchase-group-mgmt">
        <GroupHeader id="purchase-group-mgmt">
          ─── GROUP：管理 ──────────────────────────
        </GroupHeader>
        <div className="grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managementCards.map((c) => (
            <PurchaseMenuCard key={c.id} card={c} />
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="purchase-group-domestic">
        <GroupHeader id="purchase-group-domestic">
          ─── GROUP：國內採購 ──────────────────────────
        </GroupHeader>
        <DomesticFlow />
      </section>

      <section className="space-y-4" aria-labelledby="purchase-group-special">
        <GroupHeader id="purchase-group-special">
          ─── GROUP：特殊採購 ──────────────────────────
        </GroupHeader>
        <SpecialFlow />
      </section>
    </div>
  );
}
