// apps/nx-ui/src/app/preview/master-table/page.tsx
//
// MasterTable 預覽（v3.0.0 階段 4 第一批）
//
// ⭐ 這張表是全站最大的槓桿：單據列表（16 頁，經 DocWorkbench）
//    與主檔列表（24 頁，經 EntityMasterPage）都共用它，改一次四十頁到位。
//    所以它值得有一個免登入的驗證頁——以後動它都能先在這裡看。
//
// 欄位照真實的銷貨單工作台抄。資料是假的、不呼叫任何 API。

'use client';

import { useState } from 'react';

import { ErpToolbar } from '@/features/nx01/shell/ui/ErpToolbar';
import { MasterTable, type MasterTableColumn } from '@/features/nx01/shell/ui/MasterTable';

type So = {
  id: string;
  docNo: string;
  status: string;
  soDate: string;
  customerName: string;
  createdByName: string;
  itemCount: number;
  totalAmount: number;
  deliveryType: string;
};

const STATUS = ['待撿貨', '撿貨中', '已出貨', '已完成', '已取消'];
const CUSTOMERS = ['大同汽材行', '正泰保養廠', '宏光車業', '台興零件', '順風汽車百貨'];
const STAFF = ['王志明', '陳美玲', '林建宏', '張淑芬'];

const ROWS: So[] = Array.from({ length: 18 }, (_, i) => ({
  id: `id-${i}`,
  docNo: `SO-2608-${String(i + 1).padStart(4, '0')}`,
  status: STATUS[i % STATUS.length],
  soDate: `2026-08-${String(1 + (i % 3)).padStart(2, '0')}`,
  customerName: CUSTOMERS[i % CUSTOMERS.length],
  createdByName: STAFF[i % STAFF.length],
  itemCount: 2 + (i % 7),
  totalAmount: Math.round((3200 + i * 1470) * 1.05),
  deliveryType: ['自取', '配送', '寄貨'][i % 3],
}));

const COLUMNS: MasterTableColumn<So>[] = [
  { key: 'docNo', label: '單號', sortable: true, render: (r) => <span className="font-mono">{r.docNo}</span> },
  { key: 'status', label: '狀態', render: (r) => r.status },
  { key: 'soDate', label: '銷貨日期', sortable: true, render: (r) => r.soDate },
  { key: 'customerName', label: '客戶名稱', render: (r) => r.customerName },
  { key: 'createdByName', label: '建單人員', render: (r) => r.createdByName },
  { key: 'itemCount', label: '項目數', render: (r) => <span className="tabular-nums">{r.itemCount}</span> },
  {
    key: 'totalAmount',
    label: '總金額',
    sortable: true,
    render: (r) => <span className="tabular-nums">{r.totalAmount.toLocaleString('zh-TW')}</span>,
  },
  { key: 'deliveryType', label: '交貨方式', render: (r) => r.deliveryType },
];

export default function MasterTablePreviewPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-[14px] text-muted-foreground">
        全站共用表格（單據 16 頁＋主檔 24 頁）。點一列後可用 ↑↓ 切換、Enter 開啟、Home/End 首末列。
        {opened ? <span className="ml-3 text-foreground">已開啟：{opened}</span> : null}
      </div>

      {/* 工具列也是 25 個頁面共用的，跟表格擺在一起才看得出實際比例 */}
      <ErpToolbar
        mode="browse"
        hasActiveRow={!!selected}
        selectedRowActive
        selectionMode={false}
        onToggleSelection={() => {}}
        selectedCount={0}
        itemIndex={selected ? ROWS.findIndex((r) => r.id === selected) + 1 : 0}
        itemTotal={ROWS.length}
        onCreate={() => setOpened('新增')}
        onEdit={() => setOpened('編輯')}
        onSearch={() => setOpened('查詢')}
        onDelete={() => setOpened('刪除')}
        onRefresh={() => setOpened('重新整理')}
        onExport={() => setOpened('匯出')}
        onSave={() => setOpened('存檔')}
        onCancel={() => setOpened('取消')}
      />

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <MasterTable<So>
          columns={COLUMNS}
          rows={ROWS}
          getRowId={(r) => r.id}
          selectedId={selected}
          onSelect={setSelected}
          onOpenDetail={(id) => setOpened(ROWS.find((r) => r.id === id)?.docNo ?? id)}
          selectionMode={false}
          checked={checked}
          setChecked={setChecked}
          hideSerial
          totalCount={ROWS.length}
        />
      </div>
    </div>
  );
}
