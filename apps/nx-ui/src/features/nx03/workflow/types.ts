/**
 * File: apps/nx-ui/src/features/nx03/workflow/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷售作業流程引導頁共用型別（路徑、步驟、單據卡片）
 *
 * Notes:
 * - 與 mock 資料及 UI 元件對齊；不依賴後端 DTO
 */

/** 銷售路徑：A = 有庫存直接成交；C = 無庫存，詢同行後成交 */
export type SalesPath = 'A' | 'C';

/** 流程步驟定義（步驟條與面板共用） */
export interface WorkflowStep {
  id: string;
  /** 步驟名稱 */
  label: string;
  /** 待處理筆數（有值才顯示於徽章） */
  count?: number;
  /** 此步驟所屬路徑 */
  path: SalesPath[];
}

/** 單據列表列（mock 卡片） */
export interface DocCard {
  docNo: string;
  title: string;
  /** 如「供應商：…」或「客戶：…」 */
  subtitle: string;
  status: string;
  statusVariant: 'pending' | 'replied' | 'confirmed' | 'done';
  date: string;
}
