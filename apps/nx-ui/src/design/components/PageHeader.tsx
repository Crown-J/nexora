/**
 * File: apps/nx-ui/src/shared/ui/PageHeader.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-PAGE-HEADER-001：通用頁面標題
 */

type Props = {
    title: string;
    subtitle?: string;
};

export function PageHeader({ title, subtitle }: Props) {
    return (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-lg font-semibold text-white">{title}</div>
            {/* ⚠️ text-white/60 是太空風殘留：淺色主題下幾乎看不見。
                本輪只放大字級，配色留待這支舊 PageHeader 退場時一起處理 */}
            {subtitle && <div className="mt-1 text-[14px] text-white/60">{subtitle}</div>}
        </div>
    );
}