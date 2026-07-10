// apps/nx-ui/src/features/nx04/quote/ui/QuoteWorkbench.tsx
// NX04-QT-SHELL：報價單工作區 → NX02-RR-SHELL：改吃泛型 DocWorkbench（骨架收斂、行為零變）
//   本檔只留報價單差異：欄位 / 查詢條件與彈窗 / 作廢守衛 / CSV 欄位 / 三面板接線
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

import { listQuote, voidQuote } from '@data/endpoints/nx04/quote/api/quote';
import type { Quote } from '@data/types/nx04/quote';

import { QuoteCreatePanel, QuoteDetailPanel } from './QuoteDetailView';

const DEFAULT_WIDTHS: Record<string, number> = {
  docNo: 160,
  valid: 80,
  createdAt: 110,
  quoteDate: 110,
  customerCode: 110,
  customerName: 190,
  createdByName: 100,
  itemCount: 80,
  subtotal: 110,
  totalAmount: 120,
  validUntil: 120,
};

// 列表狀態：純看有效期（作廢 / 失效(逾期) / 有效）；不碰接受·拒絕（成交與否走銷貨單拉報價）
type ListStatus = 'valid' | 'expired' | 'void';
function listStatus(q: Quote): ListStatus {
  if (q.voidedAt) return 'void';
  if (q.validUntil && new Date(q.validUntil) < new Date(new Date().toDateString())) return 'expired';
  return 'valid';
}
const LIST_STATUS_LABEL: Record<ListStatus, string> = { valid: '有效', expired: '失效', void: '作廢' };

type QuoteCriteria = {
  docNoFrom?: string;
  docNoTo?: string;
  createdFrom?: string;
  createdTo?: string;
  quoteFrom?: string;
  quoteTo?: string;
  validity?: 'valid' | 'expired' | 'void';
  customerCode?: string;
  customerName?: string;
  creator?: string;
  partNo?: string;
};

const COLUMNS: MasterTableColumn<Quote>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  {
    key: 'valid',
    label: '狀態',
    render: (r) => {
      const s = listStatus(r);
      const cls =
        s === 'valid'
          ? 'bg-emerald-100 text-emerald-800'
          : s === 'void'
            ? 'bg-rose-100 text-rose-700'
            : 'bg-zinc-200 text-zinc-600';
      return <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>{LIST_STATUS_LABEL[s]}</span>;
    },
  },
  { key: 'createdAt', label: '建單日期', sortable: true, render: (r) => r.createdAt.slice(0, 10) },
  { key: 'quoteDate', label: '報價日期', sortable: true, render: (r) => r.quoteDate.slice(0, 10) },
  { key: 'customerCode', label: '客戶編號', render: (r) => <span className="font-mono text-xs">{r.customerCode ?? '—'}</span> },
  { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName ?? r.customerId },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName ?? '—' },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount ?? 0}</span> },
  { key: 'subtotal', label: '未稅金額', render: (r) => <span className="tabular-nums">{fmtMoney(r.subtotal)}</span> },
  { key: 'totalAmount', label: '總金額', sortable: true, render: (r) => <span className="font-medium tabular-nums">{fmtMoney(r.totalAmount)}</span> },
  {
    key: 'validUntil',
    label: '有效日期',
    render: (r) => {
      const exp = r.validUntil && new Date(r.validUntil) < new Date(new Date().toDateString());
      return <span className={exp ? 'font-semibold text-rose-600' : ''}>{r.validUntil ? r.validUntil.slice(0, 10) : '—'}</span>;
    },
  },
];

const CONFIG: DocWorkbenchConfig<Quote, QuoteCriteria> = {
  docLabel: '報價單',
  colOrderKey: 'nx04.quote.list.colOrder',
  colWidthKey: 'nx04.quote.list.colWidths',
  defaultWidths: DEFAULT_WIDTHS,
  emptyCriteria: {},
  fetchList: async (criteria) => {
    const resp = await listQuote({
      pageSize: 100,
      source: 'FORMAL', // 報價單列表只顯示正式報價單；即時報價紀錄不洗版

      docNoFrom: criteria.docNoFrom?.trim() || undefined,
      docNoTo: criteria.docNoTo?.trim() || undefined,
      createdFrom: criteria.createdFrom || undefined,
      createdTo: criteria.createdTo || undefined,
      quoteFrom: criteria.quoteFrom || undefined,
      quoteTo: criteria.quoteTo || undefined,
      validity: criteria.validity || undefined,
      customerCode: criteria.customerCode?.trim() || undefined,
      customerName: criteria.customerName?.trim() || undefined,
      creator: criteria.creator?.trim() || undefined,
      partNo: criteria.partNo?.trim() || undefined,
    });
    return { items: resp.items, total: resp.total };
  },
  columns: COLUMNS,
  deleteRow: (selected, reload) => {
    if (selected.status !== 'DRAFT' && selected.status !== 'SENT') {
      alert('此狀態不可作廢（僅草稿 / 已寄出可作廢）');
      return;
    }
    const reason = window.prompt(`作廢報價單 ${selected.docNo}？請輸入原因（必填）`);
    if (!reason?.trim()) return;
    void (async () => {
      try {
        await voidQuote(selected.id, reason.trim());
        await reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : '作廢失敗');
      }
    })();
  },
  exportCsv: {
    filename: '報價單列表.csv',
    header: ['單號', '狀態', '建單日期', '報價日期', '客戶編號', '客戶名稱', '建單人員', '項目數', '未稅', '總金額', '有效日期'],
    line: (r) => [
      r.docNo,
      LIST_STATUS_LABEL[listStatus(r)],
      r.createdAt.slice(0, 10),
      r.quoteDate.slice(0, 10),
      r.customerCode ?? '',
      r.customerName ?? r.customerId,
      r.createdByName ?? '',
      r.itemCount ?? 0,
      r.subtotal,
      r.totalAmount,
      r.validUntil?.slice(0, 10) ?? '',
    ],
  },
  CreatePanel: QuoteCreatePanel,
  DetailPanel: QuoteDetailPanel,
  SearchDialog: QuoteSearchDialog,
};

export function QuoteWorkbench({ initialId, initialTab = 'list' }: { initialId?: string; initialTab?: MasterTab }) {
  return <DocWorkbench config={CONFIG} initialId={initialId} initialTab={initialTab} />;
}

/** 查詢報價單（彈跳視窗、全鍵盤友善、Enter 查詢）。區間只填「起」= 該值單一比對 */
function QuoteSearchDialog({ initial, onApply, onClose }: DocSearchDialogProps<QuoteCriteria>) {
  const [c, setC] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    Object.entries(initial).forEach(([k, v]) => {
      if (v != null) o[k] = String(v);
    });
    return o;
  });
  const set = (k: string, v: string) => setC((p) => ({ ...p, [k]: v }));
  const cls = 'w-full rounded border bg-background px-2 py-1 text-sm';

  function apply() {
    onApply({
      docNoFrom: c.docNoFrom,
      docNoTo: c.docNoTo,
      createdFrom: c.createdFrom,
      createdTo: c.createdTo,
      quoteFrom: c.quoteFrom,
      quoteTo: c.quoteTo,
      validity: (c.validity as QuoteCriteria['validity']) || undefined,
      customerCode: c.customerCode,
      customerName: c.customerName,
      creator: c.creator,
      partNo: c.partNo,
    });
  }

  return (
    <SearchDialogShell title="查詢報價單" onSubmit={apply} onClear={() => setC({})} onClose={onClose} maxWidthClass="max-w-2xl">
      <SearchRow label="單號區間">
        <input value={c.docNoFrom ?? ''} onChange={(e) => set('docNoFrom', e.target.value)} placeholder="單號起（只填起＝該單號）" className={cls} autoFocus />
        <span className="text-muted-foreground">~</span>
        <input value={c.docNoTo ?? ''} onChange={(e) => set('docNoTo', e.target.value)} placeholder="單號迄" className={cls} />
      </SearchRow>
      <SearchRow label="建單區間">
        <input type="date" value={c.createdFrom ?? ''} onChange={(e) => set('createdFrom', e.target.value)} className={cls} />
        <span className="text-muted-foreground">~</span>
        <input type="date" value={c.createdTo ?? ''} onChange={(e) => set('createdTo', e.target.value)} className={cls} />
      </SearchRow>
      <SearchRow label="報價區間">
        <input type="date" value={c.quoteFrom ?? ''} onChange={(e) => set('quoteFrom', e.target.value)} className={cls} />
        <span className="text-muted-foreground">~</span>
        <input type="date" value={c.quoteTo ?? ''} onChange={(e) => set('quoteTo', e.target.value)} className={cls} />
      </SearchRow>
      <SearchRow label="單據狀態">
        <select value={c.validity ?? ''} onChange={(e) => set('validity', e.target.value)} className={cls}>
          <option value="">全部</option>
          <option value="valid">有效</option>
          <option value="expired">失效</option>
          <option value="void">作廢</option>
        </select>
      </SearchRow>
      <SearchRow label="客戶">
        <input value={c.customerCode ?? ''} onChange={(e) => set('customerCode', e.target.value)} placeholder="客戶編號" className={cls} />
        <input value={c.customerName ?? ''} onChange={(e) => set('customerName', e.target.value)} placeholder="客戶名稱（F4 注音 待 Step4）" className={cls} />
      </SearchRow>
      <SearchRow label="建單人員">
        <input value={c.creator ?? ''} onChange={(e) => set('creator', e.target.value)} placeholder="員編 或 姓名（F4 注音 待 Step4）" className={cls} />
      </SearchRow>
      <SearchRow label="零件料號">
        <input value={c.partNo ?? ''} onChange={(e) => set('partNo', e.target.value)} placeholder="料號" className={cls} />
      </SearchRow>
    </SearchDialogShell>
  );
}
