/**
 * 各模組「中心」首頁 hub 卡片統一尺寸（主檔／採購／後續中心共用）
 * padding 20px → Tailwind `p-5`；圓角 12px → `rounded-xl`
 */
export const HUB_CARD_WIDTH = 220;
export const HUB_CARD_HEIGHT = 160;

/** 與設計稿一致之 px（對照 Tailwind：p-5 = 20px、rounded-xl = 12px） */
export const HUB_CARD_PADDING_PX = 20;
export const HUB_CARD_RADIUS_PX = 12;

/** Hub 卡片外殼（不含 hover／互動）；請與 `cn(...)` 併用 */
export const hubCardShellBaseClass =
  'glass-card box-border h-[160px] w-[220px] shrink-0 overflow-hidden rounded-xl border border-border/80 p-5 text-left shadow-sm';
