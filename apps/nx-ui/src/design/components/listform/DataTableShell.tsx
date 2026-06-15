/**
 * File: apps/nx-ui/src/shared/ui/listform/DataTableShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-LISTFORM-TABLE-001：DataTable shell（glass / sticky header / scroll）
 *
 * Notes:
 * - 支援水平滾動（wheel -> scrollLeft）
 * - 外框與背景一致，避免「表格突然斷掉」的突兀感
 */

'use client';

import { useRef } from 'react';

type Props = {
    children: React.ReactNode;
};

export function DataTableShell(props: Props) {
    /**
     * @FUNCTION_CODE NX00-UI-SHARED-LISTFORM-TABLE-001-F01
     * 說明：
     * - 用 wheel 的 deltaY 轉成 scrollLeft（支援滑鼠滾輪水平移動）
     */
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const onWheel = (e: React.WheelEvent) => {
        const el = wrapRef.current;
        if (!el) return;

        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

        const canScrollX = el.scrollWidth > el.clientWidth;
        if (!canScrollX) return;

        el.scrollLeft += e.deltaY;
        e.preventDefault();
    };

    return (
        <div className="flex-1 rounded-xl border border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div ref={wrapRef} className="h-full overflow-auto rounded-xl" onWheel={onWheel}>
                {/* 這層確保 table 背景不會斷裂 */}
                <div className="min-w-max">{props.children}</div>
            </div>
        </div>
    );
}