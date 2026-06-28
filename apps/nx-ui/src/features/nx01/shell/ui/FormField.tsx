// apps/nx-ui/src/features/nx01/shell/ui/FormField.tsx
/**
 * NEXORA Master Shell — FormField / FormInput / FormSelect
 *
 * 2026-06-18 執行長範式:hex 改 css var token、light theme 黑色變深橘
 *   - --nx-surface-input        底色（dark=var(--card) / light=#c8550f 深橘）
 *   - --nx-surface-input-border 邊框
 *   - --nx-surface-input-fg     主文字
 *   - --nx-surface-input-muted  dim / placeholder
 *   - --nx-surface-input-label  欄位 label
 */
'use client';

import { cn } from '@design/utils/cn';

export function FormField({
  label,
  value,
  mono,
  dim,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  dim?: boolean;
  tone?: 'amber' | 'green' | 'red' | 'muted';
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--nx-surface-input-label)]">
        {label}
      </span>
      <div
        className={cn(
          'rounded-md border px-3 py-2 text-sm',
          'border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)]',
          mono && 'font-mono text-xs',
          dim && 'text-[var(--nx-surface-input-muted)]',
          tone === 'amber' && '!border-[var(--primary)]/30 !bg-[var(--primary)]/8 text-[var(--primary)]',
          tone === 'green' && '!border-[var(--color-success)]/30 !bg-[var(--color-success)]/8 text-[var(--color-success)]',
          tone === 'red' && '!border-[var(--color-danger)]/30 !bg-[var(--color-danger)]/8 text-[var(--color-danger)]',
          tone === 'muted' && '!border-[var(--border)] text-[var(--muted-foreground)]',
          !tone && !dim && 'text-[var(--nx-surface-input-fg)]',
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--nx-surface-input-label)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="rounded-md border border-[var(--primary)]/30 bg-[var(--nx-surface-input)] px-2.5 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none transition-colors placeholder:text-[var(--nx-surface-input-muted)] focus:border-[var(--primary)]/60 focus:ring-1 focus:ring-[var(--primary)]/40"
      />
    </div>
  );
}

export function FormSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--nx-surface-input-label)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-md border border-[var(--primary)]/30 bg-[var(--nx-surface-input)] px-2.5 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none transition-colors focus:border-[var(--primary)]/60 focus:ring-1 focus:ring-[var(--primary)]/40"
      >
        {options.map((opt) => (
          <option
            key={opt}
            value={opt}
            className="bg-[var(--nx-surface-input)] text-[var(--nx-surface-input-fg)]"
          >
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
