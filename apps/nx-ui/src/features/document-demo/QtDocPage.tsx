/**
 * @FUNCTION_CODE NX04-QT-UI-001-F01
 * 報價單 DEMO（單據公版）
 */

'use client';

import { useState } from 'react';
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
import { MOCK_RFQ_CREATOR_NAME, MOCK_RFQ_CURRENCIES, MOCK_WAREHOUSES } from '@/features/purchase/domestic/mock-data';
import { fmtMoney, MOCK_CUSTOMERS, MOCK_QT_LIST, REF_TODAY } from '@/features/document-demo/mockData';

function gradeBadge(grade: string) {
  const g = grade.toUpperCase();
  const cls =
    g === 'A'
      ? 'bg-emerald-600/20 text-emerald-950 dark:text-emerald-50'
      : g === 'B'
        ? 'bg-sky-600/20 text-sky-950 dark:text-sky-50'
        : g === 'C'
          ? 'bg-orange-500/20 text-orange-950 dark:text-orange-50'
          : 'bg-muted text-muted-foreground';
  return <span className={cx('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', cls)}>{grade}</span>;
}

function qtStatusLabel(s: string): string {
  const u = s.toUpperCase();
  if (u === 'D') return '草稿';
  if (u === 'S') return '已發出';
  if (u === 'C') return '已轉單';
  if (u === 'X') return '作廢';
  return s;
}

const QT_ITEM_COLS: DocItemColumn[] = [
  { id: '_ln', header: '項次', widthClass: 'w-10', kind: 'index' },
  { id: 'part_no', header: '料號', widthClass: 'w-40', kind: 'readonly' },
  { id: 'part_name', header: '品名', widthClass: 'min-w-0', kind: 'readonly' },
  { id: 'part_brand', header: '廠牌', widthClass: 'w-20', kind: 'readonly' },
  {
    id: 'stock_on_hand',
    header: '現存庫存',
    widthClass: 'w-[72px]',
    kind: 'readonly',
    align: 'right',
    renderCell: ({ row }) => <span className="tabular-nums text-xs text-muted-foreground">{String(row.stock_on_hand ?? '—')}</span>,
  },
  { id: 'qty', header: '報價數量', widthClass: 'w-20', kind: 'number', align: 'right' },
  {
    id: 'unit_price',
    header: '報價單價',
    widthClass: 'w-[100px]',
    kind: 'number',
    align: 'right',
    inputClassName: (row) => {
      const up = Number(row.unit_price);
      const mp = Number(row.min_price);
      return up > 0 && mp > 0 && up < mp ? 'text-red-600 font-semibold dark:text-red-400' : '';
    },
  },
  {
    id: 'min_price',
    header: '最低售價',
    widthClass: 'w-[92px]',
    kind: 'readonly',
    align: 'right',
    renderCell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground/80">{row.min_price != null && row.min_price !== '' ? fmtMoney(Number(row.min_price)) : '—'}</span>
    ),
  },
  {
    id: 'line_amount',
    header: '明細金額',
    widthClass: 'w-[100px]',
    kind: 'readonly',
    align: 'right',
    renderCell: ({ row }) => {
      const q = Number(row.qty) || 0;
      const p = Number(row.unit_price) || 0;
      return <span className="tabular-nums text-xs font-medium">{fmtMoney(q * p)}</span>;
    },
  },
  { id: 'is_selected', header: '已選', widthClass: 'w-14', kind: 'checkbox', align: 'center' },
  { id: 'remark', header: '備註', widthClass: 'w-32', kind: 'text' },
  { id: '_x', header: '', widthClass: 'w-8', kind: 'actions' },
];

function newLine(): DocItemRow {
  return {
    id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    part_no: '',
    part_name: '',
    part_brand: '',
    stock_on_hand: 0,
    qty: 1,
    unit_price: '',
    min_price: 0,
    is_selected: false,
    remark: '',
  };
}

export function QtDocPage() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [rows] = useState(() => [...MOCK_QT_LIST]);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('MW1');
  const [quoteDate, setQuoteDate] = useState(REF_TODAY);
  const [validUntil, setValidUntil] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [taxRate, setTaxRate] = useState(5);
  const [remark, setRemark] = useState('');
  const [lines, setLines] = useState<DocItemRow[]>(() => [newLine()]);
  const [headerStatus, setHeaderStatus] = useState('D');
  const [customerGrade, setCustomerGrade] = useState('');

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
            <th className="w-[100px] px-2 py-2.5">報價日期</th>
            <th className="min-w-0 px-2 py-2.5">客戶</th>
            <th className="w-16 px-2 py-2.5 text-center">等級</th>
            <th className="w-[100px] px-2 py-2.5">有效期限</th>
            <th className="w-[100px] px-2 py-2.5 text-right">總額</th>
            <th className="w-[90px] px-2 py-2.5">狀態</th>
            <th className="w-20 px-2 py-2.5">建立人</th>
            <th className="w-[140px] px-2 py-2.5">建立時間</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const exp = r.valid_until < REF_TODAY;
            return (
              <tr
                key={r.id}
                className="nx-master-tbody-row cursor-pointer"
                onClick={() => {
                  const c = MOCK_CUSTOMERS.find((x) => x.name === r.customer_name);
                  setCustomerId(c?.id ?? MOCK_CUSTOMERS[0]!.id);
                  setCustomerGrade(r.grade);
                  setQuoteDate(r.quote_date);
                  setValidUntil(r.valid_until);
                  setHeaderStatus(r.status);
                  setLines([
                    {
                      id: '1',
                      part_no: 'VAG-06K·903·133·D',
                      part_name: '火星塞',
                      part_brand: 'NGK',
                      stock_on_hand: 42,
                      qty: 4,
                      unit_price: 380,
                      min_price: 400,
                      is_selected: true,
                      remark: '',
                    },
                    {
                      id: '2',
                      part_no: 'VAG-1K0·129·620·A',
                      part_name: '空氣濾芯',
                      part_brand: 'MANN',
                      stock_on_hand: 12,
                      qty: 2,
                      unit_price: 450,
                      min_price: 420,
                      is_selected: false,
                      remark: '低於最低價 DEMO',
                    },
                  ]);
                  setView('detail');
                }}
              >
                <td className="px-2 py-2 font-mono text-xs font-medium">{r.doc_no}</td>
                <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.quote_date}</td>
                <td className="min-w-0 truncate px-2 py-2">{r.customer_name}</td>
                <td className="px-2 py-2 text-center">{gradeBadge(r.grade)}</td>
                <td className={cx('px-2 py-2 tabular-nums', exp && 'font-medium text-red-600')}>{r.valid_until}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(r.total_amount)}</td>
                <td className="px-2 py-2">
                  <DocStatusBadge status={r.status} label={qtStatusLabel(r.status)} />
                </td>
                <td className="px-2 py-2 text-xs">{r.created_by}</td>
                <td className="px-2 py-2 text-xs tabular-nums text-muted-foreground">{r.created_at}</td>
              </tr>
            );
          })}
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
                狀態：<DocStatusBadge status={headerStatus} label={qtStatusLabel(headerStatus)} />
              </span>
              <span>
                客戶等級：{customerGrade ? gradeBadge(customerGrade) : <span className="text-muted-foreground">—</span>}
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
            <Label>客戶 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = MOCK_CUSTOMERS.find((x) => x.id === e.target.value);
                setCustomerGrade(c?.grade ?? '');
              }}
            >
              <option value="">請選擇…</option>
              {MOCK_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>報價倉庫 *</Label>
            <select className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {MOCK_WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>報價日期 *</Label>
            <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>有效期限</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>幣別 *</Label>
            <select className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {MOCK_RFQ_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>稅率（%）*</Label>
            <Input type="number" className="h-9" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>備註</Label>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} className="h-9" />
          </div>
        </DocHeader>
      }
      itemToolbar={
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className="h-8">
            + 從查詢帶入
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setLines((prev) => [...prev, newLine()])}>
            + 手動新增
          </Button>
        </div>
      }
      footer={
        headerStatus === 'S' ? (
          <Button type="button" size="sm" variant="default" onClick={() => {}}>
            轉為銷貨單
          </Button>
        ) : null
      }
    >
      <DocItemTable
        columns={QT_ITEM_COLS}
        rows={lines}
        setRows={setLines}
        onAddRow={() => setLines((prev) => [...prev, newLine()])}
      />
    </DocDetailView>
  );

  const canSave = Boolean(customerId && warehouseId && currency && quoteDate && lines.some((l) => Number(l.qty) > 0 && Number(l.unit_price) > 0));

  return (
    <DocLayout
      title="報價單"
      docCode="NX04-QT-UI-001-F01 · QT"
      view={view}
      onViewChange={setView}
      listView={listView}
      detailView={detailView}
      onNew={() => {
        setView('detail');
        setCustomerId('');
        setCustomerGrade('');
        setWarehouseId('MW1');
        setQuoteDate(REF_TODAY);
        setValidUntil('');
        setCurrency('TWD');
        setTaxRate(5);
        setRemark('');
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
