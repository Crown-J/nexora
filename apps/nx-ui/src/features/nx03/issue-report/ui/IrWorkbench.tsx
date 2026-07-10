// apps/nx-ui/src/features/nx03/issue-report/ui/IrWorkbench.tsx
// W5-ISSUE-CHAIN Step 4：異常回報工作區（第十張單、吃泛型 DocWorkbench）
//   本檔只留異常回報差異：欄位 / 查詢(狀態+異常類型+處置+來源+關鍵字) / 作廢守衛(終態不可) / CSV / 三面板接線
//   IR 為單行單據（無明細行）：詳情面板左表頭右流程處置卡（IrDetailView.new）
'use client';

import { useState } from 'react';

import type { MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';
import type { MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import {
  DocWorkbench,
  SearchDialogShell,
  SearchRow,
  type DocSearchDialogProps,
  type DocWorkbenchConfig,
} from '@/features/shared/doc-shell/DocWorkbench';

import { cancelIssueReport, listIssueReport } from '@data/endpoints/nx03/issue-report/api/issue-report';
import type { DispositionType, IssueReport, IssueType } from '@data/types/nx03/issue-report';
import {
  DISPOSITION_TYPES,
  IR_DISPOSITION_LABEL,
  IR_ISSUE_LABEL,
  IR_STATUS_LABEL,
  ISSUE_STATUSES,
  ISSUE_TYPES,
} from '@data/types/nx03/issue-report';

import { IrCreatePanel, IrDetailPanel } from './IrDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 175,
  status: 90,
  reportDate: 105,
  issueType: 100,
  partNo: 140,
  partName: 180,
  qty: 80,
  warehouseCode: 100,
  dispositionType: 150,
  source: 130,
  createdByName: 100,
  createdAt: 105,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  REPORTED: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-sky-100 text-sky-800',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

/** 來源顯示：系統代碼 → 業務中文（客戶端不露 NX 代碼鐵則） */
export const IR_SOURCE_LABEL: Record<string, string> = {
  'NX02/RR': '進貨驗收',
  'NX03/STOCKTAKE': '盤點',
  'NX04/SR': '銷退收回',
  'NX04/SO': '銷貨',
  'NX04/QT': '報價',
};

export function irSourceLabel(r: Pick<IssueReport, 'sourceModule' | 'sourceDocType'>): string {
  if (!r.sourceModule) return '手動回報';
  const key = `${r.sourceModule}/${r.sourceDocType ?? ''}`;
  return IR_SOURCE_LABEL[key] ?? key;
}

type IrCriteria = {
  status?: string;
  issueType?: IssueType;
  dispositionType?: DispositionType;
  search?: string;
};

const COLUMNS: MasterTableColumn<IssueReport>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => (
      <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>
        {IR_STATUS_LABEL[r.status] ?? r.status}
      </span>
    ),
  },
  { key: 'reportDate', label: '回報日期', sortable: true, render: (r) => r.reportDate.slice(0, 10) },
  { key: 'issueType', label: '異常類型', render: (r) => IR_ISSUE_LABEL[r.issueType] ?? r.issueType },
  { key: 'partNo', label: '料號', sortable: true, render: (r) => <span className="font-mono text-xs">{r.partNo}</span> },
  { key: 'partName', label: '品名', render: (r) => r.partName },
  { key: 'qty', label: '數量', sortable: true, render: (r) => <span className="tabular-nums">{Number(r.qty)}</span> },
  { key: 'warehouseCode', label: '倉庫', render: (r) => r.warehouse?.code ?? '—' },
  {
    key: 'dispositionType',
    label: '處置',
    render: (r) =>
      r.dispositionType === 'N' ? (
        <span className="text-muted-foreground">未處置</span>
      ) : (
        <span>{IR_DISPOSITION_LABEL[r.dispositionType] ?? r.dispositionType}</span>
      ),
  },
  { key: 'source', label: '來源', render: (r) => <span className="text-xs">{irSourceLabel(r)}</span> },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
];

const CONFIG: DocWorkbenchConfig<IssueReport, IrCriteria> = {
  docLabel: '異常回報單',
  colOrderKey: 'nx03.ir.list.colOrder',
  colWidthKey: 'nx03.ir.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listIssueReport({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      issueType: criteria.issueType || undefined,
      dispositionType: criteria.dispositionType || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status === 'CLOSED' || selected.status === 'CANCELLED') {
      alert('已結案 / 已作廢為終態、不可作廢');
      return;
    }
    if (selected.status === 'PROCESSING') {
      if (!window.confirm(`此異常單已在處置中（${IR_DISPOSITION_LABEL[selected.dispositionType] ?? ''}）。\n作廢異常單不會動到已建立的處置單、確定作廢 ${selected.docNo}？`)) return;
    } else if (!window.confirm(`作廢異常回報單 ${selected.docNo}？（誤報 / 撤銷）`)) {
      return;
    }
    void (async () => {
      try {
        await cancelIssueReport(selected.id);
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '異常回報單列表.csv',
    header: ['單號', '狀態', '回報日期', '異常類型', '料號', '品名', '數量', '倉庫', '處置', '來源', '建單人員', '建單日期'],
    line: (r) => [
      r.docNo,
      IR_STATUS_LABEL[r.status] ?? r.status,
      r.reportDate.slice(0, 10),
      IR_ISSUE_LABEL[r.issueType] ?? r.issueType,
      r.partNo,
      r.partName,
      String(r.qty),
      r.warehouse?.code ?? '',
      IR_DISPOSITION_LABEL[r.dispositionType] ?? r.dispositionType,
      irSourceLabel(r),
      r.createdByName ?? '',
      r.createdAt.slice(0, 10),
    ],
  },
  CreatePanel: IrCreatePanel,
  DetailPanel: IrDetailPanel,
  SearchDialog: IrSearchDialog,
};

export function IrWorkbench({ initialId, initialTab = 'list' }: { initialId?: string; initialTab?: MasterTab }) {
  return <DocWorkbench config={CONFIG} initialId={initialId} initialTab={initialTab} />;
}

function IrSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<IrCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [issueType, setIssueType] = useState<string>(initial.issueType ?? '');
  const [dispositionType, setDispositionType] = useState<string>(initial.dispositionType ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢異常回報單"
      onSubmit={() =>
        onApply({
          status: status || undefined,
          issueType: (issueType || undefined) as IssueType | undefined,
          dispositionType: (dispositionType || undefined) as DispositionType | undefined,
          search: search.trim() || undefined,
        })
      }
      onClear={() => {
        setStatus('');
        setIssueType('');
        setDispositionType('');
        setSearch('');
      }}
      onClose={onClose}
    >
      <SearchRow label="單據狀態">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cls}>
          <option value="">全部</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>{IR_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="異常類型">
        <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className={cls}>
          <option value="">全部</option>
          {ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>{IR_ISSUE_LABEL[t]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="處置分流">
        <select value={dispositionType} onChange={(e) => setDispositionType(e.target.value)} className={cls}>
          <option value="">全部</option>
          {DISPOSITION_TYPES.map((d) => (
            <option key={d} value={d}>{IR_DISPOSITION_LABEL[d]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 料號 / 品名 / 描述" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
