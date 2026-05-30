// apps/nx-ui/src/app/dashboard/finance/account/page.tsx
// v1.2 階段 E P2：財務 → 帳戶管理（partner basic + finance 分區）
// 對齊 v1.1 §4.4：顯示 partner 基本資料 + 財務區（帳單地址 / 收付款 / 銀行帳號）
// 列表不限定 partnerType（C/O/S/V 等任何有財務交易者都在列）
'use client';

import { PartnerMasterPage } from '@/features/partner-zoned';

const EDITABLE_ZONES = new Set(['basic', 'finance'] as const);

export default function FinanceAccountPage() {
  return (
    <PartnerMasterPage
      pageCategory="財務"
      pageTitle="帳戶管理"
      entityNoun="帳戶"
      editableZones={EDITABLE_ZONES}
      createDefaultPartnerType="C"
    />
  );
}
