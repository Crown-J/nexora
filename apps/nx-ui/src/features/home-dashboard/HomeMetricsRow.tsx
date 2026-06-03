// apps/nx-ui/src/features/home-dashboard/HomeMetricsRow.tsx
// 首頁儀表板上方：5 個等寬「可由使用者設定」數據格
//
// 段 A 範圍：純殼層、5 格全部顯示「+ 點擊設定數據」邀請框
// 段 B 範圍：點 + 跳 modal（依權限過濾 + KPI 鎖）+ localStorage 持久化
// 段 C 範圍：依數據型別 render 4 種圖（圓餅 / 環形 / 大數字 / 趨勢線）
//
// 設計語言（沿用既有 MasterTopBar / Win8 磚體）：
// - 背景：bg-[#11111A]/70 backdrop-blur-sm
// - border：zinc-800（一般）/ amber-500/60（hover、active）
// - radius：rounded-xl
// - text：zinc-100 主 / zinc-500 次 / zinc-700 灰
// - 配色 accent：amber（NEXORA 星系金黃色、跟產品 LOGO 一致）

'use client';

import { Plus } from 'lucide-react';

const METRIC_SLOT_COUNT = 5;

export function HomeMetricsRow() {
  // 段 A：5 格全 placeholder「未設定」、實際設定機制段 B 接
  return (
    <section className="w-full">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: METRIC_SLOT_COUNT }).map((_, idx) => (
          <EmptyMetricInvite key={idx} slotIndex={idx} />
        ))}
      </div>
    </section>
  );
}

/** 空格邀請框：「+ 點擊設定數據」、虛線、不是壞掉的空白 */
function EmptyMetricInvite({ slotIndex }: { slotIndex: number }) {
  return (
    <button
      type="button"
      aria-label={`設定第 ${slotIndex + 1} 個數據`}
      onClick={() => {
        // 段 B：跳出可選數據清單 modal
        // eslint-disable-next-line no-console
        console.log('[home-metrics] slot', slotIndex, '尚未接 modal（段 B 做）');
      }}
      className={[
        'group flex aspect-[3/2] min-h-[140px] flex-col items-center justify-center gap-2',
        'rounded-xl border-2 border-dashed border-zinc-800',
        'bg-[#11111A]/40 backdrop-blur-sm transition-colors',
        'hover:border-amber-500/60 hover:bg-[#1a1a25]',
        'cursor-pointer text-zinc-600 hover:text-amber-300',
      ].join(' ')}
    >
      <Plus className="size-7" strokeWidth={1.5} />
      <span className="text-sm font-medium tracking-wide">點擊設定數據</span>
    </button>
  );
}
