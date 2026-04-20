/**
 * @FUNCTION_CODE NX02-PO-UI-002-F01
 * 採購單 DEMO（單據公版）
 */

'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocLayout } from '@/components/document/DocLayout';
import { DocDetailView } from '@/components/document/DocDetailView';
import { DocHeader } from '@/components/document/DocHeader';
import { DocListView } from '@/components/document/DocListView';
import { DocItemTable, type DocItemColumn, type DocItemRow } from '@/components/document/DocItemTable';
import { DocStatusBadge } from '@/components/document/docStatus';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cx } from '@/shared/lib/cx';
import { MOCK_RFQ_CREATOR_NAME, MOCK_RFQ_CURRENCIES, MOCK_VENDORS, MOCK_WAREHOUSES } from '@/features/purchase/domestic/mock-data';
import { fmtMoney, MOCK_PO_LIST, REF_TODAY } from '@/features/document-demo/mockData';

const PO_ITEM_COLS: DocItemColumn[] = [
  { id: '_ln', header: '項次', widthClass: 'w-10', kind: 'index' },
  { id: 'part_no', header: '料號', widthClass: 'w-40', kind: 'readonly' },
  { id: 'part_name', header: '品名', widthClass: 'min-w-0', kind: 'readonly' },
  { id: 'part_brand', header: '廠牌', widthClass: 'w-20', kind: 'readonly' },
  { id: 'qty', header: '採購數量', widthClass: 'w-[90px]', kind: 'number', align: 'right' },
  { id: 'received_qty', header: '已收數量', widthClass: 'w-[90px]', kind: 'readonly', align: 'right' },
  { id: 'unit_cost', header: '採購單價', widthClass: 'w-[100px]', kind: 'number', align: 'right' },
  {
    id: 'line_amount',
    header: '明細金額',
    widthClass: 'w-[100px]',
    kind: 'readonly',
    align: 'right',
    renderCell: ({ row }) => {
      const q = Number(row.qty) || 0;
      const c = Number(row.unit_cost) || 0;
      return <span className="tabular-nums text-xs font-medium">{fmtMoney(q * c)}</span>;
    },
  },
  { id: 'expected_date', header: '預計到貨', widthClass: 'w-[100px]', kind: 'text' },
  { id: 'remark', header: '備註', widthClass: 'w-32', kind: 'text' },
  { id: '_x', header: '', widthClass: 'w-8', kind: 'actions' },
];

function newLine(): DocItemRow {
  return {
    id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    part_no: '',
    part_name: '',
    part_brand: '',
    qty: 1,
    received_qty: 0,
    unit_cost: '',
    expected_date: '',
    remark: '',
  };
}

function poStatusLabel(s: string): string {
  const u = s.toUpperCase();
  if (u === 'D') return '草稿';
  if (u === 'S') return '已送出';
  if (u === 'C') return '完成';
  if (u === 'V') return '作廢';
  return s;
}

export function PoDocPage() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [rows] = useState(() => [...MOCK_PO_LIST]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('MW1');
  const [poDate, setPoDate] = useState(REF_TODAY);
  const [expectedDate, setExpectedDate] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [taxRate, setTaxRate] = useState(5);
  const [remark, setRemark] = useState('');
  const [rfqDocNo, setRfqDocNo] = useState('');
  const [lines, setLines] = useState<DocItemRow[]>(() => [newLine()]);
  const [headerStatus, setHeaderStatus] = useState('D');

  const subtotal = useMemo(() => {
    return lines.reduce((acc, row) => {
      const q = Number(row.qty) || 0;
      const c = Number(row.unit_cost) || 0;
      return acc + q * c;
    }, 0);
  }, [lines]);

  const taxAmount = useMemo(() => Math.round((subtotal * taxRate) / 100), [subtotal, taxRate]);
  const totalAmount = subtotal + taxAmount;

  const listView = (
    <DocListView>
      <table className="nx-master-table w-full min-w-[1100px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="nx-master-thead-row text-left text-muted-foreground">
            <th className="w-40 px-2 py-2.5">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                單號
                <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
              </span>
            </th>
            <th className="w-[100px] px-2 py-2.5">採購日期</th>
            <th className="min-w-0 px-2 py-2.5">廠商</th>
            <th className="w-[140px] px-2 py-2.5">來源詢價單</th>
            <th className="w-14 px-2 py-2.5">幣別</th>
            <th className="w-[100px] px-2 py-2.5 text-right">小計</th>
            <th className="w-20 px-2 py-2.5 text-right">稅額</th>
            <th className="w-[100px] px-2 py-2.5 text-right">總額</th>
            <th className="w-[100px] px-2 py-2.5">預計到貨</th>
            <th className="w-[90px] px-2 py-2.5">狀態</th>
            <th className="w-20 px-2 py-2.5">建立人</th>
            <th className="w-[140px] px-2 py-2.5">建立時間</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="nx-master-tbody-row cursor-pointer"
              onClick={() => {
                setSupplierId(MOCK_VENDORS[0]?.id ?? '');
                setPoDate(r.po_date);
                setExpectedDate(r.expected_date);
                setCurrency(r.currency);
                setRfqDocNo(r.rfq_doc_no);
                setRemark('（自列表載入 DEMO）');
                setHeaderStatus(r.status);
                setLines([
                  {
                    id: '1',
                    part_no: 'VAG-1K0·129·620·A',
                    part_name: '空氣濾芯',
                    part_brand: 'MANN',
                    qty: 10,
                    received_qty: r.status === 'C' ? 10 : 0,
                    unit_cost: 1200,
                    expected_date: r.expected_date,
                    remark: '',
                  },
                ]);
                setView('detail');
              }}
            >
              <td className="px-2 py-2 font-mono text-xs font-medium">{r.doc_no}</td>
              <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.po_date}</td>
              <td className="min-w-0 truncate px-2 py-2">{r.vendor_name}</td>
              <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{r.rfq_doc_no || '—'}</td>
              <td className="px-2 py-2">{r.currency}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(r.subtotal)}</td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{fmtMoney(r.tax_amount)}</td>
              <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums">{fmtMoney(r.total_amount)}</td>
              <td className="px-2 py-2 tabular-nums">{r.expected_date}</td>
              <td className="px-2 py-2">
                <DocStatusBadge status={r.status} label={poStatusLabel(r.status)} />
              </td>
              <td className="px-2 py-2 text-xs">{r.created_by}</td>
              <td className="px-2 py-2 text-xs tabular-nums text-muted-foreground">{r.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocListView>
  );

  const detailView = (
    <DocDetailView
      header={
        <DocHeader
          system={
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                單號：<span className="font-medium text-foreground">存檔後產生</span>
              </span>
              <span>
                狀態：<DocStatusBadge status={headerStatus} label={poStatusLabel(headerStatus)} />
              </span>
              <span>
                來源詢價單：
                <span className="font-medium text-foreground">{rfqDocNo || '—'}</span>
              </span>
              <span>
                建立人：<span className="font-medium text-foreground">{MOCK_RFQ_CREATOR_NAME}</span>
              </span>
              <span>
                建立時間：<span className="font-medium text-foreground">—</span>
              </span>
            </div>
          }
        >
          <div className="grid gap-1.5">
            <Label>廠商 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
              }}
            >
              <option value="">請選擇…</option>
              {MOCK_VENDORS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>入庫倉庫 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
              }}
            >
              {MOCK_WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>採購日期 *</Label>
            <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>預計到貨日</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>幣別 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
              }}
            >
              {MOCK_RFQ_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>稅率（%）*</Label>
            <Input
              type="number"
              className="h-9"
              value={taxRate}
              onChange={(e) => {
                setTaxRate(Number(e.target.value) || 0);
              }}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>備註</Label>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} className="h-9" />
          </div>
        </DocHeader>
      }
      itemToolbar={
        <div className="space-y-2">
          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">金額合計（唯讀）</p>
            <p className="tabular-nums">小計：{fmtMoney(subtotal)}</p>
            <p className="text-muted-foreground tabular-nums">
              稅額：{fmtMoney(taxAmount)}（{taxRate}%）
            </p>
            <p className="font-semibold tabular-nums">總額：{fmtMoney(totalAmount)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" className="h-8">
              + 從詢價單帶入
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                setLines((prev) => [...prev, newLine()]);
              }}
            >
              + 手動新增
            </Button>
          </div>
        </div>
      }
    >
      <DocItemTable
        columns={PO_ITEM_COLS}
        rows={lines}
        setRows={(u) => {
          setLines(u);
        }}
        onAddRow={() => {
          setLines((prev) => [...prev, newLine()]);
        }}
      />
    </DocDetailView>
  );

  const canSave = Boolean(supplierId && warehouseId && currency && poDate && lines.some((l) => Number(l.qty) > 0 && Number(l.unit_cost) >= 0));

  return (
    <DocLayout
      title="採購單"
      docCode="NX02-PO-UI-002-F01 · PO"
      view={view}
      onViewChange={setView}
      listView={listView}
      detailView={detailView}
      onNew={() => {
        setView('detail');
        setSupplierId('');
        setWarehouseId('MW1');
        setPoDate(REF_TODAY);
        setExpectedDate('');
        setCurrency('TWD');
        setTaxRate(5);
        setRemark('');
        setRfqDocNo('');
        setHeaderStatus('D');
        setLines([newLine()]);
      }}
      onSave={() => {}}
      onEdit={() => setView('detail')}
      onDelete={() => setView('list')}
      onCancel={() => setView('list')}
      canSave={canSave}
      canEdit
      canDelete
    />
  );
}
