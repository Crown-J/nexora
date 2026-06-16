// apps/nx-ui/src/shared/ui/filter-bar/FilterBar.tsx
/**
 * NEXORA FilterBar 受控元件（業界改革 #24 v1 MVP）
 *
 * 結構：
 *   [+ 篩選 ▾]  [chip 1 ×]  [chip 2 ×]  [全清]
 *
 * AddFilterTrigger：button + Portal popover、3-step flow：
 *   Step 1 選欄位 → Step 2 選 operator → Step 3 填 value → onAdd → 關
 *
 * 設計範式：
 * - Portal + fixed position（對齊 commit 14 NexoraBottomDock、commit 17 col-picker）
 * - 避免 backdrop-filter ancestor 影響 fixed positioning
 * - 受控元件（parent 持有 rules state）
 *
 * MVP 簡化：
 * - chip 點 x 即移除（無 edit popover、重 add 即可）
 * - 不支援 OR 邏輯（全 AND）
 * - 不支援 date / number / between（V2 後續軌補）
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Filter, X } from 'lucide-react';

import { Button } from '@design/primitives/button';
import { cn } from '@design/utils/cn';

import {
  defaultOperatorsForType,
  formatRuleChip,
  genRuleId,
  operatorNeedsValue,
  OPERATOR_LABEL,
  type FilterBarProps,
  type FilterFieldDef,
  type FilterOperator,
  type FilterRule,
} from './types';

export function FilterBar({
  fields,
  rules,
  onChange,
  addLabel = '篩選',
  className,
}: FilterBarProps) {
  const handleAdd = useCallback(
    (rule: FilterRule) => {
      onChange([...rules, rule]);
    },
    [rules, onChange],
  );
  const handleRemove = useCallback(
    (id: string) => {
      onChange(rules.filter((r) => r.id !== id));
    },
    [rules, onChange],
  );

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}>
      <AddFilterTrigger fields={fields} onAdd={handleAdd} addLabel={addLabel} />

      {rules.map((rule) => {
        const field = fields.find((f) => f.key === rule.fieldKey);
        if (!field) return null;
        return (
          <FilterChip
            key={rule.id}
            rule={rule}
            field={field}
            onRemove={() => handleRemove(rule.id)}
          />
        );
      })}

      {rules.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => onChange([])}
        >
          全清
        </Button>
      ) : null}
    </div>
  );
}

/** 規則 chip（顯示文字 + 移除 button） */
function FilterChip({
  rule,
  field,
  onRemove,
}: {
  rule: FilterRule;
  field: FilterFieldDef;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2',
        'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]',
        'text-xs',
      )}
    >
      <span className="max-w-[16rem] truncate" title={formatRuleChip(rule, field)}>
        {formatRuleChip(rule, field)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`移除規則：${formatRuleChip(rule, field)}`}
        className="rounded p-0.5 transition-colors hover:bg-[#E8A020]/20"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

/** + 篩選 button + Portal popover（3-step flow） */
function AddFilterTrigger({
  fields,
  onAdd,
  addLabel,
}: {
  fields: FilterFieldDef[];
  onAdd: (rule: FilterRule) => void;
  addLabel: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Step state
  const [step, setStep] = useState<'field' | 'operator' | 'value'>('field');
  const [draftField, setDraftField] = useState<FilterFieldDef | null>(null);
  const [draftOp, setDraftOp] = useState<FilterOperator | null>(null);

  const reset = useCallback(() => {
    setStep('field');
    setDraftField(null);
    setDraftOp(null);
  }, []);

  const openPopover = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });
    reset();
    setOpen(true);
  }, [reset]);

  const closePopover = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      closePopover();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, closePopover]);

  // Step 1 → Step 2
  const selectField = (field: FilterFieldDef) => {
    setDraftField(field);
    setStep('operator');
  };

  // Step 2 → Step 3
  const selectOperator = (op: FilterOperator) => {
    setDraftOp(op);
    if (!operatorNeedsValue(op)) {
      // is-empty / is-not-empty 不需要 value、直接 commit
      commitRule(op, null);
      return;
    }
    setStep('value');
  };

  // Step 3 → commit
  const commitRule = (op: FilterOperator, value: FilterRule['value']) => {
    if (!draftField) return;
    onAdd({
      id: genRuleId(),
      fieldKey: draftField.key,
      operator: op,
      value,
    });
    closePopover();
  };

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={() => (open ? closePopover() : openPopover())}
        aria-expanded={open}
        aria-label={`新增${addLabel}規則`}
      >
        <Filter className="size-3.5" aria-hidden />
        {addLabel}
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </Button>

      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left }}
              className={cn(
                'fixed z-[200] w-[min(100vw-2rem,280px)] rounded-xl border border-border',
                'bg-popover p-2 text-popover-foreground shadow-lg',
              )}
            >
              {step === 'field' ? (
                <FieldStep fields={fields} onSelect={selectField} />
              ) : null}
              {step === 'operator' && draftField ? (
                <OperatorStep
                  field={draftField}
                  onBack={() => setStep('field')}
                  onSelect={selectOperator}
                />
              ) : null}
              {step === 'value' && draftField && draftOp ? (
                <ValueStep
                  field={draftField}
                  operator={draftOp}
                  onBack={() => setStep('operator')}
                  onCommit={(v) => commitRule(draftOp, v)}
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Step 1：選欄位 */
function FieldStep({
  fields,
  onSelect,
}: {
  fields: FilterFieldDef[];
  onSelect: (field: FilterFieldDef) => void;
}) {
  return (
    <>
      <div className="px-1.5 py-1 text-[11px] font-medium text-muted-foreground">選擇欄位</div>
      <ul className="max-h-64 space-y-0.5 overflow-y-auto">
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => onSelect(f)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                  'hover:bg-accent hover:text-accent-foreground transition-colors',
                )}
              >
                {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
                <span className="flex-1 truncate">{f.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Step 2：選 operator */
function OperatorStep({
  field,
  onBack,
  onSelect,
}: {
  field: FilterFieldDef;
  onBack: () => void;
  onSelect: (op: FilterOperator) => void;
}) {
  const ops = field.allowedOperators ?? defaultOperatorsForType(field.type);
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] text-muted-foreground hover:text-foreground"
      >
        ← 返回
      </button>
      <div className="px-1.5 py-1 text-[11px] font-medium text-muted-foreground">
        {field.label} · 條件
      </div>
      <ul className="space-y-0.5">
        {ops.map((op) => (
          <li key={op}>
            <button
              type="button"
              onClick={() => onSelect(op)}
              className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {OPERATOR_LABEL[op]}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Step 3：填 value（依 field type 顯示不同 input） */
function ValueStep({
  field,
  operator,
  onBack,
  onCommit,
}: {
  field: FilterFieldDef;
  operator: FilterOperator;
  onBack: () => void;
  onCommit: (value: FilterRule['value']) => void;
}) {
  const [textValue, setTextValue] = useState('');
  const [boolValue, setBoolValue] = useState<boolean>(true);
  const [singleSel, setSingleSel] = useState<string>('');
  const [multiSel, setMultiSel] = useState<Set<string>>(new Set());

  const handleCommit = () => {
    if (field.type === 'text') {
      if (!textValue.trim()) return;
      onCommit(textValue.trim());
      return;
    }
    if (field.type === 'boolean') {
      onCommit(boolValue);
      return;
    }
    if (field.type === 'select') {
      if (!singleSel) return;
      onCommit(singleSel);
      return;
    }
    if (field.type === 'multi-select') {
      if (multiSel.size === 0) return;
      onCommit([...multiSel]);
      return;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] text-muted-foreground hover:text-foreground"
      >
        ← 返回
      </button>
      <div className="px-1.5 py-1 text-[11px] font-medium text-muted-foreground">
        {field.label} {OPERATOR_LABEL[operator]} …
      </div>

      {field.type === 'text' ? (
        <div className="space-y-1.5 p-1">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommit();
            }}
            placeholder="輸入關鍵字…"
            autoFocus
            className={cn(
              'h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs',
              'focus:outline-none focus:ring-2 focus:ring-ring/40',
            )}
          />
        </div>
      ) : null}

      {field.type === 'boolean' ? (
        <div className="space-y-1 p-1">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setBoolValue(v)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                boolValue === v ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <span className="inline-flex size-3.5 items-center justify-center rounded-full border border-current">
                {boolValue === v ? <span className="size-2 rounded-full bg-current" /> : null}
              </span>
              {v ? '是' : '否'}
            </button>
          ))}
        </div>
      ) : null}

      {field.type === 'select' && field.options ? (
        <ul className="max-h-48 space-y-0.5 overflow-y-auto p-1">
          {field.options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => setSingleSel(opt.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                  singleSel === opt.value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                )}
              >
                <span className="inline-flex size-3.5 items-center justify-center rounded-full border border-current">
                  {singleSel === opt.value ? <span className="size-2 rounded-full bg-current" /> : null}
                </span>
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {field.type === 'multi-select' && field.options ? (
        <ul className="max-h-48 space-y-0.5 overflow-y-auto p-1">
          {field.options.map((opt) => {
            const checked = multiSel.has(opt.value);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() =>
                    setMultiSel((prev) => {
                      const next = new Set(prev);
                      if (next.has(opt.value)) next.delete(opt.value);
                      else next.add(opt.value);
                      return next;
                    })
                  }
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                    checked ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                  )}
                >
                  <span className="inline-flex size-3.5 items-center justify-center rounded-sm border border-current">
                    {checked ? <span className="text-[10px] leading-none">✓</span> : null}
                  </span>
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex justify-end gap-1 p-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onBack}>
          取消
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleCommit}
        >
          套用
        </Button>
      </div>
    </>
  );
}
