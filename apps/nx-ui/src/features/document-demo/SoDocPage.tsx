/**
 * @FUNCTION_CODE NX04-SO-UI-001-F01
 * 銷貨單 DEMO（單據公版）
 */

'use client';

import { useEffect, useState } from 'react';
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
import { MOCK_RFQ_CREATOR_NAME, MOCK_RFQ_CURRENCIES, MOCK_WAREHOUSES } from '@/features/purchase/domestic/mock-data';
import { deliveryTypeLabel, fmtMoney, MOCK_CUSTOMERS, MOCK_LOCATIONS, MOCK_SO_LIST, REF_TODAY } from '@/features/document-demo/mockData';

function soStatusLabel(s: string): string {
  const u = s.toUpperCase();
  if (u === 'D') return '草稿';
  if (u === 'S') return '已確認';
  if (u === 'C') return '完成';
  return s;
}

function itemPrepLabel(code: string): string {
  if (code === 'D') return '待備貨';
  if (code === 'P') return '已備貨';
  if (code === 'S') return '已出貨';
  return code;
}

const SO_ITEM_COLS: DocItemColumn[] = [
  { id: '_ln', header: '項次', widthClass: 'w-10', kind: 'index' },
  { id: 'part_no', header: '料號', widthClass: 'w-40', kind: 'readonly' },
  { id: 'part_name', header: '品名', widthClass: 'min-w-0', kind: 'readonly' },
  { id: 'part_brand', header: '廠牌', widthClass: 'w-20', kind: 'readonly' },
  {
    id: 'warehouse_id',
    header: '出貨倉庫',
    widthClass: 'w-[92px]',
    kind: 'select',
    selectOptions: MOCK_WAREHOUSES.map((w) => ({ value: w.id, label: w.id })),
  },
  {
    id: 'location_id',
    header: '庫位',
    widthClass: 'w-[92px]',
    kind: 'select',
    selectOptions: MOCK_LOCATIONS.map((l) => ({ value: l.id, label: l.label })),
  },
  { id: 'qty', header: '銷貨數量', widthClass: 'w-20', kind: 'number', align: 'right' },
  { id: 'unit_price', header: '銷售單價', widthClass: 'w-[100px]', kind: 'number', align: 'right' },
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
  {
    id: 'item_status',
    header: '備貨狀態',
    widthClass: 'w-[92px]',
    kind: 'readonly',
    renderCell: ({ row }) => {
      const code = String(row.item_status ?? 'D');
      const st = code === 'P' ? 'P' : code === 'S' ? 'C' : 'D';
      return <DocStatusBadge status={st} label={itemPrepLabel(code)} />;
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
    warehouse_id: 'MW1',
    location_id: MOCK_LOCATIONS[0]!.id,
    qty: 1,
    unit_price: '',
    item_status: 'D',
    remark: '',
  };
}

export function SoDocPage() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [rows] = useState(() => [...MOCK_SO_LIST]);
  const [customerId, setCustomerId] = useState('');
  const [deliveryType, setDeliveryType] = useState('D');
  const [warehouseId, setWarehouseId] = useState('MW1');
  const [soDate, setSoDate] = useState(REF_TODAY);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [taxRate, setTaxRate] = useState(5);
  const [remark, setRemark] = useState('');
  const [quoteDocNo, setQuoteDocNo] = useState('');
  const [lines, setLines] = useState<DocItemRow[]>(() => [newLine()]);
  const [headerStatus, setHeaderStatus] = useState('D');

  useEffect(() => {
    const c = MOCK_CUSTOMERS.find((x) => x.id === customerId);
    setPaymentTerm(c?.payment_term ?? '');
  }, [customerId]);

  const listView = (
    <DocListView>
      <table className="nx-master-table w-full min-w-[1020px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="nx-master-thead-row text-left text-muted-foreground">
            <th className="w-40 px-2 py-2.5">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                單號
                <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
              </span>
            </th>
            <th className="w-[100px] px-2 py-2.5">銷貨日期</th>
            <th className="min-w-0 px-2 py-2.5">客戶</th>
            <th className="w-20 px-2 py-2.5">出貨方式</th>
            <th className="w-[100px] px-2 py-2.5">出貨倉庫</th>
            <th className="w-[140px] px-2 py-2.5">來源報價單</th>
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
                const c = MOCK_CUSTOMERS.find((x) => x.name === r.customer_name);
                setCustomerId(c?.id ?? MOCK_CUSTOMERS[0]!.id);
                setDeliveryType(r.delivery_type);
                setWarehouseId(r.warehouse);
                setSoDate(r.so_date);
                setQuoteDocNo(r.quote_doc_no);
                setHeaderStatus(r.status);
                setLines([
                  {
                    id: '1',
                    part_no: 'VAG-06K·903·133·D',
                    part_name: '火星塞',
                    part_brand: 'NGK',
                    warehouse_id: 'MW1',
                    location_id: MOCK_LOCATIONS[0]!.id,
                    qty: 2,
                    unit_price: 400,
                    item_status: 'D',
                    remark: '',
                  },
                  {
                    id: '2',
                    part_no: 'VAG-1K0·129·620·A',
                    part_name: '空氣濾芯',
                    part_brand: 'MANN',
                    warehouse_id: 'MW1',
                    location_id: MOCK_LOCATIONS[1]!.id,
                    qty: 1,
                    unit_price: 1200,
                    item_status: 'P',
                    remark: '已備貨不可刪 DEMO',
                  },
                ]);
                setView('detail');
              }}
            >
              <td className="px-2 py-2 font-mono text-xs font-medium">{r.doc_no}</td>
              <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.so_date}</td>
              <td className="min-w-0 truncate px-2 py-2">{r.customer_name}</td>
              <td className="px-2 py-2 text-xs">{deliveryTypeLabel(r.delivery_type)}</td>
              <td className="px-2 py-2">{r.warehouse}</td>
              <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{r.quote_doc_no || '—'}</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(r.total_amount)}</td>
              <td className="px-2 py-2">
                <DocStatusBadge status={r.status} label={soStatusLabel(r.status)} />
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
                狀態：<DocStatusBadge status={headerStatus} label={soStatusLabel(headerStatus)} />
              </span>
              <span>
                來源報價單：<span className="font-medium text-foreground">{quoteDocNo || '—'}</span>
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
              onChange={(e) => setCustomerId(e.target.value)}
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
            <Label>出貨方式 *</Label>
            <select className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
              <option value="D">D 配送</option>
              <option value="P">P 自取</option>
              <option value="C">C 寄貨</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>出貨倉庫 *</Label>
            <select className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {MOCK_WAREHOUSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>銷貨日期 *</Label>
            <Input type="date" value={soDate} onChange={(e) => setSoDate(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>預計出貨日</Label>
            <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>配送地址{deliveryType === 'D' ? ' *' : ''}</Label>
            <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="h-9" placeholder={deliveryType === 'D' ? '必填' : '選填'} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>付款條件 *</Label>
            <Input value={paymentTerm} readOnly className="h-9 bg-muted/40" />
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
            + 從報價單帶入
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setLines((prev) => [...prev, newLine()])}>
            + 手動新增
          </Button>
        </div>
      }
    >
      <DocItemTable
        columns={SO_ITEM_COLS}
        rows={lines}
        setRows={setLines}
        onAddRow={() => setLines((prev) => [...prev, newLine()])}
        disableRowDelete={(row) => row.item_status === 'P'}
      />
    </DocDetailView>
  );

  const canSave = Boolean(
    customerId &&
      deliveryType &&
      warehouseId &&
      soDate &&
      paymentTerm &&
      currency &&
      (deliveryType !== 'D' || deliveryAddress.trim().length > 0) &&
      lines.some((l) => Number(l.qty) > 0 && Number(l.unit_price) > 0),
  );

  return (
    <DocLayout
      title="銷貨單"
      docCode="NX04-SO-UI-001-F01 · SO"
      view={view}
      onViewChange={setView}
      listView={listView}
      detailView={detailView}
      onNew={() => {
        setView('detail');
        setCustomerId('');
        setDeliveryType('D');
        setWarehouseId('MW1');
        setSoDate(REF_TODAY);
        setExpectedDeliveryDate('');
        setDeliveryAddress('');
        setPaymentTerm('');
        setCurrency('TWD');
        setTaxRate(5);
        setRemark('');
        setQuoteDocNo('');
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
