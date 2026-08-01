// apps/nx-ui/src/app/preview/workbench/page.tsx
//
// 工作檯模板預覽：業務角色的版本（規格 §3.3 的三塊）。
// 不同角色的三塊內容不同——倉管是待驗收／待撿貨／待盤點，會計是待對帳／待收款／待關帳。
// 資料全部是假的、不呼叫任何 API。

'use client';

import { useState } from 'react';

import { WorkbenchTemplate, type WorkbenchCard } from '@design/templates/WorkbenchTemplate';

export default function WorkbenchPreviewPage() {
  const [last, setLast] = useState<string | null>(null);

  const cards: WorkbenchCard[] = [
    {
      key: 'today',
      title: '今天要處理',
      items: [
        { key: 'ship', label: '待出貨', count: 12, onClick: () => setLast('待出貨清單') },
        { key: 'receive', label: '待收款', count: 5, onClick: () => setLast('待收款清單') },
        { key: 'stuck', label: '缺貨卡住', count: 3, tone: 'warn', onClick: () => setLast('缺貨卡住清單') },
      ],
    },
    {
      key: 'follow',
      title: '要追蹤的客戶',
      items: [
        { key: 'qt-expire', label: '報價過期', count: 3, tone: 'warn', onClick: () => setLast('報價過期清單') },
        { key: 'idle', label: '久未下單', count: 8, onClick: () => setLast('久未下單清單') },
        { key: 'visit', label: '生日／回訪', count: 2, onClick: () => setLast('回訪清單') },
      ],
    },
    {
      key: 'todo',
      title: '我的待辦',
      items: [
        { key: 'approval', label: '待簽核', count: 2, onClick: () => setLast('待簽核清單') },
        { key: 'issue', label: '異常回報', count: 1, tone: 'warn', onClick: () => setLast('異常回報清單') },
      ],
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-[14px] text-muted-foreground">
        進頁面游標就在搜尋框，可以直接打料號。點任何一個數字都會進對應清單。
        {last ? <span className="ml-3 text-foreground">已開啟：{last}</span> : null}
      </div>
      <WorkbenchTemplate
        greeting="早安，王志明（銷售作業）"
        cards={cards}
        onSearch={(q) => setLast(`查詢：${q || '（空白）'}`)}
      />
    </div>
  );
}
