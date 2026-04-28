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

// 對齊 Crown 業界範例風格（全興汽材 / 三和零件 / 老吳輪胎）：
//   個體戶 / 老店感、4-5 字為主、業種口語短、不是連鎖企業

/** 短商號（2 字為主）— 個體戶常用 */
const SHORT_TRADENAMES = [
  '全興', '三和', '永昌', '福昌', '大同', '興順', '長興', '興盛',
  '永發', '太平', '東興', '宏達', '佳源', '聯興', '富強', '進億',
  '誠信', '長安', '大順', '榮昌', '弘昌', '龍興', '金順', '昇發',
  '美利', '國成', '泰豐', '東和', '南興', '北信',
];

/** 姓氏（用於「{姓}記」「老{姓}」格式）*/
const SURNAMES = ['吳', '林', '陳', '王', '張', '李', '黃', '劉', '蔡', '楊', '何', '徐', '許', '謝', '羅'];

/** 名字（用於「阿{名}」格式）*/
const GIVEN_NAMES = ['明', '雄', '強', '志', '榮', '進', '財', '國', '昌', '德'];

/** 口語業種（4 個）*/
const BUSINESS_TYPES = ['汽材', '零件', '汽修', '輪胎'];

/** 地名前綴（少數使用，避免每筆都加太工整）*/
const REGION_PREFIXES = ['北區', '南區', '東區', '中區', '信義', '中山'];

export interface CustomerSpec {
  code: string;
  name: string;
  tier: CustomerTier;
  paymentTerm: string;
  contactName?: string;
}

/**
 * 5 種命名格式輪流（idx % 5，對齊 Crown 範例風格）：
 *   0. {商號}{業種}        — 全興汽材 / 三和零件
 *   1. {姓}記{業種}         — 吳記汽材 / 林記零件
 *   2. 老{姓}{業種}         — 老吳輪胎 / 老林汽修
 *   3. 阿{名}{業種}         — 阿明零件 / 阿強汽修
 *   4. {地區}{商號}{業種}   — 北區永昌汽材（少數出現的 6 字變化、避免每筆工整）
 */
function buildCustomerName(idx: number): string {
  const business = BUSINESS_TYPES[idx % BUSINESS_TYPES.length];
  const formatId = idx % 5;
  switch (formatId) {
    case 0:
      return `${SHORT_TRADENAMES[idx % SHORT_TRADENAMES.length]}${business}`;
    case 1:
      return `${SURNAMES[idx % SURNAMES.length]}記${business}`;
    case 2:
      return `老${SURNAMES[(idx + 3) % SURNAMES.length]}${business}`;
    case 3:
      return `阿${GIVEN_NAMES[idx % GIVEN_NAMES.length]}${business}`;
    case 4:
      return `${REGION_PREFIXES[idx % REGION_PREFIXES.length]}${SHORT_TRADENAMES[(idx + 5) % SHORT_TRADENAMES.length]}${business}`;
    default:
      return `${SHORT_TRADENAMES[idx % SHORT_TRADENAMES.length]}${business}`;
  }
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
    const code = `DEMO02-${tenantCode}-CUST-${String(idx).padStart(3, '0')}`;
    const name = buildCustomerName(idx - 1); // idx 從 1 起，傳 0-based 給 buildCustomerName
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

/** Contact name 對齊個體戶口語感（{姓}老闆 / 老{姓} / {姓}師傅）*/
const CONTACT_GIVEN_NAMES = ['老闆', '老闆娘', '師傅'];
function buildContactName(idx: number): string {
  const surname = SURNAMES[(idx - 1) % SURNAMES.length];
  const given = CONTACT_GIVEN_NAMES[(idx - 1) % CONTACT_GIVEN_NAMES.length];
  return `${surname}${given}`;
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
