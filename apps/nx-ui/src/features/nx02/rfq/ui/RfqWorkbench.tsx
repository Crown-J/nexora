// apps/nx-ui/src/features/nx02/rfq/ui/RfqWorkbench.tsx
// NX02-RFQ-SHELL：詢價單工作區（第七張單、吃泛型 DocWorkbench）
//   本檔只留詢價單差異：欄位（無金額欄）/ 查詢(狀態+關鍵字) / 作廢守衛(草稿/已發出) / CSV / 三面板接線
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

import { listRfq, voidRfq } from '@data/endpoints/nx02/rfq/api/rfq';
import type { Rfq, RfqStatus } from '@data/types/nx02/rfq';
import { RFQ_STATUSES, RFQ_STATUS_LABEL } from '@data/types/nx02/rfq';

import { RfqCreatePanel, RfqDetailPanel } from './RfqDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 180,
  status: 100,
  createdAt: 110,
  rfqDate: 110,
  supplierCode: 110,
  supplierName: 180,
  contactName: 100,
  createdByName: 100,
  itemCount: 80,
  remark: 200,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  SENT: 'bg-amber-100 text-amber-800',
  REPLIED: 'bg-sky-100 text-sky-800',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

type RfqCriteria = { status?: string; search?: string };

const COLUMNS: MasterTableColumn<Rfq>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{RFQ_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'rfqDate', label: '詢價日期', sortable: true, render: (r) => r.rfqDate.slice(0, 10) },
  { key: 'supplierCode', label: '供應商編號', render: (r) => <span className="font-mono text-xs">{r.supplierCode ?? '—'}</span> },
  { key: 'supplierName', label: '供應商名稱', render: (r) => r.supplierName ?? (r.supplierId ? r.supplierId : '未指定') },
  { key: 'contactName', label: '聯絡人', render: (r) => r.contactName ?? '—' },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'remark', label: '備註', render: (r) => <span className="text-xs text-muted-foreground">{r.remark ?? ''}</span> },
];

const CONFIG: DocWorkbenchConfig<Rfq, RfqCriteria> = {
  docLabel: '詢價單',
  colOrderKey: 'nx02.rfq.list.colOrder',
  colWidthKey: 'nx02.rfq.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listRfq({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT' && selected.status !== 'SENT') {
      alert('此狀態不可作廢（僅草稿 / 已發出可作廢）');
      return;
    }
    if (!window.confirm(`作廢詢價單 ${selected.docNo}？`)) return;
    void (async () => {
      try {
        await voidRfq(selected.id);
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '詢價單列表.csv',
    header: ['單號', '狀態', '建單日期', '詢價日期', '供應商編號', '供應商名稱', '聯絡人', '建單人員', '項目數', '備註'],
    line: (r) => [
      r.docNo,
      RFQ_STATUS_LABEL[r.status] ?? r.status,
      r.createdAt.slice(0, 10),
      r.rfqDate.slice(0, 10),
      r.supplierCode ?? '',
      r.supplierName ?? '',
      r.contactName ?? '',
      r.createdByName ?? '',
      r.itemCount ?? 0,
      r.remark ?? '',
    ],
  },
  CreatePanel: RfqCreatePanel,
  DetailPanel: RfqDetailPanel,
  SearchDialog: RfqSearchDialog,
};

export function RfqWorkbench({
  initialId,
  initialTab = 'list',
  initialCreate = false,
}: {
  initialId?: string;
  initialTab?: MasterTab;
  initialCreate?: boolean;
}) {
  return <DocWorkbench config={CONFIG} initialId={initialId} initialTab={initialTab} initialCreate={initialCreate} />;
}

function RfqSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<RfqCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢詢價單"
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
          {RFQ_STATUSES.map((s) => (
            <option key={s} value={s}>{RFQ_STATUS_LABEL[s as RfqStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 供應商編號 / 供應商名稱 / 備註" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
