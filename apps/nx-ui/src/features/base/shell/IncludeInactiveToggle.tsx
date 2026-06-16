// apps/nx-ui/src/features/base/shell/IncludeInactiveToggle.tsx
/**
 * 主檔表格「包含已停用」Toggle（業界改革 #22 v1.2、Crown 拍板 Toggle 範式）
 *
 * 範式：取代既有 Dropdown「啟用 / 停用 / 全部」3 選 1：
 *   - 預設關（只顯示啟用）= 業務員 daily 主要場景
 *   - 打開（顯示啟用 + 停用）= 偶爾查停用記錄
 *
 * 對齊：
 * - GitHub / Linear / Notion SaaS Toggle 範式
 * - NEXORA dark theme + amber 主色（accent ring + 啟用態 amber bg）
 * - 業界改革 #22 v1.2「業務員 daily UX 減少操作」
 *
 * 用法：
 *   const { includeInactive, setIncludeInactive, isActiveFilter } = useIncludeInactive();
 *   <IncludeInactiveToggle value={includeInactive} onChange={setIncludeInactive} />
 *   // isActiveFilter = undefined（包含已停用）/ true（只啟用）
 *
 * 既有 'all' | 'active' | 'inactive' 三態收斂：
 *   - 'active' → includeInactive=false（預設）
 *   - 'all'    → includeInactive=true
 *   - 'inactive' → 不在本範式範圍（極少使用、可由 column filter 或 search 達成）
 */

'use client';

import { useCallback, useState } from 'react';
import { cn } from '@design/utils/cn';

export type IncludeInactiveToggleProps = {
  value: boolean;
  onChange: (next: boolean) => void;
  className?: string;
  /** label 文字（預設「包含已停用」、子主檔可換如「包含未生效」）*/
  label?: string;
};

/**
 * 「包含已停用」Toggle 元件。
 * - 視覺：amber accent / dark theme 對齊
 * - 點擊或鍵盤 Space / Enter 切換
 */
export function IncludeInactiveToggle({
  value,
  onChange,
  className,
  label = '包含已停用',
}: IncludeInactiveToggleProps) {
  const handleToggle = useCallback(() => onChange(!value), [value, onChange]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md border px-2.5 transition-colors',
        'text-xs tracking-wide select-none',
        value
          ? 'border-[#E8A020]/50 bg-[#E8A020]/12 text-foreground hover:bg-[#E8A020]/18'
          : 'border-border bg-card/55 text-muted-foreground hover:border-primary/30 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A020]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      title={value ? '當前：包含已停用（點擊只顯示啟用）' : '當前：只顯示啟用（點擊包含已停用）'}
    >
      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
          value ? 'bg-[#E8A020]' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform',
            value ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

/**
 * Toggle state hook（業界改革 #22 v1.2 共用 state 模型）。
 *
 * @returns
 *   - includeInactive：boolean（true=包含已停用、false=只顯示啟用）
 *   - setIncludeInactive：setter
 *   - isActiveFilter：傳給 API 的 isActive 參數（undefined=全部 / true=只啟用）
 */
export function useIncludeInactive(defaultValue = false) {
  const [includeInactive, setIncludeInactive] = useState(defaultValue);
  const isActiveFilter: boolean | undefined = includeInactive ? undefined : true;
  return { includeInactive, setIncludeInactive, isActiveFilter };
}
