// apps/nx-ui/src/features/nx02/po/ui/PoWorkbench.tsx
// NX02-PO-SHELL：採購單工作區（第六張單、吃泛型 DocWorkbench）
//   本檔只留採購單差異：欄位 / 查詢(狀態+類型+關鍵字) / 作廢守衛(僅草稿) / CSV / 三面板接線
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

import { listPo, voidPo } from '@data/endpoints/nx02/po/api/po';
import type { Po, PoStatus } from '@data/types/nx02/po';
import { PO_STATUSES, PO_STATUS_LABEL, PURCHASE_TYPE_LABEL } from '@data/types/nx02/po';

import { PoCreatePanel, PoDetailPanel } from './PoDetailView.new';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 180,
  status: 100,
  purchaseType: 70,
  createdAt: 110,
  poDate: 110,
  supplierCode: 110,
  supplierName: 180,
  expectedDate: 110,
  createdByName: 100,
  itemCount: 80,
  subtotal: 110,
  totalAmount: 120,
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-zinc-200 text-zinc-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-sky-100 text-sky-800',
  SUBMITTED: 'bg-indigo-100 text-indigo-800',
  CONFIRMED: 'bg-violet-100 text-violet-800',
  PARTIAL_RECEIVED: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

type PoCriteria = { status?: string; purchaseType?: string; search?: string };

const COLUMNS: MasterTableColumn<Po>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'status',
    label: '狀態',
    render: (r) => <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_CLS[r.status] ?? 'bg-zinc-200 text-zinc-600'}`}>{PO_STATUS_LABEL[r.status] ?? r.status}</span>,
  },
  { key: 'purchaseType', label: '類型', render: (r) => PURCHASE_TYPE_LABEL[r.purchaseType ?? 'D'] ?? r.purchaseType },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'poDate', label: '採購日期', sortable: true, render: (r) => r.poDate.slice(0, 10) },
  { key: 'supplierCode', label: '供應商編號', render: (r) => <span className="font-mono text-[14px]">{r.supplierCode ?? '—'}</span> },
  { key: 'supplierName', label: '供應商名稱', render: (r) => r.supplierName ?? r.supplierId },
  { key: 'expectedDate', label: '預計到貨', render: (r) => r.expectedDate ? r.expectedDate.slice(0, 10) : '—' },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'subtotal', label: '未稅金額', render: (r) => <span className="tabular-nums">{fmtMoney(r.subtotal)}</span> },
  { key: 'totalAmount', label: '總金額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
];

const CONFIG: DocWorkbenchConfig<Po, PoCriteria> = {
  docLabel: '採購單',
  colOrderKey: 'nx02.po.list.colOrder',
  colWidthKey: 'nx02.po.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listPo({
      pageSize: 100,
      status: criteria.status?.trim() || undefined,
      purchaseType: criteria.purchaseType?.trim() || undefined,
      search: criteria.search?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT') {
      alert('此狀態不可作廢（僅草稿可作廢；已進審核/採購流程請走退件或取消剩餘）');
      return;
    }
    if (!window.confirm(`作廢採購單 ${selected.docNo}？`)) return;
    void (async () => {
      try {
        await voidPo(selected.id);
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '採購單列表.csv',
    header: ['單號', '狀態', '類型', '建單日期', '採購日期', '供應商編號', '供應商名稱', '預計到貨', '建單人員', '項目數', '未稅', '總金額'],
    line: (r) => [
      r.docNo,
      PO_STATUS_LABEL[r.status] ?? r.status,
      PURCHASE_TYPE_LABEL[r.purchaseType ?? 'D'] ?? '',
      r.createdAt.slice(0, 10),
      r.poDate.slice(0, 10),
      r.supplierCode ?? '',
      r.supplierName ?? r.supplierId,
      r.expectedDate?.slice(0, 10) ?? '',
      r.createdByName ?? '',
      r.itemCount ?? 0,
      String(r.subtotal),
      String(r.totalAmount),
    ],
  },
  CreatePanel: PoCreatePanel,
  DetailPanel: PoDetailPanel,
  SearchDialog: PoSearchDialog,
};

export function PoWorkbench({
  initialId,
  initialTab = 'list',
  initialCreate = false,
  initialRfqId,
}: {
  initialId?: string;
  initialTab?: MasterTab;
  initialCreate?: boolean;
  /** RfqDetailView「轉採購」?rfq= 入口：新增面板多「從詢價單」路徑並預載該單 */
  initialRfqId?: string;
}) {
  const config = useMemo<DocWorkbenchConfig<Po, PoCriteria>>(() => {
    if (!initialRfqId) return CONFIG;
    const CreateWithRfq = (props: { onCreated: (id: string) => void; onCancel: () => void }) => (
      <PoCreatePanel {...props} initialRfqId={initialRfqId} />
    );
    return { ...CONFIG, CreatePanel: CreateWithRfq };
  }, [initialRfqId]);
  return <DocWorkbench config={config} initialId={initialId} initialTab={initialTab} initialCreate={initialCreate} />;
}

function PoSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<PoCriteria>) {
  const [status, setStatus] = useState(initial.status ?? '');
  const [purchaseType, setPurchaseType] = useState(initial.purchaseType ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';
  return (
    <SearchDialogShell
      title="查詢採購單"
      onSubmit={() => onApply({ status: status || undefined, purchaseType: purchaseType || undefined, search: search.trim() || undefined })}
      onClear={() => {
        setStatus('');
        setPurchaseType('');
        setSearch('');
      }}
      onClose={onClose}
    >
      <SearchRow label="單據狀態">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cls}>
          <option value="">全部</option>
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>{PO_STATUS_LABEL[s as PoStatus]}</option>
          ))}
        </select>
      </SearchRow>
      <SearchRow label="採購類型">
        <select value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)} className={cls}>
          <option value="">全部</option>
          <option value="D">國內</option>
          <option value="I">國外</option>
          <option value="B">掃貨</option>
        </select>
      </SearchRow>
      <SearchRow label="關鍵字">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="單號 / 供應商編號 / 供應商名稱 / 備註" className={cls} autoFocus />
      </SearchRow>
    </SearchDialogShell>
  );
}
