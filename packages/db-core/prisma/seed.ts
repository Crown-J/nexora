/**
 * NEXORA db-core Prisma Seed
 * 執行：pnpm prisma db seed（需在 packages/db-core 目錄或由根目錄透過 workspace 執行）
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { poolConfigFromDatabaseUrl } from '../scripts/pgTlsPoolConfig';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  // 在 seed 階段直接 fail，避免使用到錯誤的連線設定
  throw new Error('DATABASE_URL is not set or not a string');
}

/** Railway Public + sslmode=require 時須與 P0 相同 TLS 設定，否則 adapter-pg 會 P1011 憑證鏈錯誤 */
const pool = new pg.Pool(poolConfigFromDatabaseUrl(String(databaseUrl)));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type TenantRoleSeed = {
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  sortNo: number;
};

/** 每租戶一組 role（@@unique([tenantId, code])） */
async function upsertNx00RoleForTenant(tenantId: string, spec: TenantRoleSeed) {
  return prisma.nx00Role.upsert({
    where: { tenantId_code: { tenantId, code: spec.code } },
    update: {
      name: spec.name,
      description: spec.description ?? null,
      isSystem: spec.isSystem ?? false,
      isActive: true,
      sortNo: spec.sortNo,
    },
    create: {
      tenantId,
      code: spec.code,
      name: spec.name,
      description: spec.description ?? null,
      isSystem: spec.isSystem ?? false,
      isActive: true,
      sortNo: spec.sortNo,
    },
  });
}

/** bcrypt：一般員工／種子帳號預設 changeme */
const CHANGEME_PASSWORD_HASH =
  '$2b$10$kgqkOwTo/kEKquFZFebJfucnCaEve7IaD7.Cawir5827AARvxk8.S';
/** bcrypt：平台 admin 專用 Nexoragrid2026 */
const ADMIN_PLATFORM_PASSWORD_HASH =
  '$2b$10$H269i.oPp5pRGqcV2dzzb.viPbIMP4BMFR62oxD17CGiWvciXNWIq';

type CyticUserSeedRow = {
  username: string;
  displayName: string;
  disabled: boolean;
  passwordHash: string;
  email: string | null;
  phone: string | null;
  employeeId: string | null;
};

/**
 * 恆迎 CYTIC 使用者：`seed-data/cytic_nx00_user.csv`（與上傳專用 nx00_user 欄位一致）
 * - `user_account` → userAccount；`user_name` → userName；`is_active` TRUE/FALSE → isActive
 * - `password_hash`／`email`／`phone`／`employee_id` 一併寫入（空欄 → null）
 * - 略過表頭；`tenant_id` 以執行時 **CYTIC 租戶實際 id** 為準（不依 CSV 內固定 id）
 */
function loadCyticNx00UserCsv(): CyticUserSeedRow[] {
  const p = path.join(__dirname, 'seed-data', 'cytic_nx00_user.csv');
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const header = lines[0]!.split(',').map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);

  const iAcct = col('user_account');
  const iName = col('user_name');
  const iActive = col('is_active');
  const iHash = col('password_hash');
  const iEmail = col('email');
  const iPhone = col('phone');
  const iEmp = col('employee_id');
  if (iAcct < 0 || iName < 0 || iActive < 0) {
    throw new Error(
      'cytic_nx00_user.csv 表頭需含 user_account, user_name, is_active（請對齊上傳專用 nx00_user.csv）',
    );
  }

  const out: CyticUserSeedRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li]!;
    const cells = line.split(',');
    const username = (cells[iAcct] ?? '').trim();
    const displayName = (cells[iName] ?? '').trim();
    if (!username || !displayName) continue;

    const activeTok = (cells[iActive] ?? '').trim().toUpperCase();
    const isActive = activeTok === 'TRUE';
    const disabled = !isActive;

    let passwordHash = CHANGEME_PASSWORD_HASH;
    if (iHash >= 0) {
      const h = (cells[iHash] ?? '').trim();
      if (h) passwordHash = h;
    }

    const email = iEmail >= 0 && (cells[iEmail] ?? '').trim() ? (cells[iEmail] ?? '').trim() : null;
    const phone = iPhone >= 0 && (cells[iPhone] ?? '').trim() ? (cells[iPhone] ?? '').trim() : null;
    const employeeId = iEmp >= 0 && (cells[iEmp] ?? '').trim() ? (cells[iEmp] ?? '').trim() : null;

    out.push({
      username,
      displayName,
      disabled,
      passwordHash,
      email,
      phone,
      employeeId,
    });
  }
  return out;
}

/** 刪除 CYTIC 租戶既有使用者（含 role／該等帳號產生之 audit），避免舊種子帳號殘留 */
async function removeExistingCyticUsers(cyticTenantId: string) {
  const rows = await prisma.nx00User.findMany({
    where: { tenantId: cyticTenantId },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return;
  await prisma.nx00AuditLog.deleteMany({ where: { actorUserId: { in: ids } } });
  await prisma.nx00UserWarehouse.deleteMany({ where: { userId: { in: ids } } });
  await prisma.nx00UserRole.deleteMany({ where: { userId: { in: ids } } });
  await prisma.nx00User.deleteMany({ where: { tenantId: cyticTenantId } });
}

/** 刪除除 admin 外所有 nx00_user（先清 audit／user_role 以滿足 FK） */
async function purgeUsersExceptAdmin() {
  const admin = await prisma.nx00User.findFirst({
    where: { userAccount: 'admin' },
    select: { id: true },
  });
  if (!admin) return;
  const delAudit = await prisma.nx00AuditLog.deleteMany({
    where: { actorUserId: { not: admin.id } },
  });
  const delUw = await prisma.nx00UserWarehouse.deleteMany({
    where: { userId: { not: admin.id } },
  });
  const delUr = await prisma.nx00UserRole.deleteMany({
    where: { userId: { not: admin.id } },
  });
  const delU = await prisma.nx00User.deleteMany({
    where: { id: { not: admin.id } },
  });
  console.log(
    `✅ 已重置使用者：保留 admin；刪除 audit ${delAudit.count}、user_warehouse ${delUw.count}、user_role ${delUr.count}、user ${delU.count}`,
  );
}

/**
 * 僅保留預設 admin、刪除其餘 nx00_user（含 nx00_user_role／非 admin 之 nx00_audit_log.actor）。
 * 執行：SEED_RESET_USERS_ADMIN_ONLY=1 pnpm exec prisma db seed（於 packages/db-core）
 */
async function runResetUsersAdminOnly(): Promise<void> {
  const devTenant = await prisma.nx99Tenant.upsert({
    where: { code: 'DEV-INNOVA' },
    update: {
      nameEn: 'Innova Information Technology',
    },
    create: {
      code: 'DEV-INNOVA',
      name: '伊諾瓦資訊科技有限公司（開發測試）',
      nameEn: 'Innova Information Technology',
      status: 'A',
      sortNo: 1,
      isActive: true,
    },
  });

  await upsertNx00RoleForTenant(devTenant.id, {
    code: 'ADMIN',
    name: '管理者',
    description: '系統管理者（擁有全域存取權限）',
    isSystem: true,
    sortNo: 0,
  });
  const adminRole = await prisma.nx00Role.findUniqueOrThrow({
    where: { tenantId_code: { tenantId: devTenant.id, code: 'ADMIN' } },
  });

  await prisma.nx00User.upsert({
    where: { tenantId_userAccount: { tenantId: devTenant.id, userAccount: 'admin' } },
    update: {
      passwordHash: ADMIN_PLATFORM_PASSWORD_HASH,
      userName: '系統管理員',
      isActive: true,
      tenantId: devTenant.id,
    },
    create: {
      tenantId: devTenant.id,
      userAccount: 'admin',
      passwordHash: ADMIN_PLATFORM_PASSWORD_HASH,
      userName: '系統管理員',
      isActive: true,
    },
  });

  const adminUser = await prisma.nx00User.findUnique({
    where: { tenantId_userAccount: { tenantId: devTenant.id, userAccount: 'admin' } },
    select: { id: true, userAccount: true },
  });

  if (adminUser) {
    await prisma.nx00UserRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: devTenant.id,
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {
        isPrimary: true,
        isActive: true,
      },
      create: {
        tenantId: devTenant.id,
        userId: adminUser.id,
        roleId: adminRole.id,
        isPrimary: true,
        assignedAt: new Date(),
        isActive: true,
      },
    });
  }

  await purgeUsersExceptAdmin();
  console.log('✅ SEED_RESET_USERS_ADMIN_ONLY：nx00_user 僅剩 admin（密碼=Nexoragrid2026），可自行匯入其餘帳號');
}

function envTruthy(v: string | undefined): boolean {
  return v === '1' || v === 'true';
}

async function main() {
  if (envTruthy(process.env.SEED_TRUNCATE_NX00_PART_ONLY)) {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "nx00_part" CASCADE');
    console.log('✅ SEED_TRUNCATE_NX00_PART_ONLY：已 TRUNCATE "nx00_part" CASCADE（含相依明細）');
    return;
  }

  if (envTruthy(process.env.SEED_RESET_USERS_ADMIN_ONLY)) {
    await runResetUsersAdminOnly();
    return;
  }

  const ADMIN_DEFAULT_PASSWORD_HASH = CHANGEME_PASSWORD_HASH;

  /** 租戶需先於使用者（nx00_field.csv：tenant_id NN） */
  const devTenant = await prisma.nx99Tenant.upsert({
    where: { code: 'DEV-INNOVA' },
    update: {
      nameEn: 'Innova Information Technology',
    },
    create: {
      code: 'DEV-INNOVA',
      name: '伊諾瓦資訊科技有限公司（開發測試）',
      nameEn: 'Innova Information Technology',
      status: 'A',
      sortNo: 1,
      isActive: true,
    },
  });

  const cyticTenant = await prisma.nx99Tenant.upsert({
    where: { code: 'CYTIC' },
    update: {
      name: '恆迎企業有限公司',
      nameEn: 'CYTIC ENTERPRISE',
      isActive: true,
    },
    create: {
      code: 'CYTIC',
      name: '恆迎企業有限公司',
      nameEn: 'CYTIC ENTERPRISE',
      status: 'A',
      sortNo: 2,
      isActive: true,
    },
  });
  console.log(`✅ 租戶 CYTIC seed（id=${cyticTenant.id}，恆迎企業有限公司）`);

  /**
   * @FUNCTION_CODE NX00-ROLE-SVC-SEED-F01
   * 說明：ADMIN + 常用職務（恆迎員工預設綁 SALES）
   */
  await upsertNx00RoleForTenant(devTenant.id, {
    code: 'ADMIN',
    name: '管理者',
    description: '系統管理者（擁有全域存取權限）',
    isSystem: true,
    sortNo: 0,
  });
  const adminRole = await prisma.nx00Role.findUniqueOrThrow({
    where: { tenantId_code: { tenantId: devTenant.id, code: 'ADMIN' } },
  });
  const extraRoles = [
    { code: 'SALES', name: '業務', sortNo: 1 },
    { code: 'WH', name: '倉管', sortNo: 2 },
  ] as const;
  for (const r of extraRoles) {
    await upsertNx00RoleForTenant(cyticTenant.id, {
      code: r.code,
      name: r.name,
      isSystem: false,
      sortNo: r.sortNo,
    });
  }
  const salesRole = await prisma.nx00Role.findUnique({
    where: { tenantId_code: { tenantId: cyticTenant.id, code: 'SALES' } },
  });

  /**
   * @FUNCTION_CODE NX00-USER-SVC-SEED-F01
   * 說明：admin 僅此帳號使用 Nexoragrid2026；其餘種子使用者於 purge 後由 CYTIC 清單建立
   */
  await prisma.nx00User.upsert({
    where: { tenantId_userAccount: { tenantId: devTenant.id, userAccount: 'admin' } },
    update: {
      passwordHash: ADMIN_PLATFORM_PASSWORD_HASH,
      userName: '系統管理員',
      isActive: true,
      tenantId: devTenant.id,
    },
    create: {
      tenantId: devTenant.id,
      userAccount: 'admin',
      passwordHash: ADMIN_PLATFORM_PASSWORD_HASH,
      userName: '系統管理員',
      isActive: true,
    },
  });
  console.log('✅ admin seed 完成（userAccount=admin，密碼=Nexoragrid2026）');

  const adminUser = await prisma.nx00User.findUnique({
    where: { tenantId_userAccount: { tenantId: devTenant.id, userAccount: 'admin' } },
    select: { id: true, userAccount: true },
  });

  if (adminUser) {
    await prisma.nx00UserRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: devTenant.id,
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {
        isPrimary: true,
        isActive: true,
      },
      create: {
        tenantId: devTenant.id,
        userId: adminUser.id,
        roleId: adminRole.id,
        isPrimary: true,
        assignedAt: new Date(),
        isActive: true,
      },
    });

    console.log(
      `✅ admin 綁定 ADMIN 角色完成（userId=${adminUser.id}, roleId=${adminRole.id}, roleCode=ADMIN）`,
    );
  } else {
    console.log('⚠ 找不到 userAccount=admin 的使用者，無法綁定 ADMIN 角色');
  }

  await purgeUsersExceptAdmin();

  if (cyticTenant && salesRole) {
    await removeExistingCyticUsers(cyticTenant.id);
    const cyticRows = loadCyticNx00UserCsv();
    for (const row of cyticRows) {
      const u = await prisma.nx00User.upsert({
        where: { tenantId_userAccount: { tenantId: cyticTenant.id, userAccount: row.username } },
        update: {
          userName: row.displayName,
          isActive: !row.disabled,
          tenantId: cyticTenant.id,
          passwordHash: row.passwordHash,
          email: row.email,
          phone: row.phone,
          employeeId: row.employeeId,
        },
        create: {
          tenantId: cyticTenant.id,
          userAccount: row.username,
          userName: row.displayName,
          passwordHash: row.passwordHash,
          isActive: !row.disabled,
          email: row.email,
          phone: row.phone,
          employeeId: row.employeeId,
        },
      });
      await prisma.nx00UserRole.upsert({
        where: {
          tenantId_userId_roleId: {
            tenantId: cyticTenant.id,
            userId: u.id,
            roleId: salesRole.id,
          },
        },
        update: { isPrimary: true, isActive: true },
        create: {
          tenantId: cyticTenant.id,
          userId: u.id,
          roleId: salesRole.id,
          isPrimary: true,
          assignedAt: new Date(),
          isActive: true,
        },
      });
    }
    console.log(
      `✅ 恆迎 CYTIC 使用者 ${cyticRows.length} 筆（seed-data/cytic_nx00_user.csv；is_active 與上傳檔一致；主職務 SALES）`,
    );
  }

  /**
   * @FUNCTION_CODE NX99-PLAN-SVC-SEED-F01
   * 說明：四方案主檔（與 LITE 商業規格對齊；年費折數待 PM 定案，先以 N/0 占位）
   */
  const nx99Plans = [
    {
      code: 'NEXORA-LITE',
      name: 'NEXORA 基礎版',
      levelNo: 1,
      baseFeeMonth: 1500,
      seatFeeMonth: 250,
      minSeats: 1,
      maxSeats: 10,
      billingDefault: 'MONTHLY',
      yearDiscountType: 'N',
      yearDiscountValue: 0,
      yearPriceOverride: null as number | null,
      sortNo: 1,
    },
    {
      code: 'NEXORA-PLUS',
      name: 'NEXORA 進階版',
      levelNo: 2,
      baseFeeMonth: 5000,
      seatFeeMonth: 350,
      minSeats: 5,
      maxSeats: 20,
      billingDefault: 'MONTHLY',
      yearDiscountType: 'N',
      yearDiscountValue: 0,
      yearPriceOverride: null,
      sortNo: 2,
    },
    {
      code: 'NEXORA-PRO',
      name: 'NEXORA 專業版',
      levelNo: 3,
      baseFeeMonth: 15000,
      seatFeeMonth: 600,
      minSeats: 10,
      maxSeats: 30,
      billingDefault: 'MONTHLY',
      yearDiscountType: 'N',
      yearDiscountValue: 0,
      yearPriceOverride: null,
      sortNo: 3,
    },
    {
      code: 'NEXORA-ENTERPRISE',
      name: 'NEXORA 企業版',
      levelNo: 4,
      baseFeeMonth: 50000,
      seatFeeMonth: 1000,
      minSeats: 25,
      maxSeats: 100,
      billingDefault: 'MONTHLY',
      yearDiscountType: 'N',
      yearDiscountValue: 0,
      yearPriceOverride: null,
      sortNo: 4,
    },
  ] as const;

  for (const p of nx99Plans) {
    await prisma.nx99Plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        levelNo: p.levelNo,
        baseFeeMonth: p.baseFeeMonth,
        seatFeeMonth: p.seatFeeMonth,
        minSeats: p.minSeats,
        maxSeats: p.maxSeats,
        billingDefault: p.billingDefault,
        yearDiscountType: p.yearDiscountType,
        yearDiscountValue: p.yearDiscountValue,
        yearPriceOverride: p.yearPriceOverride,
        sortNo: p.sortNo,
        isActive: true,
      },
      create: {
        code: p.code,
        name: p.name,
        levelNo: p.levelNo,
        baseFeeMonth: p.baseFeeMonth,
        seatFeeMonth: p.seatFeeMonth,
        minSeats: p.minSeats,
        maxSeats: p.maxSeats,
        billingDefault: p.billingDefault,
        yearDiscountType: p.yearDiscountType,
        yearDiscountValue: p.yearDiscountValue,
        yearPriceOverride: p.yearPriceOverride,
        sortNo: p.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx99_plan seed 完成，共 ${nx99Plans.length} 筆`);

  /**
   * @FUNCTION_CODE NX99-PRMO-SVC-SEED-F01
   * 說明：產品模組 SKU（21 筆：LITE/PLUS/PRO 各 7；applicable_plan_code 與 nx99_plan.code 同命名空間）
   * billing_type：F＝固定月費（試算表皆為固定月費）
   * module_level：C＝Core、A＝Add-on、I＝Industry
   */
  type Nx99ModSeed = {
    code: string;
    name: string;
    moduleLevel: 'C' | 'A' | 'I';
    applicablePlanCode: string;
    monthlyFee: number;
    isBundleDefault: boolean;
    sortNo: number;
    appModuleCode: string;
  };

  const nx99ProductModules: Nx99ModSeed[] = [
    // NEXORA-LITE × 7
    {
      code: 'NX-LIT-CORE-BASE',
      name: 'LITE 核心套裝',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-LITE',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 1,
      appModuleCode: 'NX00',
    },
    {
      code: 'NX-LIT-CORE-SSO',
      name: 'SSO 單一登入',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-LITE',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 2,
      appModuleCode: 'NX00',
    },
    {
      code: 'NX-LIT-CORE-NX01',
      name: '進／退貨作業（基礎）',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-LITE',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 3,
      appModuleCode: 'NX01',
    },
    {
      code: 'NX-LIT-CORE-RPT',
      name: '基礎營運報表',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-LITE',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 4,
      appModuleCode: 'NX04',
    },
    {
      code: 'NX-LIT-ADD-EDI',
      name: 'EDI 加購',
      moduleLevel: 'A',
      applicablePlanCode: 'NEXORA-LITE',
      monthlyFee: 1500,
      isBundleDefault: false,
      sortNo: 5,
      appModuleCode: 'NX01',
    },
    {
      code: 'NX-LIT-ADD-WMS',
      name: '進階倉儲（WMS）',
      moduleLevel: 'A',
      applicablePlanCode: 'NEXORA-LITE',
      monthlyFee: 2000,
      isBundleDefault: false,
      sortNo: 6,
      appModuleCode: 'NX02',
    },
    {
      code: 'NX-LIT-IND-MFG',
      name: '製造業場域範本',
      moduleLevel: 'I',
      applicablePlanCode: 'NEXORA-LITE',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 7,
      appModuleCode: 'NX00',
    },
    // NEXORA-PLUS × 7
    {
      code: 'NX-PLU-CORE-BASE',
      name: 'PLUS 核心套裝',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PLUS',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 10,
      appModuleCode: 'NX00',
    },
    {
      code: 'NX-PLU-CORE-MSQ',
      name: '進階採購與供應商協同（MSQ）',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PLUS',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 11,
      appModuleCode: 'NX01',
    },
    {
      code: 'NX-PLU-CORE-BI',
      name: '營運儀表板（BI）',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PLUS',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 12,
      appModuleCode: 'NX04',
    },
    {
      code: 'NX-PLU-CORE-QP',
      name: '品質追溯（基礎）',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PLUS',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 13,
      appModuleCode: 'NX02',
    },
    {
      code: 'NX-PLU-ADD-CRM',
      name: 'CRM 加購',
      moduleLevel: 'A',
      applicablePlanCode: 'NEXORA-PLUS',
      monthlyFee: 2500,
      isBundleDefault: false,
      sortNo: 14,
      appModuleCode: 'NX03',
    },
    {
      code: 'NX-PLU-ADD-PRJ',
      name: '專案型訂單',
      moduleLevel: 'A',
      applicablePlanCode: 'NEXORA-PLUS',
      monthlyFee: 1800,
      isBundleDefault: false,
      sortNo: 15,
      appModuleCode: 'NX03',
    },
    {
      code: 'NX-PLU-IND-SVC',
      name: '服務業場域範本',
      moduleLevel: 'I',
      applicablePlanCode: 'NEXORA-PLUS',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 16,
      appModuleCode: 'NX00',
    },
    // NEXORA-PRO × 7
    {
      code: 'NX-PRO-CORE-BASE',
      name: 'PRO 核心套裝',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PRO',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 20,
      appModuleCode: 'NX00',
    },
    {
      code: 'NX-PRO-CORE-BI',
      name: '進階分析與預測',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PRO',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 21,
      appModuleCode: 'NX04',
    },
    {
      code: 'NX-PRO-CORE-QMS',
      name: 'QMS 品質管理',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PRO',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 22,
      appModuleCode: 'NX02',
    },
    {
      code: 'NX-PRO-CORE-MES',
      name: 'MES 生產現場',
      moduleLevel: 'C',
      applicablePlanCode: 'NEXORA-PRO',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 23,
      appModuleCode: 'NX02',
    },
    {
      code: 'NX-PRO-ADD-FSM',
      name: '現場服務（FSM）',
      moduleLevel: 'A',
      applicablePlanCode: 'NEXORA-PRO',
      monthlyFee: 3500,
      isBundleDefault: false,
      sortNo: 24,
      appModuleCode: 'NX03',
    },
    {
      code: 'NX-PRO-ADD-EAM',
      name: '資產維護（EAM）',
      moduleLevel: 'A',
      applicablePlanCode: 'NEXORA-PRO',
      monthlyFee: 4200,
      isBundleDefault: false,
      sortNo: 25,
      appModuleCode: 'NX02',
    },
    {
      code: 'NX-PRO-IND-FOOD',
      name: '食品業合規範本',
      moduleLevel: 'I',
      applicablePlanCode: 'NEXORA-PRO',
      monthlyFee: 0,
      isBundleDefault: true,
      sortNo: 26,
      appModuleCode: 'NX00',
    },
  ];

  for (const m of nx99ProductModules) {
    await prisma.nx99ProductModule.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        moduleLevel: m.moduleLevel,
        applicablePlanCode: m.applicablePlanCode,
        billingType: 'F',
        monthlyFee: m.monthlyFee,
        isBundleDefault: m.isBundleDefault,
        sortNo: m.sortNo,
        isActive: true,
      },
      create: {
        code: m.code,
        name: m.name,
        moduleLevel: m.moduleLevel,
        applicablePlanCode: m.applicablePlanCode,
        billingType: 'F',
        monthlyFee: m.monthlyFee,
        isBundleDefault: m.isBundleDefault,
        sortNo: m.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx99_product_module seed 完成，共 ${nx99ProductModules.length} 筆`);

  const prmoRows = await prisma.nx99ProductModule.findMany({
    where: { code: { in: nx99ProductModules.map((m) => m.code) } },
    select: { id: true, code: true },
  });
  const prmoIdByCode = new Map(prmoRows.map((r) => [r.code, r.id]));
  await prisma.nx99ProductModuleMap.deleteMany({
    where: { productModuleId: { in: prmoRows.map((r) => r.id) } },
  });
  for (const m of nx99ProductModules) {
    const productModuleId = prmoIdByCode.get(m.code);
    if (!productModuleId) continue;
    await prisma.nx99ProductModuleMap.create({
      data: {
        productModuleId,
        appModuleCode: m.appModuleCode,
        isRequired: m.isBundleDefault,
      },
    });
  }
  console.log(`✅ nx99_product_module_map seed 完成，共 ${nx99ProductModules.length} 筆`);

  /**
   * @FUNCTION_CODE NX99-SUBS-SVC-SEED-F01
   * 說明：DEV-INNOVA 訂閱 NEXORA-LITE（含標配模組明細 + 一筆加購測試）
   */
  if (devTenant) {
    const litePlan = await prisma.nx99Plan.findUnique({
      where: { code: 'NEXORA-LITE' },
    });
    if (litePlan) {
      await prisma.nx99SubscriptionItem.deleteMany({
        where: { subscription: { tenantId: devTenant.id } },
      });
      await prisma.nx99Subscription.deleteMany({ where: { tenantId: devTenant.id } });

      const seats = 3;
      const baseFeeSnapshot = litePlan.baseFeeMonth;
      const seatFeeSnapshot = litePlan.seatFeeMonth;
      const subtotalSnapshot = baseFeeSnapshot + seats * seatFeeSnapshot;

      const bundledLite = nx99ProductModules.filter(
        (m) => m.applicablePlanCode === 'NEXORA-LITE' && m.isBundleDefault,
      );
      const addOnSample = nx99ProductModules.find((m) => m.code === 'NX-LIT-ADD-EDI');
      const subStart = new Date('2020-01-01T00:00:00.000Z');
      const subEnd = new Date('2099-12-31T23:59:59.999Z');

      const itemCreates: {
        itemType: string;
        refId: string;
        status: string;
        isIncluded: boolean;
        billingCycle: string;
        priceSnapshot: number;
        discountTypeSnapshot: string;
        discountValueSnapshot: number;
        totalSnapshot: number;
        startAt: Date;
        endAt: Date;
      }[] = [];

      for (const m of bundledLite) {
        const id = prmoIdByCode.get(m.code);
        if (!id) continue;
        itemCreates.push({
          itemType: 'PRODUCT_MODULE',
          refId: id,
          status: 'ACTIVE',
          isIncluded: true,
          billingCycle: 'M',
          priceSnapshot: m.monthlyFee,
          discountTypeSnapshot: 'N',
          discountValueSnapshot: 0,
          totalSnapshot: m.monthlyFee,
          startAt: subStart,
          endAt: subEnd,
        });
      }
      if (addOnSample) {
        const id = prmoIdByCode.get(addOnSample.code);
        if (id) {
          itemCreates.push({
            itemType: 'PRODUCT_MODULE',
            refId: id,
            status: 'ACTIVE',
            isIncluded: false,
            billingCycle: 'M',
            priceSnapshot: addOnSample.monthlyFee,
            discountTypeSnapshot: 'N',
            discountValueSnapshot: 0,
            totalSnapshot: addOnSample.monthlyFee,
            startAt: subStart,
            endAt: subEnd,
          });
        }
      }

      await prisma.nx99Subscription.create({
        data: {
          tenantId: devTenant.id,
          planId: litePlan.id,
          status: 'A',
          billingCycle: 'M',
          seats,
          startAt: subStart,
          endAt: subEnd,
          autoRenew: true,
          baseFeeSnapshot,
          seatFeeSnapshot,
          discountTypeSnapshot: 'N',
          discountValueSnapshot: 0,
          subtotalSnapshot,
          discountAmountSnapshot: 0,
          totalSnapshot: subtotalSnapshot,
          items: { create: itemCreates },
        },
      });
      console.log(
        `✅ nx99_subscription seed 完成（DEV-INNOVA → NEXORA-LITE，seats=${seats}，明細 ${itemCreates.length} 筆）`,
      );

      const cyticSubSeats = 200;
      const cyticSubtotal = baseFeeSnapshot + cyticSubSeats * seatFeeSnapshot;
      await prisma.nx99SubscriptionItem.deleteMany({
        where: { subscription: { tenantId: cyticTenant.id } },
      });
      await prisma.nx99Subscription.deleteMany({ where: { tenantId: cyticTenant.id } });
      await prisma.nx99Subscription.create({
        data: {
          tenantId: cyticTenant.id,
          planId: litePlan.id,
          status: 'A',
          billingCycle: 'M',
          seats: cyticSubSeats,
          startAt: subStart,
          endAt: subEnd,
          autoRenew: true,
          baseFeeSnapshot,
          seatFeeSnapshot,
          discountTypeSnapshot: 'N',
          discountValueSnapshot: 0,
          subtotalSnapshot: cyticSubtotal,
          discountAmountSnapshot: 0,
          totalSnapshot: cyticSubtotal,
          items: { create: itemCreates },
        },
      });
      console.log(
        `✅ nx99_subscription seed 完成（CYTIC → NEXORA-LITE，seats=${cyticSubSeats}，明細 ${itemCreates.length} 筆）`,
      );
    }
  }

  /**
   * @FUNCTION_CODE NX00-VIEW-SVC-SEED-F01
   * 說明：系統畫面定義 seed，確保 nx00_view 有完整的畫面清單
   */
  const views = [
    { code: 'NX00_LOGIN',          name: '使用者登入',         moduleCode: 'nx00', path: '/login',                      sortNo: 1  },
    { code: 'NX00_HOME',           name: '系統首頁',            moduleCode: 'nx00', path: '/home',                       sortNo: 2  },
    { code: 'NX00_USER',           name: '使用者基本資料',    moduleCode: 'nx00', path: '/base/user',         sortNo: 3  },
    { code: 'NX00_ROLE',           name: '權限角色基本資料',  moduleCode: 'nx00', path: '/base/role',         sortNo: 4  },
    { code: 'NX00_USER_ROLE',      name: '使用者職位設定',    moduleCode: 'nx00', path: '/base/user-role',    sortNo: 5  },
    { code: 'NX00_USER_WAREHOUSE', name: '使用者據點設定',    moduleCode: 'nx00', path: '/base/user-warehouse', sortNo: 6  },
    { code: 'NX00_ROLE_VIEW',      name: '使用者權限設定',    moduleCode: 'nx00', path: '/base/role-view',    sortNo: 7  },
    { code: 'NX00_PART',           name: '零件基本資料',      moduleCode: 'nx00', path: '/base/part',         sortNo: 8  },
    { code: 'NX00_BRAND',          name: '廠牌主檔',          moduleCode: 'nx00', path: '/base/brand',        sortNo: 9  },
    { code: 'NX00_CAR_BRAND',      name: '汽車廠牌主檔',      moduleCode: 'nx00', path: '/base/car-brand',    sortNo: 10 },
    { code: 'NX00_PART_BRAND',     name: '零件廠牌主檔',      moduleCode: 'nx00', path: '/base/part-brand',   sortNo: 11 },
    { code: 'NX00_WAREHOUSE',      name: '倉庫基本資料',      moduleCode: 'nx00', path: '/base/location',    sortNo: 12 },
    { code: 'NX00_LOCATION',       name: '庫位基本資料',      moduleCode: 'nx00', path: '/base/location',     sortNo: 13 },
    { code: 'NX00_PARTNER',        name: '往來客戶基本資料',  moduleCode: 'nx00', path: '/base/partner',      sortNo: 14 },
  ];

  for (const view of views) {
    await prisma.nx00View.upsert({
      where: { code: view.code },
      update: { name: view.name, path: view.path, sortNo: view.sortNo },
      create: {
        code:       view.code,
        name:       view.name,
        moduleCode: view.moduleCode,
        path:       view.path,
        sortNo:     view.sortNo,
        isActive:   true,
      },
    });
  }
  console.log('✅ nx00_view seed 完成，共 14 筆');

  // 以下 DEMO 資料已移除：國家／零件品牌／零件／倉庫／庫位／往來客戶／nx01 單據／首頁公告與行事曆。
  // 請自行匯入主檔（舊鏈曾含會 TRUNCATE nx00_part 之 migration，已封存於 prisma/_archive_migrations/）。

}

main()
  .then(() => {
    console.log('Seed completed.');
  })
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
