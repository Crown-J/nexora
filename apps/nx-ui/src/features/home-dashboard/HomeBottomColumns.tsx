// apps/nx-ui/src/features/home-dashboard/HomeBottomColumns.tsx
// 首頁儀表板下方：三欄等寬（任務清單 / 行事曆 / 事件簿）
//
// 段 A 範圍：純殼層、三欄 placeholder（接資料前的空狀態）
// 段 D 範圍：左欄接 nx98/task-pool / 中欄行事曆 UI（資料源 STOP）/ 右欄事件簿
//
// 設計語言：同 HomeMetricsRow

'use client';

import { CalendarDays, ClipboardList, FileText } from 'lucide-react';

export function HomeBottomColumns() {
  return (
    <section className="grid grid-1 grid-cols-1 gap-3 lg:grid-cols-3">
      <BottomColumn
        Icon={ClipboardList}
        title="任務清單"
        hint="跨模組待辦彙整、緊急標 + 模組標 + 逾期提示（段 D 接 task-pool）"
      />
      <BottomColumn
        Icon={CalendarDays}
        title="行事曆"
        hint="月曆 + 點日期查事件（段 D 接、資料源待總經理定）"
      />
      <BottomColumn
        Icon={FileText}
        title="事件簿"
        hint="行事曆選取日期當天事件清單（段 D 接、連動行事曆）"
      />
    </section>
  );
}

function BottomColumn({
  Icon,
  title,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  hint: string;
}) {
  return (
    <div
      className={[
        'flex min-h-[280px] flex-col gap-3',
        'rounded-xl border border-zinc-800 bg-[#11111A]/70 backdrop-blur-sm p-4',
      ].join(' ')}
    >
      <header className="flex items-center gap-2 border-b border-zinc-900 pb-2">
        <Icon className="size-4 text-zinc-400" strokeWidth={1.5} />
        <h3 className="text-sm font-medium tracking-wide text-zinc-100">{title}</h3>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <span className="text-[11px] leading-relaxed text-zinc-600">{hint}</span>
      </div>
    </div>
  );
}
