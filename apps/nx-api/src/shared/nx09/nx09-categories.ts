// apps/nx-api/src/shared/nx09/nx09-categories.ts
// NX09 4 大分類 alignment（Crown overview v1.0 §3.1 + IMPL-01 Phase 2）
//
// 業務語意：
//   - 既有 6 KmArticle category（SO/BP/RG/CX/EM/OT）保留、本軌純擴 enum 不破壞
//   - 新增 4 大語意對齊（FAQ / SOP / ANNOUNCE / TRAIN）+ 既有 enum 並存
//   - 既有 5 Document docCategory（CR/SP/JD/FM/OT）保留、語意已涵蓋規格 / 規章 / 廠商文件 / 版本歷史
//   - 既有 endpoint 行為 100% 保留（純 additive enum 擴）
//
// Hank Q-H2 拍板：service 0 動、僅 DTO @IsIn 擴 + 提供 shared constant

/** KmArticle 9 大 category（既有 6 + 新 3）。 */
export const NX09_KM_ARTICLE_CATEGORIES = [
  // ===== 既有 6（v7_baseline、不破壞既有 row）=====
  'SO', // 系統操作（schema doc）
  'BP', // 業務流程 ≈ SOP
  'RG', // 規章制度
  'CX', // 客戶處理 ≈ FAQ 子集
  'EM', // 緊急狀況
  'OT', // 其他
  // ===== 本軌新增 3（Crown overview v1.0 §3.1 4 大分類補齊）=====
  'FQ', // FAQ 常見問題（CX 範圍擴）
  'AN', // ANNOUNCE 公告
  'TR', // TRAIN 教育訓練
] as const;

export type Nx09KmArticleCategory = (typeof NX09_KM_ARTICLE_CATEGORIES)[number];

/** Document 5 大 docCategory（既有 v7_baseline、本軌不擴）。 */
export const NX09_DOCUMENT_CATEGORIES = [
  'CR', // 章則彙編
  'SP', // SOP
  'JD', // 工作說明書
  'FM', // 表單
  'OT', // 其他
] as const;

export type Nx09DocumentCategory = (typeof NX09_DOCUMENT_CATEGORIES)[number];

/** SystemManual 3 大 category（M1 新表）。 */
export const NX09_SYSTEM_MANUAL_CATEGORIES = [
  'GENERAL',
  'FAQ',
  'TROUBLESHOOT',
] as const;

export type Nx09SystemManualCategory = (typeof NX09_SYSTEM_MANUAL_CATEGORIES)[number];

/** Crown overview v1.0 §3.1 4 大分類對 KmArticle category 映射：
 *  - FAQ 常見問題 → FQ（新）or CX（既有客戶處理）
 *  - SOP 標準作業 → BP（既有業務流程）
 *  - ANNOUNCE 公告 → AN（新）
 *  - TRAIN 教育訓練 → TR（新）
 */
export const NX09_KM_FOUR_CATEGORY_MAPPING = {
  FAQ: ['FQ', 'CX'],
  SOP: ['BP'],
  ANNOUNCE: ['AN'],
  TRAIN: ['TR'],
} as const;
