'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Label } from '@/components/ui/label';
import { LookupAutocomplete } from '@/shared/ui/lookup/LookupAutocomplete';
import { FlatMasterView, type FlatFieldDef } from '@/features/base/flat-master/FlatMasterView';
import { listPart } from '@/features/shared/master/part/api/part';
import type { PartDto } from '@/features/shared/master/part/types';
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

/** 規格 §2.2.3 + Crown Q2=C：R 同款 modal handler（TASK-NX01-17-MODAL-IMPL）*/
const RELATION_TYPE_SAME = 2;

type ReverseHintResponse = {
  suggested: boolean;
  existing: boolean;
  message: string;
};

async function handleRSameReverseHint(created: Record<string, unknown>): Promise<void> {
  const relationType = Number(created.relationType);
  if (relationType !== RELATION_TYPE_SAME) return;

  const partIdFrom = String(created.partIdFrom ?? '');
  const partIdTo = String(created.partIdTo ?? '');
  if (!partIdFrom || !partIdTo) return;

  // Step 1：查 reverseHint（後端 service.checkReverseHint）
  let hint: ReverseHintResponse;
  try {
    const res = await apiFetch('/nx01/part-relations/check-reverse-hint', {
      method: 'POST',
      body: JSON.stringify({ partIdFrom, partIdTo, relationType }),
    });
    await assertOk(res, 'nxui_part_relation_reverse_hint');
    hint = (await res.json()) as ReverseHintResponse;
  } catch {
    // hint 查失敗、靜默結束（UI 已建好主關係、reverseHint 是 nice-to-have）
    return;
  }

  if (!hint.suggested || hint.existing) return;

  // Step 2：window.confirm 提示用戶（對齊 NX01-10 簡化版 UX 範式）
  const ok = window.confirm(
    `${hint.message}\n\n按「確定」建立反向關係（B→A）、「取消」保留單向。`,
  );
  if (!ok) return;

  // Step 3：用戶確認、POST 建反向關係（partIdFrom=B, partIdTo=A, relationType=2）
  try {
    const res = await apiFetch('/nx01/part-relations', {
      method: 'POST',
      body: JSON.stringify({
        partIdFrom: partIdTo,
        partIdTo: partIdFrom,
        relationType: RELATION_TYPE_SAME,
      }),
    });
    await assertOk(res, 'nxui_part_relation_reverse_create');
    // 反向建立成功、提示用戶（generic list 不會自動 refetch、可選擇）
    window.alert('反向關係 B→A 已建立、請手動重整列表');
  } catch (e) {
    window.alert(
      `反向關係建立失敗：${e instanceof Error ? e.message : '未知錯誤'}`,
    );
  }
}

// 規格 §1.3 + §4.2 Crown Q3=B-小範圍：relationType 升 SmallInt（1=改號 / 2=同款 / 3=改版換周邊 / 4=組合包 / 5=拆解包）
const REL_OPTS = [
  { value: '1', label: '1 改號' },
  { value: '2', label: '2 同款' },
  { value: '3', label: '3 改版換周邊' },
  { value: '4', label: '4 組合包' },
  { value: '5', label: '5 拆解包' },
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
    <FlatMasterView
      basePath="/nx01/part-relations"
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
      onAfterCreate={handleRSameReverseHint}
    />
  );
}
