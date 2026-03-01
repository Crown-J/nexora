/**
 * File: apps/nx-ui/src/shared/ui/group/MemberChipsPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-GROUP-MEMBER-CHIPS-001：通用 Members Chips 面板（primary / remove）
 *
 * Notes:
 * - 用於「左群組右成員」的各種關聯管理頁面
 * - 透過 render props 注入 label 與操作，避免綁死 DTO
 */

'use client';

import { cx } from '@/shared/lib/cx';

export type MemberChipsPanelProps<T> = {
    items: T[];
    getKey: (row: T) => string;
    getLabel: (row: T) => string;

    // optional: primary toggle
    isPrimary?: (row: T) => boolean;
    onTogglePrimary?: (row: T) => void;

    // optional: remove
    onRemove?: (row: T) => void;

    loading?: boolean;
    emptyText?: string;

    disabled?: boolean;
    className?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-SHARED-GROUP-MEMBER-CHIPS-001-F01
 * 說明：
 * - MemberChipsPanel：通用 chips 呈現 + primary + remove
 */
export function MemberChipsPanel<T>(props: MemberChipsPanelProps<T>) {
    const {
        items,
        getKey,
        getLabel,
        isPrimary,
        onTogglePrimary,
        onRemove,
        loading = false,
        emptyText = '尚無成員。',
        disabled = false,
        className,
    } = props;

    return (
        <div className={cx('flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/10 p-3', className)}>
            {items.map((row) => {
                const label = getLabel(row);
                const primary = isPrimary ? Boolean(isPrimary(row)) : false;
                const showPrimary = Boolean(isPrimary && onTogglePrimary);
                const showRemove = Boolean(onRemove);

                return (
                    <div
                        key={getKey(row)}
                        className={cx(
                            'group flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
                            primary
                                ? 'border-green-500/30 bg-green-500/10 text-green-200'
                                : 'border-white/10 bg-white/5 text-white/85',
                        )}
                        title={label}
                    >
                        <span className="max-w-[240px] truncate">{label}</span>

                        {showPrimary && (
                            <button
                                className={cx(
                                    'rounded-full px-2 py-0.5 text-[10px] transition-colors disabled:opacity-40',
                                    primary
                                        ? 'bg-green-500/20 text-green-100 hover:bg-green-500/25'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10',
                                )}
                                onClick={() => onTogglePrimary?.(row)}
                                disabled={disabled}
                                title="切換主角色"
                            >
                                {primary ? 'PRIMARY' : 'SET'}
                            </button>
                        )}

                        {showRemove && (
                            <button
                                className="rounded-full px-2 py-0.5 text-[10px] text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40"
                                onClick={() => onRemove?.(row)}
                                disabled={disabled}
                                title="移除"
                            >
                                ×
                            </button>
                        )}
                    </div>
                );
            })}

            {!loading && items.length === 0 && <div className="text-xs text-white/60">{emptyText}</div>}
        </div>
    );
}