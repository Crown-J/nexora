// apps/nx-ui/src/features/sale/ui/inquiry/mock-data.ts
/**
 * R7 Phase 7：同行調貨初始 Mock 資料（3 筆 RFQ 涵蓋 3 種狀態）。
 *
 * 與狀態追蹤「詢價待回覆」整合：
 *   這 3 筆取代原 hub/mock-data/scenario.ts 的 MOCK_INQUIRY_TODOS。
 *   狀態追蹤待辦從 store 動態衍生（status=waiting|responded）。
 *
 * 日期刻意錯開，讓 demo 能看到「等待天數染色」：
 *   - rfq-1：2 天前建立（淡灰）
 *   - rfq-2：5 天前建立（淡金）
 *   - rfq-3：9 天前建立（淡紅，逾期）
 */

import type { RFQ } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const INITIAL_MOCK_RFQS: RFQ[] = [
  // 已有 2 家同行回覆，等待業務比價採用
  {
    id: 'rfq-mock-1',
    rfqNumber: 'RFQ-2604-00087',
    sourceCustomer: {
      code: 'A0087',
      name: '新竹汽材行',
      tier: 'A',
    },
    part: {
      sku: 'SKU-031',
      name: '空氣濾心 Skoda Superb',
    },
    quantity: 3,
    vendorQuotes: [
      {
        id: 'vq-mock-1',
        vendorCode: 'V012',
        vendorName: '桃園汽材',
        price: 380,
        quotedAt: new Date(Date.now() - 1.5 * DAY_MS),
        notes: '3 天內可到',
      },
      {
        id: 'vq-mock-2',
        vendorCode: 'V023',
        vendorName: '台中源豐',
        price: 420,
        quotedAt: new Date(Date.now() - 1 * DAY_MS),
      },
    ],
    status: 'responded',
    createdAt: new Date(Date.now() - 2 * DAY_MS),
    createdBy: '王小明',
  },

  // 剛建立、還沒同行回覆（給業務點進去輸入第一家）
  {
    id: 'rfq-mock-2',
    rfqNumber: 'RFQ-2604-00091',
    sourceCustomer: {
      code: 'B0156',
      name: '台中順達汽車',
      tier: 'B',
    },
    part: {
      sku: 'SKU-042',
      name: '火星塞 VW Golf',
    },
    quantity: 4,
    vendorQuotes: [],
    status: 'waiting',
    createdAt: new Date(Date.now() - 5 * DAY_MS),
    createdBy: '王小明',
  },

  // 久未處理（逾期染紅）
  {
    id: 'rfq-mock-3',
    rfqNumber: 'RFQ-2604-00094',
    sourceCustomer: {
      code: 'C0421',
      name: '高雄修車場',
      tier: 'C',
    },
    part: {
      sku: 'SKU-055',
      name: '方向盤 BMW E46',
    },
    quantity: 1,
    vendorQuotes: [],
    status: 'waiting',
    createdAt: new Date(Date.now() - 9 * DAY_MS),
    createdBy: '王小明',
  },
];
