/**
 * File: apps/nx-ui/src/app/dashboard/master/[segment]/page.tsx
 *
 * Purpose:
 * - 主檔單段動態路由（路由 v2：`/dashboard/master/[segment]`）
 */

'use client';

import { useParams } from 'next/navigation';
import { BaseMasterSubPageLayout } from '@/features/nx01/shell/ui/BaseMasterSubPageLayout';
import { BaseMasterPlaceholderSection } from '@/features/nx01/shell/ui/BaseMasterPlaceholderSection';
import { getBaseSegmentTitle, isValidBaseSegment } from '@/features/nx01/shell/config/master-cards';

export default function BaseDashboardSegmentPage() {
  const params = useParams();
  const segment = typeof params.segment === 'string' ? params.segment : '';
  const valid = isValidBaseSegment(segment);
  const title = valid ? getBaseSegmentTitle(segment)! : '找不到頁面';

  const description = valid
    ? '維護主檔資料（目前為占位頁，未接 API）。'
    : `路徑 /dashboard/master/${segment || '…'} 不存在，請由主檔總覽進入。`;

  return (
    <BaseMasterSubPageLayout title={title} description={description}>
      {valid ? (
        <BaseMasterPlaceholderSection />
      ) : (
        <BaseMasterPlaceholderSection message="無此主檔項目。請返回主檔總覽選擇正確入口。" />
      )}
    </BaseMasterSubPageLayout>
  );
}
