// apps/nx-ui/src/features/nx01/shell/entity-master/MasterTabs.tsx
// 主檔頁「資料瀏覽 / 詳細資料」切換（對齊 Hana demo .nx-pageswitch、軌 B1 樣式重整）
// - inline-flex pill 容器、gold tint 選中、kbd 顯示快捷
// - Alt+1 / Alt+2 由各頁自己的鍵盤 handler 觸發 onChange
'use client';

import { List, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@design/utils/cn';

export type MasterTab = 'list' | 'detail';

export function MasterTabs({ tab, onChange }: { tab: MasterTab; onChange: (t: MasterTab) => void }) {
  return (
    <div className="inline-flex gap-[3px] self-start rounded-[11px] border border-border/40 bg-background/40 p-[3px]">
      <TabBtn icon={List} label="資料瀏覽" hint="Alt+1" active={tab === 'list'} onClick={() => onChange('list')} />
      <TabBtn icon={FileText} label="詳細資料" hint="Alt+2" active={tab === 'detail'} onClick={() => onChange('detail')} />
    </div>
  );
}

function TabBtn({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-[34px] items-center gap-2 rounded-lg px-[15px] text-[13px] font-semibold transition',
        active
          ? 'bg-[#E8A020]/15 text-[#E8A020]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-[15px]" />
      {label}
      <kbd className="hidden rounded border border-current/30 px-1 font-mono text-[10px] opacity-70 sm:inline">
        {hint}
      </kbd>
    </button>
  );
}
