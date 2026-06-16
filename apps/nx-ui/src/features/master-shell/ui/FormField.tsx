// apps/nx-ui/src/features/master-shell/ui/FormField.tsx
/**
 * NEXORA Master Shell — FormField / FormInput / FormSelect
 *
 * 抽自 lab/users（commit 41-48 鋼鐵星球範式），用於主檔詳細頁的表單欄位渲染。
 *
 * 設計：
 * - FormField：read-only 顯示（瀏覽模式），支援 mono / dim / tone 四種樣式變體
 * - FormInput：可編輯文字欄位（編輯模式）
 * - FormSelect：可編輯下拉選單（編輯模式）
 * - 色系統一：4 階灰 + 琥珀 + green/red/amber tone
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
        {label}
      </span>
      <div
        style={
          !tone
            ? {
                backgroundImage: 'linear-gradient(180deg, #101015 0%, #08080C 100%)',
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
              }
            : undefined
        }
        className={cn(
          'rounded-md border border-[#2A2A30] px-3 py-2 text-sm',
          mono && 'font-mono text-xs',
          dim && 'text-[#5A5A60]',
          tone === 'amber' && 'border-[#E8A020]/30 bg-[#E8A020]/8 text-[#E8A020]',
          tone === 'green' && 'border-[#22D88F]/30 bg-[#22D88F]/8 text-[#22D88F]',
          tone === 'red' && 'border-[#E26060]/30 bg-[#E26060]/8 text-[#E26060]',
          tone === 'muted' && 'border-[#3A3A42] text-[#888892]',
          !tone && !dim && 'text-[#F0F0F3]',
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2.5 py-1.5 text-sm text-[#E8E8EB] outline-none transition-colors placeholder:text-[#5A5A60] focus:border-[#E8A020]/60 focus:bg-[#0A0A0C] focus:ring-1 focus:ring-[#E8A020]/40"
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2.5 py-1.5 text-sm text-[#E8E8EB] outline-none transition-colors focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#131316] text-[#E8E8EB]">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
