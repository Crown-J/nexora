/**
 * File: apps/nx-ui/src/shared/ui/group/GroupPanelShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-GROUP-PANEL-SHELL-001：Group Panel Shell（共用面板外殼）
 *
 * Notes:
 * - 統一兩欄 Group 頁面的面板視覺：玻璃卡 + 標題列 + actions + body
 * - 左面板 / 右面板都可使用
 */

'use client';

import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';

export type GroupPanelShellProps = {
    title: string;
    actions?: ReactNode;
    children: ReactNode;

    className?: string;
    headerClassName?: string;
    bodyClassName?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-SHARED-GROUP-PANEL-SHELL-001-F01
 * 說明：
 * - GroupPanelShell：通用面板外殼
 */
export function GroupPanelShell(props: GroupPanelShellProps) {
    const { title, actions, children, className, headerClassName, bodyClassName } = props;

    return (
        <div className={cx('relative flex flex-col rounded-xl border border-white/10 bg-white/5 p-3', className)}>
            <div className={cx('mb-2 flex items-center justify-between', headerClassName)}>
                <div className="text-sm font-semibold text-white/85">{title}</div>
                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>

            <div className={cx('flex-1', bodyClassName)}>{children}</div>
        </div>
    );
}