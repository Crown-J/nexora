// apps/nx-ui/src/app/preview/doc/page.tsx
//
// 單據模板預覽（銷貨單）。
// 單身欄位照真實單據抄：料號／品名／數量／單價／金額（三張單一致），另加備註。
// 計算（金額＝數量×單價、稅 5%）寫在這頁而不是模板裡——
// 折扣、稅、贈品規則每張單不同，寫進模板就等於焊死。
// 資料全部是假的、不呼叫任何 API。

'use client';

import { useMemo, useState } from 'react';

import { DocTemplate, type DocItemColumn } from '@design/templates/DocTemplate';

/** 假的料號對照：打料號自動帶品名（真實系統走 API） */
const PARTS: Record<string, string> = {
  '03L131512DS': 'EGR 冷卻器',
  '1K0199855BJ': '引擎腳（右）',
  '5Q0615301F': '煞車碟盤（前）',
  '06K115562': '機油芯',
  '1J0129620': '空氣芯',
};

type Row = Record<string, string>;

const COLUMNS: DocItemColumn[] = [
  { key: 'partNo', label: '料號', kind: 'text', widthClass: 'w-44' },
  { key: 'partName', label: '品名', kind: 'readonly' },
  { key: 'qty', label: '數量', kind: 'number', widthClass: 'w-24', align: 'right' },
  { key: 'unitPrice', label: '單價', kind: 'number', widthClass: 'w-28', align: 'right' },
  { key: 'amount', label: '金額', kind: 'readonly', widthClass: 'w-32', align: 'right' },
  { key: 'remark', label: '備註', kind: 'text', widthClass: 'w-48' },
];

const EMPTY: Row = { partNo: '', partName: '', qty: '', unitPrice: '', amount: '', remark: '' };

const money = (n: number) => n.toLocaleString('zh-TW');

export default function DocPreviewPage() {
  const [customer, setCustomer] = useState('大同汽材行');
  const [soDate, setSoDate] = useState('2026-08-01');
  const [staff, setStaff] = useState('王志明');
  const [delivery, setDelivery] = useState('配送');
  const [rows, setRows] = useState<Row[]>([
    { partNo: '03L131512DS', partName: 'EGR 冷卻器', qty: '2', unitPrice: '3850', amount: '7,700', remark: '' },
    { partNo: '06K115562', partName: '機油芯', qty: '10', unitPrice: '180', amount: '1,800', remark: '急件' },
    { ...EMPTY },
  ]);

  function change(i: number, key: string, value: string) {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const row = next[i];
      row[key] = value;
      // 打料號 → 自動帶品名（真實系統走 API 查零件主檔）
      if (key === 'partNo') row.partName = PARTS[value.replace(/\s/g, '')] ?? '';
      // 數量或單價變了 → 重算金額
      if (key === 'qty' || key === 'unitPrice' || key === 'partNo') {
        const q = Number(row.qty) || 0;
        const p = Number(row.unitPrice) || 0;
        row.amount = q && p ? money(q * p) : '';
      }
      return next;
    });
  }

  const totals = useMemo(() => {
    const subtotal = rows.reduce(
      (s, r) => s + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0),
      0,
    );
    const tax = Math.round(subtotal * 0.05);
    return [
      { label: '小計', value: money(subtotal) },
      { label: '稅額', value: money(tax) },
      { label: '總計', value: money(subtotal + tax) },
    ];
  }, [rows]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-[14px] text-muted-foreground">
        試試看：在最後一列的「備註」按 Tab，會自動新增一列並跳過去。料號可打
        03L131512DS、1K0199855BJ、5Q0615301F、06K115562、1J0129620。
      </div>

      <DocTemplate
        title="銷貨單"
        docNo="SO-2608-0001"
        status="草稿"
        header={[
          { label: '客戶', value: customer, onChange: setCustomer, widthClass: 'w-52' },
          { label: '銷貨日期', value: soDate, onChange: setSoDate, widthClass: 'w-36' },
          { label: '業務員', value: staff, onChange: setStaff, widthClass: 'w-32' },
          { label: '交貨方式', value: delivery, onChange: setDelivery, widthClass: 'w-32' },
        ]}
        columns={COLUMNS}
        rows={rows}
        onCellChange={change}
        onAddRow={() => setRows((prev) => [...prev, { ...EMPTY }])}
        onDeleteRow={(i) => setRows((prev) => prev.filter((_, x) => x !== i))}
        totals={totals}
        actions={
          <>
            <button
              type="button"
              className="h-9 rounded-md border border-border px-4 text-[15px] hover:bg-accent"
            >
              存檔
            </button>
            <button
              type="button"
              className="h-9 rounded-md border border-border px-4 text-[15px] hover:bg-accent"
            >
              作廢
            </button>
          </>
        }
      />
    </div>
  );
}
