/**
 * 往來對象 mock（廠商／客戶）
 */

export type PartnerKind = 'vendor' | 'customer';

export type BasePartnerRow = {
  id: string;
  code: string;
  name: string;
  taxId: string;
  phone: string;
  kind: PartnerKind;
  isActive: boolean;
};

export const MOCK_BASE_PARTNERS: BasePartnerRow[] = [
  {
    id: 'v1',
    code: 'V-BOSCH-TW',
    name: '台灣博世',
    taxId: '12345678',
    phone: '02-2700-0000',
    kind: 'vendor',
    isActive: true,
  },
  {
    id: 'v2',
    code: 'V-MANN-ASIA',
    name: '曼牌亞洲',
    taxId: '87654321',
    phone: '07-123-4567',
    kind: 'vendor',
    isActive: true,
  },
  {
    id: 'c1',
    code: 'C-TT-MOTORS',
    name: '大同汽車材料行',
    taxId: '11112222',
    phone: '04-222-3333',
    kind: 'customer',
    isActive: true,
  },
  {
    id: 'c2',
    code: 'C-YC-PARTS',
    name: '永昌汽材',
    taxId: '33334444',
    phone: '06-555-6666',
    kind: 'customer',
    isActive: false,
  },
];
