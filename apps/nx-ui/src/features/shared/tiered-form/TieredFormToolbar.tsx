// apps/nx-ui/src/features/shared/tiered-form/TieredFormToolbar.tsx
// LITE 階段 1 M5：三層欄位模式切換工具列（toolbar）

'use client';

import { useTieredForm } from './TieredFormProvider';
import { MODE_LABEL_ZH, type TieredDisplayMode } from './types';

const MODES: TieredDisplayMode[] = ['lite', 'expanded', 'all'];

export type TieredFormToolbarProps = {
  className?: string;
  /** 隱藏 Alt+L 提示文字（密集 UI 用） */
  hideHotkeyHint?: boolean;
};

export function TieredFormToolbar({ className, hideHotkeyHint }: TieredFormToolbarProps) {
  const { mode, setMode } = useTieredForm();
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <span className="text-xs text-white/50">欄位顯示：</span>
      <div className="flex overflow-hidden rounded-lg border border-white/10">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              mode === m
                ? 'bg-white/20 px-2.5 py-1 text-xs text-white'
                : 'px-2.5 py-1 text-xs text-white/60 hover:bg-white/10'
            }
          >
            {MODE_LABEL_ZH[m]}
          </button>
        ))}
      </div>
      {!hideHotkeyHint && (
        <span className="text-xs text-white/30">Alt+L 切換</span>
      )}
    </div>
  );
}
