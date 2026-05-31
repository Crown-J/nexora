// apps/nx-ui/src/app/dashboard/finance/account/page.tsx
// v1.2 階段 F P4：帳戶管理（往來帳戶 vs 自有銀行帳戶分開、意圖書 §6.2）
// 階段 E 既有 PartnerMasterPage 仍是「往來帳戶」內容、本軌外包 Tab + 加自有銀行 placeholder
'use client';

import { AccountManagementView } from '@/features/nx05/ui/AccountManagementView';

export default function FinanceAccountPage() {
  return <AccountManagementView />;
}
