// apps/nx-ui/src/features/base/part-model/BasePartModelMasterView.tsx
// 對應規格：docs/nx01/spec/intent/nx01-16-part-model.md v1.0 §2 / §3
// Q2=A：獨立 /master/part-model 列表頁、generic FlatMasterView 框架
// Q3=B：fitLevel SmallInt enum（1=原廠 / 2=副廠等效 / 3=通用替代）
// Q7=A：料件反查車型單向、雙向後續軌（A072）
'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Label } from '@design/primitives/label';
import { LookupAutocomplete } from '@design/components/lookup/LookupAutocomplete';
import { FlatMasterView, type FlatFieldDef } from '@/features/base/flat-master/FlatMasterView';
import { listPart } from '@data/endpoints/shared/master/part/api/part';
import type { PartDto } from '@data/types/shared/master/part';
import { listModel } from '@data/endpoints/base/model/api/model';
import type { ModelDto } from '@data/types/base/model';

// 規格 §3.3 Q3=B：fitLevel SmallInt（1=原廠 / 2=副廠等效 / 3=通用替代）
const FIT_LEVEL_OPTS = [
  { value: '1', label: '1 原廠' },
  { value: '2', label: '2 副廠等效' },
  { value: '3', label: '3 通用替代' },
];

const FIELDS: FlatFieldDef[] = [
  { key: 'partCode', label: '料件代碼', filter: true, edit: false },
  { key: 'partName', label: '料件名稱', filter: true, edit: false },
  { key: 'modelCode', label: '車型代碼', filter: true, edit: false },
  { key: 'modelName', label: '車型全名', filter: true, edit: false },
  { key: 'partId', label: '料件內碼', list: false, detailForm: false },
  { key: 'modelId', label: '車型內碼', list: false, detailForm: false },
  { key: 'fitLevel', label: '適配等級' },
  { key: 'remark', label: '備註', optional: true },
  { key: 'sortNo', label: '排序', type: 'number' },
  { key: 'isActive', label: '啟用', type: 'bool' },
];

function usePartLookup(open: boolean, q: string) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PartDto[]>([]);

  useEffect(() => {
    if (!open) return;
    const tq = q.trim();
    if (!tq) {
      setOptions([]);
      return;
    }
    let alive = true;
    const t = window.setTimeout(() => {
      setLoading(true);
      listPart({ q: tq, page: 1, pageSize: 12 })
        .then((res) => {
          if (!alive) return;
          setOptions(res.items ?? []);
        })
        .catch(() => {
          if (!alive) return;
          setOptions([]);
        })
        .finally(() => {
          if (!alive) return;
          setLoading(false);
        });
    }, 220);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, q]);

  return { loading, options };
}

function useModelLookup(open: boolean, q: string) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ModelDto[]>([]);

  useEffect(() => {
    if (!open) return;
    const tq = q.trim();
    if (!tq) {
      setOptions([]);
      return;
    }
    let alive = true;
    const t = window.setTimeout(() => {
      setLoading(true);
      listModel({ search: tq, page: 1, pageSize: 12, isActive: true })
        .then((res) => {
          if (!alive) return;
          setOptions(res.rows ?? []);
        })
        .catch(() => {
          if (!alive) return;
          setOptions([]);
        })
        .finally(() => {
          if (!alive) return;
          setLoading(false);
        });
    }, 220);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, q]);

  return { loading, options };
}

function PartModelEndpointsBlock(props: {
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
  creating: boolean;
  selected: Record<string, unknown> | null;
}) {
  const { setDraft, creating, selected } = props;
  const [openPart, setOpenPart] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [qPart, setQPart] = useState('');
  const [qModel, setQModel] = useState('');
  const { loading: lp, options: op } = usePartLookup(openPart, qPart);
  const { loading: lm, options: om } = useModelLookup(openModel, qModel);

  const syncLabelsFromRow = useCallback(() => {
    if (!selected) {
      setQPart('');
      setQModel('');
      return;
    }
    const p = [selected.partCode, selected.partName].filter(Boolean).join('　').trim();
    const m = [selected.modelCode, selected.modelName].filter(Boolean).join('　').trim();
    setQPart(p);
    setQModel(m);
  }, [selected]);

  useEffect(() => {
    if (creating) {
      setQPart('');
      setQModel('');
      return;
    }
    syncLabelsFromRow();
  }, [creating, syncLabelsFromRow, selected?.id]);

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
      <p className="text-xs font-medium text-muted-foreground">料件／車型適配（以料號／車型代碼搜尋選取）</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>料件</Label>
          <LookupAutocomplete<PartDto>
            value={qPart}
            onChange={setQPart}
            options={op}
            open={openPart}
            onOpenChange={setOpenPart}
            loading={lp}
            placeholder="搜尋料號／品名"
            emptyText="找不到料號"
            getKey={(row) => row.id}
            renderOption={(row) => (
              <span>
                {row.code} <span className="text-muted-foreground">{row.name}</span>
              </span>
            )}
            onPick={(row) => {
              setDraft((d) => ({ ...d, partId: row.id }));
              setQPart(`${row.code} ${row.name}`.trim());
              setOpenPart(false);
            }}
            inputClassName="mt-0"
          />
        </div>
        <div className="space-y-2">
          <Label>車型</Label>
          <LookupAutocomplete<ModelDto>
            value={qModel}
            onChange={setQModel}
            options={om}
            open={openModel}
            onOpenChange={setOpenModel}
            loading={lm}
            placeholder="搜尋車型代碼／全名"
            emptyText="找不到車型"
            getKey={(row) => row.id}
            renderOption={(row) => (
              <span>
                {row.code} <span className="text-muted-foreground">{row.name}</span>
              </span>
            )}
            onPick={(row) => {
              setDraft((d) => ({ ...d, modelId: row.id }));
              setQModel(`${row.code} ${row.name}`.trim());
              setOpenModel(false);
            }}
            inputClassName="mt-0"
          />
        </div>
      </div>
      {!creating && selected ? (
        <p className="text-[11px] text-muted-foreground">
          變更料件／車型後請儲存；列表欄位會於重新載入後同步。
        </p>
      ) : null}
    </div>
  );
}

export function BasePartModelMasterView() {
  return (
    <FlatMasterView
      basePath="/nx01/part-models"
      prefKey="base.partModel"
      listErrorCode="nxui_base_part_model_list"
      fields={FIELDS}
      upperCaseFields={[]}
      selectOptions={{ fitLevel: FIT_LEVEL_OPTS }}
      unifiedMasterShell
      slideDetailTitle={({ creating, selected }) => {
        if (creating) return '新增料件車型適配';
        const a = selected?.partCode != null ? String(selected.partCode) : '';
        const b = selected?.modelCode != null ? String(selected.modelCode) : '';
        if (a || b) return `${a || '—'} ↔ ${b || '—'}`;
        return '料件車型適配';
      }}
      slideDetailSubtitle={({ creating, selected }) => {
        if (creating) return null;
        const pn = selected?.partName != null ? String(selected.partName) : '';
        const mn = selected?.modelName != null ? String(selected.modelName) : '';
        if (!pn && !mn) return null;
        return `${pn || '—'}／${mn || '—'}`;
      }}
      renderDetailExtras={({ draft, setDraft, creating, selected }) => (
        <PartModelEndpointsBlock
          draft={draft}
          setDraft={setDraft}
          creating={creating}
          selected={selected}
        />
      )}
    />
  );
}
