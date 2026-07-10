// apps/nx-ui/src/features/nx04/sales-return/ui/SrWorkbench.tsx
// NX04-QT-SHELL：銷退單工作區 → NX02-RR-SHELL：改吃泛型 DocWorkbench（骨架收斂、行為零變）
//   本檔只留銷退單差異：欄位 / 查詢(狀態+關鍵字：單號/客戶/來源銷貨單) / 取消守衛 / CSV 欄位 / 三面板接線
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

import { listSr, voidSr } from '@data/endpoints/nx04/sales-return/api/sales-return';
import type { Sr, SrStatus } from '@data/types/nx04/sales-return';
import { SR_STATUSES, SR_STATUS_LABEL } from '@data/types/nx04/sales-return';

import { SrCreatePanel, SrDetailPanel, SR_METHOD_LABEL } from './SrDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 170,
  status: 110,
  createdAt: 110,
  srDate: 110,
  customerCode: 110,
  customerName: 180,
  soDocNo: 160,
  returnMethod: 110,
  createdByName: 100,
  itemCount: 80,
  totalAmount: 120,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  INSPECTING: 'bg-amber-100 text-amber-800',
  POSTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

type SrCriteria = { status?: string; search?: string };

const COLUMNS: MasterTableColumn<Sr>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{SR_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'srDate', label: '銷退日期', sortable: true, render: (r) => r.srDate.slice(0, 10) },
  { key: 'customerCode', label: '客戶編號', render: (r) => <span className="font-mono text-xs">{r.customerCode ?? '—'}</span> },
  { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName ?? r.customerId },
  { key: 'soDocNo', label: '來源銷貨單', render: (r) => <span className="font-mono text-xs">{r.soDocNo ?? '—'}</span> },
  { key: 'returnMethod', label: '退款方式', render: (r) => SR_METHOD_LABEL[r.returnMethod] ?? r.returnMethod },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'totalAmount', label: '退款總額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
];

const CONFIG: DocWorkbenchConfig<Sr, SrCriteria> = {
  docLabel: '銷退單',
  colOrderKey: 'nx04.sr.list.colOrder',
  colWidthKey: 'nx04.sr.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listSr({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT' && selected.status !== 'INSPECTING') {
      alert('此狀態不可取消（僅草稿 / 驗收中可取消）');
      return;
    }
    const reason = window.prompt(`取消銷退單 ${selected.docNo}？請輸入原因（必填）`);
    if (!reason?.trim()) return;
    void (async () => {
      try {
        await voidSr(selected.id, reason.trim());
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '取消失敗');
      }
    })();
  },
  exportCsv: {
    filename: '銷退單列表.csv',
    header: ['單號', '狀態', '建單日期', '銷退日期', '客戶編號', '客戶名稱', '來源銷貨單', '退款方式', '建單人員', '項目數', '退款總額'],
    line: (r) => [
      r.docNo,
      SR_STATUS_LABEL[r.status] ?? r.status,
      r.createdAt.slice(0, 10),
      r.srDate.slice(0, 10),
      r.customerCode ?? '',
      r.customerName ?? r.customerId,
      r.soDocNo ?? '',
      SR_METHOD_LABEL[r.returnMethod] ?? r.returnMethod,
      r.createdByName ?? '',
      r.itemCount ?? 0,
      r.totalAmount,
    ],
  },
  CreatePanel: SrCreatePanel,
  DetailPanel: SrDetailPanel,
  SearchDialog: SrSearchDialog,
};

export function SrWorkbench({ initialId, initialTab = 'list' }: { initialId?: string; initialTab?: MasterTab }) {
  return <DocWorkbench config={CONFIG} initialId={initialId} initialTab={initialTab} />;
}

function SrSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<SrCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢銷退單"
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
          {SR_STATUSES.map((s) => (
            <option key={s} value={s}>{SR_STATUS_LABEL[s as SrStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 客戶 / 來源銷貨單號" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
