// apps/nx-ui/src/app/dashboard/base/brand/page.tsx
// W6 [3-8] 2026-06-06 品牌合併主檔頁（合 car-brand + part-brand 路由）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { BRAND_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={BRAND_MASTER} />;
}
