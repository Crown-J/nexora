// apps/nx-ui/src/app/dashboard/master/phonetic-dictionary/page.tsx
// L0 卡片式 + 全鍵盤範本（執行長 2026-06-24 範式套至 L0 全字典）
'use client';

import { KeyboardCardMasterPage } from '@/features/nx01/shell/keyboard-card-master';
import { PHONETIC_DICTIONARY_MASTER } from '@/features/nx01/shell/master-config/catalog-masters';

export default function Page() {
  return <KeyboardCardMasterPage config={PHONETIC_DICTIONARY_MASTER} />;
}
