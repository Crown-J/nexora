// apps/nx-ui/src/features/nx02/pr/ui/PrWorkbench.tsx
// NX02-PR-SHELL：進貨退回工作區（第八張單、吃泛型 DocWorkbench）
//   本檔只留進貨退回差異：欄位 / 查詢(狀態+關鍵字) / 作廢守衛(僅草稿) / CSV / 三面板接線
'use client';

import { useMemo, useState } from 'react';

import type { MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';
import type { MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import {
  DocWorkbench,
  fmtMoney,
  SearchDialogShell,
  SearchRow,
  type DocSearchDialogProps,
  type DocWorkbenchConfig,
} from '@/features/shared/doc-shell/DocWorkbench';

import { listPr, voidPr } from '@data/endpoints/nx02/pr/api/pr';
import type { Pr, PrStatus } from '@data/types/nx02/pr';
import { DISPOSITION_LABEL, PR_STATUSES, PR_STATUS_LABEL, RETURN_MODE_LABEL } from '@data/types/nx02/pr';

import { PrCreatePanel, PrDetailPanel } from './PrDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 180,
  status: 100,
  createdAt: 110,
  prDate: 110,
  supplierCode: 110,
  supplierName: 170,
  rrDocNo: 160,
  returnMode: 90,
  dispositionFlag: 90,
  createdByName: 100,
  itemCount: 80,
  totalAmount: 120,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  POSTED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

type PrCriteria = { status?: string; search?: string };

const COLUMNS: MasterTableColumn<Pr>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{PR_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'prDate', label: '退回日期', sortable: true, render: (r) => r.prDate.slice(0, 10) },
  { key: 'supplierCode', label: '供應商編號', render: (r) => <span className="font-mono text-xs">{r.supplierCode ?? '—'}</span> },
  { key: 'supplierName', label: '供應商名稱', render: (r) => r.supplierName ?? r.supplierId },
  { key: 'rrDocNo', label: '來源進貨單', render: (r) => <span className="font-mono text-xs">{r.rrDocNo ?? '—'}</span> },
  { key: 'returnMode', label: '退貨類型', render: (r) => (r.returnMode ? RETURN_MODE_LABEL[r.returnMode] ?? r.returnMode : '—') },
  { key: 'dispositionFlag', label: '處置', render: (r) => (r.dispositionFlag ? DISPOSITION_LABEL[r.dispositionFlag] ?? r.dispositionFlag : '—') },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'totalAmount', label: '總金額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
];

const CONFIG: DocWorkbenchConfig<Pr, PrCriteria> = {
  docLabel: '進貨退回單',
  colOrderKey: 'nx02.pr.list.colOrder',
  colWidthKey: 'nx02.pr.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listPr({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT') {
      alert('此狀態不可作廢（僅草稿可作廢）');
      return;
    }
    if (!window.confirm(`作廢進貨退回單 ${selected.docNo}？`)) return;
    void (async () => {
      try {
        await voidPr(selected.id);
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '進貨退回單列表.csv',
    header: ['單號', '狀態', '建單日期', '退回日期', '供應商編號', '供應商名稱', '來源進貨單', '退貨類型', '處置', '建單人員', '項目數', '總金額'],
    line: (r) => [
      r.docNo,
      PR_STATUS_LABEL[r.status] ?? r.status,
      r.createdAt.slice(0, 10),
      r.prDate.slice(0, 10),
      r.supplierCode ?? '',
      r.supplierName ?? r.supplierId,
      r.rrDocNo ?? '',
      r.returnMode ? RETURN_MODE_LABEL[r.returnMode] ?? r.returnMode : '',
      r.dispositionFlag ? DISPOSITION_LABEL[r.dispositionFlag] ?? r.dispositionFlag : '',
      r.createdByName ?? '',
      r.itemCount ?? 0,
      String(r.totalAmount),
    ],
  },
  CreatePanel: PrCreatePanel,
  DetailPanel: PrDetailPanel,
  SearchDialog: PrSearchDialog,
};

export function PrWorkbench({
  initialId,
  initialTab = 'list',
  initialCreate = false,
  initialRrId,
}: {
  initialId?: string;
  initialTab?: MasterTab;
  initialCreate?: boolean;
  /** ?rr= 入口：新增面板預載來源進貨單（沿舊 PrNewForm 參數） */
  initialRrId?: string;
}) {
  const config = useMemo<DocWorkbenchConfig<Pr, PrCriteria>>(() => {
    if (!initialRrId) return CONFIG;
    const CreateWithRr = (props: { onCreated: (id: string) => void; onCancel: () => void }) => (
      <PrCreatePanel {...props} initialRrId={initialRrId} />
    );
    return { ...CONFIG, CreatePanel: CreateWithRr };
  }, [initialRrId]);
  return <DocWorkbench config={config} initialId={initialId} initialTab={initialTab} initialCreate={initialCreate} />;
}

function PrSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<PrCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢進貨退回單"
      onSubmit={() => onApply({ status: status || undefined, search: search.trim() || undefined })}
      onClear={() => {
        setStatus('');
        setSearch('');
      }}
      onClose={onClose}
    >
      <SearchRow label="單據狀態">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cls}>
          <option value="">全部</option>
          {PR_STATUSES.map((s) => (
            <option key={s} value={s}>{PR_STATUS_LABEL[s as PrStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 供應商 / 來源進貨單號 / 備註" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
