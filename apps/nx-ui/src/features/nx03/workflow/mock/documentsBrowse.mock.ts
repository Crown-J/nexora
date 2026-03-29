/**
 * File: apps/nx-ui/src/features/nx03/workflow/mock/documentsBrowse.mock.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 「瀏覽銷貨單據」分頁：三步驟（報價／銷貨／成交）mock 單據
 *
 * Notes:
 * - 報價：沒庫存找零件、有庫存已報價客戶考慮中；銷貨：撿貨／待配送／配送中
 */

import type { DocCard, WorkflowStep } from '@/features/nx03/workflow/types';

/** 簡化流程三步驟（不依路徑 A/C） */
export const browseSteps: WorkflowStep[] = [
  { id: 'quote', label: '報價', count: 2, path: ['A'] },
  { id: 'sales', label: '銷貨', count: 3, path: ['A'] },
  { id: 'deal', label: '成交', count: 2, path: ['A'] },
];

/**
 * @FUNCTION_CODE NX03-WKFL-MOCK-003-F01
 */
export const mockBrowseDocsByStep: Record<string, DocCard[]> = {
  quote: [
    {
      docNo: 'QT-BROWSE-01',
      title: 'Bosch 煞車來令（前）',
      subtitle: '情境：沒庫存，幫客戶找零件｜客戶：祥和汽車修配廠',
      status: '找料中',
      statusVariant: 'pending',
      date: '2024-01-22',
    },
    {
      docNo: 'QT-BROWSE-02',
      title: 'VAG 水箱總成',
      subtitle: '情境：有庫存，已報價，客戶還在考慮｜客戶：大順汽車百貨',
      status: '待客戶回覆',
      statusVariant: 'confirmed',
      date: '2024-01-21',
    },
  ],
  sales: [
    {
      docNo: 'SO-2401-101',
      title: '銷貨單 - 撿貨中',
      subtitle: '倉別：A 倉｜3 項',
      status: '撿貨中',
      statusVariant: 'pending',
      date: '2024-01-22',
    },
    {
      docNo: 'SO-2401-102',
      title: '銷貨單 - 待配送',
      subtitle: '客戶：桃園保修站',
      status: '待配送',
      statusVariant: 'replied',
      date: '2024-01-22',
    },
    {
      docNo: 'SO-2401-103',
      title: '銷貨單 - 配送中',
      subtitle: '物流：黑貓｜單號 9527****',
      status: '配送中',
      statusVariant: 'confirmed',
      date: '2024-01-21',
    },
  ],
  deal: [
    {
      docNo: 'DEAL-2401-01',
      title: '成交通知 - 祥和汽車',
      subtitle: 'SO-2401-088 已結案',
      status: '已成交',
      statusVariant: 'done',
      date: '2024-01-20',
    },
    {
      docNo: 'DEAL-2401-02',
      title: '成交通知 - 大順汽車百貨',
      subtitle: 'SO-2401-076 已結案',
      status: '已成交',
      statusVariant: 'done',
      date: '2024-01-19',
    },
  ],
};
