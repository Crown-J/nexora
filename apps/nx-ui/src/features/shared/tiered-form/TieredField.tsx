// apps/nx-ui/src/features/shared/tiered-form/TieredField.tsx
// LITE 階段 1 M5：三層欄位 wrap、自動處理顯示/摺疊/隱藏

'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTieredFormSafe } from './TieredFormProvider';
import { TIER_ICON, TIER_LABEL_ZH, type FieldTier } from './types';

export type TieredFieldProps = {
  tier: FieldTier;
  label: string;
  /** 為何「建議」或「進階」（給 hint 提示、recommended/advanced 才會顯示） */
  hint?: string;
  /** 欄位內容（input / select / textarea / ...） */
  children: ReactNode;
  /** 跨欄寬度（grid-col-span） */
  className?: string;
};

/**
 * 自動處理顯示邏輯（依 TieredFormProvider mode）：
 *   - required：永遠顯示、🟢 icon
 *   - recommended：
 *       mode=lite 摺疊（顯示「🟡 label（建議填、點開）」、點開展示 children）
 *       mode=expanded/all 展開、🟡 icon
 *   - advanced：
 *       mode=lite/expanded 隱藏（return null）
 *       mode=all 顯示、⚪ icon
 *
 * 若沒包在 TieredFormProvider 內、fallback 顯示「展開模式」（不破壞）。
 */
export function TieredField({ tier, label, hint, children, className }: TieredFieldProps) {
  const ctx = useTieredFormSafe();
  const [localExpanded, setLocalExpanded] = useState(false);

  // fallback：沒 Provider 時當作 'expanded' mode
  const mode = ctx?.mode ?? 'expanded';

  // advanced + 非 all → 隱藏
  if (tier === 'advanced' && mode !== 'all') return null;

  // recommended + lite + 未本地展開 → 摺疊
  const recommendedCollapsed = tier === 'recommended' && mode === 'lite' && !localExpanded;
  if (recommendedCollapsed) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setLocalExpanded(true)}
          className="inline-flex items-center gap-1 rounded border border-dashed border-amber-500/30 px-2 py-1 text-xs text-amber-300/80 hover:border-amber-500/60 hover:bg-amber-500/10"
        >
          <span>{TIER_ICON.recommended}</span>
          <span>{label}</span>
          <span className="text-amber-400/60">（建議填、點開）</span>
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1 text-sm text-white/80">
        <span title={TIER_LABEL_ZH[tier]}>{TIER_ICON[tier]}</span>
        <span>{label}</span>
        {hint && (tier === 'recommended' || tier === 'advanced') && (
          <span className="text-xs text-white/40">（{hint}）</span>
        )}
      </div>
      {children}
    </div>
  );
}
