/**
 * @FUNCTION_CODE NX05-HUB-UI-001-F01
 * 財務中心 Hub（版型對齊 `/dashboard/base`、v1.2 階段 F P4 接 href）
 */

'use client';

import {
  CreditCard,
  Landmark,
  Lock,
  Percent,
  Receipt,
  Wallet,
} from 'lucide-react';

import { HubLinkCard, ModuleHubSection } from '@/features/layout/ui/module-hub/hub-primitives';

export default function FinanceHubPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">FINANCE CENTER</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">財務中心</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">月關帳 + 401 雙月一期申報、應收應付彙整、票據與帳戶管理。</p>
      </header>

      <div className="space-y-10">
        <ModuleHubSection sectionId="fin-ar-ap" title="帳款管理" count={2}>
          <HubLinkCard
            title="應收帳款"
            description="客戶帳款追蹤、月結請款、催收作業（含廠商退費衍生應收）"
            Icon={Receipt}
            href="/dashboard/finance/ar"
          />
          <HubLinkCard
            title="應付帳款"
            description="採購應付（廠商確認）+ 銷退退款彙整、逾期提醒"
            Icon={Landmark}
            href="/dashboard/finance/ap"
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="fin-cash" title="收付款 + 折讓" count={2}>
          <HubLinkCard
            title="票據管理"
            description="現金 / 匯款 / 支票 / 信用卡 4 種方式、自動沖應收應付"
            Icon={CreditCard}
            href="/dashboard/finance/notes"
          />
          <HubLinkCard
            title="折讓核可"
            description="人工折讓 DRAFT + 主管核可（防亂打折少收）、核可後自動沖"
            Icon={Percent}
            href="/dashboard/finance/allowance"
          />
        </ModuleHubSection>

        <ModuleHubSection sectionId="fin-close" title="關帳與帳戶" count={2}>
          <HubLinkCard
            title="關帳作業 + 401"
            description="月關帳 + 401 雙月一期預覽 / 標記已上報 / 解除關帳"
            Icon={Lock}
            href="/dashboard/finance/closing"
          />
          <HubLinkCard
            title="帳戶管理"
            description="往來帳戶（客戶/廠商）vs 自有銀行帳戶分開呈現"
            Icon={Wallet}
            href="/dashboard/finance/account"
          />
        </ModuleHubSection>
      </div>
    </div>
  );
}

