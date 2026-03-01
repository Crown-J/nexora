/**
 * File: apps/nx-ui/src/shared/ui/group/GroupListPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-GROUP-LIST-PANEL-001：Group List Panel（左側群組列表：搜尋 + 清單 + 狀態）
 *
 * Notes:
 * - 結合 GroupPanelShell：統一外觀（玻璃卡 + 標題列）
 * - 透過 renderItem 注入畫面，避免綁死 role/user/partner 等 DTO
 */

'use client';

import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import { GroupPanelShell } from '@/shared/ui/group/GroupPanelShell';

export type GroupListPanelProps<T> = {
    title: string;

    // search
    searchValue: string;
    onSearchChange: (next: string) => void;
    searchPlaceholder?: string;

    // state
    loading?: boolean;
    error?: string | null;
    emptyText?: string;

    // list
    items: T[];
    getKey: (row: T) => string;
    isActive?: (row: T) => boolean;
    onSelect?: (row: T) => void;
    renderItem: (row: T) => ReactNode;

    className?: string; // outer wrapper width etc.
    listClassName?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-SHARED-GROUP-LIST-PANEL-001-F01
 * 說明：
 * - GroupListPanel：群組列表（搜尋 + 列表）
 */
export function GroupListPanel<T>(props: GroupListPanelProps<T>) {
    const {
        title,
        searchValue,
        onSearchChange,
        searchPlaceholder = '搜尋...',
        loading = false,
        error = null,
        emptyText = '無資料',
        items,
        getKey,
        isActive,
        onSelect,
        renderItem,
        className,
        listClassName,
    } = props;

    return (
        <div className={className}>
            <GroupPanelShell title={title}>
                <input
                    className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') onSearchChange('');
                    }}
                />

                {error ? <div className="mb-2 text-xs text-red-300">{error}</div> : null}
                {loading ? <div className="mb-2 text-xs text-white/60">載入中...</div> : null}

                <div className={cx('space-y-2 overflow-auto pr-1', listClassName)}>
                    {items.map((row) => {
                        const active = isActive ? Boolean(isActive(row)) : false;

                        return (
                            <button
                                key={getKey(row)}
                                className={cx(
                                    'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                                    active
                                        ? 'border-green-500/40 bg-green-500/10 text-green-200'
                                        : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
                                )}
                                onClick={() => onSelect?.(row)}
                            >
                                {renderItem(row)}
                            </button>
                        );
                    })}

                    {!loading && items.length === 0 ? (
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/60">{emptyText}</div>
                    ) : null}
                </div>
            </GroupPanelShell>
        </div>
    );
}