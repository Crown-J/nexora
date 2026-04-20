/**
 * @FUNCTION_CODE NX02-RFQ-UI-001-F01
 * 詢價單 DEMO（單據公版）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { MOCK_RFQ_LIST, REF_TODAY } from '@/features/document-demo/mockData';

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

const RF_ITEM_COLS: DocItemColumn[] = [
  { id: '_ln', header: '項次', widthClass: 'w-10', kind: 'index' },
  { id: 'part_no', header: '料號', widthClass: 'w-40', kind: 'readonly' },
  { id: 'part_name', header: '品名', widthClass: 'min-w-0', kind: 'readonly' },
  { id: 'part_brand', header: '廠牌', widthClass: 'w-20', kind: 'readonly' },
  { id: 'qty', header: '詢價數量', widthClass: 'w-[90px]', kind: 'number', align: 'right' },
  { id: 'unit_price', header: '回覆單價', widthClass: 'w-[90px]', kind: 'number', align: 'right' },
  { id: 'lead_time_days', header: '交期(天)', widthClass: 'w-[72px]', kind: 'number', align: 'right' },
  {
    id: 'item_status',
    header: '狀態',
    widthClass: 'w-[76px]',
    kind: 'select',
    selectOptions: [
      { value: 'P', label: '待回覆' },
      { value: 'R', label: '已回覆' },
    ],
  },
  { id: 'remark', header: '備註', widthClass: 'w-36', kind: 'text' },
  { id: '_x', header: '', widthClass: 'w-8', kind: 'actions' },
];

function newLine(): DocItemRow {
  return {
    id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    part_no: '',
    part_name: '',
    part_brand: '',
    qty: 1,
    unit_price: '',
    lead_time_days: '',
    item_status: 'P',
    remark: '',
  };
}

export function RfqDocPage() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [rows] = useState(() => [...MOCK_RFQ_LIST]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('MW1');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [rfqDate, setRfqDate] = useState(REF_TODAY);
  const [validUntil, setValidUntil] = useState(() => addDays(REF_TODAY, 5));
  const [currency, setCurrency] = useState('TWD');
  const [remark, setRemark] = useState('');
  const [reasonS, setReasonS] = useState(true);
  const [reasonO, setReasonO] = useState(false);
  const [reasonN, setReasonN] = useState(false);
  const [lines, setLines] = useState<DocItemRow[]>(() => [newLine()]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const v = MOCK_VENDORS.find((x) => x.id === supplierId);
    if (v) {
      setContactName(v.contactName);
      setContactPhone(v.contactPhone);
    } else {
      setContactName('');
      setContactPhone('');
    }
  }, [supplierId]);

  const vendor = useMemo(() => MOCK_VENDORS.find((v) => v.id === supplierId), [supplierId]);

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
            <th className="w-[100px] px-2 py-2.5">詢價日期</th>
            <th className="min-w-0 px-2 py-2.5">廠商</th>
            <th className="w-14 px-2 py-2.5 text-right">料號數</th>
            <th className="w-14 px-2 py-2.5">幣別</th>
            <th className="w-[100px] px-2 py-2.5">有效期限</th>
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
                  setSupplierId(MOCK_VENDORS[0]?.id ?? '');
                  setRfqDate(r.rfq_date);
                  setValidUntil(r.valid_until);
                  setCurrency(r.currency);
                  setRemark('（自列表載入 DEMO）');
                  setLines([
                    {
                      id: '1',
                      part_no: 'VAG-1K0·129·620·A',
                      part_name: '空氣濾芯',
                      part_brand: 'MANN',
                      qty: r.item_count * 10,
                      unit_price: '',
                      lead_time_days: '',
                      item_status: 'P',
                      remark: '',
                    },
                  ]);
                  setView('detail');
                  setDirty(false);
                }}
              >
                <td className="px-2 py-2 font-mono text-xs font-medium">{r.doc_no}</td>
                <td className="px-2 py-2 tabular-nums text-muted-foreground">{r.rfq_date}</td>
                <td className="min-w-0 truncate px-2 py-2">{r.vendor_name}</td>
                <td className="px-2 py-2 text-right tabular-nums">{r.item_count}</td>
                <td className="px-2 py-2">{r.currency}</td>
                <td className={cx('px-2 py-2 tabular-nums', exp && 'font-medium text-red-600')}>{r.valid_until}</td>
                <td className="px-2 py-2">
                  <DocStatusBadge
                    status={r.status}
                    label={r.status === 'D' ? '草稿' : r.status === 'S' ? '已送出' : r.status === 'R' ? '已回覆' : r.status === 'C' ? '完成' : '作廢'}
                  />
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

  const mark = () => setDirty(true);

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
                狀態：<DocStatusBadge status="D" label="草稿" />
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
            <Label>詢價廠商 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                mark();
              }}
            >
              <option value="">請選擇…</option>
              {MOCK_VENDORS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}（{v.grade} 級）
                </option>
              ))}
            </select>
            {vendor ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">代理廠牌：{vendor.brands.join(' · ')}</p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label>入庫倉庫 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                mark();
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
            <Label>聯絡人</Label>
            <Input value={contactName} onChange={(e) => { setContactName(e.target.value); mark(); }} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>聯絡電話</Label>
            <Input value={contactPhone} onChange={(e) => { setContactPhone(e.target.value); mark(); }} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>詢價日期 *</Label>
            <Input
              type="date"
              value={rfqDate}
              onChange={(e) => {
                setRfqDate(e.target.value);
                setValidUntil(addDays(e.target.value, 5));
                mark();
              }}
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>有效期限</Label>
            <Input type="date" value={validUntil} onChange={(e) => { setValidUntil(e.target.value); mark(); }} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label>幣別 *</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                mark();
              }}
            >
              {MOCK_RFQ_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>詢價原因（多選）</Label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={reasonS} onChange={(e) => { setReasonS(e.target.checked); mark(); }} />
                S 庫存不足
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={reasonO} onChange={(e) => { setReasonO(e.target.checked); mark(); }} />
                O 客訂
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={reasonN} onChange={(e) => { setReasonN(e.target.checked); mark(); }} />
                N 新品
              </label>
            </div>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>備註</Label>
            <Input value={remark} onChange={(e) => { setRemark(e.target.value); mark(); }} className="h-9" />
          </div>
        </DocHeader>
      }
      itemToolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => mark()}>
            + 從需求單帶入
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              setLines((prev) => [...prev, newLine()]);
              mark();
            }}
          >
            + 手動新增
          </Button>
        </div>
      }
    >
      <DocItemTable
        columns={RF_ITEM_COLS}
        rows={lines}
        setRows={(u) => {
          mark();
          setLines(u);
        }}
        onAddRow={() => {
          setLines((prev) => [...prev, newLine()]);
          mark();
        }}
      />
    </DocDetailView>
  );

  const canSave = Boolean(supplierId && warehouseId && currency && rfqDate && lines.some((l) => Number(l.qty) > 0));

  return (
    <DocLayout
      title="詢價單"
      docCode="NX02-RFQ-UI-001-F01 · RF"
      view={view}
      onViewChange={setView}
      listView={listView}
      detailView={detailView}
      onNew={() => {
        setView('detail');
        setSupplierId('');
        setWarehouseId('MW1');
        setRfqDate(REF_TODAY);
        setValidUntil(addDays(REF_TODAY, 5));
        setCurrency('TWD');
        setRemark('');
        setLines([newLine()]);
        setDirty(false);
      }}
      onSave={() => setDirty(false)}
      onEdit={() => setView('detail')}
      onDelete={() => setView('list')}
      onCancel={() => {
        if (dirty) setView('list');
        else setView('list');
      }}
      canSave={canSave}
      canEdit
      canDelete
    />
  );
}
