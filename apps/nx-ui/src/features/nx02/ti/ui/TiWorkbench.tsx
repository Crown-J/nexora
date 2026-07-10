// apps/nx-ui/src/features/nx02/ti/ui/TiWorkbench.tsx
// NX02-TI-SHELL：同行調貨單工作區（第九張單、吃泛型 DocWorkbench）
//   本檔只留同行調貨差異：欄位 / 查詢(狀態+關鍵字) / 作廢守衛(草稿~已回覆) / CSV / 三面板接線
//   ⛔ 新增面板=導引（TI 只能由 銷貨缺貨行 / 詢價比價採用 產生、不能憑空建單）
'use client';

import { useState } from 'react';

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

import { listTi, voidTi } from '@data/endpoints/nx02/ti/api/ti';
import type { Ti, TiStatus } from '@data/types/nx02/ti';
import { TI_STATUSES, TI_STATUS_LABEL } from '@data/types/nx02/ti';

import { TiCreatePanel, TiDetailPanel } from './TiDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 180,
  status: 100,
  createdAt: 110,
  tiDate: 110,
  partnerCode: 110,
  partnerName: 170,
  warehouseName: 130,
  rfqDocNo: 150,
  createdByName: 100,
  itemCount: 80,
  totalAmount: 120,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  SENT: 'bg-amber-100 text-amber-800',
  REPLIED: 'bg-sky-100 text-sky-800',
  PENDING_RECEIPT: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

type TiCriteria = { status?: string; search?: string };

const COLUMNS: MasterTableColumn<Ti>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{TI_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'tiDate', label: '調貨日期', sortable: true, render: (r) => r.tiDate.slice(0, 10) },
  { key: 'partnerCode', label: '同行編號', render: (r) => <span className="font-mono text-xs">{r.partnerCode ?? '—'}</span> },
  { key: 'partnerName', label: '同行名稱', render: (r) => r.partnerName ?? r.partnerId },
  { key: 'warehouseName', label: '入庫倉', render: (r) => r.warehouseName ?? '—' },
  { key: 'rfqDocNo', label: '來源詢價單', render: (r) => <span className="font-mono text-xs">{r.rfqDocNo ?? '—'}</span> },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'totalAmount', label: '總金額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
];

const CONFIG: DocWorkbenchConfig<Ti, TiCriteria> = {
  docLabel: '同行調貨單',
  colOrderKey: 'nx02.ti.list.colOrder',
  colWidthKey: 'nx02.ti.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listTi({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT' && selected.status !== 'SENT' && selected.status !== 'REPLIED') {
      alert('此狀態不可作廢（待驗收請先處理其進貨單；已完成/已取消為終態）');
      return;
    }
    if (!window.confirm(`作廢同行調貨單 ${selected.docNo}？\n（來源銷貨缺貨行會退回「待補」、可重新找別家同行調）`)) return;
    void (async () => {
      try {
        await voidTi(selected.id);
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '同行調貨單列表.csv',
    header: ['單號', '狀態', '建單日期', '調貨日期', '同行編號', '同行名稱', '入庫倉', '來源詢價單', '建單人員', '項目數', '總金額'],
    line: (r) => [
      r.docNo,
      TI_STATUS_LABEL[r.status] ?? r.status,
      r.createdAt.slice(0, 10),
      r.tiDate.slice(0, 10),
      r.partnerCode ?? '',
      r.partnerName ?? r.partnerId,
      r.warehouseName ?? '',
      r.rfqDocNo ?? '',
      r.createdByName ?? '',
      r.itemCount ?? 0,
      String(r.totalAmount),
    ],
  },
  CreatePanel: TiCreatePanel,
  DetailPanel: TiDetailPanel,
  SearchDialog: TiSearchDialog,
};

export function TiWorkbench({ initialId, initialTab = 'list' }: { initialId?: string; initialTab?: MasterTab }) {
  return <DocWorkbench config={CONFIG} initialId={initialId} initialTab={initialTab} />;
}

function TiSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<TiCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢同行調貨單"
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
          {TI_STATUSES.map((s) => (
            <option key={s} value={s}>{TI_STATUS_LABEL[s as TiStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 同行編號 / 同行名稱 / 備註" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
