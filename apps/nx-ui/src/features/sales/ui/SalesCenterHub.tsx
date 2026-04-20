/**
 * @FUNCTION_CODE NX04-DASH-UI-001-F01
 * 銷貨中心首頁：版型與採購中心一致（群組 + 流程卡 + Step）
 */

'use client';

import type { LucideIcon } from 'lucide-react';
import { Building2, ClipboardList, FileText, Package, Truck, Undo2 } from 'lucide-react';
import { mockSalesCounts } from '@/mocks/sales-hub';
import {
  CenterHubCardWrap,
  CenterHubFlowCard,
  CenterHubGroupHeading,
} from '@/features/layout/ui/CenterHubFlowCard';

const ACCENT = '#E8A020';

type SubItem = { label: string; href: string };

type SalesCardConfig = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  subItems: SubItem[];
  countKind: 'pending' | 'total';
  countKey: keyof typeof mockSalesCounts;
};

const managementCards: SalesCardConfig[] = [
  {
    id: 'customer',
    title: '客戶管理',
    description: '客戶主檔與等級',
    icon: Building2,
    countKind: 'total',
    countKey: 'customer',
    subItems: [
      { label: '新增客戶', href: '/dashboard/base/partners' },
      { label: '客戶列表', href: '/dashboard/base/partners' },
      { label: '客戶銷貨流程', href: '/dashboard/nx03/customer-sales' },
    ],
  },
  {
    id: 'part',
    title: '料號與售價',
    description: '料號主檔／報價基礎',
    icon: Package,
    countKind: 'total',
    countKey: 'part',
    subItems: [
      { label: '料號列表', href: '/dashboard/base/parts' },
      { label: '國內銷售作業', href: '/dashboard/nx04/domestic' },
      { label: 'NX03 工作台', href: '/dashboard/nx03/workbench' },
    ],
  },
];

const domesticMain: SalesCardConfig[] = [
  {
    id: 'quote',
    title: '報價單',
    description: '客戶報價與議價',
    icon: ClipboardList,
    countKind: 'pending',
    countKey: 'quote',
    subItems: [
      { label: '報價作業', href: '/dashboard/nx04/domestic?mode=quote' },
      { label: '銷售工作台', href: '/dashboard/nx03/workbench' },
    ],
  },
  {
    id: 'so',
    title: '銷貨單',
    description: '訂單確認與沖銷',
    icon: FileText,
    countKind: 'pending',
    countKey: 'so',
    subItems: [
      { label: '建立銷貨單', href: '/dashboard/nx04/domestic?mode=so' },
      { label: '銷貨單（工作台）', href: '/dashboard/nx03/workbench?phase=salesOrder' },
    ],
  },
  {
    id: 'pick',
    title: '撿貨／備貨',
    description: '倉儲備貨節點',
    icon: Package,
    countKind: 'pending',
    countKey: 'pick',
    subItems: [
      { label: '庫存工作台', href: '/dashboard/nx03/workspace' },
      { label: 'NX03 工作台', href: '/dashboard/nx03/workbench' },
    ],
  },
];

const domesticShip: SalesCardConfig = {
  id: 'ship',
  title: '出貨',
  description: '出貨與簽收',
  icon: Truck,
  countKind: 'pending',
  countKey: 'ship',
  subItems: [
    { label: '出貨作業（工作台）', href: '/dashboard/nx03/workbench?phase=ship' },
    { label: '銷售作業總覽', href: '/dashboard/nx04/domestic' },
  ],
};

const domesticReturn: SalesCardConfig = {
  id: 'return',
  title: '銷退',
  description: '銷貨退回',
  icon: Undo2,
  countKind: 'pending',
  countKey: 'return',
  subItems: [
    { label: '銷退處理', href: '/dashboard/nx04/domestic?mode=return' },
    { label: '工作台', href: '/dashboard/nx03/workbench' },
  ],
};

function countBadge(c: SalesCardConfig): string {
  const row = mockSalesCounts[c.countKey];
  if (c.countKind === 'total' && 'total' in row) return `${row.total}`;
  if ('pending' in row) return `${row.pending}`;
  return '—';
}

function SalesMenuCard({ card, stepLabel }: { card: SalesCardConfig; stepLabel?: string }) {
  const Icon = card.icon;
  return (
    <CenterHubFlowCard
      title={card.title}
      description={card.description}
      icon={Icon}
      subItems={card.subItems}
      footerBadge={countBadge(card)}
      stepLabel={stepLabel}
      accentHex={ACCENT}
    />
  );
}

function DomesticFlow() {
  const [a, b, c] = domesticMain;
  return (
    <div className="relative w-full min-w-0">
      <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
        <CenterHubCardWrap>
          <SalesMenuCard card={a} stepLabel="Step.1" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <SalesMenuCard card={b} stepLabel="Step.2" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <SalesMenuCard card={c} stepLabel="Step.3" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <SalesMenuCard card={domesticShip} stepLabel="Step.4" />
        </CenterHubCardWrap>
        <CenterHubCardWrap>
          <SalesMenuCard card={domesticReturn} stepLabel="Step.5" />
        </CenterHubCardWrap>
      </div>
    </div>
  );
}

export function SalesCenterHub() {
  return (
    <div className="w-full min-w-0 space-y-12">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SALES CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">銷貨中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          版型與採購中心一致；點選卡片展開快捷連結（含 NX03 工作台與國內銷售作業）。
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="sales-group-mgmt">
        <CenterHubGroupHeading id="sales-group-mgmt" title="管理" />
        <div className="flex flex-wrap justify-start gap-6">
          {managementCards.map((c) => (
            <div key={c.id} className="flex w-[220px] shrink-0 justify-center sm:w-auto">
              <SalesMenuCard card={c} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="sales-group-domestic">
        <CenterHubGroupHeading id="sales-group-domestic" title="國內銷售" />
        <DomesticFlow />
      </section>
    </div>
  );
}
