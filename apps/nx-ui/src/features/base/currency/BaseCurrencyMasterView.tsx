'use client';

import { Nx00FlatMasterView, type FlatFieldDef } from '@/features/base/nx00-flat-master/Nx00FlatMasterView';

const FIELDS: FlatFieldDef[] = [
  { key: 'code', label: '幣別碼（3 碼）', filter: true },
  { key: 'name', label: '名稱', filter: true },
  { key: 'symbol', label: '符號', optional: true },
  { key: 'decimalPlaces', label: '小數位', type: 'number' },
  { key: 'sortNo', label: '排序', type: 'number' },
  { key: 'isActive', label: '啟用', type: 'bool' },
];

export function BaseCurrencyMasterView() {
  return (
    <Nx00FlatMasterView
      basePath="/currency"
      prefKey="base.currency"
      listErrorCode="nxui_base_currency_list"
      fields={FIELDS}
      upperCaseFields={['code']}
    />
  );
}
