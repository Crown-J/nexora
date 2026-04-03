/**
 * Role⇄View 矩陣欄位標籤（與 nx00_role_view 五欄對應）。
 * canToggleActive：啟用／停用（PATCH active 等），非資料列硬刪。
 */
import type { PermKey } from './types';

export const PERM_MATRIX_COLS: { key: PermKey; label: string; hint?: string }[] = [
  { key: 'canRead', label: '瀏覽', hint: '進入畫面、查看列表與明細' },
  { key: 'canCreate', label: '新增' },
  { key: 'canUpdate', label: '修改' },
  { key: 'canToggleActive', label: '啟／停用', hint: '啟用狀態切換（非刪除資料列）' },
  { key: 'canExport', label: '匯出' },
];
