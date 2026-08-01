// apps/nx-ui/src/app/preview/list/page.tsx
//
// 清單模板預覽。欄位照真實的銷貨單工作台（features/nx04/so/ui/SoWorkbench.tsx）抄，
// ⛔ 不憑空想欄位——模板刻得再漂亮，欄位對不上真實資料就要重做。
// 資料全部是假的、不呼叫任何 API。

'use client';

import { useState } from 'react';

import { ListTemplate, type ListColumn } from '@design/templates/ListTemplate';

type So = {
  docNo: string;
  status: '待撿貨' | '撿貨中' | '已出貨' | '已完成' | '已取消';
  createdAt: string;
  soDate: string;
  customerCode: string;
  customerName: string;
  createdByName: string;
  itemCount: number;
  subtotal: number;
  totalAmount: number;
  deliveryType: '自取' | '配送' | '寄貨';
};

const CUSTOMERS: [string, string][] = [
  ['C001', '大同汽材行'],
  ['C002', '正泰保養廠'],
  ['C003', '宏光車業'],
  ['C004', '台興零件'],
  ['C005', '順風汽車百貨'],
  ['C006', '永達汽材'],
];
const STATUS: So['status'][] = ['待撿貨', '撿貨中', '已出貨', '已完成', '已取消'];
const DELIVERY: So['deliveryType'][] = ['自取', '配送', '寄貨'];
const STAFF = ['王志明', '陳美玲', '林建宏', '張淑芬'];

const ROWS: So[] = Array.from({ length: 24 }, (_, i) => {
  const [code, name] = CUSTOMERS[i % CUSTOMERS.length];
  const subtotal = 3200 + i * 1470;
  return {
    docNo: `SO-2608-${String(i + 1).padStart(4, '0')}`,
    status: STATUS[i % STATUS.length],
    createdAt: `2026-07-${String(20 + (i % 10)).padStart(2, '0')}`,
    soDate: `2026-08-${String(1 + (i % 3)).padStart(2, '0')}`,
    customerCode: code,
    customerName: name,
    createdByName: STAFF[i % STAFF.length],
    itemCount: 2 + (i % 7),
    subtotal,
    totalAmount: Math.round(subtotal * 1.05),
    deliveryType: DELIVERY[i % DELIVERY.length],
  };
});

const money = (n: number) => n.toLocaleString('zh-TW');

/** 狀態用文字＋淡底，⛔ 不用純色點——色盲與長輩都要讀得懂，顏色只是輔助 */
function StatusTag({ s }: { s: So['status'] }) {
  const tone =
    s === '已取消'
      ? 'border-border bg-muted text-muted-foreground'
      : s === '已完成'
        ? 'border-border bg-accent text-foreground'
        : 'border-border bg-background text-foreground';
  return <span className={`rounded border px-2 py-0.5 text-[14px] ${tone}`}>{s}</span>;
}

const COLUMNS: ListColumn<So>[] = [
  { key: 'docNo', label: '單號', render: (r) => <span className="font-mono">{r.docNo}</span> },
  { key: 'status', label: '狀態', render: (r) => <StatusTag s={r.status} /> },
  { key: 'soDate', label: '銷貨日期', render: (r) => r.soDate },
  { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName },
  { key: 'itemCount', label: '項目數', align: 'right', render: (r) => r.itemCount },
  { key: 'totalAmount', label: '總金額', align: 'right', render: (r) => money(r.totalAmount) },
  { key: 'deliveryType', label: '交貨方式', render: (r) => r.deliveryType },
  // 以下三欄預設收起來：規格 §6 預設只留 6-8 欄，其餘進「欄位」面板
  { key: 'createdAt', label: '建單日期', defaultHidden: true, render: (r) => r.createdAt },
  { key: 'customerCode', label: '客戶編號', defaultHidden: true, render: (r) => <span className="font-mono">{r.customerCode}</span> },
  { key: 'subtotal', label: '未稅金額', defaultHidden: true, align: 'right', render: (r) => money(r.subtotal) },
];

export default function ListPreviewPage() {
  const [opened, setOpened] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-[14px] text-muted-foreground">
        Tab 進表格 → ↑↓ 選擇 → Enter 開啟。點「欄位」可調要顯示哪幾欄。
        {opened ? <span className="ml-3 text-foreground">已開啟：{opened}</span> : null}
      </div>

      <ListTemplate
        title="銷貨單"
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.docNo}
        onOpen={(r) => setOpened(`${r.docNo}／${r.customerName}`)}
        searchPlaceholder="單號／客戶／料號"
        footerText={`共 ${ROWS.length} 筆`}
        actions={
          <button
            type="button"
            className="h-9 rounded-md border border-border px-4 text-[15px] hover:bg-accent"
          >
            新增
          </button>
        }
      />
    </div>
  );
}
