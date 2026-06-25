// apps/nx-ui/src/design/components/multi-select-modal/EntityPickerDialog.tsx
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
import { AlertCircle, Check, Search, type LucideIcon } from 'lucide-react';
import type { PagedResult } from '@data/types/nx01/api';
import { cn } from '@design/utils/cn';
import { FocusZone } from '@design/primitives/focus-zone';
import { useModalLayer } from '@design/primitives/modal-stack';

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
  /** 提交（每個選中項依序呼叫 API）。管理模式（onApplyChanges）下可省。*/
  onConfirm?: (selected: T[]) => Promise<void>;
  /** 全部 onConfirm 成功後執行；count = 成功筆數，方便 caller 顯示 toast「已新增 N 項」*/
  onSuccess?: (count: number) => void;
  /** 確認按鈕 label（預設「新增」）*/
  confirmLabel?: string;

  // ── 管理模式（manage）：勾＝指派、反勾＝撤銷（業界 multi-select 範式）───────
  /** 已指派的 id 集合：開啟時預設勾選、可反勾（反勾＝撤銷）。提供此 prop 即進入管理模式。*/
  preselectedIds?: Set<string>;
  /** 已勾選但「不可反勾」的 id（如主要職務）：顯示鎖定 chip、空白鍵 / 點擊不切換。*/
  lockedIds?: Set<string>;
  /** locked 項目 hint chip 文字（預設「鎖定」）*/
  lockedHint?: string;
  /** 管理模式提交：added＝新勾選、removedIds＝被反勾的既有項目 id。*/
  onApplyChanges?: (added: T[], removedIds: string[]) => Promise<void>;
  /** 管理模式套用成功後執行（顯示 toast）。*/
  onApplied?: (addedCount: number, removedCount: number) => void;
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
  preselectedIds,
  lockedIds,
  lockedHint = '鎖定',
  onApplyChanges,
  onApplied,
}: EntityPickerDialogProps<T>) {
  // 管理模式：提供 onApplyChanges 即啟用（勾＝指派、反勾＝撤銷）
  const manage = !!onApplyChanges;
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  useModalLayer(layerRef, onClose);

  // 開啟時 reset + 自動 focus
  useEffect(() => {
    if (open) {
      setKeyword('');
      setDebouncedKeyword('');
      setItems([]);
      // 管理模式：預設勾選已指派項目（含未在搜尋結果中者，避免被誤撤銷）
      setSelected(new Set(manage ? Array.from(preselectedIds ?? []) : []));
      setError(null);
      setSubmitting(false);
      // 預設不開搜尋框、焦點在列表（↑↓ 選 / 空白 勾 / Alt+F 才開搜尋）
      setSearchOpen(false);
      setFocusedIndex(0);
    }
    // 只在開啟瞬間 init；preselectedIds / manage 於開啟時讀取、不隨父層 re-render 重置
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggle = useCallback(
    (id: string) => {
      if (lockedIds?.has(id)) return; // 鎖定項（如主要職務）不可切換
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [lockedIds],
  );

  // 管理模式變更計算（added＝新勾、removed＝反勾既有項）
  const addedIds = useMemo(
    () => (manage ? Array.from(selected).filter((id) => !(preselectedIds?.has(id) ?? false)) : []),
    [manage, selected, preselectedIds],
  );
  const removedIds = useMemo(
    () =>
      manage
        ? Array.from(preselectedIds ?? []).filter((id) => !selected.has(id) && !(lockedIds?.has(id) ?? false))
        : [],
    [manage, preselectedIds, selected, lockedIds],
  );
  const changeCount = addedIds.length + removedIds.length;

  const handleSubmit = useCallback(async () => {
    // 管理模式：套用「新增 + 撤銷」差異
    if (manage) {
      if (changeCount === 0) {
        setError('沒有變更');
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const addedSet = new Set(addedIds);
        const added = items.filter((it) => addedSet.has(getId(it)));
        await onApplyChanges?.(added, removedIds);
        onApplied?.(added.length, removedIds.length);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : '處理失敗');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (selected.size === 0) {
      setError('請至少選擇一項');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const selectedItems = items.filter((it) => selected.has(getId(it)));
      await onConfirm?.(selectedItems);
      onSuccess?.(selectedItems.length);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '處理失敗');
    } finally {
      setSubmitting(false);
    }
  }, [manage, changeCount, addedIds, removedIds, onApplyChanges, onApplied, selected, items, getId, onConfirm, onSuccess, onClose]);

  const selectedCount = selected.size;
  const visibleItems = useMemo(() => items, [items]);

  // 全鍵盤：↑↓ 移動焦點、空白 勾選/取消、Enter 確認、Esc 關（capture 優先於外層）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (submitting) return;
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      // Alt+F 開搜尋框並 focus
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // 搜尋開著：關搜尋 + 焦點回列表；否則關整個視窗
        if (searchOpen) {
          setSearchOpen(false);
          setKeyword('');
          (document.activeElement as HTMLElement | null)?.blur();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const n = visibleItems.length;
        if (n === 0) return;
        setFocusedIndex((i) => (e.key === 'ArrowDown' ? Math.min(n - 1, i + 1) : Math.max(0, i - 1)));
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (tag === 'input') return; // 搜尋框內空白＝打字
        e.preventDefault();
        e.stopPropagation();
        const it = visibleItems[focusedIndex];
        if (it && !(disabledIds?.has(getId(it)) ?? false)) toggle(getId(it));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        void handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, submitting, searchOpen, visibleItems, focusedIndex, disabledIds, getId, toggle, handleSubmit, onClose]);

  // 清單變動時焦點回第一項 + 捲入視野
  useEffect(() => {
    setFocusedIndex(0);
  }, [visibleItems]);
  useEffect(() => {
    if (!open) return;
    document.querySelector(`[data-picker-idx="${focusedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, open]);

  if (!open) return null;

  return (
    <div
      ref={layerRef}
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

        {/* Search：預設收起、Alt+F 開、Esc 關回列表 */}
        {searchOpen ? (
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
            <span className="hidden text-[10px] tracking-wider text-[#5A5A60] sm:inline">ESC 關閉</span>
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
        ) : (
          <div className="flex items-center gap-2 border-b border-[#2A2A30] px-4 py-1.5 text-[11px] text-[#5A5A60]">
            <Search className="size-3.5" />
            {manage ? '↑↓ 選 · 空白 勾＝指派／反勾＝撤銷 · Alt+F 搜尋 · Enter 套用' : '↑↓ 選 · 空白 勾選 · Alt+F 搜尋 · Enter 儲存'}
          </div>
        )}

        {/* List
            焦點黏著（執行長 2026-06-25 軌 2）：FocusZone 包列表外層、
            鍵盤事件仍由上面 window-level capture listener 處理（focusedIndex 內部 state、
            不依 row DOM focus）；FocusZone 的職責純粹是「點 ul 空白拉回容器、避免 focus 飄 body」。
            tabIndex=-1 不擾 Tab 順序。scope='space-only' 防容器 onKeyDown 和 window listener 衝突。*/}
        <FocusZone tabIndex={-1} className="min-h-0 flex-1 overflow-auto nx-master-scroll">
          {loading ? (
            <div className="px-5 py-8 text-center text-xs text-[#5A5A60]">載入中…</div>
          ) : visibleItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#5A5A60]">
              {debouncedKeyword ? `找不到符合「${debouncedKeyword}」的項目` : '無項目'}
            </div>
          ) : (
            <ul className="divide-y divide-[#1A1A1F]">
              {visibleItems.map((item, index) => {
                const id = getId(item);
                const isLocked = lockedIds?.has(id) ?? false;
                const isAssigned = preselectedIds?.has(id) ?? false;
                // 一般模式才用 disabledIds 鎖死；管理模式已指派項可反勾、不 disable
                const isDisabled = !manage && (disabledIds?.has(id) ?? false);
                const isSelected = selected.has(id);
                const isFocused = index === focusedIndex;
                const desc = getDescription?.(item);
                const willRemove = manage && isAssigned && !isSelected && !isLocked;
                const willAdd = manage && !isAssigned && isSelected;
                const clickable = !isLocked && !isDisabled && !submitting;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      data-picker-idx={index}
                      disabled={!clickable}
                      onClick={() => toggle(id)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isFocused && 'ring-1 ring-inset ring-[#E8A020]/60',
                        isDisabled
                          ? 'cursor-not-allowed opacity-50'
                          : isLocked
                            ? 'cursor-not-allowed bg-[#E8A020]/6'
                            : willRemove
                              ? 'bg-[#E26060]/8 hover:bg-[#E26060]/14'
                              : isSelected
                                ? 'bg-[#E8A020]/8 hover:bg-[#E8A020]/12'
                                : 'hover:bg-[#1A1A22]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isSelected
                            ? willAdd
                              ? 'border-[#22D88F]/60 bg-[#22D88F]/15 text-[#22D88F]'
                              : 'border-[#E8A020]/60 bg-[#E8A020]/15 text-[#E8A020]'
                            : willRemove
                              ? 'border-[#E26060]/50 bg-[#E26060]/8'
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
                                ? willAdd
                                  ? 'font-semibold text-[#22D88F]'
                                  : 'font-semibold text-[#E8A020]'
                                : willRemove
                                  ? 'text-[#E26060] line-through'
                                  : 'text-[#E8E8EB]',
                          )}
                        >
                          {getLabel(item)}
                        </span>
                        {desc ? (
                          <span className="truncate text-[11px] text-[#5A5A60]">{desc}</span>
                        ) : null}
                      </span>
                      {isLocked ? (
                        <span className="shrink-0 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-0.5 text-[10px] text-[#E8A020]">
                          {lockedHint}
                        </span>
                      ) : willRemove ? (
                        <span className="shrink-0 rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-1.5 py-0.5 text-[10px] text-[#E26060]">
                          將撤銷
                        </span>
                      ) : willAdd ? (
                        <span className="shrink-0 rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-1.5 py-0.5 text-[10px] text-[#22D88F]">
                          將新增
                        </span>
                      ) : manage && isAssigned ? (
                        <span className="shrink-0 rounded-md border border-[#3A3A42] bg-[#1A1A1F] px-1.5 py-0.5 text-[10px] text-[#888892]">
                          已指派
                        </span>
                      ) : isDisabled ? (
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
        </FocusZone>

        {/* Error */}
        {error ? (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-md border border-[#5A2A2A] bg-[#1F1212] px-3 py-2 text-xs text-[#E26060]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-3">
          {manage ? (
            <span className="text-[10px] text-[#5A5A60]">
              ESC 取消 · <span className="font-mono text-[#22D88F]">{addedIds.length}</span> 新增 ·{' '}
              <span className="font-mono text-[#E26060]">{removedIds.length}</span> 撤銷
            </span>
          ) : (
            <span className="text-[10px] text-[#5A5A60]">
              ESC 取消 · 已選{' '}
              <span className="font-mono text-[#E8A020]">{selectedCount}</span> 項
            </span>
          )}
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
              disabled={submitting || (manage ? changeCount === 0 : selectedCount === 0)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-3 text-xs font-medium text-[#E8A020] transition-colors',
                submitting || (manage ? changeCount === 0 : selectedCount === 0)
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-[#E8A020]/25',
              )}
            >
              {submitting
                ? '處理中…'
                : manage
                  ? `套用變更${changeCount > 0 ? ` (${changeCount})` : ''}`
                  : `${confirmLabel}${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 業界範式：API 回傳 `PagedResult<T>` 既有 type 已存在 features/base/api/types.ts。
 *  本元件 search prop 統一回 PagedResult<T>、由 caller 提供 page/pageSize 預設值。 */
