// apps/nx-ui/src/design/templates/WizardTemplate.tsx
//
// 精靈／流程模板（v3.0.0 模板軌 第 3 支）
// 規格：docs/專案/介面規格/NEXORA-介面架構-v3.0.0.md v1.1 §2.1 §6 §7
//
// ⭐ 這支是規格 §2.1「一頁式取代彈跳視窗」真正落地的地方：
//    多步驟流程在頁面上依序走完，⛔ 不是彈窗裡切步驟。
//    長輩對「我現在在第幾層」最沒把握，一頁式讓層級永遠只有一層。
//
// 鍵盤（沿用既有即時銷售精靈的範式）：
//   · Alt + 1~9   直接跳到第 N 步
//   · Alt + ← →   上一步／下一步
//   ⚠️ 跳步刻意不檢查守門——使用者常常要回頭改前面、或先跳去看後面。
//      真正的把關在「完成」那一下，呼叫端務必在 onFinish 再驗一次。
//
// ⚠️ 受控元件：目前第幾步由呼叫端管（每一步的資料與驗證都在呼叫端）。

'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';

export type WizardStep = {
  key: string;
  label: string;
  content: React.ReactNode;
  /**
   * 擋住「下一步」的理由；有值＝不給按，並把理由顯示出來。
   * ⛔ 不要只用 true/false——使用者被擋住時要知道為什麼，否則只會覺得系統壞了。
   */
  blocked?: string;
};

export type WizardTemplateProps = {
  title: string;
  steps: WizardStep[];
  current: number;
  onStepChange: (index: number) => void;
  onFinish: () => void;
  onCancel: () => void;
  finishLabel?: string;
};

export function WizardTemplate({
  title,
  steps,
  current,
  onStepChange,
  onFinish,
  onCancel,
  finishLabel = '完成',
}: WizardTemplateProps) {
  const step = steps[current];
  const isLast = current === steps.length - 1;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (current < steps.length - 1) onStepChange(current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (current > 0) onStepChange(current - 1);
      } else if (e.key >= '1' && e.key <= '9') {
        const i = Number(e.key) - 1;
        if (i < steps.length) {
          e.preventDefault();
          onStepChange(i);
        }
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [current, steps.length, onStepChange]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="text-lg">{title}</h1>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto h-9 rounded-md border border-border px-4 text-[15px] hover:bg-accent"
        >
          取消
        </button>
      </div>

      {/* 步驟列：永遠看得到自己在哪、還有幾步。已走過的可以點回去 */}
      <ol className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onStepChange(i)}
                aria-current={active ? 'step' : undefined}
                className={[
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-[15px]',
                  active
                    ? 'border border-border bg-card text-foreground'
                    : 'border border-transparent text-muted-foreground hover:bg-accent',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid h-6 w-6 place-items-center rounded-full border text-[14px]',
                    active ? 'border-primary text-primary' : 'border-border',
                  ].join(' ')}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      {/* 內容：一頁式，⛔ 不開彈窗 */}
      <div className="min-h-0 flex-1 overflow-auto p-4">{step?.content}</div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
        <span className="text-[14px] text-muted-foreground">
          Alt+← → 上下步 · Alt+1~9 直接跳
        </span>

        {/* 被擋住時把理由講出來，⛔ 不要只是讓按鈕變灰 */}
        {step?.blocked ? (
          <span className="text-[15px] text-destructive">{step.blocked}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStepChange(current - 1)}
            disabled={current === 0}
            className="h-9 rounded-md border border-border px-4 text-[15px] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => (isLast ? onFinish() : onStepChange(current + 1))}
            disabled={!!step?.blocked}
            className="h-9 rounded-md border border-border bg-card px-5 text-[15px] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? finishLabel : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
