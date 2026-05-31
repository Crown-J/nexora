// apps/nx-ui/src/features/satellite/SatelliteSection.tsx
// v1.2 對齊軌 階段 E P5：衛星表「預設 + 展開看全部」共用範式
//
// 對齊 v1.1 §3.3：
// - 預設只顯示「主」/「前 N 筆 summary」 + 「展開全部」按鈕
// - 點開展開後顯示完整 list（inline、不開 modal）
// - 衛星 CRUD 通常需要獨立 endpoint、本元件預設提供 read-only 視角
//   寫操作（新增/編輯/刪除）由各 SectionShell 自己決定怎麼接（或 redirect 獨立頁）
'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

export type SatelliteSectionStatus = 'loading' | 'empty' | 'backend-missing' | 'ready';

export type SatelliteSectionProps = {
  /** 衛星表中文標題、e.g. '送貨地址（多筆）' */
  title: string;
  /** 衛星表簡介、e.g. 'v1.1 §3.3 預設 + 展開看全部' */
  description?: string;
  /** 總筆數、用於 badge 顯示 */
  count?: number;
  /** 狀態：loading 中 / empty 無資料 / backend-missing 後端 endpoint 待建 / ready 渲染 */
  status: SatelliteSectionStatus;
  /** ready 狀態時的 summary（預設摺疊顯示）— e.g. 「主送貨地址：台北市 ...」 */
  summary?: React.ReactNode;
  /** 展開後完整 list 內容 */
  expandedContent?: React.ReactNode;
  /** 提示文字（顯示在右上角） */
  hint?: string;
};

export function SatelliteSection({
  title,
  description,
  count,
  status,
  summary,
  expandedContent,
  hint,
}: SatelliteSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C]/40">
      <div className="flex items-center gap-3 border-b border-[#2A2A30] px-3 py-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E8E8EB]">
              {title}
            </span>
            {typeof count === 'number' ? (
              <span className="rounded bg-[#2A2A30] px-1.5 py-0.5 text-[10px] text-[#B8B8C0]">
                {count} 筆
              </span>
            ) : null}
            {status === 'backend-missing' ? (
              <span className="rounded border border-[#E26060]/40 bg-[#E26060]/10 px-1.5 py-0.5 text-[10px] text-[#E26060]">
                後端待建
              </span>
            ) : status === 'loading' ? (
              <span className="text-[10px] text-[#5A5A60]">載入中...</span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-[10px] text-[#5A5A60]">{description}</p>
          ) : null}
        </div>
        {hint ? <span className="text-[10px] text-[#5A5A60]">{hint}</span> : null}
        {status === 'ready' && expandedContent ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'rounded border px-2 py-1 text-[11px] transition-colors',
              open
                ? 'border-[#E8A020]/60 bg-[#E8A020]/10 text-[#E8A020]'
                : 'border-[#3A3A42] text-[#888892] hover:border-[#5A5A60]',
            )}
          >
            {open ? '收合' : '展開全部'}
          </button>
        ) : null}
      </div>

      <div className="px-3 py-2.5">
        {status === 'loading' ? (
          <div className="text-xs text-[#5A5A60]">載入中...</div>
        ) : status === 'empty' ? (
          <div className="text-xs text-[#5A5A60]">尚無資料</div>
        ) : status === 'backend-missing' ? (
          <div className="text-xs text-[#5A5A60]">
            後端 module 尚未建立、本欄目前為 UI placeholder；列入 closure 後續軌。
          </div>
        ) : open ? (
          expandedContent ?? <div className="text-xs text-[#5A5A60]">無展開內容</div>
        ) : (
          summary ?? <div className="text-xs text-[#5A5A60]">主筆位摺疊中、點「展開全部」查看</div>
        )}
      </div>
    </div>
  );
}
