/**
 * File: apps/nx-ui/src/shared/ui/lookup/LookupAutocomplete.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-LOOKUP-AUTOCOMPLETE-001：通用 Lookup Autocomplete（下拉搜尋選取）
 *
 * Notes:
 * - 支援：debounce 放在外層 hook（本元件只負責 UI）
 * - 支援：click outside 自動關閉
 * - renderOption / getKey 由外部注入，避免綁死 DTO
 */

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { cx } from '@/shared/lib/cx';

export type LookupAutocompleteProps<T> = {
    value: string;
    onChange: (next: string) => void;

    options: T[];
    open: boolean;
    onOpenChange: (open: boolean) => void;

    loading?: boolean;
    disabled?: boolean;

    placeholder?: string;
    emptyText?: string;
    loadingText?: string;

    getKey: (row: T) => string;
    renderOption: (row: T) => React.ReactNode;
    onPick: (row: T) => void;

    className?: string;
    inputClassName?: string;
    panelClassName?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-SHARED-LOOKUP-AUTOCOMPLETE-001-F01
 * 說明：
 * - LookupAutocomplete：通用搜尋下拉
 */
export function LookupAutocomplete<T>(props: LookupAutocompleteProps<T>) {
    const {
        value,
        onChange,
        options,
        open,
        onOpenChange,
        loading = false,
        disabled = false,
        placeholder = 'Search...',
        emptyText = '沒有符合的資料',
        loadingText = '搜尋中...',
        getKey,
        renderOption,
        onPick,
        className,
        inputClassName,
        panelClassName,
    } = props;

    const wrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as any)) onOpenChange(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [onOpenChange]);

    const showPanel = useMemo(() => open && (loading || options.length > 0 || value.trim().length > 0), [open, loading, options.length, value]);

    return (
        <div ref={wrapRef} className={cx('relative', className)}>
            <input
                className={cx(
                    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50',
                    inputClassName,
                )}
                placeholder={placeholder}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => {
                    if (!disabled) onOpenChange(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        onChange('');
                        onOpenChange(false);
                    }
                }}
            />

            {showPanel && (
                <div
                    className={cx(
                        'absolute left-0 top-[44px] z-30 w-full rounded-xl border border-white/10 bg-[#0b0f13]/95 p-2 shadow-xl backdrop-blur',
                        panelClassName,
                    )}
                >
                    {loading && <div className="px-2 py-2 text-xs text-white/60">{loadingText}</div>}

                    {!loading && options.length === 0 && <div className="px-2 py-2 text-xs text-white/60">{emptyText}</div>}

                    {!loading &&
                        options.map((row) => (
                            <button
                                key={getKey(row)}
                                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                                onClick={() => {
                                    onPick(row);
                                    onOpenChange(false);
                                }}
                            >
                                {renderOption(row)}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}