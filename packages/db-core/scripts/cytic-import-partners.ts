/**
 * packages/db-core/scripts/cytic-import-partners.ts
 *
 * 恆迎客戶 / 廠商 / 散客 / 同行 CSV 4109 筆匯入（2026-06-21 Hank）
 *
 * 流程：
 *   Phase 1 — buildWarehouses: M01 主倉改名 Z00 + 新增 Z01~Z04 (5 倉位)
 *   Phase 2 — buildCustomerGrades: 建 A/B/C/D 4 個預設客戶等級
 *   Phase 3 — importPartners: 4109 筆過濾分類灌入
 *   Phase 4 — cleanup: 刪 CSV
 *
 * 拍板 (Q40~Q49 全照 Hank 建議)：
 *   Q40: N 國外供應商 → partner_S
 *   Q41: O 材料行 → partner_O 同行
 *   Q42: Z00~Z04 → nx01_warehouse
 *   Q43: M 現購 → partner_S
 *   Q44: V 不往來 → partner_C + isActive=false
 *   Q45: Y 員工自己 → 不灌
 *   Q46: 3XX-結束 → isActive=false
 *   Q47: 5XX-待開檔 → 跳過
 *   Q48: 備註/附註 全清 (PII)
 *   Q49: 新編號自動產 + legacyCode 灌舊號
 *
 * 編號 prefix mapping（執行長提供）：
 *   A=雙北 / B=桃園中壢 / C=新竹 / D=苗栗 / E=宜花東 / F=台中 / G=南投 / H=雲嘉 / I=台南 / J=高雄 / K=屏東 → C 保養廠
 *   L=現銷 → L 散客
 *   M=現購 / N=國外 → S 供應商
 *   O=材料行 → O 同行
 *   V=不往來 → C + isActive=false
 *   W=房東會計師 / X=庶務用品 → V 一般廠商
 *   Y=人事資料 → skip
 *   Z=銀行 / 倉位 / NULL → skip
 *
 * 執行: pnpm exec tsx scripts/cytic-import-partners.ts
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SYSADMIN_USER_ID = 'NX01USER0000001';
const CYTIC_TENANT_CODE = 'TW-100001';

const CSV_PATH = path.resolve(__dirname, '../../../docs/專案/測試資料/20260604_客戶資料.csv');

// ─── partnerType mapping by prefix ─────────────────────────────
type PartnerType = 'C' | 'S' | 'O' | 'L' | 'V';
const PREFIX_TO_TYPE: Record<string, PartnerType> = {
  A: 'C', B: 'C', C: 'C', D: 'C', E: 'C', F: 'C', G: 'C', H: 'C', I: 'C', J: 'C', K: 'C',
  L: 'L',
  M: 'S', N: 'S',
  O: 'O',
  V: 'C', // 不往來客戶 → C + isActive=false
  W: 'V', X: 'V',
  // Y, Z → 不灌
};

// ─── 5 倉位範式（執行長拍板）───────────────────────────────────
const WAREHOUSES = [
  { code: 'Z00', name: '恆迎-總倉', isMain: true,  sortNo: 1, remark: '總部主倉、依公司地址' },
  { code: 'Z01', name: '恆迎-台北', isMain: false, sortNo: 2, remark: '台北衛星倉' },
  { code: 'Z02', name: '恆迎-新莊', isMain: false, sortNo: 3, remark: '新莊衛星倉' },
  { code: 'Z03', name: '北投倉',   isMain: false, sortNo: 4, remark: '北投衛星倉' },
  { code: 'Z04', name: '林口倉',   isMain: false, sortNo: 5, remark: '林口衛星倉' },
];

// ─── 4 客戶等級預設 (執行長之後可調毛利率) ───────────────────
const CUSTOMER_GRADES = [
  { code: 'A', name: 'A 級客戶', marginPct: 15.0, sortNo: 1 },
  { code: 'B', name: 'B 級客戶', marginPct: 20.0, sortNo: 2 },
  { code: 'C', name: 'C 級客戶', marginPct: 25.0, sortNo: 3 },
  { code: 'D', name: 'D 級客戶', marginPct: 30.0, sortNo: 4 },
];

// ─── helper ────────────────────────────────────────────────────
function log(phase: string, msg: string) {
  console.log(`[${phase}] ${msg}`);
}

function clean(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'NULL' || s === '無' || s === '同上') return null;
  return s;
}

function cleanPostalCode(v: any): string | null {
  const s = clean(v);
  if (!s) return null;
  const m = s.match(/(\d{3})/);
  return m ? m[1] : null;
}

function stripNamePrefix(name: string): { name: string; isClosed: boolean; isPending: boolean } {
  let n = name.trim();
  let isClosed = false;
  let isPending = false;
  if (n.startsWith('3')) {
    isClosed = true;
    n = n.slice(1).trim();
  } else if (n.startsWith('5')) {
    isPending = true;
    n = n.slice(1).trim();
  }
  return { name: n, isClosed, isPending };
}

// ─── Phase 1: buildWarehouses ─────────────────────────────────
async function buildWarehouses(prisma: PrismaClient, tenantId: string) {
  log('WAREHOUSE', '處理 5 倉位（Z00~Z04）');

  // 找既有主倉 M01（onboarding 建的）
  const existing = await prisma.nx01Warehouse.findFirst({
    where: { tenantId, code: 'M01' },
  });
  if (!existing) {
    throw new Error('找不到 onboarding 建的 M01 主倉');
  }

  // 找主據點 HQ
  const hqSite = await prisma.nx01Site.findFirst({
    where: { tenantId, code: 'HQ' },
  });
  if (!hqSite) throw new Error('找不到 HQ 主據點');

  // 1. M01 → Z00 改名（保留 isMain=true）
  await prisma.nx01Warehouse.update({
    where: { id: existing.id },
    data: {
      code: WAREHOUSES[0].code,
      name: WAREHOUSES[0].name,
      remark: WAREHOUSES[0].remark,
      sortNo: WAREHOUSES[0].sortNo,
      updatedBy: SYSADMIN_USER_ID,
    },
  });
  log('WAREHOUSE', `✓ M01 → ${WAREHOUSES[0].code} ${WAREHOUSES[0].name}`);

  // 2. 新增 Z01~Z04
  for (const w of WAREHOUSES.slice(1)) {
    await prisma.nx01Warehouse.create({
      data: {
        tenantId,
        siteId: hqSite.id,
        code: w.code,
        name: w.name,
        remark: w.remark,
        sortNo: w.sortNo,
        isMain: w.isMain,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
    log('WAREHOUSE', `✓ 新增 ${w.code} ${w.name}`);
  }
  log('WAREHOUSE', `共 5 倉位（1 主倉 + 4 衛星倉）`);
}

// ─── Phase 2: buildCustomerGrades ──────────────────────────────
async function buildCustomerGrades(prisma: PrismaClient, tenantId: string) {
  log('GRADE', '建 A/B/C/D 4 個客戶等級');
  for (const g of CUSTOMER_GRADES) {
    await prisma.nx01CustomerGrade.create({
      data: {
        tenantId,
        code: g.code,
        name: g.name,
        marginPct: g.marginPct,
        sortNo: g.sortNo,
        isActive: true,
        isBuiltin: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
    log('GRADE', `✓ ${g.code} ${g.name} (margin ${g.marginPct}%)`);
  }
}

// ─── Phase 3: importPartners ───────────────────────────────────
type ImportStats = {
  total: number;
  imported: number;
  skipped: number;
  byType: Record<string, number>;
  errors: Array<{ row: number; reason: string }>;
};

async function importPartners(prisma: PrismaClient, tenantId: string): Promise<ImportStats> {
  log('IMPORT', `讀 CSV: ${CSV_PATH}`);
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows: Record<string, any>[] = parse(content, {
    columns: (header: string[]) => header.map(h => h.trim()),
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  });
  log('IMPORT', `CSV 載入 ${rows.length} 筆`);

  // 國別 TW
  const twCountry = await prisma.nx01Country.findFirstOrThrow({ where: { code: 'TWN' } });

  // typeCounter (L 從 2 起跳、L0001 已 onboarding 建散客)
  const counter: Record<PartnerType, number> = { C: 0, S: 0, O: 0, L: 1, V: 0 };

  const stats: ImportStats = {
    total: rows.length,
    imported: 0,
    skipped: 0,
    byType: { C: 0, S: 0, O: 0, L: 0, V: 0 },
    errors: [],
  };

  // header 欄位名（取自 CSV 第一行、執行長給的格式）
  const COL_CODE = '客戶編號';
  const COL_CATEGORY = '客戶類別代碼（A=台北保養廠/O=材料行/N=廠商等）';
  const COL_NAME = '客戶名稱';
  const COL_NAME_EN = '英文名稱';
  const COL_SHORT = '客戶簡稱';
  const COL_CONTACT = '連絡人';
  const COL_OWNER = '負責人';
  const COL_CLOSED_AT = '停業日期';
  const COL_ZIP_SHIPPING = '郵遞區號';
  const COL_ADDR_SHIPPING = '送貨地址';
  const COL_TAX_ID = '統一編號';
  const COL_ZIP_BILLING = '發票郵遞區號';
  const COL_ADDR_BILLING = '發票地址';
  const COL_PHONE = '電話號碼';
  const COL_FAX = '傳真機';
  const COL_EMAIL = 'E-mail帳號';
  const COL_WEBSITE = '網址';
  const COL_CREDIT_LIMIT = '信用額度';
  const COL_MOBILE = '行動電話';

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2; // 1-based + header
    const row = rows[i];

    const legacyCode = clean(row[COL_CODE]);
    if (!legacyCode) {
      stats.skipped++;
      continue;
    }

    const prefix = legacyCode[0]?.toUpperCase();
    const category = clean(row[COL_CATEGORY]);

    // Skip rules
    if (!prefix) {
      stats.skipped++;
      continue;
    }
    if (prefix === 'Y') {
      stats.skipped++;
      continue;
    }
    if (prefix === 'Z') {
      stats.skipped++;
      continue;
    }
    if (category === 'M') {
      stats.skipped++;
      continue;
    }
    if (!category) {
      stats.skipped++;
      continue;
    }

    const partnerType = PREFIX_TO_TYPE[prefix];
    if (!partnerType) {
      stats.skipped++;
      stats.errors.push({ row: rowNo, reason: `${legacyCode} prefix ${prefix} 無對應 type、跳過` });
      continue;
    }

    const rawName = clean(row[COL_NAME]);
    if (!rawName) {
      stats.skipped++;
      stats.errors.push({ row: rowNo, reason: `${legacyCode} 名稱空白、跳過` });
      continue;
    }

    const { name, isClosed, isPending } = stripNamePrefix(rawName);
    if (isPending) {
      stats.skipped++;
      continue;
    }

    // L0001 已 onboarding 建散客、CSV L0001 名稱「現銷」跳過
    if (partnerType === 'L' && legacyCode === 'L0001') {
      stats.skipped++;
      continue;
    }

    // isActive 判斷
    let isActive = true;
    if (isClosed) isActive = false; // 3XX-結束
    if (prefix === 'V') isActive = false; // 不往來客戶
    const closedAt = clean(row[COL_CLOSED_AT]);
    if (closedAt && closedAt !== '00:00.0') isActive = false; // 有停業日期
    // 名稱含「結束」「不存在」「註銷」「待開檔」等
    if (/結束|不存在|註銷|已停|關門/.test(name)) isActive = false;

    // 產新 code
    counter[partnerType]++;
    const newCode = `${partnerType}${String(counter[partnerType]).padStart(4, '0')}`;

    // 欄位
    const shortName = clean(row[COL_SHORT]);
    const contactName = clean(row[COL_CONTACT]);
    const ownerName = clean(row[COL_OWNER]);
    const taxId = clean(row[COL_TAX_ID]);
    const phone = clean(row[COL_PHONE]);
    const mobile = clean(row[COL_MOBILE]);
    const fax = clean(row[COL_FAX]);
    const email = clean(row[COL_EMAIL]);
    const website = clean(row[COL_WEBSITE]);

    // 英文名（CSV 多為 NULL/SUM/stop+go 等錯位、只灌真英文）
    let nameEn: string | null = null;
    const rawEn = clean(row[COL_NAME_EN]);
    if (rawEn && /^[A-Za-z0-9\s.,&()\-]+$/.test(rawEn) && rawEn.length > 3) {
      nameEn = rawEn;
    }

    // 信用額度（CSV 全 0、但 N/M 國外採購預設 0 沒問題）
    let creditLimit = 0;
    const cl = clean(row[COL_CREDIT_LIMIT]);
    if (cl) {
      const num = parseFloat(cl);
      if (!isNaN(num) && num > 0) creditLimit = num;
    }

    // 地址處理
    const shippingZip = cleanPostalCode(row[COL_ZIP_SHIPPING]);
    const shippingAddr = clean(row[COL_ADDR_SHIPPING]);
    const billingZip = cleanPostalCode(row[COL_ZIP_BILLING]);
    const billingAddr = clean(row[COL_ADDR_BILLING]);

    let shippingCityId: string | null = null;
    let shippingDistrictId: string | null = null;
    let billingCityId: string | null = null;
    let billingDistrictId: string | null = null;

    if (shippingZip) {
      const d = await prisma.nx01District.findFirst({
        where: { postalCode: shippingZip },
        select: { id: true, cityId: true },
      });
      if (d) {
        shippingDistrictId = d.id;
        shippingCityId = d.cityId;
      }
    }
    if (billingZip) {
      const d = await prisma.nx01District.findFirst({
        where: { postalCode: billingZip },
        select: { id: true, cityId: true },
      });
      if (d) {
        billingDistrictId = d.id;
        billingCityId = d.cityId;
      }
    }

    // 國別：N 開頭推測國外供應商、其他 TW
    const isOverseas = prefix === 'N';
    const countryId = isOverseas ? null : twCountry.id;

    try {
      // 建 partner
      const partner = await prisma.nx01Partner.create({
        data: {
          tenantId,
          code: newCode,
          legacyCode,
          name,
          nameEn,
          shortName,
          partnerType,
          canTransferStock: partnerType === 'O', // 同行預設可調貨
          contactName,
          ownerName,
          phone,
          mobile,
          fax,
          email,
          website,
          taxId,
          countryId,
          paymentTermDomestic: 'NET30', // 預設、執行長之後手動調
          paymentTermImport: isOverseas ? 'TT' : null,
          incoterm: isOverseas ? 'FOB' : null,
          creditLimit,
          creditStatus: isActive ? 'N' : 'F', // 不啟用 → 凍結
          isActive,
          // remark: null (Q48 PII 全清)
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });

      // 建 SHIPPING address（若有送貨地址）
      if (shippingAddr) {
        await prisma.nx01PartnerAddress.create({
          data: {
            tenantId,
            partnerId: partner.id,
            addressType: 'SHIPPING',
            label: '送貨地址',
            isDefault: true,
            countryId: isOverseas ? null : twCountry.id,
            cityId: shippingCityId,
            districtId: shippingDistrictId,
            postalCode: shippingZip,
            freeformAddress: shippingAddr,
            isActive: true,
            createdBy: SYSADMIN_USER_ID,
            updatedBy: SYSADMIN_USER_ID,
          },
        });
      }

      // 建 BILLING address（若有發票地址、且跟送貨地址不同）
      if (billingAddr && billingAddr !== shippingAddr) {
        await prisma.nx01PartnerAddress.create({
          data: {
            tenantId,
            partnerId: partner.id,
            addressType: 'BILLING',
            label: '發票地址',
            isDefault: true,
            countryId: isOverseas ? null : twCountry.id,
            cityId: billingCityId,
            districtId: billingDistrictId,
            postalCode: billingZip,
            freeformAddress: billingAddr,
            isActive: true,
            createdBy: SYSADMIN_USER_ID,
            updatedBy: SYSADMIN_USER_ID,
          },
        });
      }

      stats.imported++;
      stats.byType[partnerType]++;
    } catch (e: any) {
      stats.errors.push({ row: rowNo, reason: `${legacyCode} → ${newCode}: ${e.message}` });
      stats.skipped++;
    }
  }

  // 建 seq counter for each partner type（供未來 NEXORA 新增）
  for (const t of ['C', 'S', 'O', 'L', 'V'] as PartnerType[]) {
    const scope = `PARTNER_${t}`;
    const existing = await prisma.nx01SeqCounter.findFirst({
      where: { tenantId, scope },
    });
    const nextNo = counter[t] + 1;
    if (existing) {
      await prisma.nx01SeqCounter.update({
        where: { id: existing.id },
        data: { nextNo },
      });
    } else {
      await prisma.nx01SeqCounter.create({
        data: { tenantId, scope, nextNo },
      });
    }
  }

  return stats;
}

// ─── Phase 4: cleanup ─────────────────────────────────────────
async function cleanup() {
  if (fs.existsSync(CSV_PATH)) {
    fs.unlinkSync(CSV_PATH);
    log('CLEAN', `✓ 刪除 CSV: ${CSV_PATH}`);
  } else {
    log('CLEAN', 'CSV 已不存在');
  }
}

// ─── main ─────────────────────────────────────────────────────
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log(' CYTIC 客戶 / 廠商 / 散客 / 同行 匯入 (2026-06-21)');
    console.log('═══════════════════════════════════════════════════');

    const tenant = await prisma.nx99Tenant.findFirstOrThrow({
      where: { code: CYTIC_TENANT_CODE },
    });
    log('INIT', `恆迎 tenant: ${tenant.code} (${tenant.id})`);

    await buildWarehouses(prisma, tenant.id);
    console.log('');
    await buildCustomerGrades(prisma, tenant.id);
    console.log('');
    const stats = await importPartners(prisma, tenant.id);
    console.log('');
    await cleanup();

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(' 完成');
    console.log('═══════════════════════════════════════════════════');
    console.log(` 倉位:     5 (Z00 主倉 + Z01/Z02/Z03/Z04 衛星)`);
    console.log(` 客戶等級: ABCD 4 個`);
    console.log('');
    console.log(` Partner 匯入: ${stats.imported}/${stats.total}`);
    console.log(` 分類:`);
    console.log(`   C 保養廠: ${stats.byType.C}`);
    console.log(`   S 供應商: ${stats.byType.S}`);
    console.log(`   O 同行:   ${stats.byType.O}`);
    console.log(`   L 散客:   ${stats.byType.L} (L0001 onboarding 已建)`);
    console.log(`   V 廠商:   ${stats.byType.V}`);
    console.log(` 跳過:     ${stats.skipped}`);
    console.log(` 錯誤:     ${stats.errors.length}`);
    if (stats.errors.length) {
      console.log(' 錯誤明細 (前 20):');
      stats.errors.slice(0, 20).forEach(e => console.log(`   row ${e.row}: ${e.reason}`));
      if (stats.errors.length > 20) console.log(`   ...還有 ${stats.errors.length - 20} 筆`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
