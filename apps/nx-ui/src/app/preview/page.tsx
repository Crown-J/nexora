// apps/nx-ui/src/app/preview/page.tsx
// 設計預覽區索引：模板清單與進度。做一支就在這裡加一列。

import Link from 'next/link';

type Entry = {
  href?: string;
  name: string;
  desc: string;
  status: '完成' | '進行中' | '待做';
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
  { name: '單據模板', desc: '八張單共用：表頭＋單身表格＋合計', status: '待做' },
  { name: '精靈／流程模板', desc: '多步驟一頁式；⛔ 不用彈跳視窗', status: '待做' },
  { name: '主檔編輯模板', desc: '25 個主檔共用；現有三套要收斂成一套', status: '待做' },
  { name: '工作檯卡片', desc: '九個角色的首頁區塊', status: '待做' },
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
