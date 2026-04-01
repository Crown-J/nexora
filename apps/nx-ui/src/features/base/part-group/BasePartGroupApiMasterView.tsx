'use client';

import { Nx00FlatMasterView, type FlatFieldDef } from '@/features/base/nx00-flat-master/Nx00FlatMasterView';

const FIELDS: FlatFieldDef[] = [
  { key: 'code', label: '族群代碼', filter: true },
  { key: 'name', label: '名稱', filter: true },
  { key: 'sortNo', label: '排序', type: 'number' },
  { key: 'isActive', label: '啟用', type: 'bool' },
];

/** 接 nx-api `/part-group`（取代 mock 版） */
export function BasePartGroupApiMasterView() {
  return (
    <Nx00FlatMasterView
      basePath="/part-group"
      prefKey="base.partGroupApi"
      listErrorCode="nxui_base_pagr_list"
      fields={FIELDS}
      upperCaseFields={[]}
    />
  );
}
