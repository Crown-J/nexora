// apps/nx-ui/src/app/platform/page.tsx
// 平台層 vs 租戶層分離軌 Phase 4：平台後台 hub（4 卡片）

'use client';

import Link from 'next/link';
import { Building2, UserPlus, CreditCard, Activity } from 'lucide-react';

type HubCard = {
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  badge?: string;
};

const CARDS: HubCard[] = [
  {
    href: '/platform/customers',
    title: 'Customers',
    description: '所有客戶租戶清單、查詢、詳情。',
    Icon: Building2,
    enabled: true,
  },
  {
    href: '/platform/onboarding',
    title: 'Onboarding',
    description: '幫新客戶開戶：建租戶 + 負責人 + 主據點 + 主倉。',
    Icon: UserPlus,
    enabled: true,
  },
  {
    href: '/platform/subscriptions',
    title: 'Subscriptions',
    description: '訂閱方案管理、續約、變更。',
    Icon: CreditCard,
    enabled: false,
    badge: 'Phase 5+',
  },
  {
    href: '/platform/ops',
    title: 'Platform KPI',
    description: '系統營運指標、租戶活躍度、訂閱收入。',
    Icon: Activity,
    enabled: false,
    badge: 'Phase 5+',
  },
];

export default function PlatformHubPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600">Platform / Hub</p>
        <h1 className="text-2xl tracking-tight text-zinc-100">營運後台</h1>
        <p className="text-xs text-zinc-500">伊諾瓦 NEXORA 平台管理入口、僅平台帳號可進。</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <CardItem key={card.href} card={card} />
        ))}
      </div>
    </div>
  );
}

function CardItem({ card }: { card: HubCard }) {
  const inner = (
    <div
      className={[
        'border border-zinc-800 bg-zinc-950 p-5 transition-colors',
        card.enabled ? 'hover:border-zinc-600 hover:bg-zinc-900 cursor-pointer' : 'opacity-50 cursor-not-allowed',
      ].join(' ')}
    >
      <div className="flex items-start justify-between mb-3">
        <card.Icon className="size-6 text-zinc-400" />
        {card.badge ? (
          <span className="text-[10px] uppercase tracking-wider border border-zinc-700 text-zinc-500 px-1.5 py-0.5">
            {card.badge}
          </span>
        ) : null}
      </div>
      <div className="text-sm tracking-wide text-zinc-100 uppercase mb-1">{card.title}</div>
      <div className="text-xs text-zinc-500 leading-relaxed">{card.description}</div>
    </div>
  );

  if (!card.enabled) return inner;
  return <Link href={card.href}>{inner}</Link>;
}
