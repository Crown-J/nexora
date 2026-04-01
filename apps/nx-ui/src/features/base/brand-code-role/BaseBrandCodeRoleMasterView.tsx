'use client';

import { useEffect, useState } from 'react';
import { Nx00FlatMasterView, type FlatFieldDef } from '@/features/base/nx00-flat-master/Nx00FlatMasterView';
import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

const FIELDS: FlatFieldDef[] = [
  { key: 'partBrandCode', label: '零件品牌代碼', filter: true, edit: false },
  { key: 'partBrandName', label: '零件品牌名稱', filter: true, edit: false },
  { key: 'partBrandId', label: '零件品牌（內碼）', list: false, createOnly: true },
  { key: 'seg1', label: 'seg1 長度', type: 'number' },
  { key: 'seg2', label: 'seg2 長度', type: 'number' },
  { key: 'seg3', label: 'seg3 長度', type: 'number' },
  { key: 'seg4', label: 'seg4 長度', type: 'number' },
  { key: 'seg5', label: 'seg5 長度', type: 'number' },
  { key: 'codeFormat', label: '料號格式', filter: true },
  { key: 'brandSort', label: '排列', filter: true },
  { key: 'isActive', label: '啟用', type: 'bool' },
];

export function BaseBrandCodeRoleMasterView() {
  const [brandOpts, setBrandOpts] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = buildQueryString({ page: '1', pageSize: '500' });
        const res = await apiFetch(`/brand${qs}`, { method: 'GET' });
        await assertOk(res, 'nxui_base_bcor_brands');
        const data = (await res.json()) as { items: { id: string; code: string; name: string }[] };
        if (cancelled) return;
        setBrandOpts(
          (data.items ?? []).map((b) => ({
            value: b.id,
            label: `${b.code} — ${b.name}`,
          })),
        );
      } catch {
        if (!cancelled) setBrandOpts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Nx00FlatMasterView
      basePath="/brand-code-role"
      prefKey="base.brandCodeRole"
      listErrorCode="nxui_base_bcor_list"
      fields={FIELDS}
      upperCaseFields={[]}
      selectOptions={{ partBrandId: brandOpts }}
    />
  );
}
