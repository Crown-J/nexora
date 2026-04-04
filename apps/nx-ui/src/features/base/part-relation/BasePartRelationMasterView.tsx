'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Label } from '@/components/ui/label';
import { LookupAutocomplete } from '@/shared/ui/lookup/LookupAutocomplete';
import { Nx00FlatMasterView, type FlatFieldDef } from '@/features/base/nx00-flat-master/Nx00FlatMasterView';
import { listPart } from '@/features/nx00/part/api/part';
import type { PartDto } from '@/features/nx00/part/types';

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
  { key: 'partIdFrom', label: '來源零件內碼', list: false, detailForm: false },
  { key: 'partIdTo', label: '目的零件內碼', list: false, detailForm: false },
  { key: 'relationType', label: '關聯類型' },
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

function PartRelationEndpointsBlock(props: {
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
  creating: boolean;
  selected: Record<string, unknown> | null;
}) {
  const { draft, setDraft, creating, selected } = props;
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [qFrom, setQFrom] = useState('');
  const [qTo, setQTo] = useState('');
  const { loading: lf, options: of } = usePartLookup(openFrom, qFrom);
  const { loading: lt, options: ot } = usePartLookup(openTo, qTo);

  const syncLabelsFromRow = useCallback(() => {
    if (!selected) {
      setQFrom('');
      setQTo('');
      return;
    }
    const a = [selected.partCodeFrom, selected.partNameFrom].filter(Boolean).join('\u3000').trim();
    const b = [selected.partCodeTo, selected.partNameTo].filter(Boolean).join('\u3000').trim();
    setQFrom(a);
    setQTo(b);
  }, [selected]);

  useEffect(() => {
    if (creating) {
      setQFrom('');
      setQTo('');
      return;
    }
    syncLabelsFromRow();
  }, [creating, syncLabelsFromRow, selected?.id]);

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
      <p className="text-xs font-medium text-muted-foreground">來源／目的零件（以料號搜尋選取）</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>來源零件</Label>
          <LookupAutocomplete<PartDto>
            value={qFrom}
            onChange={setQFrom}
            options={of}
            open={openFrom}
            onOpenChange={setOpenFrom}
            loading={lf}
            placeholder="搜尋基準料號／品名"
            emptyText="找不到料號"
            getKey={(row) => row.id}
            renderOption={(row) => (
              <span>
                {row.code} <span className="text-muted-foreground">{row.name}</span>
              </span>
            )}
            onPick={(row) => {
              setDraft((d) => ({ ...d, partIdFrom: row.id }));
              setQFrom(`${row.code} ${row.name}`.trim());
              setOpenFrom(false);
            }}
            inputClassName="mt-0"
          />
        </div>
        <div className="space-y-2">
          <Label>目的零件</Label>
          <LookupAutocomplete<PartDto>
            value={qTo}
            onChange={setQTo}
            options={ot}
            open={openTo}
            onOpenChange={setOpenTo}
            loading={lt}
            placeholder="搜尋基準料號／品名"
            emptyText="找不到料號"
            getKey={(row) => row.id}
            renderOption={(row) => (
              <span>
                {row.code} <span className="text-muted-foreground">{row.name}</span>
              </span>
            )}
            onPick={(row) => {
              setDraft((d) => ({ ...d, partIdTo: row.id }));
              setQTo(`${row.code} ${row.name}`.trim());
              setOpenTo(false);
            }}
            inputClassName="mt-0"
          />
        </div>
      </div>
      {!creating && selected ? (
        <p className="text-[11px] text-muted-foreground">變更來源／目的後請儲存；列表欄位會於重新載入後同步。</p>
      ) : null}
    </div>
  );
}

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
      slideDetailTitle={({ creating, selected }) => {
        if (creating) return '新增零件關聯';
        const a = selected?.partCodeFrom != null ? String(selected.partCodeFrom) : '';
        const b = selected?.partCodeTo != null ? String(selected.partCodeTo) : '';
        if (a || b) return `${a || '—'} → ${b || '—'}`;
        return '零件關聯';
      }}
      slideDetailSubtitle={({ creating, selected }) => {
        if (creating) return null;
        const nf = selected?.partNameFrom != null ? String(selected.partNameFrom) : '';
        const nt = selected?.partNameTo != null ? String(selected.partNameTo) : '';
        if (!nf && !nt) return null;
        return `${nf || '—'}／${nt || '—'}`;
      }}
      renderDetailExtras={({ draft, setDraft, creating, selected }) => (
        <PartRelationEndpointsBlock draft={draft} setDraft={setDraft} creating={creating} selected={selected} />
      )}
    />
  );
}
