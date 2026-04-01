'use client';

import { BaseMasterSubPageLayout } from '@/features/base/shell/BaseMasterSubPageLayout';
import { BaseCurrencyMasterView } from '@/features/base/currency/BaseCurrencyMasterView';

export default function BaseCurrencyPage() {
  return (
    <BaseMasterSubPageLayout
      title="幣別主檔"
      description="nx00_currency。列表含業務欄位與稽核；不顯示系統 id。"
    >
      <BaseCurrencyMasterView />
    </BaseMasterSubPageLayout>
  );
}