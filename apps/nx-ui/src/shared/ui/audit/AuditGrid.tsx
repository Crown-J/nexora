/**
 * File: apps/nx-ui/src/shared/ui/audit/AuditGrid.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-AUDIT-001：Audit Grid（建立/更新時間與人員）
 *
 * Notes:
 * - 基本資料頁面通用：右側表單底部顯示稽核資訊（唯讀、可複製）
 */

'use client';

import { formatDatetimeZhTw } from '@/shared/format/datetime';

type Props = {
    createdAt: string;
    createdByText: string;
    updatedAt: string | null;
    updatedByText: string;
};

const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none cursor-text select-text';

export function AuditGrid(props: Props) {
    const { createdAt, createdByText, updatedAt, updatedByText } = props;

    return (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 text-xs font-semibold text-white/70">稽核資訊（唯讀）</div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <div className="mb-1 text-[11px] text-white/55">建立時間</div>
                    <input className={inputClass} value={formatDatetimeZhTw(createdAt)} readOnly />
                </div>

                <div>
                    <div className="mb-1 text-[11px] text-white/55">更新時間</div>
                    <input className={inputClass} value={updatedAt ? formatDatetimeZhTw(updatedAt) : '-'} readOnly />
                </div>

                <div>
                    <div className="mb-1 text-[11px] text-white/55">建立人</div>
                    <input className={inputClass} value={createdByText || '-'} readOnly />
                </div>

                <div>
                    <div className="mb-1 text-[11px] text-white/55">更新人</div>
                    <input className={inputClass} value={updatedByText || '-'} readOnly />
                </div>
            </div>

            <div className="mt-2 text-[11px] text-white/35">
                ※ 若仍顯示 id，代表後端 DTO 尚未回傳 displayName（後續補齊即可自動顯示）。
            </div>
        </div>
    );
}