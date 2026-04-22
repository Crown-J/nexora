// apps/nx-ui/src/features/purchase/ui/sop-workspace/components/Step1Requirements.tsx
/**
 * STEP 1：採購需求彙整
 * 系統主動列出三個分類的料號（庫存不足 / 客戶下單需求 / 廠商特價推薦），
 * 使用者勾選要採購的項目。至少勾 1 項才能進 STEP 2。
 *
 * SOP 內建亮點：新人不用判斷「要買什麼」、「要買多少」— 系統預先整理好。
 */

'use client';

import { useMemo } from 'react';
import { AlertTriangle, PackageX, ShoppingBag, Sparkles } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import { MOCK_REQUIREMENTS } from '../mock-data/scenario';
import type {
  RequirementGroupLabel,
  RequirementItem,
  ScenarioAction,
  ScenarioState,
} from '../types';
import { StepWrapper } from './StepWrapper';

type Step1Props = {
  state: ScenarioState;
  dispatch: (action: ScenarioAction) => void;
  onNext: () => void;
};

const GROUP_ORDER: RequirementGroupLabel[] = ['庫存不足', '客戶下單需求', '廠商特價推薦'];

const GROUP_VISUAL: Record<
  RequirementGroupLabel,
  { Icon: typeof PackageX; tone: string; badgeTone: string }
> = {
  庫存不足: {
    Icon: PackageX,
    tone: 'border-orange-400/40 bg-orange-500/5',
    badgeTone: 'bg-orange-500/20 text-orange-200',
  },
  客戶下單需求: {
    Icon: ShoppingBag,
    tone: 'border-sky-400/40 bg-sky-500/5',
    badgeTone: 'bg-sky-500/20 text-sky-200',
  },
  廠商特價推薦: {
    Icon: Sparkles,
    tone: 'border-[#E8A020]/40 bg-[#E8A020]/5',
    badgeTone: 'bg-[#E8A020]/20 text-[#E8A020]',
  },
};

export function Step1Requirements({ state, dispatch, onNext }: Step1Props) {
  const groups = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: MOCK_REQUIREMENTS.filter((r) => r.group === group),
    }));
  }, []);

  const selectedCount = state.selectedSkus.length;
  const canProceed = selectedCount > 0;

  return (
    <StepWrapper
      canProceed={canProceed}
      onNext={onNext}
      nextLabel={canProceed ? `下一步 → 已選 ${selectedCount} 項` : '請至少選 1 項'}
      disabledHint="請至少選 1 項需求"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-xl border border-[#E8A020]/30 bg-[#E8A020]/5 px-3 py-2 text-xs text-[#E8A020]">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>系統已自動盤點，建議新人先從這三類開始採購</span>
        </div>

        {groups.map(({ group, items }) =>
          items.length === 0 ? null : (
            <RequirementGroup
              key={group}
              group={group}
              items={items}
              selectedSet={state.selectedSkus}
              onToggle={(sku) => dispatch({ type: 'TOGGLE_REQUIREMENT', sku })}
              onSelectAll={(skus) => dispatch({ type: 'SET_SELECTED_SKUS', skus: mergeUnique(state.selectedSkus, skus) })}
              onDeselectAll={(skus) =>
                dispatch({
                  type: 'SET_SELECTED_SKUS',
                  skus: state.selectedSkus.filter((s) => !skus.includes(s)),
                })
              }
            />
          ),
        )}
      </div>
    </StepWrapper>
  );
}

function mergeUnique(a: readonly string[], b: readonly string[]): string[] {
  const set = new Set(a);
  b.forEach((x) => set.add(x));
  return Array.from(set);
}

function RequirementGroup({
  group,
  items,
  selectedSet,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  group: RequirementGroupLabel;
  items: RequirementItem[];
  selectedSet: string[];
  onToggle: (sku: string) => void;
  onSelectAll: (skus: string[]) => void;
  onDeselectAll: (skus: string[]) => void;
}) {
  const visual = GROUP_VISUAL[group];
  const Icon = visual.Icon;
  const groupSkus = items.map((i) => i.sku);
  const allSelected = groupSkus.every((s) => selectedSet.includes(s));

  return (
    <section className={cx('rounded-xl border', visual.tone)}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cx('flex h-7 w-7 items-center justify-center rounded-lg', visual.badgeTone)}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">{group}</span>
          <span className="text-[11px] text-white/50 tabular-nums">（{items.length} 項）</span>
        </div>
        <button
          type="button"
          onClick={() => (allSelected ? onDeselectAll(groupSkus) : onSelectAll(groupSkus))}
          className="text-[11px] text-white/60 underline underline-offset-2 transition-colors hover:text-white/90"
        >
          {allSelected ? '全部取消' : '全選'}
        </button>
      </header>

      <ul className="divide-y divide-white/5">
        {items.map((item) => {
          const isSelected = selectedSet.includes(item.sku);
          return (
            <li key={item.sku}>
              <button
                type="button"
                onClick={() => onToggle(item.sku)}
                aria-pressed={isSelected}
                className={cx(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                  'active:bg-white/5',
                  isSelected && 'bg-white/[0.03]',
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                    isSelected
                      ? 'border-[#E8A020] bg-[#E8A020]'
                      : 'border-white/30 bg-transparent',
                  )}
                >
                  {isSelected ? <span className="text-[13px] font-bold text-black leading-none">✓</span> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-white/60">{item.sku}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium text-white/90">{item.name}</div>
                  <RequirementMeta item={item} />
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">建議補</div>
                  <div className="tabular-nums text-base font-semibold text-[#E8A020]">
                    {item.suggested}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RequirementMeta({ item }: { item: RequirementItem }) {
  if (item.group === '庫存不足') {
    const short = (item.safetyStock ?? 0) - (item.currentStock ?? 0);
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
        <span>
          目前 <span className="tabular-nums text-white/80">{item.currentStock}</span>
          <span className="mx-1 text-white/40">/</span>
          安全 <span className="tabular-nums text-white/80">{item.safetyStock}</span>
        </span>
        {short > 0 ? (
          <span className="inline-flex items-center gap-1 text-orange-300">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            缺 {short}
          </span>
        ) : null}
      </div>
    );
  }
  if (item.group === '客戶下單需求') {
    return (
      <div className="mt-1 text-xs text-white/60">
        <span className="text-sky-200">{item.customerName}</span>
      </div>
    );
  }
  if (item.group === '廠商特價推薦') {
    return (
      <div className="mt-1 text-xs text-[#E8A020]/90">{item.recommendNote}</div>
    );
  }
  return null;
}
