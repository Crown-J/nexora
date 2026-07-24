// apps/nx-ui/src/features/nx03/workstation/packing/PackageWorkbench.tsx
// 包貨台＝標準單據頁（WMS 2026-07-24、吃泛型 DocWorkbench）：包裹列表 + 工具列 + 資料瀏覽/詳細兩分頁。
//   新增 → 5 步精靈（PackageWizard）；詳細 → PackageDetailPanel（建箱中可加貨/封箱、已封箱唯讀）。
'use client';

import { useState } from 'react';

import type { MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';
import type { MasterTab } from '@/features/nx01/shell/entity-master/MasterTabs';
import {
  DocWorkbench,
  SearchDialogShell,
  SearchRow,
  type DocDetailPanelProps,
  type DocSearchDialogProps,
  type DocWorkbenchConfig,
} from '@/features/shared/doc-shell/DocWorkbench';

import { discardBox, listPackages, type PackageRow } from '@data/endpoints/nx03/workstation/api';

import { PackageDetailPanel } from './PackageDetailPanel';
import { PackageWizard } from './PackageWizard';

const TYPE_LABEL: Record<string, string> = { P: '自取', C: '寄貨', D: '配送' };
const STATUS_LABEL: Record<string, string> = { C: '建箱中', F: '已封箱', S: '已寄出', V: '作廢' };
const STATUS_CLS: Record<string, string> = {
  C: 'bg-amber-100 text-amber-800',
  F: 'bg-emerald-100 text-emerald-800',
  S: 'bg-indigo-100 text-indigo-800',
  V: 'bg-rose-100 text-rose-700',
};

const DEFAULT_WIDTHS: Record<string, number> = { docNo: 190, status: 90, plType: 90, plDate: 110, customerLabel: 200, lineCount: 80, warehouseCode: 90 };

type PkgCriteria = { status?: string; deliveryType?: string; search?: string };

const COLUMNS: MasterTableColumn<PackageRow>[] = [
  { key: 'docNo', label: '包裹單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  { key: 'status', label: '狀態', render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{STATUS_LABEL[r.status] ?? r.status}</span> },
  { key: 'plType', label: '出貨方式', render: (r) => TYPE_LABEL[r.plType] ?? r.plType },
  { key: 'plDate', label: '包貨日期', sortable: true, render: (r) => r.plDate ?? '—' },
  { key: 'customerLabel', label: '客戶', render: (r) => r.customerLabel },
  { key: 'lineCount', label: '項數', render: (r) => <span className="tabular-nums">{r.lineCount}</span> },
  { key: 'warehouseCode', label: '倉別', render: (r) => <span className="font-mono text-xs">{r.warehouseCode}</span> },
];

const CONFIG: DocWorkbenchConfig<PackageRow, PkgCriteria> = {
  docLabel: '包裹',
  colOrderKey: 'nx03.package.list.colOrder',
  colWidthKey: 'nx03.package.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (c) => {
    const r = await listPackages({ pageSize: 100, status: c.status?.trim() || undefined, deliveryType: c.deliveryType?.trim() || undefined, search: c.search?.trim() || undefined });
    return { items: r.items, total: r.total };
  },
  columns: COLUMNS,
  deleteRow: (row, reload) => {
    if (row.status !== 'C') { alert('只有「建箱中」的包裹可丟棄；已封箱請走出貨作業'); return; }
    if (!window.confirm(`丟棄包裹 ${row.docNo}？箱內貨會退回已撿池。`)) return;
    void (async () => {
      try { await discardBox(row.id); await reload(); }
      catch (e) { alert(e instanceof Error ? e.message : '丟棄失敗'); }
    })();
  },
  exportCsv: {
    filename: '包裹列表.csv',
    header: ['包裹單號', '狀態', '出貨方式', '包貨日期', '客戶', '項數', '倉別'],
    line: (r) => [r.docNo, STATUS_LABEL[r.status] ?? r.status, TYPE_LABEL[r.plType] ?? r.plType, r.plDate ?? '', r.customerLabel, r.lineCount, r.warehouseCode],
  },
  CreatePanel: PackageWizard,
  DetailPanel: (props: DocDetailPanelProps) => <PackageDetailPanel id={props.id} onChanged={props.onChanged} />,
  SearchDialog: PackageSearchDialog,
};

export function PackageWorkbench({ initialId, initialTab = 'list' }: { initialId?: string; initialTab?: MasterTab }) {
  return <DocWorkbench config={CONFIG} initialId={initialId} initialTab={initialTab} />;
}

function PackageSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<PkgCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [deliveryType, setDeliveryType] = useState(initial.deliveryType ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢包裹"
      onSubmit={() => onApply({ status: status || undefined, deliveryType: deliveryType || undefined, search: search.trim() || undefined })}
      onClear={() => { setStatus(''); setDeliveryType(''); setSearch(''); }}
      onClose={onClose}
    >
      <SearchRow label="狀態">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cls}>
          <option value="">全部</option>
          <option value="C">建箱中</option>
          <option value="F">已封箱</option>
          <option value="S">已寄出</option>
        </select>
      </SearchRow>
      <SearchRow label="出貨方式">
        <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className={cls}>
          <option value="">全部</option>
          <option value="P">自取</option>
          <option value="C">寄貨</option>
          <option value="D">配送</option>
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="包裹單號 / 客戶 / 料號" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
