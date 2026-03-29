/**
 * File: apps/nx-ui/src/features/nx03/workflow/mock/workflow.mock.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 銷售流程引導頁 mock：路徑步驟定義、各步驟單據卡片（不呼叫 API）
 *
 * Notes:
 * - key 為 step id，與 pathASteps / pathCSteps 的 id 對齊
 */

import type { DocCard, SalesPath, WorkflowStep } from '@/features/nx03/workflow/types';

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-001-F01
 * 路徑 A：有庫存 → 報價 → 確認 → 銷貨 → 出貨（無 RFQ）
 */
export const pathASteps: WorkflowStep[] = [
  { id: 'stock', label: '查庫存', path: ['A'] },
  { id: 'quote', label: '對客報價 Quote', count: 2, path: ['A'] },
  { id: 'confirm', label: '成交確認', count: 1, path: ['A'] },
  { id: 'so', label: '建立銷貨單 SO', count: 1, path: ['A'] },
  { id: 'ship', label: '出貨', path: ['A'] },
];

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-001-F02
 * 路徑 C：詢同行 RFQ → 報價 → …（含成本帶入情境）
 */
export const pathCSteps: WorkflowStep[] = [
  { id: 'rfq', label: '詢同行報價 RFQ', count: 1, path: ['C'] },
  { id: 'quote', label: '對客報價 Quote', count: 1, path: ['C'] },
  { id: 'confirm', label: '成交確認', path: ['C'] },
  { id: 'so', label: '建立銷貨單 SO', path: ['C'] },
  { id: 'ship', label: '出貨', path: ['C'] },
];

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-001-F03
 * 依 step id 索引的 mock 單據；至少 rfq / quote / so 各 2 筆
 */
export const mockDocsByStep: Record<string, DocCard[]> = {
  stock: [
    {
      docNo: 'INV-CHECK-01',
      title: '倉別 A：水箱總成',
      subtitle: '可用量：12｜安全庫存：4',
      status: '庫存足夠',
      statusVariant: 'confirmed',
      date: '2024-01-22',
    },
    {
      docNo: 'INV-CHECK-02',
      title: '倉別 B：煞車來令',
      subtitle: '可用量：3｜建議補貨',
      status: '偏低',
      statusVariant: 'pending',
      date: '2024-01-21',
    },
  ],
  rfq: [
    {
      docNo: 'RFQ-S-101',
      title: '車用 ECU 模組',
      subtitle: '供應商：台科科技有限公司',
      status: '待供應商回覆',
      statusVariant: 'pending',
      date: '2024-01-22',
    },
    {
      docNo: 'RFQ-S-102',
      title: '散熱風扇成本確認',
      subtitle: '供應商：新旺電子股份有限公司',
      status: '已回覆',
      statusVariant: 'replied',
      date: '2024-01-21',
    },
  ],
  quote: [
    {
      docNo: 'QT-S-201',
      title: 'VAG 水箱報價',
      subtitle: '客戶：祥和汽車修配廠',
      status: '已發出',
      statusVariant: 'pending',
      date: '2024-01-22',
    },
    {
      docNo: 'QT-S-202',
      title: '煞車來令片',
      subtitle: '客戶：大順汽車百貨',
      status: '客戶確認中',
      statusVariant: 'confirmed',
      date: '2024-01-20',
    },
  ],
  confirm: [
    {
      docNo: 'CFM-009',
      title: '報價 QT-S-198 待回簽',
      subtitle: '客戶：桃園保修站',
      status: '待客戶確認',
      statusVariant: 'pending',
      date: '2024-01-19',
    },
  ],
  so: [
    {
      docNo: 'SO-2401-001',
      title: '銷貨單 - 祥和汽車',
      subtitle: '共 3 項料號',
      status: '草稿',
      statusVariant: 'pending',
      date: '2024-01-22',
    },
    {
      docNo: 'SO-2401-002',
      title: '銷貨單 - 大順汽車百貨',
      subtitle: '共 1 項料號',
      status: '已確認',
      statusVariant: 'confirmed',
      date: '2024-01-20',
    },
  ],
  ship: [],
};

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-001-F04
 */
export function getStepsForPath(path: SalesPath): WorkflowStep[] {
  return path === 'A' ? pathASteps : pathCSteps;
}

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-001-F05
 */
export function getFirstStepId(path: SalesPath): string {
  return getStepsForPath(path)[0]!.id;
}
