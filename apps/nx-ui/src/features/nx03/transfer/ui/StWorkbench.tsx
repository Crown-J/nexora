// apps/nx-ui/src/features/nx03/transfer/ui/StWorkbench.tsx
// NX04-QT-SHELL：調撥單工作區（Nx03St 倉對倉內部調撥）→ NX02-RR-SHELL：改吃泛型 DocWorkbench（骨架收斂、行為零變）
//   本檔只留調撥單差異：欄位（倉對倉無客戶/無金額）/ 查詢(狀態+關鍵字) / 作廢守衛(confirm 無原因) / CSV / 三面板接線
//   initialCreate：/new 路由直接開在新增
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

import { listSt, voidSt } from '@data/endpoints/nx03/transfer/api/transfer';
import type { St, StStatus } from '@data/types/nx03/transfer';
import { ST_STATUSES, ST_STATUS_LABEL } from '@data/types/nx03/transfer';

import { StCreatePanel, StDetailPanel } from './StDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 180,
  status: 130,
  createdAt: 110,
  stDate: 110,
  fromWarehouse: 160,
  toWarehouse: 160,
  createdByName: 100,
  itemCount: 80,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  TRANSIT: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

type StCriteria = { status?: string; search?: string };

const COLUMNS: MasterTableColumn<St>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{ST_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'stDate', label: '調撥日期', sortable: true, render: (r) => r.stDate.slice(0, 10) },
  { key: 'fromWarehouse', label: '撥出倉', render: (r) => (r.fromWarehouseName ? `${r.fromWarehouseCode ?? ''}　${r.fromWarehouseName}` : r.fromWarehouseId) },
  { key: 'toWarehouse', label: '撥入倉', render: (r) => (r.toWarehouseName ? `${r.toWarehouseCode ?? ''}　${r.toWarehouseName}` : r.toWarehouseId) },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
];

const CONFIG: DocWorkbenchConfig<St, StCriteria> = {
  docLabel: '調撥單',
  colOrderKey: 'nx03.st.list.colOrder',
  colWidthKey: 'nx03.st.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listSt({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT' && selected.status !== 'TRANSIT') {
      alert('此狀態不可作廢（僅草稿 / 調撥中可作廢）');
      return;
    }
    if (!window.confirm(`作廢調撥單 ${selected.docNo}？`)) return;
    void (async () => {
      try {
        await voidSt(selected.id);
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '調撥單列表.csv',
    header: ['單號', '狀態', '建單日期', '調撥日期', '撥出倉', '撥入倉', '建單人員', '項目數'],
    line: (r) => [
      r.docNo,
      ST_STATUS_LABEL[r.status] ?? r.status,
      r.createdAt.slice(0, 10),
      r.stDate.slice(0, 10),
      r.fromWarehouseName ?? r.fromWarehouseId,
      r.toWarehouseName ?? r.toWarehouseId,
      r.createdByName ?? '',
      r.itemCount ?? 0,
    ],
  },
  CreatePanel: StCreatePanel,
  DetailPanel: StDetailPanel,
  SearchDialog: StSearchDialog,
};

export function StWorkbench({
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

function StSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<StCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢調撥單"
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
          {ST_STATUSES.map((s) => (
            <option key={s} value={s}>{ST_STATUS_LABEL[s as StStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 備註" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
