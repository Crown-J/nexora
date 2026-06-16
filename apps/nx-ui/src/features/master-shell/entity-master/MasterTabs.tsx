// apps/nx-ui/src/features/master-shell/entity-master/MasterTabs.tsx
/**
 * MasterTabs — 主檔頁「資料瀏覽 / 詳細資料」Tab 列（鋼鐵星球）
 *
 * 共用元件，確保所有 23 個主檔頁（EntityMasterPage + 使用者主檔）Tab 視覺完全一致。
 * Alt+1 / Alt+2 由各頁自己的鍵盤 handler 觸發 onChange。
 */
'use client';

import { List, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@design/utils/cn';

export type MasterTab = 'list' | 'detail';

export function MasterTabs({ tab, onChange }: { tab: MasterTab; onChange: (t: MasterTab) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-[#2A2A30] bg-[#0E0E12] px-2">
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
        'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
        active
          ? 'border-[#E8A020] text-[#E8A020]'
          : 'border-transparent text-[#888892] hover:text-[#E8E8EB]',
      )}
    >
      <Icon className="size-3.5" />
      {label}
      <span className="hidden text-[10px] text-[#5A5A60] sm:inline">{hint}</span>
    </button>
  );
}
