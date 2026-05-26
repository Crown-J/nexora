// apps/nx-ui/src/features/master-shell/ui/EntityPickerDialog.tsx
/**
 * NEXORA Master Shell — EntityPickerDialog<T>（泛型實體選擇器對話框）
 *
 * 用途：USER 詳細頁編輯模式「新增職務」「新增倉庫據點」等場景的多選 Picker。
 *
 * 業界範式：
 * - 業界 SaaS multi-select picker（Notion / Linear / Salesforce Lookup）
 * - 搜尋 + 列表 + 多選 + 確認
 * - 已選 / 已指派標示（避免重複）
 * - ESC / backdrop 關閉
 *
 * 用法範例（features/base/users/UserMasterPage.tsx）：
 *   <EntityPickerDialog<RoleDto>
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     title="新增職務"
 *     subtitle="Assign Roles"
 *     icon={Briefcase}
 *     search={(q) => listRoles({ q, isActive: true, pageSize: 50 })}
 *     getId={(r) => r.id}
 *     getLabel={(r) => `${r.code} · ${r.name}`}
 *     getDescription={(r) => r.description ?? undefined}
 *     disabledIds={alreadyAssignedRoleIds}
 *     disabledHint="已指派"
 *     onConfirm={async (selected) => {
 *       for (const r of selected) await assignUserRole({ userId, roleId: r.id });
 *     }}
 *     onSuccess={() => { reload(); showToast(`已新增 ${n} 個職務`, 'success'); }}
 *   />
 *
 * 設計：
 * - 300ms search debounce
 * - 多選 Set<string>
 * - 提交中 disable buttons + 顯示「處理中…」
 * - 失敗顯示錯誤於 dialog 底、不關閉
 * - 鋼鐵風樣式對齊 ConfirmDialog / CreateUserDialog
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Search, X, type LucideIcon } from 'lucide-react';
import type { PagedResult } from '@/features/base/api/types';
import { cn } from '@/lib/utils';

export type EntityPickerDialogProps<T> = {
  open: boolean;
  onClose: () => void;
  /** 對話框標題（如「新增職務」）*/
  title: string;
  /** 英文副標（如「Assign Roles」）*/
  subtitle?: string;
  /** Header icon（如 Briefcase）*/
  icon?: LucideIcon;
  /** 搜尋 placeholder */
  searchPlaceholder?: string;
  /** 搜尋 API：給定 query string、回傳 PagedResult<T> */
  search: (q: string) => Promise<PagedResult<T>>;
  /** 取 entity id（unique key、用於 dedupe / disable）*/
  getId: (item: T) => string;
  /** 取顯示 label（主要文字）*/
  getLabel: (item: T) => string;
  /** 取描述（次要文字、可省）*/
  getDescription?: (item: T) => string | undefined;
  /** 已禁用的 id 集合（如已指派的項目，list 內顯示 disabled）*/
  disabledIds?: Set<string>;
  /** disabled 項目右側 hint chip 文字（預設「已指派」）*/
  disabledHint?: string;
  /** 提交（每個選中項依序呼叫 API）*/
  onConfirm: (selected: T[]) => Promise<void>;
  /** 全部 onConfirm 成功後執行（reload list + toast）*/
  onSuccess?: () => void;
  /** 確認按鈕 label（預設「新增」）*/
  confirmLabel?: string;
};

export function EntityPickerDialog<T>({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  searchPlaceholder,
  search,
  getId,
  getLabel,
  getDescription,
  disabledIds,
  disabledHint = '已指派',
  onConfirm,
  onSuccess,
  confirmLabel = '新增',
}: EntityPickerDialogProps<T>) {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 開啟時 reset + 自動 focus
  useEffect(() => {
    if (open) {
      setKeyword('');
      setDebouncedKeyword('');
      setItems([]);
      setSelected(new Set());
      setError(null);
      setSubmitting(false);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  // 300ms search debounce
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword, open]);

  // 載入 search 結果
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await search(debouncedKeyword);
        if (!alive) return;
        setItems(res.items);
      } catch (e) {
        if (!alive) return;
        setItems([]);
        setError(e instanceof Error ? e.message : '搜尋失敗');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, debouncedKeyword, search]);

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (selected.size === 0) {
      setError('請至少選擇一項');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const selectedItems = items.filter((it) => selected.has(getId(it)));
      await onConfirm(selectedItems);
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '處理失敗');
    } finally {
      setSubmitting(false);
    }
  }, [selected, items, getId, onConfirm, onSuccess, onClose]);

  const selectedCount = selected.size;
  const visibleItems = useMemo(() => items, [items]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="flex w-full max-w-xl flex-col rounded-2xl border border-[#2A2A30] bg-[#131316] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#2A2A30] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          {Icon ? <Icon className="size-4 text-[#E8A020]" /> : null}
          <h2 className="text-sm font-bold tracking-wide text-[#F0F0F3]">{title}</h2>
          {subtitle ? (
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
              {subtitle}
            </span>
          ) : null}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-[#2A2A30] px-4 py-2">
          <Search className="size-4 text-[#E8A020]" />
          <input
            ref={searchInputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={searchPlaceholder ?? '搜尋...'}
            disabled={submitting}
            className="flex-1 bg-transparent text-sm text-[#E8E8EB] outline-none placeholder:text-[#5A5A60]"
          />
          {keyword ? (
            <button
              type="button"
              onClick={() => setKeyword('')}
              disabled={submitting}
              className="rounded px-1.5 text-[11px] text-[#888892] transition-colors hover:bg-[#1A1A1F] hover:text-[#E8E8EB]"
            >
              清除
            </button>
          ) : null}
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-auto nx-master-scroll">
          {loading ? (
            <div className="px-5 py-8 text-center text-xs text-[#5A5A60]">載入中…</div>
          ) : visibleItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#5A5A60]">
              {debouncedKeyword ? `找不到符合「${debouncedKeyword}」的項目` : '無項目'}
            </div>
          ) : (
            <ul className="divide-y divide-[#1A1A1F]">
              {visibleItems.map((item) => {
                const id = getId(item);
                const isDisabled = disabledIds?.has(id) ?? false;
                const isSelected = selected.has(id);
                const desc = getDescription?.(item);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={isDisabled || submitting}
                      onClick={() => toggle(id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isDisabled
                          ? 'cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'bg-[#E8A020]/8 hover:bg-[#E8A020]/12'
                            : 'hover:bg-[#1A1A22]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isSelected
                            ? 'border-[#E8A020]/60 bg-[#E8A020]/15 text-[#E8A020]'
                            : 'border-[#3A3A42] bg-[#1A1A1F]',
                        )}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            'truncate text-sm',
                            isDisabled
                              ? 'text-[#5A5A60]'
                              : isSelected
                                ? 'font-semibold text-[#E8A020]'
                                : 'text-[#E8E8EB]',
                          )}
                        >
                          {getLabel(item)}
                        </span>
                        {desc ? (
                          <span className="truncate text-[11px] text-[#5A5A60]">{desc}</span>
                        ) : null}
                      </span>
                      {isDisabled ? (
                        <span className="shrink-0 rounded-md border border-[#3A3A42] bg-[#1A1A1F] px-1.5 py-0.5 text-[10px] text-[#888892]">
                          {disabledHint}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Error */}
        {error ? (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-md border border-[#5A2A2A] bg-[#1F1212] px-3 py-2 text-xs text-[#E26060]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-3">
          <span className="text-[10px] text-[#5A5A60]">
            ESC 取消 · 已選{' '}
            <span className="font-mono text-[#E8A020]">{selectedCount}</span> 項
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={cn(
                'inline-flex h-8 items-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] transition-colors',
                submitting
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]',
              )}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedCount === 0}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-3 text-xs font-medium text-[#E8A020] transition-colors',
                submitting || selectedCount === 0
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-[#E8A020]/25',
              )}
            >
              {submitting ? '處理中…' : `${confirmLabel}${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 業界範式：API 回傳 `PagedResult<T>` 既有 type 已存在 features/base/api/types.ts。
 *  本元件 search prop 統一回 PagedResult<T>、由 caller 提供 page/pageSize 預設值。 */
