/**
 * NEXORA db-core Prisma Seed
 * 執行：pnpm prisma db seed（需在 packages/db-core 目錄或由根目錄透過 workspace 執行）
 */
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  // 在 seed 階段直接 fail，避免使用到錯誤的連線設定
  throw new Error('DATABASE_URL is not set or not a string');
}

const pool = new pg.Pool({
  connectionString: String(databaseUrl),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  /**
   * @FUNCTION_CODE NX00-USER-SVC-SEED-F01
   * 說明：建立或更新 admin 帳號（預設密碼為 changeme 的 bcrypt hash）
   */
  const ADMIN_DEFAULT_PASSWORD_HASH =
    '$2b$10$kgqkOwTo/kEKquFZFebJfucnCaEve7IaD7.Cawir5827AARvxk8.S'; // bcrypt hash for 'changeme'

  await prisma.nx00User.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: ADMIN_DEFAULT_PASSWORD_HASH,
      displayName: '系統管理員',
      isActive: true,
    },
    create: {
      username: 'admin',
      passwordHash: ADMIN_DEFAULT_PASSWORD_HASH,
      displayName: '系統管理員',
      isActive: true,
    },
  });
  console.log('✅ admin seed 完成（username=admin, 預設密碼=changeme）');

  const adminUser = await prisma.nx00User.findUnique({
    where: { username: 'admin' },
    select: { id: true, username: true },
  });

  if (adminUser) {
    /**
     * @FUNCTION_CODE NX00-ROLE-SVC-SEED-F01
     * 說明：確保系統管理者角色 ADMIN 存在
     */
    const adminRole = await prisma.nx00Role.upsert({
      where: { code: 'ADMIN' },
      update: {
        name: '管理者',
        isSystem: true,
        isActive: true,
      },
      create: {
        code: 'ADMIN',
        name: '管理者',
        description: '系統管理者（擁有全域存取權限）',
        isSystem: true,
        isActive: true,
        sortNo: 0,
      },
    });

    /**
     * @FUNCTION_CODE NX00-USER-ROLE-SVC-SEED-F01
     * 說明：確保 admin 使用者綁定 ADMIN 角色
     */
    await prisma.nx00UserRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {
        isPrimary: true,
        isActive: true,
      },
      create: {
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
    console.log('⚠ 找不到 username=admin 的使用者，無法綁定 ADMIN 角色');
  }

  /**
   * @FUNCTION_CODE NX99-TENANT-SVC-SEED-F01
   * 說明：DEV 測試用租戶 seed，確保開發環境有基礎租戶資料
   */
  await prisma.nx99Tenant.upsert({
    where: { code: 'DEV-INNOVA' },
    update: {},
    create: {
      code: 'DEV-INNOVA',
      name: '伊諾瓦資訊科技有限公司（開發測試）',
      status: 'A',
      sortNo: 1,
      isActive: true,
    },
  });

  /**
   * @FUNCTION_CODE NX99-TENANT-SVC-SEED-F02
   * 說明：將現有 nx00_user 全部綁定至 DEV-INNOVA 開發測試租戶
   */
  const devTenant = await prisma.nx99Tenant.findUnique({
    where: { code: 'DEV-INNOVA' },
  });

  if (devTenant) {
    const result = await prisma.nx00User.updateMany({
      where: { tenantId: null },
      data: { tenantId: devTenant.id },
    });
    console.log(
      `✅ 所有 nx00_user 已綁定至 DEV-INNOVA（tenantId: ${devTenant.id}，更新 ${result.count} 筆）`
    );
  }

  /**
   * @FUNCTION_CODE NX00-VIEW-SVC-SEED-F01
   * 說明：系統畫面定義 seed，確保 nx00_view 有完整的畫面清單
   */
  const views = [
    { code: 'NX00_LOGIN',     name: '使用者登入',       moduleCode: 'nx00', path: '/login',                      sortNo: 1  },
    { code: 'NX00_HOME',      name: '系統首頁',          moduleCode: 'nx00', path: '/home',                       sortNo: 2  },
    { code: 'NX00_USER',      name: '使用者基本資料',    moduleCode: 'nx00', path: '/dashboard/nx00/user',         sortNo: 3  },
    { code: 'NX00_ROLE',      name: '權限角色基本資料',  moduleCode: 'nx00', path: '/dashboard/nx00/role',         sortNo: 4  },
    { code: 'NX00_USER_ROLE', name: '使用者職位設定',    moduleCode: 'nx00', path: '/dashboard/nx00/user-role',    sortNo: 5  },
    { code: 'NX00_ROLE_VIEW', name: '使用者權限設定',    moduleCode: 'nx00', path: '/dashboard/nx00/role-view',    sortNo: 6  },
    { code: 'NX00_PART',      name: '零件基本資料',      moduleCode: 'nx00', path: '/dashboard/nx00/part',         sortNo: 7  },
    { code: 'NX00_BRAND',     name: '廠牌基本資料',      moduleCode: 'nx00', path: '/dashboard/nx00/brand',        sortNo: 8  },
    { code: 'NX00_WAREHOUSE', name: '倉庫基本資料',      moduleCode: 'nx00', path: '/dashboard/nx00/warehouse',    sortNo: 9  },
    { code: 'NX00_LOCATION',  name: '庫位基本資料',      moduleCode: 'nx00', path: '/dashboard/nx00/location',     sortNo: 10 },
    { code: 'NX00_PARTNER',   name: '往來客戶基本資料',  moduleCode: 'nx00', path: '/dashboard/nx00/partner',      sortNo: 11 },
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
  console.log('✅ nx00_view seed 完成，共 11 筆');

  /**
   * @FUNCTION_CODE NX00-BRAND-SVC-SEED-F01
   * 說明：seed 測試用廠牌資料
   */
  const brands = [
    { code: 'MANN',   name: 'MANN',     originCountry: 'DE', sortNo: 1 },
    { code: 'BOSCH',  name: 'BOSCH',    originCountry: 'DE', sortNo: 2 },
    { code: 'TW-OEM', name: '台灣副廠',  originCountry: 'TW', sortNo: 3 },
  ] as const;

  for (const b of brands) {
    await prisma.nx00Brand.upsert({
      where: { code: b.code },
      update: {
        name: b.name,
        originCountry: b.originCountry,
        sortNo: b.sortNo,
        isActive: true,
      },
      create: {
        code: b.code,
        name: b.name,
        originCountry: b.originCountry,
        sortNo: b.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx00_brand seed 完成，共 ${brands.length} 筆`);

  /**
   * @FUNCTION_CODE NX00-PART-SVC-SEED-F01
   * 說明：seed 測試用零件資料（brand_id 對應上方廠牌）
   */
  const brandRows = await prisma.nx00Brand.findMany({
    where: { code: { in: brands.map((b) => b.code) } },
    select: { id: true, code: true },
  });
  const brandIdByCode = new Map(brandRows.map((r) => [r.code, r.id]));

  const parts = [
    { code: 'OC-001', name: '機油濾芯', brandCode: 'MANN',   uom: 'pcs', spec: 'MANN W712/75' },
    { code: 'AF-001', name: '空氣濾芯', brandCode: 'BOSCH',  uom: 'pcs', spec: 'BOSCH S0001' },
    { code: 'BP-001', name: '煞車來令片', brandCode: 'TW-OEM', uom: 'set', spec: '前輪用' },
  ] as const;

  for (const p of parts) {
    const brandId = brandIdByCode.get(p.brandCode) ?? null;
    await prisma.nx00Part.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        brandId,
        uom: p.uom,
        spec: p.spec,
        isActive: true,
      },
      create: {
        code: p.code,
        name: p.name,
        brandId,
        uom: p.uom,
        spec: p.spec,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx00_part seed 完成，共 ${parts.length} 筆`);

  /**
   * @FUNCTION_CODE NX00-WAREHOUSE-SVC-SEED-F01
   * 說明：seed 測試用倉庫資料
   */
  const warehouses = [
    { code: 'Z01', name: '主倉庫', sortNo: 1 },
  ] as const;

  for (const w of warehouses) {
    await prisma.nx00Warehouse.upsert({
      where: { code: w.code },
      update: {
        name: w.name,
        sortNo: w.sortNo,
        isActive: true,
      },
      create: {
        code: w.code,
        name: w.name,
        sortNo: w.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx00_warehouse seed 完成，共 ${warehouses.length} 筆`);

  /**
   * @FUNCTION_CODE NX00-LOCATION-SVC-SEED-F01
   * 說明：seed 測試用庫位資料（掛在 Z01 倉庫下）
   */
  const warehouseRows = await prisma.nx00Warehouse.findMany({
    where: { code: { in: warehouses.map((w) => w.code) } },
    select: { id: true, code: true },
  });
  const warehouseIdByCode = new Map(warehouseRows.map((r) => [r.code, r.id]));

  const locations = [
    { warehouseCode: 'Z01', code: 'A-01-01', name: 'A區01架01格', zone: 'A', rack: 'R01', sortNo: 1 },
    { warehouseCode: 'Z01', code: 'A-01-02', name: 'A區01架02格', zone: 'A', rack: 'R01', sortNo: 2 },
  ] as const;

  for (const l of locations) {
    const warehouseId = warehouseIdByCode.get(l.warehouseCode);
    if (!warehouseId) continue;

    await prisma.nx00Location.upsert({
      where: {
        warehouseId_code: {
          warehouseId,
          code: l.code,
        },
      },
      update: {
        name: l.name,
        zone: l.zone,
        rack: l.rack,
        sortNo: l.sortNo,
        isActive: true,
      },
      create: {
        warehouseId,
        code: l.code,
        name: l.name,
        zone: l.zone,
        rack: l.rack,
        sortNo: l.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx00_location seed 完成，共 ${locations.length} 筆（若倉庫存在）`);

  /**
   * @FUNCTION_CODE NX00-PARTNER-SVC-SEED-F01
   * 說明：seed 測試用往來客戶資料
   */
  const partners = [
    { code: 'C0001', name: '測試客戶',       partnerType: 'CUST', contactName: '王小明', phone: '02-12345678' },
    { code: 'S0001', name: '測試供應商',     partnerType: 'SUP',  contactName: '李大華', phone: '02-87654321' },
    { code: 'B0001', name: '測試客戶供應商', partnerType: 'BOTH', contactName: '陳小花', phone: '02-11112222' },
  ] as const;

  for (const p of partners) {
    await prisma.nx00Partner.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        partnerType: p.partnerType,
        contactName: p.contactName,
        phone: p.phone,
        isActive: true,
      },
      create: {
        code: p.code,
        name: p.name,
        partnerType: p.partnerType,
        contactName: p.contactName,
        phone: p.phone,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx00_partner seed 完成，共 ${partners.length} 筆`);

  /**
   * @FUNCTION_CODE NX00-ROLE-SVC-SEED-F02
   * 說明：seed 測試用角色資料
   */
  const extraRoles = [
    { code: 'SALES', name: '業務', sortNo: 1 },
    { code: 'WH',    name: '倉管', sortNo: 2 },
  ] as const;

  for (const r of extraRoles) {
    await prisma.nx00Role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
      },
      create: {
        code: r.code,
        name: r.name,
        sortNo: r.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ nx00_role seed (SALES/WH) 完成，共 ${extraRoles.length} 筆`);

  /**
   * @FUNCTION_CODE NX00-USER-SVC-SEED-F02
   * 說明：seed 測試用使用者，預設密碼 changeme
   */
  const TEST_USER_PASSWORD_HASH = ADMIN_DEFAULT_PASSWORD_HASH;

  await prisma.nx00User.upsert({
    where: { username: 'test_user' },
    update: {
      displayName: '測試人員',
      passwordHash: TEST_USER_PASSWORD_HASH,
      isActive: true,
    },
    create: {
      username: 'test_user',
      displayName: '測試人員',
      passwordHash: TEST_USER_PASSWORD_HASH,
      isActive: true,
    },
  });
  console.log('✅ test_user seed 完成（username=test_user, 預設密碼=changeme）');
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
