/**
 * @FUNCTION_CODE NX02-RR-UI-001-F01
 * 進貨單 DEMO（單據公版）
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
import { MOCK_RFQ_CREATOR_NAME, MOCK_RFQ_CURRENCIES, MOCK_VENDORS, MOCK_WAREHOUSES } from '@/features/purchase/domestic/mock-data';
import { fmtMoney, MOCK_LOCATIONS, MOCK_RR_LIST, REF_TODAY } from '@/features/document-demo/mockData';

const RR_ITEM_COLS: DocItemColumn[] = [
  { id: '_ln', header: '項次', widthClass: 'w-10', kind: 'index' },
  { id: 'part_no', header: '料號', widthClass: 'w-40', kind: 'readonly' },
  { id: 'part_name', header: '品名', widthClass: 'min-w-0', kind: 'readonly' },
  { id: 'part_brand', header: '廠牌', widthClass: 'w-20', kind: 'readonly' },
  {
    id: 'location_id',
    header: '入庫庫位',
    widthClass: 'w-[100px]',
    kind: 'select',
    selectOptions: MOCK_LOCATIONS.map((l) => ({ value: l.id, label: l.label })),
  },
  { id: 'qty', header: '進貨數量', widthClass: 'w-[90px]', kind: 'number', align: 'right' },
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
  { id: 'remark', header: '備註', widthClass: 'w-32', kind: 'text' },
  { id: '_x', header: '', widthClass: 'w-8', kind: 'actions' },
];

function newLine(): DocItemRow {
  return {
    id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    part_no: '',
    part_name: '',
    part_brand: '',
    location_id: MOCK_LOCATIONS[0]!.id,
    qty: 1,
    unit_cost: '',
    remark: '',
  };
}

function rrStatusLabel(s: string): string {
  const u = s.toUpperCase();
  if (u === 'D') return '草稿';
  if (u === 'P') return '已過帳';
  if (u === 'C') return '已取消';
  return s;
}

export function RrDocPage() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [rows] = useState(() => [...MOCK_RR_LIST]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('MW1');
  const [rrDate, setRrDate] = useState(REF_TODAY);
  const [currency, setCurrency] = useState('TWD');
  const [taxRate, setTaxRate] = useState(5);
  const [remark, setRemark] = useState('');
  const [poDocNo, setPoDocNo] = useState('');
  const [lines, setLines] = useState<DocItemRow[]>(() => [newLine()]);
  const [headerStatus, setHeaderStatus] = useState('D');

  const readOnlyDetail = headerStatus === 'P' || headerStatus === 'C';

  const listView = (
    <DocListView>
      <table className="nx-master-table w-full min-w-[960px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="nx-master-thead-row text-left text-muted-foreground">
            <th className="w-40 px-2 py-2.5">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                單號
                <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
              </span>
            </th>
            <th className="w-[100px] px-2 py-2.5">進貨日期</th>
            <th className="min-w-0 px-2 py-2.5">廠商</th>
            <th className="w-[140px] px-2 py-2.5">來源採購單</th>
            <th className="w-[100px] px-2 py-2.5">入庫倉庫</th>
            <th className="w-[100px] px-2 py-2.5 text-right">總額</th>
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
                setWarehouseId(r.warehouse);
                setRrDate(r.rr_date);
                setCurrency('TWD');
                setPoDocNo(r.po_doc_no);
                setRemark('（自列表載入 DEMO）');
                setHeaderStatus(r.status);
                setLines([
                  {
                    id: '1',
                    part_no: 'VAG-1K0·129·620·A',
                    part_name: '空氣濾芯',
                    part_brand: 'MANN',
                    location_id: MOCK_LOCATIONS[0]!.id,
                    qty: 5,
                    unit_cost: 1200,
                    remark: '',
                  },
                ]);
                setView('detail');
              }}
            >
              <td className="px-2 py-2 font-mono text-xs font-medium">{r.doc_no}</td>
              <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.rr_date}</td>
              <td className="min-w-0 truncate px-2 py-2">{r.vendor_name}</td>
              <td className="px-2 py-2 font-mono text-xs">{r.po_doc_no}</td>
              <td className="px-2 py-2">{r.warehouse}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(r.total_amount)}</td>
              <td className="px-2 py-2">
                <DocStatusBadge status={r.status} label={rrStatusLabel(r.status)} />
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
                狀態：<DocStatusBadge status={headerStatus} label={rrStatusLabel(headerStatus)} />
              </span>
              <span>
                來源採購單：<span className="font-medium text-foreground">{poDocNo || '—'}</span>
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
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm disabled:opacity-60"
              value={supplierId}
              disabled={readOnlyDetail}
              onChange={(e) => setSupplierId(e.target.value)}
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
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm disabled:opacity-60"
              value={warehouseId}
              disabled={readOnlyDetail}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {MOCK_WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>進貨日期 *</Label>
            <Input type="date" value={rrDate} disabled={readOnlyDetail} onChange={(e) => setRrDate(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>幣別 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm disabled:opacity-60"
              value={currency}
              disabled={readOnlyDetail}
              onChange={(e) => setCurrency(e.target.value)}
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
              className="h-9 disabled:opacity-60"
              value={taxRate}
              disabled={readOnlyDetail}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>備註</Label>
            <Input value={remark} disabled={readOnlyDetail} onChange={(e) => setRemark(e.target.value)} className="h-9" />
          </div>
        </DocHeader>
      }
      itemToolbar={
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className="h-8" disabled={readOnlyDetail}>
            + 從採購單帶入
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={readOnlyDetail}
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            + 手動新增
          </Button>
        </div>
      }
      footer={
        headerStatus === 'D' ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary">
              儲存草稿
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setHeaderStatus('P');
                setView('detail');
              }}
            >
              執行過帳
            </Button>
          </div>
        ) : null
      }
    >
      <DocItemTable
        columns={RR_ITEM_COLS}
        rows={lines}
        setRows={(u) => {
          if (readOnlyDetail) return;
          setLines(u);
        }}
        onAddRow={
          readOnlyDetail
            ? undefined
            : () => {
                setLines((prev) => [...prev, newLine()]);
              }
        }
      />
    </DocDetailView>
  );

  const canSave = useMemo(
    () =>
      !readOnlyDetail &&
      Boolean(supplierId && warehouseId && currency && rrDate && lines.every((l) => l.location_id && Number(l.qty) > 0 && Number(l.unit_cost) >= 0)),
    [readOnlyDetail, supplierId, warehouseId, currency, rrDate, lines],
  );

  return (
    <DocLayout
      title="進貨單"
      docCode="NX02-RR-UI-001-F01 · RR"
      view={view}
      onViewChange={setView}
      listView={listView}
      detailView={detailView}
      onNew={() => {
        setView('detail');
        setSupplierId('');
        setWarehouseId('MW1');
        setRrDate(REF_TODAY);
        setCurrency('TWD');
        setTaxRate(5);
        setRemark('');
        setPoDocNo('');
        setHeaderStatus('D');
        setLines([newLine()]);
      }}
      onSave={() => {}}
      onEdit={() => {
        if (headerStatus === 'D') setView('detail');
      }}
      onDelete={() => setView('list')}
      onCancel={() => setView('list')}
      canSave={canSave}
      canEdit={headerStatus === 'D'}
      canDelete={headerStatus === 'D'}
    />
  );
}
