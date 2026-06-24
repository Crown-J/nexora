// apps/nx-ui/src/app/dashboard/master/part-relation/page.tsx
// L0 卡片式 + 全鍵盤範本（執行長 2026-06-24 第二批 L0 候選）
'use client';

import { KeyboardCardMasterPage } from '@/features/nx01/shell/keyboard-card-master';
import { PART_RELATION_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <KeyboardCardMasterPage config={PART_RELATION_MASTER} />;
}
