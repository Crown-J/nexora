/**
 * File: apps/nx-ui/src/shared/ui/group/GroupSplitShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-GROUP-SPLIT-SHELL-001：Group Split Shell（兩欄版型外殼）
 *
 * Notes:
 * - 統一「左群組 / 右成員」頁面的 layout（高度、gap、左右欄位）
 * - leftWidth 可調整（預設 360px）
 */

'use client';

import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';

export type GroupSplitShellProps = {
    left: ReactNode;
    right: ReactNode;

    leftWidthClassName?: string; // e.g. 'w-[360px]'
    className?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-SHARED-GROUP-SPLIT-SHELL-001-F01
 * 說明：
 * - GroupSplitShell：兩欄 group layout
 */
export function GroupSplitShell(props: GroupSplitShellProps) {
    const { left, right, leftWidthClassName = 'w-[360px]', className } = props;

    return (
        <div className={cx('flex h-[calc(100vh-200px)] gap-3', className)}>
            <div className={leftWidthClassName}>{left}</div>
            <div className="flex-1">{right}</div>
        </div>
    );
}