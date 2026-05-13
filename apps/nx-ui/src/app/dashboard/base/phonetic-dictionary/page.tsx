// apps/nx-ui/src/app/dashboard/base/phonetic-dictionary/page.tsx
// 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §2.2
'use client';

import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { PhoneticDictionaryMasterView } from '@/features/nx01/phonetic-dictionary/ui/PhoneticDictionaryMasterView';

export default function PhoneticDictionaryPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader title="注音字典維護" />
      <PhoneticDictionaryMasterView />
    </div>
  );
}
