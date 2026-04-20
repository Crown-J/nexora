/**
 * @FUNCTION_CODE NX02-DASH-UI-001-F01
 * 採購中心首頁：群組標題 + Hub 卡 + 流程步驟標籤 Step.N（右上角，橘底深字）
 */

'use client';

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
import { mockPurchaseCounts } from '@/mocks/purchase-hub';
import {
  CenterHubCardWrap,
  CenterHubFlowCard,
  CenterHubGroupHeading,
} from '@/features/layout/ui/CenterHubFlowCard';

const BADGE_GOLD = '#E8A020';
const STEP_BADGE_BG = '#E8A020';

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

const managementCards: PurchaseCardConfig[] = [
  {
    id: 'product',
    title: '產品管理',
    description: '零件定價/安全量',
    icon: Package,
    countKind: 'total',
    countKey: 'product',
    subItems: [
      { label: '新增料號', href: '/dashboard/base/parts' },
      { label: '料號列表', href: '/dashboard/base/parts' },
      { label: '定價管理', href: '/dashboard/nx02/product' },
      { label: '安全量設定', href: '/dashboard/nx02/product' },
    ],
  },
  {
    id: 'vendor',
    title: '廠商管理',
    description: '廠商新增/評鑑/談判',
    icon: Building2,
    countKind: 'total',
    countKey: 'vendor',
    subItems: [
      { label: '新增廠商', href: '/dashboard/base/partners' },
      { label: '廠商列表', href: '/dashboard/base/partners' },
      { label: '季度評鑑', href: '/dashboard/nx02/vendor' },
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
      { label: '新增詢價單', href: '/dashboard/nx01/rfq/new' },
      { label: '詢價單列表', href: '/dashboard/nx01/rfq' },
      { label: '待回覆詢價單', href: '/dashboard/nx01/rfq' },
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
      { label: '新增進貨單', href: '/dashboard/nx01/po/new' },
      { label: '進貨單列表', href: '/dashboard/nx01/po' },
      { label: '待確認進貨單', href: '/dashboard/nx01/po' },
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
      { label: '待驗收列表', href: '/dashboard/nx01/rr' },
      { label: '驗收作業', href: '/dashboard/nx01/rr' },
      { label: '已驗收記錄', href: '/dashboard/nx01/rr' },
    ],
  },
];

const domesticBranchReturn: PurchaseCardConfig = {
  id: 'domestic-return',
  title: '退貨（退供應商）',
  description: '退供應商',
  icon: RotateCcw,
  countKind: 'pending',
  countKey: 'return',
  subItems: [
    { label: '新增退貨單', href: '/dashboard/nx01/pr/new' },
    { label: '退貨單列表', href: '/dashboard/nx01/pr' },
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
    { label: '新增保固申請', href: '/dashboard/nx02/domestic?focus=warranty' },
    { label: '保固申請列表', href: '/dashboard/nx02/domestic?focus=warranty' },
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

function PurchaseMenuCard({ card, stepLabel }: { card: PurchaseCardConfig; stepLabel?: string }) {
  const Icon = card.icon;
  return (
    <CenterHubFlowCard
      title={card.title}
      description={card.description}
      icon={Icon}
      subItems={card.subItems}
      footerBadge={countBadge(card)}
      stepLabel={stepLabel}
      accentHex={BADGE_GOLD}
    />
  );
}

function DomesticFlow() {
  const [a, b, c] = domesticMain;

  return (
    <div className="relative w-full min-w-0">
      <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
        <CenterHubCardWrap>
          <PurchaseMenuCard card={a} stepLabel="Step.1" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <PurchaseMenuCard card={b} stepLabel="Step.2" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <PurchaseMenuCard card={c} stepLabel="Step.3" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <PurchaseMenuCard card={domesticBranchReturn} stepLabel="Step.4" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <PurchaseMenuCard card={domesticBranchWarranty} stepLabel="Step.5" />
        </CenterHubCardWrap>
      </div>
    </div>
  );
}

function SpecialFlow() {
  const [a, b, c] = specialMain;

  return (
    <div className="relative w-full min-w-0">
      <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
        <CenterHubCardWrap>
          <PurchaseMenuCard card={a} stepLabel="Step.1" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <PurchaseMenuCard card={b} stepLabel="Step.2" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <PurchaseMenuCard card={c} stepLabel="Step.3" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <PurchaseMenuCard card={specialReturn} stepLabel="Step.4" />
        </CenterHubCardWrap>
      </div>
    </div>
  );
}

export function PurchaseCenterHub() {
  return (
    <div className="w-full min-w-0 space-y-12">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">PURCHASE CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">採購中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">依業務分區排列；點選卡片進入各採購流程。</p>
      </header>

      <section className="space-y-4" aria-labelledby="purchase-group-mgmt">
        <CenterHubGroupHeading id="purchase-group-mgmt" title="管理" />
        <div className="flex flex-wrap justify-start gap-6">
          {managementCards.map((c) => (
            <div key={c.id} className="flex w-[220px] shrink-0 justify-center sm:w-auto">
              <PurchaseMenuCard card={c} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="purchase-group-domestic">
        <CenterHubGroupHeading id="purchase-group-domestic" title="國內採購" />
        <DomesticFlow />
      </section>

      <section className="space-y-4" aria-labelledby="purchase-group-special">
        <CenterHubGroupHeading id="purchase-group-special" title="特殊採購" />
        <SpecialFlow />
      </section>
    </div>
  );
}
