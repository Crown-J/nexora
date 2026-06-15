// apps/nx-ui/src/features/shared/tiered-form/types.ts
// LITE 階段 1 M5：漸進式三層欄位框架 type 定義
//
// 業務語意（Crown 拍板 LITE 設計原則）：
//   🟢 required    必要欄位（不填不能存、系統運作最低需求）
//   🟡 recommended 建議欄位（不填會提醒、可跳過、影響功能但不擋業務）
//   ⚪ advanced    進階欄位（預設收起、80% 客戶用不到、Alt+L 展開）

export type FieldTier = 'required' | 'recommended' | 'advanced';

/**
 * 整個 form 的顯示模式：
 *   - lite     ：只顯示 required、recommended 摺疊（顯示提示+點開）、advanced 隱藏
 *   - expanded ：required + recommended 都展開、advanced 隱藏
 *   - all      ：全部顯示（含 advanced）
 *
 * 鍵盤 Alt+L 三段循環：lite → expanded → all → lite
 */
export type TieredDisplayMode = 'lite' | 'expanded' | 'all';

export const TIER_ICON: Record<FieldTier, string> = {
  required: '🟢',
  recommended: '🟡',
  advanced: '⚪',
};

export const TIER_LABEL_ZH: Record<FieldTier, string> = {
  required: '必要',
  recommended: '建議',
  advanced: '進階',
};

export const MODE_LABEL_ZH: Record<TieredDisplayMode, string> = {
  lite: 'LITE（只必要）',
  expanded: '展開（必要+建議）',
  all: '全顯示（含進階）',
};
