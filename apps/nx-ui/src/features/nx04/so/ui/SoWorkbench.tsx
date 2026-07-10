// apps/nx-ui/src/features/nx04/so/ui/SoWorkbench.tsx
// NX04-QT-SHELL：銷貨單工作區 → NX02-RR-SHELL：改吃泛型 DocWorkbench（骨架收斂、行為零變）
//   本檔只留銷貨單差異：欄位 / 查詢(狀態+關鍵字) / 取消守衛 / CSV 欄位 / 三面板接線
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

import { listSo, softDeleteSo } from '@data/endpoints/nx04/so/api/so';
import type { So } from '@data/types/nx04/so';
import { SO_STATUSES, SO_STATUS_LABEL, type SoStatus } from '@data/types/nx04/so';

import { SoCreatePanel, SoDetailPanel } from './SoDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 170,
  status: 100,
  createdAt: 110,
  soDate: 110,
  customerCode: 110,
  customerName: 190,
  createdByName: 100,
  itemCount: 80,
  subtotal: 110,
  totalAmount: 120,
  deliveryType: 90,
};

const DELIVERY_LABEL: Record<string, string> = { P: '自取', D: '配送', S: '寄送' };
const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  CONFIRMED: 'bg-sky-100 text-sky-800',
  PICKING: 'bg-amber-100 text-amber-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  INVOICED: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

type SoCriteria = { status?: string; search?: string };

const COLUMNS: MasterTableColumn<So>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{SO_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'soDate', label: '銷貨日期', sortable: true, render: (r) => r.soDate.slice(0, 10) },
  { key: 'customerCode', label: '客戶編號', render: (r) => <span className="font-mono text-xs">{r.customerCode ?? '—'}</span> },
  { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName ?? r.customerId },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'subtotal', label: '未稅金額', render: (r) => <span className="tabular-nums">{fmtMoney(r.subtotal)}</span> },
  { key: 'totalAmount', label: '總金額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
  { key: 'deliveryType', label: '交貨方式', render: (r) => DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType },
];

const CONFIG: DocWorkbenchConfig<So, SoCriteria> = {
  docLabel: '銷貨單',
  colOrderKey: 'nx04.so.list.colOrder',
  colWidthKey: 'nx04.so.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listSo({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT' && selected.status !== 'CONFIRMED') {
      alert('此狀態不可取消（僅草稿 / 已確認可取消）');
      return;
    }
    const reason = window.prompt(`取消銷貨單 ${selected.docNo}？請輸入原因（必填）`);
    if (!reason?.trim()) return;
    void (async () => {
      try {
        await softDeleteSo(selected.id, reason.trim());
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '取消失敗');
      }
    })();
  },
  exportCsv: {
    filename: '銷貨單列表.csv',
    header: ['單號', '狀態', '建單日期', '銷貨日期', '客戶編號', '客戶名稱', '建單人員', '項目數', '未稅', '總金額', '交貨方式'],
    line: (r) => [
      r.docNo,
      SO_STATUS_LABEL[r.status] ?? r.status,
      r.createdAt.slice(0, 10),
      r.soDate.slice(0, 10),
      r.customerCode ?? '',
      r.customerName ?? r.customerId,
      r.createdByName ?? '',
      r.itemCount ?? 0,
      r.subtotal,
      r.totalAmount,
      DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType,
    ],
  },
  CreatePanel: SoCreatePanel,
  DetailPanel: SoDetailPanel,
  SearchDialog: SoSearchDialog,
};

export function SoWorkbench({ initialId, initialTab = 'list' }: { initialId?: string; initialTab?: MasterTab }) {
  return <DocWorkbench config={CONFIG} initialId={initialId} initialTab={initialTab} />;
}

function SoSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<SoCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢銷貨單"
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
          {SO_STATUSES.map((s) => (
            <option key={s} value={s}>{SO_STATUS_LABEL[s as SoStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 客戶編號 / 客戶名稱" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
