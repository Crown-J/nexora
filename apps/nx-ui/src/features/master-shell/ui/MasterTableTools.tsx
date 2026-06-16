// apps/nx-ui/src/features/master-shell/ui/MasterTableTools.tsx
/**
 * MasterTableTools — 主檔列表「欄位設定」+「篩選」兩個工具面板（鋼鐵星球、全鍵盤）
 *
 * 共用於 EntityMasterPage（22 主檔）與 UserMasterPage，確保 23 個主檔行為一致。
 *
 * - MasterColumnsPanel（Alt+L）：勾選要顯示 / 隱藏的欄位。↑↓ 移動、空白 勾選、Esc 關閉（即時生效）。
 * - MasterFilterPanel（Alt+T）：選欄位 + 條件（=、≠、包含、>、<）+ 值，可多條件。Enter 套用、Esc 關閉。
 *
 * 兩面板皆於工具列下方展開（對齊 SearchPanel 範式），不用彈窗、避免破壞鍵盤焦點流。
 * 篩選為前端篩選（就目前載入的資料列套用）。
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Columns3, Eye, Filter, Plus, X } from 'lucide-react';
import { cn } from '@design/utils/cn';

// ──────────────────────────────────────────────────────────────
// 篩選型別 + 比對邏輯
// ──────────────────────────────────────────────────────────────

export type FilterOp = '=' | '!=' | 'contains' | '>' | '<';

export const FILTER_OPS: { value: FilterOp; label: string }[] = [
  { value: 'contains', label: '包含' },
  { value: '=', label: '＝ 等於' },
  { value: '!=', label: '≠ 不等於' },
  { value: '>', label: '＞ 大於' },
  { value: '<', label: '＜ 小於' },
];

export type FilterCond = {
  id: string;
  field: string;
  op: FilterOp;
  value: string;
};

export type FilterFieldDef = { key: string; label: string };

export function makeFilterCond(field: string): FilterCond {
  return { id: `f_${Math.random().toString(36).slice(2, 9)}`, field, op: 'contains', value: '' };
}

/** 只計入「有填值」的條件數（badge / 是否啟用） */
export function activeFilterCount(conds: FilterCond[]): number {
  return conds.filter((c) => c.value.trim() !== '').length;
}

function applyOp(cellText: string, op: FilterOp, value: string): boolean {
  const a = (cellText ?? '').trim();
  const b = (value ?? '').trim();
  switch (op) {
    case '=':
      return a.toLowerCase() === b.toLowerCase();
    case '!=':
      return a.toLowerCase() !== b.toLowerCase();
    case 'contains':
      return a.toLowerCase().includes(b.toLowerCase());
    case '>':
    case '<': {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== '' && b !== '') {
        return op === '>' ? na > nb : na < nb;
      }
      // 非數字 → 字串比較（locale）
      const cmp = a.localeCompare(b, 'zh-Hant');
      return op === '>' ? cmp > 0 : cmp < 0;
    }
  }
}

/**
 * 列是否通過所有（有填值的）篩選條件。
 * getText(field) 由 caller 提供 → 回傳該欄位「顯示文字」（select / ref 取 label、日期取格式化字串）。
 */
export function rowMatchesFilters(conds: FilterCond[], getText: (field: string) => string): boolean {
  return conds
    .filter((c) => c.value.trim() !== '')
    .every((c) => applyOp(getText(c.field), c.op, c.value));
}

// ──────────────────────────────────────────────────────────────
// 欄位設定面板（Alt+L）
// ──────────────────────────────────────────────────────────────

export function MasterColumnsPanel({
  open,
  onClose,
  columns,
  hidden,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  columns: FilterFieldDef[];
  /** 被隱藏的欄位 key 集合 */
  hidden: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [focusIdx, setFocusIdx] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = (key: string) => {
    const next = new Set(hidden);
    // 不允許把最後一個可見欄位也藏掉（至少留一欄）
    if (!next.has(key) && columns.length - next.size <= 1) return;
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  useEffect(() => {
    if (open) setFocusIdx(0);
  }, [open]);

  // 全鍵盤：↑↓ 移動、空白 勾選、Esc 關閉（capture + stopPropagation，不讓整頁 ↑↓ 切表格列）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return; // Alt+L 等交給父層切換
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setFocusIdx((i) =>
          e.key === 'ArrowDown' ? Math.min(columns.length - 1, i + 1) : Math.max(0, i - 1),
        );
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        const c = columns[focusIdx];
        if (c) toggle(c.key);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, columns, focusIdx, hidden]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector(`[data-col-idx="${focusIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx, open]);

  if (!open) return null;

  const visibleCount = columns.length - hidden.size;

  return (
    <div className="border-b border-[#2A2A30] bg-[#0E0E12] px-3 py-2.5" ref={panelRef}>
      <div className="mb-2 flex items-center gap-2">
        <Columns3 className="size-3.5 text-[#E8A020]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
          欄位設定
        </span>
        <span className="text-[10px] text-[#5A5A60]">↑↓ 移動 · 空白 勾選 · Esc 關閉</span>
        <div className="flex-1" />
        <span className="font-mono text-[10px] text-[#888892]">顯示 {visibleCount}/{columns.length}</span>
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-2 text-[10px] text-[#B8B8C0] transition-colors hover:border-[#E8A020]/40 hover:text-[#E8A020]"
        >
          <Eye className="size-3" /> 全部顯示
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((c, i) => {
          const shown = !hidden.has(c.key);
          const focused = i === focusIdx;
          return (
            <button
              key={c.key}
              type="button"
              data-col-idx={i}
              onClick={() => toggle(c.key)}
              onMouseEnter={() => setFocusIdx(i)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors',
                shown
                  ? 'border-[#E8A020]/45 bg-[#E8A020]/12 text-[#E8A020]'
                  : 'border-[#3A3A42] bg-[#1A1A1F] text-[#5A5A60]',
                focused && 'ring-2 ring-inset ring-[#E8A020]/70',
              )}
            >
              <span
                className={cn(
                  'flex size-3.5 shrink-0 items-center justify-center rounded border',
                  shown ? 'border-[#E8A020]/60 bg-[#E8A020]/20 text-[#E8A020]' : 'border-[#3A3A42] bg-[#131316]',
                )}
              >
                {shown ? <Check className="size-2.5" /> : null}
              </span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 篩選面板（Alt+T）
// ──────────────────────────────────────────────────────────────

export function MasterFilterPanel({
  open,
  onClose,
  fields,
  value,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  fields: FilterFieldDef[];
  /** 目前已套用的條件 */
  value: FilterCond[];
  /** Enter / 套用：提交條件（caller 寫入 active state） */
  onApply: (conds: FilterCond[]) => void;
}) {
  const [draft, setDraft] = useState<FilterCond[]>([]);
  const firstFieldKey = fields[0]?.key ?? '';

  // 開啟時：以目前 active 條件初始化；無條件則自動帶一列空白條件
  useEffect(() => {
    if (open) {
      setDraft(value.length > 0 ? value.map((c) => ({ ...c })) : [makeFilterCond(firstFieldKey)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apply = () => {
    onApply(draft.filter((c) => c.value.trim() !== ''));
    onClose();
  };

  const clearAll = () => {
    onApply([]);
    setDraft([makeFilterCond(firstFieldKey)]);
  };

  // Enter 套用 / Esc 關閉（capture，攔在整頁 handler 之前）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        apply();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft]);

  const update = (id: string, patch: Partial<FilterCond>) =>
    setDraft((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => setDraft((prev) => prev.filter((c) => c.id !== id));
  const add = () => setDraft((prev) => [...prev, makeFilterCond(firstFieldKey)]);

  const draftActive = useMemo(() => activeFilterCount(draft), [draft]);

  if (!open) return null;

  const inputCls =
    'rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2 py-1 text-xs text-[#E8E8EB] outline-none transition-colors focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40';

  return (
    <div className="border-b border-[#2A2A30] bg-[#0E0E12] px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2">
        <Filter className="size-3.5 text-[#E8A020]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">篩選</span>
        <span className="text-[10px] text-[#5A5A60]">Enter 套用 · Esc 關閉 · 就目前頁面資料篩選</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {draft.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-1.5">
            <select
              value={c.field}
              onChange={(e) => update(c.id, { field: e.target.value })}
              className={cn(inputCls, 'min-w-[7rem] cursor-pointer')}
              aria-label="篩選欄位"
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key} className="bg-[#131316]">
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={c.op}
              onChange={(e) => update(c.id, { op: e.target.value as FilterOp })}
              className={cn(inputCls, 'min-w-[6rem] cursor-pointer')}
              aria-label="篩選條件"
            >
              {FILTER_OPS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#131316]">
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={c.value}
              onChange={(e) => update(c.id, { value: e.target.value })}
              placeholder="值..."
              className={cn(inputCls, 'min-w-[8rem] flex-1 placeholder:text-[#5A5A60]')}
              aria-label="篩選值"
            />
            <button
              type="button"
              onClick={() => remove(c.id)}
              title="移除此條件"
              className="inline-flex size-7 items-center justify-center rounded-md border border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] transition-colors hover:bg-[#2A1818] hover:text-[#E26060]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-2.5 text-[11px] font-medium text-[#B8B8C0] transition-colors hover:border-[#E8A020]/40 hover:text-[#E8A020]"
        >
          <Plus className="size-3" /> 新增條件
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-7 items-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-2.5 text-[11px] font-medium text-[#B8B8C0] transition-colors hover:border-[#3A3A42] hover:text-[#E8E8EB]"
        >
          清除
        </button>
        <button
          type="button"
          onClick={apply}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-3 text-[11px] font-semibold text-[#E8A020] transition-colors hover:bg-[#E8A020]/25"
        >
          套用{draftActive > 0 ? ` (${draftActive})` : ''}（Enter）
        </button>
      </div>
    </div>
  );
}
