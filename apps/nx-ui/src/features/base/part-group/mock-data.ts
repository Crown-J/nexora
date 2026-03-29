/**
 * 零件族群主檔 mock — 對應資料表 nx00_part_group（前端 camelCase）
 *
 * - id：系統內碼，畫面不顯示
 * - carBrandId：FK → nx00_car_brand（mock 取自汽車廠牌）
 */

import { MOCK_BASE_BRANDS, type BaseBrandRow } from '@/features/base/brand/mock-data';

export type BasePartGroupRow = {
  id: string;
  name: string;
  carBrandId: string;
  seg1: string;
  seg2: string;
  seg3: string;
  seg4: string;
  seg5: string;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

/** 族群主檔可選之汽車廠牌（與 nx00_car_brand mock 對齊：僅 vehicle） */
export function getMockCarBrandsForPartGroup(): BaseBrandRow[] {
  return MOCK_BASE_BRANDS.filter((b) => b.kind === 'vehicle');
}

export const MOCK_BASE_PART_GROUPS: BasePartGroupRow[] = [
  {
    id: 'pg-1',
    name: '煞車系統',
    carBrandId: 'b1',
    seg1: 'BRK',
    seg2: '*',
    seg3: '',
    seg4: '',
    seg5: '',
    sortNo: 20,
    isActive: true,
    createdAt: '2025-01-10T08:00:00.000Z',
    createdBy: '系統',
    updatedAt: '2025-03-01T10:30:00.000Z',
    updatedBy: '王管理',
  },
  {
    id: 'pg-2',
    name: '引擎潤滑',
    carBrandId: 'b1',
    seg1: 'ENG',
    seg2: 'OIL',
    seg3: '*',
    seg4: '',
    seg5: '',
    sortNo: 11,
    isActive: true,
    createdAt: '2025-01-12T09:15:00.000Z',
    createdBy: '李小華',
    updatedAt: '2025-02-20T14:00:00.000Z',
    updatedBy: '李小華',
  },
  {
    id: 'pg-3',
    name: '碟煞耗材',
    carBrandId: 'b2',
    seg1: 'BRK',
    seg2: 'DISC',
    seg3: '',
    seg4: '',
    seg5: '',
    sortNo: 21,
    isActive: true,
    createdAt: '2025-02-01T11:00:00.000Z',
    createdBy: '王管理',
    updatedAt: '2025-02-01T11:00:00.000Z',
    updatedBy: '王管理',
  },
  {
    id: 'pg-4',
    name: '空調濾網（本田）',
    carBrandId: 'b2',
    seg1: 'CAB',
    seg2: 'FLT',
    seg3: 'AC',
    seg4: '',
    seg5: '',
    sortNo: 35,
    isActive: false,
    createdAt: '2024-12-05T16:20:00.000Z',
    createdBy: '系統',
    updatedAt: '2025-01-28T08:45:00.000Z',
    updatedBy: '王管理',
  },
];
