// packages/db-core/prisma/seed/demo/lib/customers-catalog.ts
// @FUNCTION_CODE SYS-DEMO-LIB-005-F01
// 客戶 / 同行名稱清單（真實感名稱、不是 CUST-001/SUPPLIER-001）
//
// Crown Q1 拍板分布：VIP 12% / 好客戶 37% / 一般 37% / 觀察 14%

import { SUB_BRANDS } from './parts-catalog';

export type CustomerTier = 'vip' | 'good' | 'normal' | 'observe';

interface CustomerNameTemplate {
  /** 加在「{prefix}{店家識別}{suffix}」中間的店家識別字（按業界常見模式）*/
  identifier: string;
  /** 「{prefix}{identifier}{suffix}」拼成完整店名 */
  prefix?: string;
  suffix: string;
  paymentTerm: string;
  /** VIP/好客戶通常有負責人聯絡人 */
  contactName?: string;
}

const SHOP_PREFIXES = ['信義', '新北', '台中', '高雄', '桃園', '彰化', '台南', '基隆', '宜蘭', '花蓮'];
const SHOP_IDENTIFIERS = ['誠信', '宏達', '大順', '佳源', '長安', '永泰', '榮昌', '富強', '興盛', '進億',
  '東方', '美利', '國成', '泰豐', '聯興', '弘昌', '龍興', '金順', '昇發', '太平'];

export interface CustomerSpec {
  code: string;
  name: string;
  tier: CustomerTier;
  paymentTerm: string;
  contactName?: string;
}

/**
 * 依 tier 分布建客戶清單
 *
 * Crown Q1 拍板分布近似：
 *   VIP 12% / 好客戶 37% / 一般 37% / 觀察 14%
 */
export function buildCustomers(
  tenantCode: 'LITE' | 'PLUS' | 'PRO',
  totalCount: number,
): CustomerSpec[] {
  // 計算各 tier 分布
  const vipCount = Math.max(1, Math.round(totalCount * 0.12));
  const goodCount = Math.round(totalCount * 0.37);
  const observeCount = Math.max(1, Math.round(totalCount * 0.14));
  const normalCount = totalCount - vipCount - goodCount - observeCount;

  const result: CustomerSpec[] = [];
  let idx = 1;

  const buildOne = (tier: CustomerTier): CustomerSpec => {
    const prefix = SHOP_PREFIXES[(idx - 1) % SHOP_PREFIXES.length];
    const ident = SHOP_IDENTIFIERS[(idx - 1) % SHOP_IDENTIFIERS.length];
    const suffix = tier === 'vip' || tier === 'good' ? '汽車材料行' : '汽修廠';
    const code = `DEMO02-${tenantCode}-CUST-${String(idx).padStart(3, '0')}`;
    const name = `${prefix}${ident}${suffix}`;
    const paymentTerm =
      tier === 'vip' ? 'NET60' : tier === 'observe' ? 'PREPAY' : 'NET30';
    const contactName =
      tier === 'vip' || tier === 'good' ? buildContactName(idx) : undefined;
    idx++;
    return { code, name, tier, paymentTerm, contactName };
  };

  for (let i = 0; i < vipCount; i++) result.push(buildOne('vip'));
  for (let i = 0; i < goodCount; i++) result.push(buildOne('good'));
  for (let i = 0; i < normalCount; i++) result.push(buildOne('normal'));
  for (let i = 0; i < observeCount; i++) result.push(buildOne('observe'));

  return result;
}

const FAMILY_NAMES = ['王', '李', '張', '林', '陳', '劉', '黃', '吳', '蔡', '楊'];
const GIVEN_NAMES = ['老闆', '經理', '師傅', '小哥', '先生'];
function buildContactName(idx: number): string {
  const fn = FAMILY_NAMES[(idx - 1) % FAMILY_NAMES.length];
  const gn = GIVEN_NAMES[(idx - 1) % GIVEN_NAMES.length];
  return `${fn}${gn}`;
}

/** 同行 partner 名稱清單（type='S'）*/
export interface InquiryPartnerSpec {
  code: string;
  name: string;
  contactName?: string;
}

const INQUIRY_PARTNER_NAMES = [
  '東方汽車零件', '佳源國際貿易', '聯興零件', '宏達汽材',
  '永泰汽車材料', '泰豐國際', '榮昌貿易', '興盛汽車材料',
  '大順國際', '長安汽材', '富強汽車零件', '進億零件',
  '弘昌貿易', '龍興汽材', '金順國際', '昇發汽車零件',
  '太平國際', '美利汽材',
];

export function buildInquiryPartners(
  tenantCode: 'LITE' | 'PLUS' | 'PRO',
  totalCount: number,
): InquiryPartnerSpec[] {
  const result: InquiryPartnerSpec[] = [];
  for (let i = 0; i < totalCount; i++) {
    const code = `DEMO02-${tenantCode}-INQ-${String(i + 1).padStart(3, '0')}`;
    const name = INQUIRY_PARTNER_NAMES[i % INQUIRY_PARTNER_NAMES.length];
    const contactName = buildContactName(i + 1);
    result.push({ code, name, contactName });
  }
  return result;
}

/** sub-brand 是否有對應 part_brand（template seed）*/
export function listSubBrandNames(): string[] {
  return SUB_BRANDS.map((b) => b.name);
}
