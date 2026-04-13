/**
 * File: apps/nx-ui/src/app/dashboard/base/parts/page.tsx
 *
 * Purpose:
 * - 零件主檔（路由 v2：`/dashboard/base/parts`）
 */

'use client';

import { BasePartMasterView } from '@/features/base/part/BasePartMasterView';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';

export default function BasePartsPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader
        title="零件主檔"
        description="同租戶下同料號＋同產地唯一；需指定編碼規則。連線 /part、/brand-code-rule、/brand、/country、/part-group。"
      />
      <BasePartMasterView />
    </div>
  );
}
