// apps/nx-ui/src/app/dashboard/master/phonetic-dictionary/page.tsx
// 注音字典主檔（執行長 2026-06-24 推翻卡片式、統一回 EntityMasterPage）
'use client';

import { EntityMasterPage } from '@/features/nx01/shell/entity-master/EntityMasterPage';
import { PHONETIC_DICTIONARY_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <EntityMasterPage config={PHONETIC_DICTIONARY_MASTER} />;
}
