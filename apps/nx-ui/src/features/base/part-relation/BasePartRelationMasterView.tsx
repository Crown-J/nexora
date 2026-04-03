'use client';

import { Nx00FlatMasterView, type FlatFieldDef } from '@/features/base/nx00-flat-master/Nx00FlatMasterView';

const REL_OPTS = [
  { value: 'S', label: 'S 改號' },
  { value: 'R', label: 'R 同款' },
  { value: 'C', label: 'C 改版換周邊' },
  { value: 'B', label: 'B 組合包' },
  { value: 'F', label: 'F 拆解包' },
];

const FIELDS: FlatFieldDef[] = [
  { key: 'partCodeFrom', label: '來源料號', filter: true, edit: false },
  { key: 'partNameFrom', label: '來源品名', filter: true, edit: false },
  { key: 'partCodeTo', label: '目的料號', filter: true, edit: false },
  { key: 'partNameTo', label: '目的品名', filter: true, edit: false },
  { key: 'partIdFrom', label: '來源零件內碼', list: false },
  { key: 'partIdTo', label: '目的零件內碼', list: false },
  { key: 'relationType', label: '關聯類型' },
  { key: 'remark', label: '備註', optional: true },
  { key: 'sortNo', label: '排序', type: 'number' },
  { key: 'isActive', label: '啟用', type: 'bool' },
];

export function BasePartRelationMasterView() {
  return (
    <Nx00FlatMasterView
      basePath="/part-relation"
      prefKey="base.partRelation"
      listErrorCode="nxui_base_pare_list"
      fields={FIELDS}
      upperCaseFields={[]}
      selectOptions={{ relationType: REL_OPTS }}
      unifiedMasterShell
    />
  );
}
