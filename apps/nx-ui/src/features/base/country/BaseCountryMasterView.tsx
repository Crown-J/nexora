'use client';

import { Nx00FlatMasterView, type FlatFieldDef } from '@/features/base/nx00-flat-master/Nx00FlatMasterView';

const FIELDS: FlatFieldDef[] = [
  { key: 'code', label: '國碼（3 碼）', filter: true },
  { key: 'name', label: '名稱', filter: true },
  { key: 'sortNo', label: '排序', type: 'number' },
  { key: 'isActive', label: '啟用', type: 'bool' },
];

export function BaseCountryMasterView() {
  return (
    <Nx00FlatMasterView
      basePath="/country"
      prefKey="base.country"
      listErrorCode="nxui_base_country_list"
      fields={FIELDS}
      upperCaseFields={['code']}
    />
  );
}
