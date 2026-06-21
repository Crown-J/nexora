/**
 * packages/db-core/scripts/cytic-bootstrap.ts
 *
 * 恆迎企業有限公司 CYTIC 初始化一條龍 script（2026-06-21 Hank）
 *
 * 流程：
 *   Phase 1 — resetDatabase: 清掉所有業務資料 + reset tenant sequence
 *   Phase 2 — onboardCytic:  建恆迎租戶 (TW-100001) + 5 部門 + MANAGEMENT 角色 + Y0001 周棟堅 OWNER
 *   Phase 3 — importEmployees: CSV 162 筆員工灌入 (含 4 特殊員工 + Y0156 執行長 + PII 全清)
 *   Phase 4 — cleanup:        刪 CSV + 加 .gitignore
 *
 * 拍板總覽：
 *   Q15-16 清庫 B 徹底 + sequence reset
 *   Q17-18 走 script 直接 insert (不走 UI)
 *   Q20 PII 全清（備註 / 銀行帳號 / 身分證灌但備註不灌）
 *   Q22 離職員工全灌 (isActive=false)
 *   Q26 密碼: 管理部 CYTIC#8412 / 其他 CHANGEME
 *   Q27 部門用職務反推
 *   Q28 jobTitle 純文字欄
 *   Q31 5 部門範式 (管理/財務/銷售/產品/營運)
 *   Q38 補做 audit B6 (Y+4 碼自動產)
 *   Q39 員編按 CSV 數字保留 (Y001 → Y0001、Y156 → Y0156)
 *
 * 執行: pnpm --filter db-core exec tsx scripts/cytic-bootstrap.ts
 */

import { parse } from 'csv-parse/sync';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── 常量 ───────────────────────────────────────────────────────
const SYSTEM_TENANT_ID = 'NX99TANT0000000';
const INNOVA_TENANT_ID = 'NX99TANT0000001';
const SYSADMIN_USER_ID = 'NX01USER0000001';
const INNOVA_PLATFORM_ADMIN_ID = 'PLATADMN0000001';
const RESERVED_TENANT_IDS = [SYSTEM_TENANT_ID, INNOVA_TENANT_ID];

const CSV_PATH = path.resolve(__dirname, '../../../docs/專案/測試資料/20260621_員工資料表.csv');
const GITIGNORE_PATH = path.resolve(__dirname, '../../../.gitignore');

// 恆迎開戶 14 項
const CYTIC = {
  companyName: '恆迎企業有限公司',
  companyNameEn: 'CYTIC ENTERPRISE CO., LTD.',
  taxId: '84125898',
  address: '台北市中山區龍江路342巷2號1F',
  phone: '02-25084541',
  planCode: 'PRO' as const,
  isTest: false,
  ownerName: '周棟堅',
  ownerLegacyCode: 'Y001',
  ownerEmail: null as string | null,
  ownerPassword: 'CYTIC#8412',
  mainWarehouseName: '主倉',
  mainWarehouseAddress: '台北市中山區龍江路342巷2號1F',
};

// 5 部門範式
const DEPARTMENTS = [
  { code: 'ADMIN',      name: '管理部', sortNo: 1 },
  { code: 'FINANCE',    name: '財務部', sortNo: 2 },
  { code: 'SALES',      name: '銷售部', sortNo: 3 },
  { code: 'PRODUCT',    name: '產品部', sortNo: 4 },
  { code: 'OPERATIONS', name: '營運部', sortNo: 5 },
];

const MANAGEMENT_PASSWORD = 'CYTIC#8412';
const DEFAULT_PASSWORD = 'CHANGEME';

// 4 特殊員工 + 1 執行長
type SpecialOverride = {
  newCode: string;
  legacyCode: string;
  mainDeptCode: string;
  extraDeptCodes: string[];
  jobTitle: string;
  password: string;
  isActive: boolean;
  hasManagementRole: boolean;
};

const SPECIAL_EMPLOYEES: Record<string, SpecialOverride> = {
  Y002: { newCode: 'Y0002', legacyCode: 'Y002', mainDeptCode: 'SALES',   extraDeptCodes: ['ADMIN'],   jobTitle: '股東（VIP 業務）', password: MANAGEMENT_PASSWORD, isActive: false, hasManagementRole: true },
  Y003: { newCode: 'Y0003', legacyCode: 'Y003', mainDeptCode: 'ADMIN',   extraDeptCodes: ['FINANCE'], jobTitle: '股東（總管）',     password: MANAGEMENT_PASSWORD, isActive: false, hasManagementRole: true },
  Y055: { newCode: 'Y0055', legacyCode: 'Y055', mainDeptCode: 'SALES',   extraDeptCodes: ['PRODUCT'], jobTitle: '採購助理',         password: DEFAULT_PASSWORD,    isActive: false, hasManagementRole: false },
  Y156: { newCode: 'Y0156', legacyCode: 'Y156', mainDeptCode: 'ADMIN',   extraDeptCodes: [],          jobTitle: '執行長',           password: MANAGEMENT_PASSWORD, isActive: true,  hasManagementRole: true },
};

// CSV 職務 → 部門 / jobTitle / 密碼 mapping（非特殊員工）
const ROLE_MAPPING: Record<string, { deptCode: string; jobTitle: string; password: string; mgmt: boolean }> = {
  業務:   { deptCode: 'SALES',      jobTitle: '業務員',   password: DEFAULT_PASSWORD,    mgmt: false },
  外務:   { deptCode: 'OPERATIONS', jobTitle: '外務員',   password: DEFAULT_PASSWORD,    mgmt: false },
  會計:   { deptCode: 'FINANCE',    jobTitle: '會計',     password: DEFAULT_PASSWORD,    mgmt: false },
  倉管:   { deptCode: 'OPERATIONS', jobTitle: '倉管員',   password: DEFAULT_PASSWORD,    mgmt: false },
  股東:   { deptCode: 'ADMIN',      jobTitle: '股東',     password: MANAGEMENT_PASSWORD, mgmt: true },
  負責人: { deptCode: 'ADMIN',      jobTitle: '負責人',   password: MANAGEMENT_PASSWORD, mgmt: true },
};

// ─── 共用 helper ───────────────────────────────────────────────
function log(phase: string, msg: string) {
  console.log(`[${phase}] ${msg}`);
}

function formatEmployeeAccount(value: string): string {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return `Y${trimmed.padStart(4, '0')}`;
  const m = trimmed.match(/^Y(\d+)$/i);
  if (m) return `Y${m[1].padStart(4, '0')}`;
  return trimmed;
}

function cleanPostalCode(zip: string | undefined | null): string | null {
  if (!zip) return null;
  const s = String(zip).trim();
  if (!s || s === 'NULL') return null;
  // 取前 3 碼
  const m = s.match(/(\d{3})/);
  return m ? m[1] : null;
}

function cleanAddress(addr: string | undefined | null): string | null {
  if (!addr) return null;
  const s = String(addr).trim();
  if (!s || s === 'NULL' || s === '無' || s === '同上') return null;
  return s;
}

function cleanPhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const s = String(phone).trim();
  if (!s || s === 'NULL' || s === '無') return null;
  return s;
}

// ─── Phase 1: resetDatabase ─────────────────────────────────────
async function resetDatabase(prisma: PrismaClient) {
  log('RESET', '開始清庫（保留 SYSTEM + INNOVA 兩個 tenant 結構）');

  // 1.1 用 PL/pgSQL 動態清所有帶 tenant_id 的表（保留 SYSTEM / INNOVA 內的）
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      r RECORD;
      cnt INTEGER;
    BEGIN
      SET LOCAL session_replication_role = replica;
      FOR r IN
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'tenant_id'
        ORDER BY table_name
      LOOP
        EXECUTE format(
          'DELETE FROM %I WHERE tenant_id NOT IN (%L, %L)',
          r.table_name, 'NX99TANT0000000', 'NX99TANT0000001'
        );
        GET DIAGNOSTICS cnt = ROW_COUNT;
        IF cnt > 0 THEN
          RAISE NOTICE '清表 %: 刪 % 筆', r.table_name, cnt;
        END IF;
      END LOOP;
    END $$;
  `);
  log('RESET', '✓ 帶 tenant_id 的 138 個表清完（保留 SYSTEM/INNOVA）');

  // 1.2 nx99_subscription（已在 tenant_id 表清單）已被前段清了
  // 1.3 從 nx99_tenant 刪除非保留 row
  const deletedTenants = await prisma.nx99Tenant.deleteMany({
    where: { id: { notIn: RESERVED_TENANT_IDS } },
  });
  log('RESET', `✓ nx99_tenant: 刪 ${deletedTenants.count} 筆 (保留 SYSTEM/INNOVA)`);

  // 1.4 reset tenant sequence (CYTIC 是 TW-100001 第一個正式客戶)
  await prisma.$executeRawUnsafe(`SELECT setval('seq_tenant_code_tw', 100001, false)`);
  await prisma.$executeRawUnsafe(`SELECT setval('seq_tenant_code_zt', 100001, false)`);
  log('RESET', '✓ tenant sequences reset to 100001');

  log('RESET', '清庫完成');
}

// ─── Phase 2: onboardCytic ──────────────────────────────────────
type OnboardResult = {
  tenantId: string;
  tenantCode: string;
  ownerId: string;
  managementRoleId: string;
  mainSiteId: string;
  mainWarehouseId: string;
  departments: Map<string, string>; // code → id
};

async function onboardCytic(prisma: PrismaClient): Promise<OnboardResult> {
  log('ONBOARD', '開始恆迎企業有限公司開戶 (PRO)');

  // 2.1 產 tenantCode (TW-100001)
  const [{ nextval }] = await prisma.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    `SELECT nextval('seq_tenant_code_tw') AS nextval`,
  );
  const tenantCode = `TW-${nextval.toString()}`;
  log('ONBOARD', `產 tenantCode: ${tenantCode}`);

  // 2.2 hash 密碼
  const ownerPwHash = await bcrypt.hash(CYTIC.ownerPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    // 2.3 建租戶
    const tenant = await tx.nx99Tenant.create({
      data: {
        code: tenantCode,
        name: CYTIC.companyName,
        nameEn: CYTIC.companyNameEn,
        status: 'A',
        sortNo: 0,
        isActive: true,
        taxId: CYTIC.taxId,
        address: CYTIC.address,
        phone: CYTIC.phone,
        planCode: CYTIC.planCode,
        contactName: CYTIC.ownerName,
        contactEmail: CYTIC.ownerEmail,
        contactPhone: CYTIC.phone,
        createdBy: INNOVA_PLATFORM_ADMIN_ID,
        updatedBy: INNOVA_PLATFORM_ADMIN_ID,
      },
    });
    log('ONBOARD', `✓ tenant ${tenant.id} ${tenant.code} 建立`);

    // 2.4 建負責人 Y0001 周棟堅
    const owner = await tx.nx01User.create({
      data: {
        tenantId: tenant.id,
        userAccount: 'Y0001',
        passwordHash: ownerPwHash,
        userName: CYTIC.ownerName,
        email: CYTIC.ownerEmail,
        legacyCode: CYTIC.ownerLegacyCode,
        gender: 'M',
        isActive: true,
        mustChangePassword: true,
        isTenantOwner: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
    log('ONBOARD', `✓ owner Y0001 周棟堅 建立 (${owner.id})`);

    // 2.5 建 5 部門
    const deptMap = new Map<string, string>();
    for (const d of DEPARTMENTS) {
      const dept = await tx.nx01Department.create({
        data: {
          tenantId: tenant.id,
          code: d.code,
          name: d.name,
          sortNo: d.sortNo,
          isActive: true,
          createdBy: INNOVA_PLATFORM_ADMIN_ID,
          updatedBy: INNOVA_PLATFORM_ADMIN_ID,
        },
      });
      deptMap.set(d.code, dept.id);
    }
    log('ONBOARD', `✓ 5 部門建立: ${DEPARTMENTS.map(d => d.name).join(' / ')}`);

    // 2.6 建 5 預設組（每部門 1 組）
    for (const d of DEPARTMENTS) {
      await tx.nx01Team.create({
        data: {
          tenantId: tenant.id,
          departmentId: deptMap.get(d.code)!,
          code: d.code,
          name: `${d.name}預設組`,
          sortNo: 1,
          isActive: true,
          createdBy: INNOVA_PLATFORM_ADMIN_ID,
          updatedBy: INNOVA_PLATFORM_ADMIN_ID,
        },
      });
    }
    log('ONBOARD', `✓ 5 預設組建立`);

    // 2.7 把 Y0001 周棟堅指派部門 (主財務部 + 副管理部)
    await tx.nx01User.update({
      where: { id: owner.id },
      data: {
        departmentId: deptMap.get('FINANCE'),
        jobTitle: '負責人（兼財務主管）',
      },
    });
    // user_team 多組掛 (財務 + 管理)
    const financeTeam = await tx.nx01Team.findFirstOrThrow({
      where: { tenantId: tenant.id, departmentId: deptMap.get('FINANCE')! },
    });
    const adminTeam = await tx.nx01Team.findFirstOrThrow({
      where: { tenantId: tenant.id, departmentId: deptMap.get('ADMIN')! },
    });
    await tx.nx01UserTeam.create({
      data: { tenantId: tenant.id, userId: owner.id, teamId: financeTeam.id, isPrimary: true, assignedBy: SYSADMIN_USER_ID, createdBy: SYSADMIN_USER_ID },
    });
    await tx.nx01UserTeam.create({
      data: { tenantId: tenant.id, userId: owner.id, teamId: adminTeam.id, isPrimary: false, assignedBy: SYSADMIN_USER_ID, createdBy: SYSADMIN_USER_ID },
    });
    log('ONBOARD', `✓ Y0001 主部門=財務、副部門=管理、jobTitle=負責人（兼財務主管）`);

    // 2.8 建 OWNER 角色
    const ownerRole = await tx.nx01Role.create({
      data: {
        tenantId: tenant.id,
        code: 'OWNER',
        name: '負責人',
        description: '老闆 / 總經理、全模組總覽（自動全權限）',
        isSystem: true,
        sortNo: 1,
        isActive: true,
        createdBy: INNOVA_PLATFORM_ADMIN_ID,
        updatedBy: INNOVA_PLATFORM_ADMIN_ID,
      },
    });

    // 2.9 建 MANAGEMENT 角色（管理階層、等同全權限）
    const mgmtRole = await tx.nx01Role.create({
      data: {
        tenantId: tenant.id,
        code: 'MANAGEMENT',
        name: '管理員',
        description: '管理階層、等同負責人全權限（不可設 isTenantOwner、但有全部模組權限）',
        isSystem: true,
        sortNo: 2,
        isActive: true,
        createdBy: INNOVA_PLATFORM_ADMIN_ID,
        updatedBy: INNOVA_PLATFORM_ADMIN_ID,
      },
    });
    log('ONBOARD', `✓ OWNER + MANAGEMENT 兩個系統角色建立`);

    // 2.10 OWNER 掛給 Y0001
    await tx.nx01UserRole.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        roleId: ownerRole.id,
        isPrimary: true,
        assignedBy: INNOVA_PLATFORM_ADMIN_ID,
        isActive: true,
      },
    });

    // 2.11 MANAGEMENT 掛給 Y0001 (執行長要求管理部全權限、Y0001 主財務副管理也算)
    await tx.nx01UserRole.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        roleId: mgmtRole.id,
        isPrimary: false,
        assignedBy: INNOVA_PLATFORM_ADMIN_ID,
        isActive: true,
      },
    });

    // 2.12 MANAGEMENT 掛全部 view + permission
    const allViews = await tx.nx01View.findMany({ select: { id: true } });
    for (const v of allViews) {
      await tx.nx01RoleView.create({
        data: {
          tenantId: tenant.id,
          roleId: mgmtRole.id,
          viewId: v.id,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
          canApprove: true,
          isActive: true,
          grantedBy: SYSADMIN_USER_ID,
        },
      });
    }
    const allPermissions = await tx.nx01Permission.findMany({ select: { id: true } });
    for (const p of allPermissions) {
      await tx.nx01RolePermission.create({
        data: {
          tenantId: tenant.id,
          roleId: mgmtRole.id,
          permissionId: p.id,
          grantedBy: SYSADMIN_USER_ID,
        },
      });
    }
    log('ONBOARD', `✓ MANAGEMENT 掛 ${allViews.length} views + ${allPermissions.length} permissions (全權限)`);

    // 2.13 建主據點 HQ
    const site = await tx.nx01Site.create({
      data: {
        tenantId: tenant.id,
        code: 'HQ',
        name: '總部據點',
        address: CYTIC.address,
        isMain: true,
        isActive: true,
        createdBy: INNOVA_PLATFORM_ADMIN_ID,
        updatedBy: INNOVA_PLATFORM_ADMIN_ID,
      },
    });

    // 2.14 建主倉 M01
    const warehouse = await tx.nx01Warehouse.create({
      data: {
        tenantId: tenant.id,
        code: 'M01',
        name: CYTIC.mainWarehouseName,
        siteId: site.id,
        isMain: true,
        isActive: true,
        createdBy: INNOVA_PLATFORM_ADMIN_ID,
        updatedBy: INNOVA_PLATFORM_ADMIN_ID,
      },
    });
    log('ONBOARD', `✓ HQ 據點 + M01 主倉建立`);

    // 2.15 建散客 partner L0001
    await tx.nx01Partner.create({
      data: {
        tenantId: tenant.id,
        code: 'L0001',
        name: '散客',
        partnerType: 'L',
        canTransferStock: false,
        paymentTermDomestic: 'PREPAY',
        creditStatus: 'N',
        creditLimit: 0,
        defaultInvoiceCopies: 2,
        isActive: true,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
    });

    // 2.16 建 PARTNER_L + EMPLOYEE seq counter
    await tx.nx01SeqCounter.create({
      data: { tenantId: tenant.id, scope: 'PARTNER_L', nextNo: 2 },
    });
    await tx.nx01SeqCounter.create({
      data: { tenantId: tenant.id, scope: 'EMPLOYEE', nextNo: 164 }, // Y0001 已用、CSV 最大 Y163、下個從 164
    });
    log('ONBOARD', `✓ EMPLOYEE seq counter 建立 (nextNo=164、CSV 最大 Y0163 後從 Y0164 起跳)`);

    // 2.17 建訂閱 (NEXORA-PRO-XL)
    const plan = await tx.nx99Plan.findUniqueOrThrow({ where: { code: 'NEXORA-PRO-XL' } });
    const twd = await tx.nx01Currency.findUniqueOrThrow({ where: { code: 'TWD' } });
    await tx.nx99Subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'A',
        billingCycle: 'M',
        seats: 100,
        startAt: new Date().toISOString().slice(0, 10),
        endAt: '2099-12-31',
        autoRenew: true,
        baseFeeSnapshot: plan.baseFeeMonth,
        seatFeeSnapshot: plan.seatFeeMonth,
        discountTypeSnapshot: 'N',
        discountValueSnapshot: 0,
        subtotalSnapshot: plan.baseFeeMonth,
        discountAmountSnapshot: 0,
        totalSnapshot: plan.baseFeeMonth,
        currencyId: twd.id,
        createdBy: SYSADMIN_USER_ID,
        updatedBy: SYSADMIN_USER_ID,
      },
    });
    log('ONBOARD', `✓ NEXORA-PRO-XL 訂閱 (100 seats)`);

    return {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      ownerId: owner.id,
      managementRoleId: mgmtRole.id,
      mainSiteId: site.id,
      mainWarehouseId: warehouse.id,
      departments: deptMap,
    };
  });

  log('ONBOARD', `恆迎開戶完成: ${result.tenantCode} (${result.tenantId})`);
  return result;
}

// ─── Phase 3: importEmployees ───────────────────────────────────
type CsvRow = {
  員工編號: string;
  員工姓名: string;
  身分證字號: string;
  性別: string;
  學歷: string;
  緊急聯絡人: string;
  緊急連絡人電話: string;
  '郵遞區號 1': string;
  戶籍地址: string;
  '電話 2': string;
  '郵遞區號(通訊)': string;
  通訊地址: string;
  電話: string;
  手機: string;
  部門: string;
  職務: string;
  備註: string;
};

type ImportSummary = {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ rowNo: number; reason: string }>;
};

async function importEmployees(prisma: PrismaClient, onboard: OnboardResult): Promise<ImportSummary> {
  log('IMPORT', `開始讀 CSV: ${CSV_PATH}`);
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows: CsvRow[] = parse(content, {
    columns: (header: string[]) => header.map(h => h.trim()),
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  log('IMPORT', `CSV 載入 ${rows.length} 筆`);

  const summary: ImportSummary = { total: rows.length, imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2;
    const row = rows[i];

    const legacyCode = (row.員工編號 || '').trim();
    if (!legacyCode) {
      summary.errors.push({ rowNo, reason: '員編空白' });
      summary.skipped++;
      continue;
    }

    // Y001 周棟堅已在 onboarding 建、跳過
    if (legacyCode === 'Y001') {
      summary.skipped++;
      log('IMPORT', `Row ${rowNo}: Y001 周棟堅已在 onboarding 建、跳過`);
      continue;
    }

    // 姓名剝離 `*` 前綴
    const rawName = (row.員工姓名 || '').trim();
    if (!rawName) {
      summary.errors.push({ rowNo, reason: '姓名空白' });
      summary.skipped++;
      continue;
    }
    const isLeft = rawName.startsWith('*');
    const userName = isLeft ? rawName.slice(1).trim() : rawName;

    // 新員編 Y+4 碼補零（按 CSV 原號保留、Q39=a）
    const newCode = formatEmployeeAccount(legacyCode);

    // 性別 mapping
    let gender: string | null = null;
    const g = (row.性別 || '').trim();
    if (g === '男') gender = 'M';
    else if (g === '女') gender = 'F';

    // CSV 職務
    const csvRole = (row.職務 || '').trim();

    // 決定部門 / jobTitle / 密碼 / role
    let mainDeptCode: string;
    let extraDeptCodes: string[] = [];
    let jobTitle: string;
    let password: string;
    let isActive: boolean;
    let hasManagementRole: boolean;

    const special = SPECIAL_EMPLOYEES[legacyCode];
    if (special) {
      mainDeptCode = special.mainDeptCode;
      extraDeptCodes = special.extraDeptCodes;
      jobTitle = special.jobTitle;
      password = special.password;
      isActive = special.isActive;
      hasManagementRole = special.hasManagementRole;
    } else {
      const mapping = ROLE_MAPPING[csvRole];
      if (!mapping) {
        // 沒對應職務 → 預設管理部、給警告
        summary.errors.push({ rowNo, reason: `職務「${csvRole}」無對應 mapping、預設掛管理部` });
        mainDeptCode = 'ADMIN';
        jobTitle = csvRole || '未指定';
        password = DEFAULT_PASSWORD;
        hasManagementRole = false;
      } else {
        mainDeptCode = mapping.deptCode;
        jobTitle = mapping.jobTitle;
        password = mapping.password;
        hasManagementRole = mapping.mgmt;
      }
      // 離職員工 / 非特殊員工：全 isActive=false
      isActive = false;
    }

    // 地址 / zip
    const householdZip = cleanPostalCode(row['郵遞區號 1']);
    const householdAddr = cleanAddress(row.戶籍地址);
    const mailingZip = cleanPostalCode(row['郵遞區號(通訊)']);
    const mailingAddr = cleanAddress(row.通訊地址);

    // city/district 反查（依 zip）
    let householdCityId: string | null = null;
    let householdDistrictId: string | null = null;
    let mailingCityId: string | null = null;
    let mailingDistrictId: string | null = null;
    if (householdZip) {
      const dist = await prisma.nx01District.findFirst({
        where: { postalCode: householdZip },
        select: { id: true, cityId: true },
      });
      if (dist) {
        householdDistrictId = dist.id;
        householdCityId = dist.cityId;
      }
    }
    if (mailingZip) {
      const dist = await prisma.nx01District.findFirst({
        where: { postalCode: mailingZip },
        select: { id: true, cityId: true },
      });
      if (dist) {
        mailingDistrictId = dist.id;
        mailingCityId = dist.cityId;
      }
    }

    // 手機 / 電話 / 學歷 / 緊急聯絡人 / 身分證
    const phone = cleanPhone(row.手機) || cleanPhone(row.電話);
    const education = (row.學歷 || '').trim() || null;
    const emergencyContact = (row.緊急聯絡人 || '').trim() || null;
    const emergencyPhone = cleanPhone(row.緊急連絡人電話);
    const nationalId = (row.身分證字號 || '').trim() || null;

    // 密碼 hash
    const pwHash = await bcrypt.hash(password, 10);

    // 國別 TW
    const twCountry = await prisma.nx01Country.findFirstOrThrow({ where: { code: 'TWN' } });

    // 建 user
    try {
      const user = await prisma.nx01User.create({
        data: {
          tenantId: onboard.tenantId,
          userAccount: newCode,
          passwordHash: pwHash,
          userName,
          email: null, // Q11: CSV 沒填都 null
          phone,
          legacyCode,
          jobTitle,
          gender,
          nationalId,
          countryId: twCountry.id,
          householdCityId,
          householdDistrictId,
          householdPostalCode: householdZip,
          householdDetail: householdAddr,
          mailingCityId,
          mailingDistrictId,
          mailingPostalCode: mailingZip,
          mailingDetail: mailingAddr,
          highestEducation: education,
          emergencyContact,
          emergencyPhone,
          departmentId: onboard.departments.get(mainDeptCode),
          primarySiteId: onboard.mainSiteId,
          isActive: isLeft ? false : isActive,
          mustChangePassword: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });

      // 掛主部門 team
      const mainTeam = await prisma.nx01Team.findFirstOrThrow({
        where: {
          tenantId: onboard.tenantId,
          departmentId: onboard.departments.get(mainDeptCode)!,
        },
      });
      await prisma.nx01UserTeam.create({
        data: {
          tenantId: onboard.tenantId,
          userId: user.id,
          teamId: mainTeam.id,
          isPrimary: true,
          assignedBy: SYSADMIN_USER_ID,
          createdBy: SYSADMIN_USER_ID,
        },
      });

      // 掛副部門 team
      for (const code of extraDeptCodes) {
        const extraTeam = await prisma.nx01Team.findFirstOrThrow({
          where: { tenantId: onboard.tenantId, departmentId: onboard.departments.get(code)! },
        });
        await prisma.nx01UserTeam.create({
          data: {
            tenantId: onboard.tenantId,
            userId: user.id,
            teamId: extraTeam.id,
            isPrimary: false,
            assignedBy: SYSADMIN_USER_ID,
            createdBy: SYSADMIN_USER_ID,
          },
        });
      }

      // 掛 MANAGEMENT 角色
      if (hasManagementRole) {
        await prisma.nx01UserRole.create({
          data: {
            tenantId: onboard.tenantId,
            userId: user.id,
            roleId: onboard.managementRoleId,
            isPrimary: true,
            assignedBy: INNOVA_PLATFORM_ADMIN_ID,
            isActive: true,
          },
        });
      }

      summary.imported++;
    } catch (e: any) {
      summary.errors.push({ rowNo, reason: `${legacyCode} → ${newCode}: ${e.message}` });
      summary.skipped++;
    }
  }

  log('IMPORT', `匯入完成: ${summary.imported}/${summary.total} (跳 ${summary.skipped}、錯 ${summary.errors.length})`);
  return summary;
}

// ─── Phase 4: cleanup ──────────────────────────────────────────
async function cleanup() {
  log('CLEAN', 'CSV 處理');
  if (fs.existsSync(CSV_PATH)) {
    fs.unlinkSync(CSV_PATH);
    log('CLEAN', `✓ 刪除 CSV: ${CSV_PATH}`);
  }

  const gitignoreEntry = 'docs/專案/測試資料/';
  let gitignore = '';
  if (fs.existsSync(GITIGNORE_PATH)) {
    gitignore = fs.readFileSync(GITIGNORE_PATH, 'utf-8');
  }
  if (!gitignore.includes(gitignoreEntry)) {
    const append = (gitignore.endsWith('\n') || gitignore === '') ? '' : '\n';
    fs.appendFileSync(GITIGNORE_PATH, `${append}\n# 測試資料含 PII、絕不入庫\n${gitignoreEntry}\n`);
    log('CLEAN', `✓ .gitignore 加入 "${gitignoreEntry}"`);
  } else {
    log('CLEAN', `✓ .gitignore 已含 "${gitignoreEntry}"、跳過`);
  }
}

// ─── main ──────────────────────────────────────────────────────
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log(' CYTIC 恆迎企業有限公司 初始化一條龍 (2026-06-21)');
    console.log('═══════════════════════════════════════════════════');

    await resetDatabase(prisma);
    console.log('');
    const onboard = await onboardCytic(prisma);
    console.log('');
    const summary = await importEmployees(prisma, onboard);
    console.log('');
    await cleanup();

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(' 完成');
    console.log('═══════════════════════════════════════════════════');
    console.log(` 租戶代碼: ${onboard.tenantCode}`);
    console.log(` 租戶 ID:  ${onboard.tenantId}`);
    console.log(` 負責人:   Y0001 周棟堅 (legacyCode=Y001)`);
    console.log(` 密碼:     ${CYTIC.ownerPassword}（首登強制改）`);
    console.log(` MANAGEMENT 角色 ID: ${onboard.managementRoleId}`);
    console.log(` 主據點:   ${onboard.mainSiteId}`);
    console.log(` 主倉:     ${onboard.mainWarehouseId}`);
    console.log('');
    console.log(` 員工匯入: ${summary.imported}/${summary.total}`);
    console.log(` 跳過:     ${summary.skipped}`);
    console.log(` 錯誤:     ${summary.errors.length}`);
    if (summary.errors.length) {
      console.log(' 錯誤明細:');
      summary.errors.slice(0, 20).forEach(e => console.log(`   row ${e.rowNo}: ${e.reason}`));
      if (summary.errors.length > 20) console.log(`   ...還有 ${summary.errors.length - 20} 筆`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
