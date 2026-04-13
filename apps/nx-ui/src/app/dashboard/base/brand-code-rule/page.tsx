/**
 * File: apps/nx-ui/src/app/dashboard/base/brand-code-rule/page.tsx
 * Purpose: 廠牌料號規則（路由 v2：`/dashboard/base/brand-code-rule`）
 */
'use client';
import { BaseBrandCodeRoleMasterView } from '@/features/base/brand-code-role/BaseBrandCodeRoleMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
export default function BaseBrandCodeRuleDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="廠牌料號規則" />
      <BaseBrandCodeRoleMasterView />
    </div>
  );
}
