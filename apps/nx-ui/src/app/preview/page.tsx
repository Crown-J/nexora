// apps/nx-ui/src/app/preview/page.tsx
// 設計預覽區索引：模板清單與進度。做一支就在這裡加一列。

import Link from 'next/link';

type Entry = {
  href?: string;
  name: string;
  desc: string;
  status: '完成' | '進行中' | '待做' | '不做';
};

const ENTRIES: Entry[] = [
  {
    href: '/preview/nine-grid',
    name: '九宮格導覽',
    desc: '角色 → 功能 → 子功能三層，數字鍵盤排列',
    status: '完成',
  },
  {
    href: '/preview/list',
    name: '清單／查詢模板',
    desc: '主檔列表・單據列表・報表共用；↑↓ Enter 純鍵盤、欄位可收合',
    status: '完成',
  },
  {
    href: '/preview/doc',
    name: '單據模板',
    desc: '八張單共用：單頭＋單身＋合計；Tab 跳格、最後一格 Tab 自動新增列',
    status: '完成',
  },
  {
    href: '/preview/flow',
    name: '流程模板',
    desc: '一頁到底、Alt+數字捲到對應區、滾輪自由移動；⛔ 不用彈跳視窗、⛔ 不做分步鎖定',
    status: '完成',
  },
  {
    href: '/preview/workbench',
    name: '工作檯模板',
    desc: '九個角色的首頁：搜尋框永遠聚焦＋三塊大數字；⛔ 不放圖表',
    status: '完成',
  },
  {
    href: '/preview/components',
    name: '基礎元件',
    desc: '按鈕／輸入框／標籤；每頁都會用到，字級改一次全站生效',
    status: '完成',
  },
  {
    href: '/preview/master-table',
    name: '全站共用表格（MasterTable）',
    desc: '⭐ 單據列表 16 頁＋主檔列表 24 頁都用它；階段 4 已套字級規範',
    status: '完成',
  },
  {
    name: '主檔編輯模板',
    desc: '⛔ 不做新的——EntityMasterPage 已是 config-driven 且符合一頁式，24 個主檔在用；改視覺屬階段 4',
    status: '不做',
  },
];

export default function PreviewIndexPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl">模板</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md
      </p>

      <div className="mt-6 max-w-3xl divide-y divide-border rounded-lg border border-border">
        {ENTRIES.map((e) => {
          const row = (
            <div className="flex items-center gap-4 px-4 py-3">
              <span className="flex-1">
                <span className="block text-lg">{e.name}</span>
                <span className="block text-[14px] text-muted-foreground">{e.desc}</span>
              </span>
              <span
                className={[
                  'shrink-0 rounded-md border px-2 py-1 text-[14px]',
                  e.status === '完成'
                    ? 'border-border text-foreground'
                    : 'border-border/60 text-muted-foreground',
                ].join(' ')}
              >
                {e.status}
              </span>
            </div>
          );
          return e.href ? (
            <Link key={e.name} href={e.href} className="block hover:bg-accent">
              {row}
            </Link>
          ) : (
            <div key={e.name} className="opacity-60">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
