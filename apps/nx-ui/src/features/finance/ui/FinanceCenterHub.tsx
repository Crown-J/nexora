/**
 * @FUNCTION_CODE NX05-DASH-UI-001-F01
 * 財務中心首頁：版型與採購中心一致（Mock 數字）
 */

'use client';

import { Banknote, CreditCard, FileSpreadsheet, Landmark, Receipt } from 'lucide-react';
import { mockFinanceCounts } from '@/mocks/finance-hub';
import {
  CenterHubCardWrap,
  CenterHubFlowCard,
  CenterHubGroupHeading,
} from '@/features/layout/ui/CenterHubFlowCard';

const ACCENT = '#E8A020';

type Key = keyof typeof mockFinanceCounts;

function badge(k: Key, kind: 'pending' | 'total'): string {
  const row = mockFinanceCounts[k];
  if (kind === 'total' && 'total' in row) return `${row.total}`;
  if ('pending' in row) return `${row.pending}`;
  return '—';
}

export function FinanceCenterHub() {
  return (
    <div className="w-full min-w-0 space-y-12">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">FINANCE CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">財務中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          版型與採購中心一致；子頁為占位，後續接 NX05 模組。
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="fin-group-arap">
        <CenterHubGroupHeading id="fin-group-arap" title="立帳與沖銷" />
        <div className="relative z-10 flex min-w-0 flex-col items-stretch gap-6 md:flex-row md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto md:pb-1">
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="應收帳款"
              description="AR 立帳、沖銷與帳齡"
              icon={Receipt}
              footerBadge={badge('ar', 'pending')}
              stepLabel="Step.1"
              accentHex={ACCENT}
              subItems={[
                { label: '應收總覽（占位）', href: '/dashboard/nx05/workspace' },
                { label: '財務工作台', href: '/dashboard/nx05/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="應付帳款"
              description="AP 立帳與付款排程"
              icon={Landmark}
              footerBadge={badge('ap', 'pending')}
              stepLabel="Step.2"
              accentHex={ACCENT}
              subItems={[
                { label: '應付總覽（占位）', href: '/dashboard/nx05/workspace' },
                { label: '財務工作台', href: '/dashboard/nx05/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="收付款"
              description="收款／付款登錄"
              icon={Banknote}
              footerBadge={badge('cash', 'pending')}
              stepLabel="Step.3"
              accentHex={ACCENT}
              subItems={[
                { label: '收付款（占位）', href: '/dashboard/nx05/workspace' },
                { label: '工作台', href: '/dashboard/nx05/workspace' },
              ]}
            />
          </CenterHubCardWrap>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="fin-group-more">
        <CenterHubGroupHeading id="fin-group-more" title="票據與關帳" />
        <div className="flex flex-wrap justify-start gap-6">
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="票據"
              description="應收／應付票據"
              icon={CreditCard}
              footerBadge={badge('note', 'total')}
              accentHex={ACCENT}
              subItems={[
                { label: '票據（占位）', href: '/dashboard/nx05/workspace' },
                { label: '財務首頁', href: '/dashboard/nx05/workspace' },
              ]}
            />
          </CenterHubCardWrap>
          <CenterHubCardWrap>
            <CenterHubFlowCard
              title="關帳"
              description="月結與關帳檢核"
              icon={FileSpreadsheet}
              footerBadge={badge('closing', 'total')}
              accentHex={ACCENT}
              subItems={[
                { label: '關帳（占位）', href: '/dashboard/nx05/workspace' },
                { label: '工作台', href: '/dashboard/nx05/workspace' },
              ]}
            />
          </CenterHubCardWrap>
        </div>
      </section>
    </div>
  );
}
