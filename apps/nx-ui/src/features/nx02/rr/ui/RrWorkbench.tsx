// apps/nx-ui/src/features/nx02/rr/ui/RrWorkbench.tsx
// NX02-RR-SHELL：進貨單工作區（第四張單、直接吃泛型 DocWorkbench）
//   本檔只留進貨單差異：欄位 / 查詢(狀態+關鍵字：單號/供應商/來源採購單) / 作廢守衛 / CSV 欄位 / 三面板接線
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

import { listRr, voidRr } from '@data/endpoints/nx02/rr/api/rr';
import type { Rr, RrStatus } from '@data/types/nx02/rr';
import { RR_STATUSES, RR_STATUS_LABEL } from '@data/types/nx02/rr';

import { RrCreatePanel, RrDetailPanel } from './RrDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 180,
  status: 100,
  createdAt: 110,
  rrDate: 110,
  supplierCode: 110,
  supplierName: 180,
  sourceDocNo: 160,
  createdByName: 100,
  itemCount: 80,
  subtotal: 110,
  totalAmount: 120,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  INSPECTING: 'bg-amber-100 text-amber-800',
  POSTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

/** 來源單號：採購單 / 同行調貨單 / 詢價單 擇一顯示 */
const sourceDocNo = (r: Rr) => r.poDocNo ?? r.tiDocNo ?? r.rfqDocNo ?? null;

type RrCriteria = { status?: string; search?: string };

const COLUMNS: MasterTableColumn<Rr>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{RR_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'rrDate', label: '進貨日期', sortable: true, render: (r) => r.rrDate.slice(0, 10) },
  { key: 'supplierCode', label: '供應商編號', render: (r) => <span className="font-mono text-[14px]">{r.supplierCode ?? '—'}</span> },
  { key: 'supplierName', label: '供應商名稱', render: (r) => r.supplierName ?? r.supplierId },
  { key: 'sourceDocNo', label: '來源單號', render: (r) => <span className="font-mono text-[14px]">{sourceDocNo(r) ?? '—'}</span> },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'subtotal', label: '未稅金額', render: (r) => <span className="tabular-nums">{fmtMoney(r.subtotal)}</span> },
  { key: 'totalAmount', label: '總金額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
];

const CONFIG: DocWorkbenchConfig<Rr, RrCriteria> = {
  docLabel: '進貨單',
  colOrderKey: 'nx02.rr.list.colOrder',
  colWidthKey: 'nx02.rr.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listRr({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status === 'POSTED' || selected.status === 'CANCELLED') {
      alert('此狀態不可作廢（已過帳 / 已取消）');
      return;
    }
    if (!window.confirm(`作廢進貨單 ${selected.docNo}？`)) return;
    void (async () => {
      try {
        await voidRr(selected.id);
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '進貨單列表.csv',
    header: ['單號', '狀態', '建單日期', '進貨日期', '供應商編號', '供應商名稱', '來源單號', '建單人員', '項目數', '未稅', '總金額'],
    line: (r) => [
      r.docNo,
      RR_STATUS_LABEL[r.status] ?? r.status,
      r.createdAt.slice(0, 10),
      r.rrDate.slice(0, 10),
      r.supplierCode ?? '',
      r.supplierName ?? r.supplierId,
      sourceDocNo(r) ?? '',
      r.createdByName ?? '',
      r.itemCount ?? 0,
      String(r.subtotal),
      String(r.totalAmount),
    ],
  },
  CreatePanel: RrCreatePanel,
  DetailPanel: RrDetailPanel,
  SearchDialog: RrSearchDialog,
};

export function RrWorkbench({
  initialId,
  initialTab = 'list',
  initialCreate = false,
  initialRfqId,
}: {
  initialId?: string;
  initialTab?: MasterTab;
  initialCreate?: boolean;
  /** RfqDetailView「轉進貨」?rfq= 入口：新增面板多「從詢價單」路徑並預載該單 */
  initialRfqId?: string;
}) {
  const config = useMemo<DocWorkbenchConfig<Rr, RrCriteria>>(() => {
    if (!initialRfqId) return CONFIG;
    const CreateWithRfq = (props: { onCreated: (id: string) => void; onCancel: () => void }) => (
      <RrCreatePanel {...props} initialRfqId={initialRfqId} />
    );
    return { ...CONFIG, CreatePanel: CreateWithRfq };
  }, [initialRfqId]);
  return <DocWorkbench config={config} initialId={initialId} initialTab={initialTab} initialCreate={initialCreate} />;
}

function RrSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<RrCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢進貨單"
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
          {RR_STATUSES.map((s) => (
            <option key={s} value={s}>{RR_STATUS_LABEL[s as RrStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 供應商 / 來源採購單號 / 備註" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
