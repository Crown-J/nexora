/**
 * NEXORA db-core Prisma Seed
 * 執行：pnpm prisma db seed（需在 packages/db-core 目錄或由根目錄透過 workspace 執行）
 *
 * 策略（2026-04-03）：DEV-INNOVA + DEMO-LITE + DEMO-PLUS；CYTIC 不寫入（真實客戶改 CSV 匯入）。
 */
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { poolConfigFromDatabaseUrl } from '../scripts/pgTlsPoolConfig';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error('DATABASE_URL is not set or not a string');
}

const pool = new pg.Pool(poolConfigFromDatabaseUrl(String(databaseUrl)));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** bcrypt：展示帳號 Demo2026（固定 hash 以利重跑 seed） */
const DEMO_PASSWORD_HASH =
  '$2b$10$RKCgQR6E8aK1D5fM2MZMB.ffxkFnEsSPEtUrLPMvuoKQnYCXqBVrq';
/** bcrypt：平台／各租戶 admin — Nexoragrid2026 */
const ADMIN_PLATFORM_PASSWORD_HASH =
  '$2b$10$H269i.oPp5pRGqcV2dzzb.viPbIMP4BMFR62oxD17CGiWvciXNWIq';

type TenantRoleSeed = {
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  sortNo: number;
};

type DemoUserSeed = {
  userAccount: string;
  userName: string;
  useAdminPassword: boolean;
  roleCodes: string[];
};

const ROLE_SPECS: TenantRoleSeed[] = [
  { code: 'ADMIN', name: '系統管理員', isSystem: true, sortNo: 1, description: '系統管理員' },
  { code: 'OWNER', name: '負責人', isSystem: false, sortNo: 2 },
  { code: 'SALES', name: '業務專員', isSystem: false, sortNo: 3 },
  { code: 'WAREHOUSE', name: '倉管專員', isSystem: false, sortNo: 4 },
  { code: 'DRIVER', name: '外務司機', isSystem: false, sortNo: 5 },
  { code: 'ACCOUNTANT', name: '會計專員', isSystem: false, sortNo: 6 },
];

const ROLES_WITH_WAREHOUSE = new Set(['ADMIN', 'OWNER', 'WAREHOUSE', 'DRIVER']);

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

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F01
 */
async function seedCountries(): Promise<Map<string, string>> {
  const rows = [
    { code: 'TWN', name: '台灣', sortNo: 1 },
    { code: 'DEU', name: '德國', sortNo: 2 },
    { code: 'JPN', name: '日本', sortNo: 3 },
    { code: 'USA', name: '美國', sortNo: 4 },
    { code: 'CHN', name: '中國', sortNo: 5 },
    { code: 'KOR', name: '韓國', sortNo: 6 },
    { code: 'GBR', name: '英國', sortNo: 7 },
    { code: 'FRA', name: '法國', sortNo: 8 },
    { code: 'ITA', name: '義大利', sortNo: 9 },
    { code: 'AUT', name: '奧地利', sortNo: 10 },
  ];
  const idByCode = new Map<string, string>();
  for (const r of rows) {
    const row = await prisma.nx00Country.upsert({
      where: { code: r.code },
      update: { name: r.name, sortNo: r.sortNo, isActive: true },
      create: { code: r.code, name: r.name, sortNo: r.sortNo, isActive: true },
    });
    idByCode.set(r.code, row.id);
  }
  console.log(`✅ NX00-SEED-SVC-001-F01 seedCountries：${rows.length} 筆`);
  return idByCode;
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F02
 */
async function seedCurrencies(): Promise<void> {
  const rows = [
    { code: 'TWD', name: '新台幣', symbol: 'NT$', decimalPlaces: 0, sortNo: 1 },
    { code: 'EUR', name: '歐元', symbol: '€', decimalPlaces: 2, sortNo: 2 },
    { code: 'USD', name: '美元', symbol: '$', decimalPlaces: 2, sortNo: 3 },
    { code: 'JPY', name: '日圓', symbol: '¥', decimalPlaces: 0, sortNo: 4 },
    { code: 'CNY', name: '人民幣', symbol: '¥', decimalPlaces: 2, sortNo: 5 },
  ];
  for (const r of rows) {
    await prisma.nx00Currency.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        symbol: r.symbol,
        decimalPlaces: r.decimalPlaces,
        sortNo: r.sortNo,
        isActive: true,
      },
      create: {
        code: r.code,
        name: r.name,
        symbol: r.symbol,
        decimalPlaces: r.decimalPlaces,
        sortNo: r.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ NX00-SEED-SVC-001-F02 seedCurrencies：${rows.length} 筆`);
}

type TenantIds = {
  dev: string;
  demoLite: string;
  demoPlus: string;
};

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F03
 */
async function seedTenants(): Promise<TenantIds> {
  const dev = await prisma.nx99Tenant.upsert({
    where: { code: 'DEV-INNOVA' },
    update: {
      name: 'Innova IT',
      nameEn: 'Innova IT',
      isActive: true,
    },
    create: {
      code: 'DEV-INNOVA',
      name: 'Innova IT',
      nameEn: 'Innova IT',
      status: 'A',
      sortNo: 1,
      isActive: true,
    },
  });
  const demoLite = await prisma.nx99Tenant.upsert({
    where: { code: 'DEMO-LITE' },
    update: {
      name: 'NEXORA 展示版（基礎）',
      nameEn: 'NEXORA Demo LITE',
      isActive: true,
    },
    create: {
      code: 'DEMO-LITE',
      name: 'NEXORA 展示版（基礎）',
      nameEn: 'NEXORA Demo LITE',
      status: 'A',
      sortNo: 2,
      isActive: true,
    },
  });
  const demoPlus = await prisma.nx99Tenant.upsert({
    where: { code: 'DEMO-PLUS' },
    update: {
      name: 'NEXORA 展示版（進階）',
      nameEn: 'NEXORA Demo PLUS',
      isActive: true,
    },
    create: {
      code: 'DEMO-PLUS',
      name: 'NEXORA 展示版（進階）',
      nameEn: 'NEXORA Demo PLUS',
      status: 'A',
      sortNo: 3,
      isActive: true,
    },
  });
  console.log('✅ NX00-SEED-SVC-001-F03 seedTenants：DEV-INNOVA、DEMO-LITE、DEMO-PLUS');
  return { dev: dev.id, demoLite: demoLite.id, demoPlus: demoPlus.id };
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F04
 */
async function seedRoles(tenantIds: TenantIds): Promise<void> {
  const ids = [tenantIds.dev, tenantIds.demoLite, tenantIds.demoPlus];
  for (const tid of ids) {
    for (const spec of ROLE_SPECS) {
      await upsertNx00RoleForTenant(tid, spec);
    }
  }
  console.log('✅ NX00-SEED-SVC-001-F04 seedRoles：三租戶 × 6 角色');
}

async function getRoleIdMap(tenantId: string): Promise<Map<string, string>> {
  const roles = await prisma.nx00Role.findMany({ where: { tenantId }, select: { id: true, code: true } });
  return new Map(roles.map((r) => [r.code, r.id]));
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F05
 * 僅 DEV-INNOVA：admin + ADMIN；DEMO 使用者於 F17 內建立。
 */
async function seedUsers(tenantIds: TenantIds): Promise<void> {
  const tid = tenantIds.dev;
  const roleMap = await getRoleIdMap(tid);
  const adminRoleId = roleMap.get('ADMIN');
  if (!adminRoleId) throw new Error('DEV-INNOVA 缺少 ADMIN 角色');

  await prisma.nx00User.upsert({
    where: { tenantId_userAccount: { tenantId: tid, userAccount: 'admin' } },
    update: {
      passwordHash: ADMIN_PLATFORM_PASSWORD_HASH,
      userName: '系統管理員',
      isActive: true,
      tenantId: tid,
    },
    create: {
      tenantId: tid,
      userAccount: 'admin',
      passwordHash: ADMIN_PLATFORM_PASSWORD_HASH,
      userName: '系統管理員',
      isActive: true,
    },
  });
  const adminUser = await prisma.nx00User.findUniqueOrThrow({
    where: { tenantId_userAccount: { tenantId: tid, userAccount: 'admin' } },
    select: { id: true },
  });
  await prisma.nx00UserRole.upsert({
    where: {
      tenantId_userId_roleId: { tenantId: tid, userId: adminUser.id, roleId: adminRoleId },
    },
    update: { isPrimary: true, isActive: true },
    create: {
      tenantId: tid,
      userId: adminUser.id,
      roleId: adminRoleId,
      isPrimary: true,
      assignedAt: new Date(),
      isActive: true,
    },
  });
  console.log('✅ NX00-SEED-SVC-001-F05 seedUsers：DEV-INNOVA admin（Nexoragrid2026）+ ADMIN');
}

async function seedDemoUsersForTenant(tenantId: string, users: DemoUserSeed[]): Promise<void> {
  const roleMap = await getRoleIdMap(tenantId);
  const warehouses = await prisma.nx00Warehouse.findMany({
    where: { tenantId, code: { in: ['Z01', 'Z02'] } },
    select: { id: true, code: true },
  });
  const whIds = warehouses.map((w) => w.id);

  for (const u of users) {
    const hash = u.useAdminPassword ? ADMIN_PLATFORM_PASSWORD_HASH : DEMO_PASSWORD_HASH;
    await prisma.nx00User.upsert({
      where: { tenantId_userAccount: { tenantId, userAccount: u.userAccount } },
      update: {
        userName: u.userName,
        passwordHash: hash,
        isActive: true,
        tenantId,
      },
      create: {
        tenantId,
        userAccount: u.userAccount,
        userName: u.userName,
        passwordHash: hash,
        isActive: true,
      },
    });
    const userRow = await prisma.nx00User.findUniqueOrThrow({
      where: { tenantId_userAccount: { tenantId, userAccount: u.userAccount } },
      select: { id: true },
    });

    for (let i = 0; i < u.roleCodes.length; i++) {
      const rc = u.roleCodes[i]!;
      const rid = roleMap.get(rc);
      if (!rid) throw new Error(`租戶缺少角色 ${rc}`);
      await prisma.nx00UserRole.upsert({
        where: {
          tenantId_userId_roleId: { tenantId, userId: userRow.id, roleId: rid },
        },
        update: { isPrimary: i === 0, isActive: true },
        create: {
          tenantId,
          userId: userRow.id,
          roleId: rid,
          isPrimary: i === 0,
          assignedAt: new Date(),
          isActive: true,
        },
      });
    }

    const needsWh = u.roleCodes.some((c) => ROLES_WITH_WAREHOUSE.has(c));
    if (needsWh && whIds.length > 0) {
      for (const wid of whIds) {
        await prisma.nx00UserWarehouse.upsert({
          where: {
            tenantId_userId_warehouseId: { tenantId, userId: userRow.id, warehouseId: wid },
          },
          update: { isActive: true },
          create: {
            tenantId,
            userId: userRow.id,
            warehouseId: wid,
            assignedAt: new Date(),
            isActive: true,
          },
        });
      }
    }
  }
}

const DEMO_LITE_USERS: DemoUserSeed[] = [
  { userAccount: 'admin', userName: '系統管理員', useAdminPassword: true, roleCodes: ['ADMIN'] },
  { userAccount: 'chen_boss', userName: '陳志明', useAdminPassword: false, roleCodes: ['OWNER', 'ACCOUNTANT'] },
  { userAccount: 'lin_sales1', userName: '林雅惠', useAdminPassword: false, roleCodes: ['SALES'] },
  { userAccount: 'huang_sales2', userName: '黃建宏', useAdminPassword: false, roleCodes: ['SALES'] },
  { userAccount: 'wang_wh1', userName: '王俊傑', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
  { userAccount: 'lee_wh2', userName: '李淑芬', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
  { userAccount: 'chou_driver', userName: '周文凱', useAdminPassword: false, roleCodes: ['DRIVER', 'SALES'] },
  { userAccount: 'wu_acct', userName: '吳美玲', useAdminPassword: false, roleCodes: ['ACCOUNTANT'] },
  { userAccount: 'chang_sales3', userName: '張家豪', useAdminPassword: false, roleCodes: ['SALES', 'DRIVER'] },
  { userAccount: 'hsu_wh3', userName: '許雅婷', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
];

const DEMO_PLUS_USERS: DemoUserSeed[] = [
  { userAccount: 'admin', userName: '系統管理員', useAdminPassword: true, roleCodes: ['ADMIN'] },
  { userAccount: 'luo_boss', userName: '羅大偉', useAdminPassword: false, roleCodes: ['OWNER'] },
  { userAccount: 'chen_vp', userName: '陳淑華', useAdminPassword: false, roleCodes: ['OWNER', 'ACCOUNTANT'] },
  { userAccount: 'lin_sales1', userName: '林志豪', useAdminPassword: false, roleCodes: ['SALES'] },
  { userAccount: 'huang_sales2', userName: '黃雅玲', useAdminPassword: false, roleCodes: ['SALES'] },
  { userAccount: 'tsai_sales3', userName: '蔡明翰', useAdminPassword: false, roleCodes: ['SALES'] },
  { userAccount: 'wu_sales4', userName: '吳佳蓉', useAdminPassword: false, roleCodes: ['SALES', 'DRIVER'] },
  { userAccount: 'wang_sales5', userName: '王冠霖', useAdminPassword: false, roleCodes: ['SALES'] },
  { userAccount: 'lee_wh1', userName: '李建國', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
  { userAccount: 'chou_wh2', userName: '周美慧', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
  { userAccount: 'hsu_wh3', userName: '許志偉', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
  { userAccount: 'chang_wh4', userName: '張雅萍', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
  { userAccount: 'liu_wh5', userName: '劉家銘', useAdminPassword: false, roleCodes: ['WAREHOUSE'] },
  { userAccount: 'cheng_driver1', userName: '鄭文彬', useAdminPassword: false, roleCodes: ['DRIVER'] },
  { userAccount: 'ho_driver2', userName: '何淑君', useAdminPassword: false, roleCodes: ['DRIVER', 'SALES'] },
  { userAccount: 'kao_driver3', userName: '高志遠', useAdminPassword: false, roleCodes: ['DRIVER'] },
  { userAccount: 'yeh_acct1', userName: '葉美珍', useAdminPassword: false, roleCodes: ['ACCOUNTANT'] },
  { userAccount: 'pan_acct2', userName: '潘建宇', useAdminPassword: false, roleCodes: ['ACCOUNTANT'] },
  { userAccount: 'su_acct3', userName: '蘇雅文', useAdminPassword: false, roleCodes: ['ACCOUNTANT'] },
  { userAccount: 'tang_sales6', userName: '唐志鴻', useAdminPassword: false, roleCodes: ['SALES'] },
];

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F06
 */
async function seedPartBrands(tenantId: string, countryIdDeu: string): Promise<Map<string, string>> {
  /** code 僅 3 碼（schema：nx00_part_brand.code VarChar(3)）；展示名稱仍對應 MANN／BOSCH */
  const rows = [
    { code: 'VAG', name: 'VAG 集團', countryCode: 'DEU', sortNo: 1 },
    { code: 'OEM', name: '原廠件', countryCode: 'DEU', sortNo: 2 },
    { code: 'MAN', name: 'MANN+HUMMEL', countryCode: 'DEU', sortNo: 3 },
    { code: 'BOS', name: 'Bosch', countryCode: 'DEU', sortNo: 4 },
  ];
  const map = new Map<string, string>();
  for (const r of rows) {
    const row = await prisma.nx00PartBrand.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      update: {
        name: r.name,
        countryId: countryIdDeu,
        sortNo: r.sortNo,
        isActive: true,
        tenantId,
      },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        countryId: countryIdDeu,
        sortNo: r.sortNo,
        isActive: true,
      },
    });
    map.set(r.code, row.id);
  }
  console.log(`✅ NX00-SEED-SVC-001-F06 seedPartBrands tenant=${tenantId.slice(0, 8)}…`);
  return map;
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F07
 */
async function seedCarBrands(tenantId: string, countryIdDeu: string): Promise<void> {
  await prisma.nx00CarBrand.upsert({
    where: { tenantId_code: { tenantId, code: 'VAG' } },
    update: { name: 'VAG', countryId: countryIdDeu, sortNo: 1, isActive: true, tenantId },
    create: {
      tenantId,
      code: 'VAG',
      name: 'VAG',
      countryId: countryIdDeu,
      sortNo: 1,
      isActive: true,
    },
  });
  console.log(`✅ NX00-SEED-SVC-001-F07 seedCarBrands tenant=${tenantId.slice(0, 8)}…`);
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F08
 */
async function seedPartGroups(tenantId: string): Promise<Map<string, string>> {
  const rows = [
    { code: 'FILTER', name: '濾清器', sortNo: 1 },
    { code: 'BRAKE', name: '煞車系統', sortNo: 2 },
    { code: 'ENGINE', name: '引擎零件', sortNo: 3 },
    { code: 'SUSPENSION', name: '懸吊系統', sortNo: 4 },
    { code: 'ELECTRICAL', name: '電器系統', sortNo: 5 },
    { code: 'BODY', name: '車身零件', sortNo: 6 },
  ];
  const map = new Map<string, string>();
  for (const r of rows) {
    const row = await prisma.nx00PartGroup.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      update: { name: r.name, sortNo: r.sortNo, isActive: true, tenantId },
      create: { tenantId, code: r.code, name: r.name, sortNo: r.sortNo, isActive: true },
    });
    map.set(r.code, row.id);
  }
  console.log(`✅ NX00-SEED-SVC-001-F08 seedPartGroups tenant=${tenantId.slice(0, 8)}…`);
  return map;
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F09
 */
async function seedWarehouses(tenantId: string): Promise<Map<string, string>> {
  const rows = [
    { code: 'Z01', name: '台北主倉', sortNo: 1 },
    { code: 'Z02', name: '新北倉', sortNo: 2 },
  ];
  const map = new Map<string, string>();
  for (const r of rows) {
    const row = await prisma.nx00Warehouse.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      update: { name: r.name, sortNo: r.sortNo, isActive: true, tenantId },
      create: { tenantId, code: r.code, name: r.name, sortNo: r.sortNo, isActive: true },
    });
    map.set(r.code, row.id);
  }
  console.log(`✅ NX00-SEED-SVC-001-F09 seedWarehouses tenant=${tenantId.slice(0, 8)}…`);
  return map;
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F10
 */
async function seedLocations(
  tenantId: string,
  whMap: Map<string, string>,
): Promise<void> {
  const locs: { wh: string; code: string; name: string; sortNo: number }[] = [];
  let sn = 1;
  for (const wh of ['Z01', 'Z02'] as const) {
    const wid = whMap.get(wh);
    if (!wid) continue;
    for (const [code, name] of [
      ['A-01', 'A區01格'],
      ['A-02', 'A區02格'],
      ['B-01', 'B區01格'],
      ['B-02', 'B區02格'],
      ['C-01', 'C區01格'],
    ] as const) {
      locs.push({ wh, code, name, sortNo: sn++ });
    }
  }
  for (const l of locs) {
    const wid = whMap.get(l.wh)!;
    await prisma.nx00Location.upsert({
      where: { tenantId_warehouseId_code: { tenantId, warehouseId: wid, code: l.code } },
      update: { name: l.name, sortNo: l.sortNo, isActive: true, tenantId, warehouseId: wid },
      create: {
        tenantId,
        warehouseId: wid,
        code: l.code,
        name: l.name,
        sortNo: l.sortNo,
        isActive: true,
      },
    });
  }
  console.log(`✅ NX00-SEED-SVC-001-F10 seedLocations tenant=${tenantId.slice(0, 8)}…`);
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F11
 */
async function seedPartners(tenantId: string): Promise<void> {
  const rows: { code: string; name: string; partnerType: string }[] = [
    { code: 'C0001', name: '台北汽修廠', partnerType: 'C' },
    { code: 'C0002', name: '新北車業有限公司', partnerType: 'C' },
    { code: 'C0003', name: '桃園零件行', partnerType: 'C' },
    { code: 'C0004', name: '台中汽材行', partnerType: 'C' },
    { code: 'C0005', name: '高雄車料企業', partnerType: 'C' },
    { code: 'S0001', name: '德國原廠直送有限公司', partnerType: 'S' },
    { code: 'S0002', name: '台灣總代理股份有限公司', partnerType: 'S' },
    { code: 'S0003', name: '中部批發商行', partnerType: 'S' },
    { code: 'S0004', name: '北部經銷商有限公司', partnerType: 'S' },
    { code: 'S0005', name: '南部供應商企業', partnerType: 'S' },
  ];
  for (const r of rows) {
    await prisma.nx00Partner.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      update: {
        name: r.name,
        partnerType: r.partnerType,
        isActive: true,
        tenantId,
      },
      create: {
        tenantId,
        code: r.code,
        name: r.name,
        partnerType: r.partnerType,
        isActive: true,
      },
    });
  }
  console.log(`✅ NX00-SEED-SVC-001-F11 seedPartners tenant=${tenantId.slice(0, 8)}…`);
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F12
 * seedBrandCodeRules（原 seedBrandCodeRoles）：同品牌可有多筆規則（例：Bosch 德國／上海）
 */
async function seedBrandCodeRules(
  tenantId: string,
  brandMap: Map<string, string>,
): Promise<Map<string, string>> {
  const specs: {
    brand: string;
    name: string;
    s1: number;
    s2: number;
    s3: number;
    s4: number;
    s5: number;
    codeFormat: string;
    brandSort: string;
  }[] = [
    { brand: 'VAG', name: 'VAG 標準', s1: 3, s2: 3, s3: 3, s4: 1, s5: 0, codeFormat: '1-2-3-4', brandSort: '1234' },
    { brand: 'OEM', name: 'OEM 標準', s1: 3, s2: 3, s3: 3, s4: 1, s5: 0, codeFormat: '1-2-3-4', brandSort: '1234' },
    { brand: 'MAN', name: 'MANN 德國', s1: 2, s2: 4, s3: 0, s4: 0, s5: 0, codeFormat: '1-2', brandSort: '12' },
    { brand: 'BOS', name: 'Bosch 德國', s1: 4, s2: 3, s3: 0, s4: 0, s5: 0, codeFormat: '1-2', brandSort: '12' },
    { brand: 'BOS', name: 'Bosch 上海', s1: 3, s2: 3, s3: 2, s4: 0, s5: 0, codeFormat: '1-2-3', brandSort: '123' },
  ];
  const ruleMap = new Map<string, string>();
  for (const s of specs) {
    const pbid = brandMap.get(s.brand);
    if (!pbid) continue;
    const key = `${s.brand}|${s.name}`;
    const existing = await prisma.nx00BrandCodeRule.findFirst({
      where: { tenantId, partBrandId: pbid, name: s.name },
      select: { id: true },
    });
    const data = {
      tenantId,
      partBrandId: pbid,
      name: s.name,
      seg1: s.s1,
      seg2: s.s2,
      seg3: s.s3,
      seg4: s.s4,
      seg5: s.s5,
      codeFormat: s.codeFormat,
      brandSort: s.brandSort,
      isActive: true,
    };
    const row = existing
      ? await prisma.nx00BrandCodeRule.update({ where: { id: existing.id }, data })
      : await prisma.nx00BrandCodeRule.create({ data });
    ruleMap.set(key, row.id);
  }
  console.log(`✅ NX00-SEED-SVC-001-F12 seedBrandCodeRules tenant=${tenantId.slice(0, 8)}…`);
  return ruleMap;
}

function defaultBrandRuleKey(partBrandCode: string): string {
  const m: Record<string, string> = {
    VAG: 'VAG|VAG 標準',
    OEM: 'OEM|OEM 標準',
    MAN: 'MAN|MANN 德國',
    BOS: 'BOS|Bosch 德國',
  };
  const k = m[partBrandCode];
  if (!k) throw new Error(`seed: no default brand code rule mapping for ${partBrandCode}`);
  return k;
}

async function upsertPart(
  tenantId: string,
  p: {
    code: string;
    name: string;
    isOem: boolean;
    uom: string;
    partBrandCode: string;
    partGroupCode: string;
    countryId: string;
    /** 覆寫 ruleMap key，預設依 partBrandCode */
    ruleMapKey?: string;
  },
  brandMap: Map<string, string>,
  groupMap: Map<string, string>,
  ruleMap: Map<string, string>,
): Promise<void> {
  const pb = brandMap.get(p.partBrandCode);
  const pg = groupMap.get(p.partGroupCode);
  if (!pb || !pg) return;
  const rk = p.ruleMapKey ?? defaultBrandRuleKey(p.partBrandCode);
  const codeRuleId = ruleMap.get(rk);
  if (!codeRuleId) throw new Error(`seed: missing brand code rule id for key ${rk}`);
  await prisma.nx00Part.upsert({
    where: { tenantId_code_countryId: { tenantId, code: p.code, countryId: p.countryId } },
    update: {
      name: p.name,
      isOem: p.isOem,
      uom: p.uom,
      partBrandId: pb,
      partGroupId: pg,
      countryId: p.countryId,
      codeRuleId,
      tenantId,
      isActive: true,
    },
    create: {
      tenantId,
      codeRuleId,
      code: p.code,
      name: p.name,
      isOem: p.isOem,
      uom: p.uom,
      partBrandId: pb,
      partGroupId: pg,
      countryId: p.countryId,
      isActive: true,
    },
  });
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F13
 */
async function seedParts(
  tenantId: string,
  countryIdDeu: string,
  countryIdChn: string,
  brandMap: Map<string, string>,
  groupMap: Map<string, string>,
  ruleMap: Map<string, string>,
): Promise<void> {
  const oil = [
    '8K0115561',
    '06L115561',
    '04L115561',
    '06J115561',
    '03L115466A',
    '06K115561B',
    '06H115561',
    '03N115561',
    '04E115561',
    '06A115561',
  ];
  const air = [
    '8K0129620',
    '3C0129620',
    '1K0129620',
    '5Q0129620B',
    '8P0129620',
    '6R0129620',
    '1Z0129620',
    '6C0129620',
    '5N0129620',
    '6Q0129620',
  ];
  const cabin = [
    '8K0819439B',
    '3C0819644',
    '1K0820367',
    '5Q0819653C',
    '8P0819439',
    '6R0819653',
    '1Z0819653',
    '6C0819653',
    '5N0819653',
    '6Q0819653',
  ];
  const mann = ['W712/75', 'HU7009z', 'C27006', 'CU2939', 'W940/25', 'HU12110x', 'C30130', 'CU3337', 'W610/3', 'HU816x'];
  for (const c of oil) {
    await upsertPart(
      tenantId,
      { code: c, name: `機油濾芯 ${c}`, isOem: true, uom: 'pcs', partBrandCode: 'VAG', partGroupCode: 'FILTER', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }
  for (const c of air) {
    await upsertPart(
      tenantId,
      { code: c, name: `空氣濾芯 ${c}`, isOem: true, uom: 'pcs', partBrandCode: 'VAG', partGroupCode: 'FILTER', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }
  for (const c of cabin) {
    await upsertPart(
      tenantId,
      { code: c, name: `冷氣濾網 ${c}`, isOem: true, uom: 'pcs', partBrandCode: 'VAG', partGroupCode: 'FILTER', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }
  for (const c of mann) {
    await upsertPart(
      tenantId,
      { code: c, name: `MANN 濾清 ${c}`, isOem: false, uom: 'pcs', partBrandCode: 'MAN', partGroupCode: 'FILTER', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }

  const brakePadF = [
    '8K0698151A',
    '8K0698151B',
    '3C0698151',
    '1K0698151E',
    '5Q0698151C',
    '8P0698151',
    '6R0698151',
    '1Z0698151',
    '6C0698151',
    '5N0698151',
  ];
  const brakeDiscF = [
    '8K0615301L',
    '8K0615302L',
    '3C0615301',
    '1K0615301AA',
    '5Q0615301F',
    '8P0615301',
    '6R0615301',
    '1Z0615301',
    '6C0615301',
    '5N0615301',
  ];
  const brakePadR = [
    '8K0698451A',
    '8K0698451B',
    '3C0698451',
    '1K0698451B',
    '5Q0698451C',
    '8P0698451',
    '6R0698451',
    '1Z0698451',
    '6C0698451',
    '5N0698451',
  ];
  for (const c of brakePadF) {
    await upsertPart(
      tenantId,
      { code: c, name: `煞車皮前 ${c}`, isOem: true, uom: '套', partBrandCode: 'VAG', partGroupCode: 'BRAKE', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }
  for (const c of brakeDiscF) {
    await upsertPart(
      tenantId,
      { code: c, name: `煞車盤前 ${c}`, isOem: true, uom: '片', partBrandCode: 'VAG', partGroupCode: 'BRAKE', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }
  for (const c of brakePadR) {
    await upsertPart(
      tenantId,
      { code: c, name: `煞車皮後 ${c}`, isOem: true, uom: '套', partBrandCode: 'VAG', partGroupCode: 'BRAKE', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }

  const spark = [
    '101000033AA',
    '101905626A',
    '101905611A',
    '101000063AA',
    '101905631B',
    '101905621',
    '101905601D',
    '101000043AA',
    '101905615B',
    '101905616A',
  ];
  const belt = [
    '06H109243',
    '06H109244',
    '06H109285',
    '06H109286',
    '06H109287',
    '06H109288',
    '06H109289',
    '06H109290',
    '06H109291',
    '06H109292',
  ];
  for (const c of spark) {
    await upsertPart(
      tenantId,
      { code: c, name: `火星塞 ${c}`, isOem: true, uom: '支', partBrandCode: 'OEM', partGroupCode: 'ENGINE', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }
  for (const c of belt) {
    await upsertPart(
      tenantId,
      { code: c, name: `皮帶組 ${c}`, isOem: true, uom: '組', partBrandCode: 'VAG', partGroupCode: 'ENGINE', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }

  const susp = [
    '8K0412021AF',
    '8K0412022AF',
    '8K0505431L',
    '8K0505432L',
    '8K0199381NQ',
    '8K0199382NQ',
    '8K0407151F',
    '8K0407152F',
    '8K0407693F',
    '8K0407694F',
    '8K0411105BB',
    '8K0411106BB',
    '8K0411315',
    '8K0411316',
    '8K0511115',
  ];
  for (const c of susp) {
    await upsertPart(
      tenantId,
      { code: c, name: `懸吊 ${c}`, isOem: true, uom: 'pcs', partBrandCode: 'VAG', partGroupCode: 'SUSPENSION', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }

  const elec = [
    '06J906036F',
    '8K0907115B',
    '8K0959455L',
    '8K0959455M',
    '8K0959455P',
    '8K0919275',
    '8K0820536A',
    '8K0907115C',
    '8K0907601A',
    '8K0959501',
  ];
  for (const c of elec) {
    await upsertPart(
      tenantId,
      { code: c, name: `電器 ${c}`, isOem: true, uom: 'pcs', partBrandCode: 'VAG', partGroupCode: 'ELECTRICAL', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }

  const body = ['8K1955426', '8K1955427', '8K0945095', '8K0945096', '8K0807217GRU'];
  for (const c of body) {
    await upsertPart(
      tenantId,
      { code: c, name: `車身 ${c}`, isOem: true, uom: 'pcs', partBrandCode: 'VAG', partGroupCode: 'BODY', countryId: countryIdDeu },
      brandMap,
      groupMap,
      ruleMap,
    );
  }

  const vagRule = 'VAG|VAG 標準';
  await upsertPart(
    tenantId,
    {
      code: '8K0-819-439B',
      name: '冷氣濾網（展示：同料號 DEU）',
      isOem: true,
      uom: 'pcs',
      partBrandCode: 'VAG',
      partGroupCode: 'FILTER',
      countryId: countryIdDeu,
      ruleMapKey: vagRule,
    },
    brandMap,
    groupMap,
    ruleMap,
  );
  await upsertPart(
    tenantId,
    {
      code: '8K0-819-439B',
      name: '冷氣濾網（展示：同料號 CHN）',
      isOem: true,
      uom: 'pcs',
      partBrandCode: 'VAG',
      partGroupCode: 'FILTER',
      countryId: countryIdChn,
      ruleMapKey: vagRule,
    },
    brandMap,
    groupMap,
    ruleMap,
  );
  await upsertPart(
    tenantId,
    {
      code: '06L-115-561',
      name: '機油濾芯（展示：同料號 DEU）',
      isOem: true,
      uom: 'pcs',
      partBrandCode: 'VAG',
      partGroupCode: 'FILTER',
      countryId: countryIdDeu,
      ruleMapKey: vagRule,
    },
    brandMap,
    groupMap,
    ruleMap,
  );
  await upsertPart(
    tenantId,
    {
      code: '06L-115-561',
      name: '機油濾芯（展示：同料號 CHN）',
      isOem: true,
      uom: 'pcs',
      partBrandCode: 'VAG',
      partGroupCode: 'FILTER',
      countryId: countryIdChn,
      ruleMapKey: vagRule,
    },
    brandMap,
    groupMap,
    ruleMap,
  );

  console.log(`✅ NX00-SEED-SVC-001-F13 seedParts tenant=${tenantId.slice(0, 8)}…（124 筆含展示）`);
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F14
 */
async function seedPartRelations(tenantId: string, countryIdDeu: string): Promise<void> {
  const pairs: [string, string, string][] = [
    ['8K0115561', '06L115561', 'S'],
    ['8K0819439B', '8P0819439', 'S'],
    ['8K0698151A', '8K0698151B', 'S'],
    ['8K0412021AF', '8K0412022AF', 'R'],
    ['8K0505431L', '8K0505432L', 'R'],
    ['06H109243', '06H109244', 'R'],
    ['8K0959455L', '8K0959455M', 'S'],
    ['8K0959455M', '8K0959455P', 'S'],
    ['8K1955426', '8K1955427', 'R'],
    ['8K0615301L', '8K0615302L', 'R'],
  ];
  for (const [fromC, toC, rt] of pairs) {
    const fromP = await prisma.nx00Part.findUnique({
      where: { tenantId_code_countryId: { tenantId, code: fromC, countryId: countryIdDeu } },
      select: { id: true },
    });
    const toP = await prisma.nx00Part.findUnique({
      where: { tenantId_code_countryId: { tenantId, code: toC, countryId: countryIdDeu } },
      select: { id: true },
    });
    if (!fromP || !toP) continue;
    const existing = await prisma.nx00PartRelation.findFirst({
      where: {
        tenantId,
        partIdFrom: fromP.id,
        partIdTo: toP.id,
        relationType: rt,
      },
    });
    if (!existing) {
      await prisma.nx00PartRelation.create({
        data: {
          tenantId,
          partIdFrom: fromP.id,
          partIdTo: toP.id,
          relationType: rt,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ NX00-SEED-SVC-001-F14 seedPartRelations tenant=${tenantId.slice(0, 8)}…`);
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F15
 */
async function seedBulletins(tenantId: string): Promise<void> {
  const rows = [
    { title: '歡迎使用 NEXORA ERP', scopeType: 'S', isPinned: true, content: '感謝您選擇 NEXORA，如有任何問題請聯繫客服。' },
    { title: '系統維護通知', scopeType: 'S', isPinned: false, content: '本系統將於每週日 02:00-04:00 進行例行維護。' },
    { title: '本月促銷活動', scopeType: 'C', isPinned: false, content: '本月採購滿 10 萬元享 95 折優惠。' },
  ];
  for (const r of rows) {
    const found = await prisma.nx00Bulletin.findFirst({
      where: { tenantId, title: r.title },
    });
    if (found) {
      await prisma.nx00Bulletin.update({
        where: { id: found.id },
        data: {
          content: r.content,
          scopeType: r.scopeType,
          isPinned: r.isPinned,
          isActive: true,
        },
      });
    } else {
      await prisma.nx00Bulletin.create({
        data: {
          tenantId,
          title: r.title,
          content: r.content,
          scopeType: r.scopeType,
          isPinned: r.isPinned,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ NX00-SEED-SVC-001-F15 seedBulletins tenant=${tenantId.slice(0, 8)}…`);
}

function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F16
 */
async function seedCalendarEvents(tenantId: string): Promise<void> {
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  const rows: { title: string; scopeType: string; start: Date; end: Date; isAllDay: boolean }[] = [
    {
      title: '季度盤點',
      scopeType: 'C',
      start: addDaysUtc(base, 7),
      end: addDaysUtc(base, 7),
      isAllDay: true,
    },
    {
      title: '供應商拜訪',
      scopeType: 'C',
      start: new Date(addDaysUtc(base, 14).getTime() + 9 * 3600000),
      end: new Date(addDaysUtc(base, 14).getTime() + 18 * 3600000),
      isAllDay: false,
    },
    {
      title: '年度庫存清查',
      scopeType: 'C',
      start: addDaysUtc(base, 30),
      end: addDaysUtc(base, 32),
      isAllDay: true,
    },
  ];
  for (const r of rows) {
    const found = await prisma.nx00CalendarEvent.findFirst({
      where: { tenantId, title: r.title },
    });
    if (found) {
      await prisma.nx00CalendarEvent.update({
        where: { id: found.id },
        data: {
          dateStart: r.start,
          dateEnd: r.end,
          scopeType: r.scopeType,
          isAllDay: r.isAllDay,
          isActive: true,
        },
      });
    } else {
      await prisma.nx00CalendarEvent.create({
        data: {
          tenantId,
          title: r.title,
          scopeType: r.scopeType,
          dateStart: r.start,
          dateEnd: r.end,
          isAllDay: r.isAllDay,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ NX00-SEED-SVC-001-F16 seedCalendarEvents tenant=${tenantId.slice(0, 8)}…`);
}

/**
 * @FUNCTION_CODE NX00-SEED-SVC-001-F17
 */
async function seedDemoData(tenantId: string, users: DemoUserSeed[]): Promise<void> {
  const countryMap = await prisma.nx00Country.findMany({ select: { id: true, code: true } });
  const deuId = countryMap.find((c) => c.code === 'DEU')?.id;
  if (!deuId) throw new Error('缺少 DEU 國別');
  const chnId = countryMap.find((c) => c.code === 'CHN')?.id;
  if (!chnId) throw new Error('缺少 CHN 國別');

  const brandMap = await seedPartBrands(tenantId, deuId);
  await seedCarBrands(tenantId, deuId);
  const groupMap = await seedPartGroups(tenantId);
  const whMap = await seedWarehouses(tenantId);
  await seedLocations(tenantId, whMap);
  await seedDemoUsersForTenant(tenantId, users);
  await seedPartners(tenantId);
  const ruleMap = await seedBrandCodeRules(tenantId, brandMap);
  await seedParts(tenantId, deuId, chnId, brandMap, groupMap, ruleMap);
  await seedPartRelations(tenantId, deuId);
  await seedBulletins(tenantId);
  await seedCalendarEvents(tenantId);
  console.log(`✅ NX00-SEED-SVC-001-F17 seedDemoData 完成 tenant=${tenantId.slice(0, 8)}…`);
}

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

async function runResetUsersAdminOnly(): Promise<void> {
  const devTenant = await prisma.nx99Tenant.findUnique({ where: { code: 'DEV-INNOVA' } });
  if (!devTenant) {
    console.log('⚠ SEED_RESET：找不到 DEV-INNOVA');
    return;
  }
  const others = await prisma.nx00User.findMany({
    where: { tenantId: devTenant.id, userAccount: { not: 'admin' } },
    select: { id: true },
  });
  const ids = others.map((o) => o.id);
  if (ids.length === 0) {
    console.log('✅ SEED_RESET_USERS_ADMIN_ONLY：DEV-INNOVA 僅 admin');
    return;
  }
  await prisma.nx00AuditLog.deleteMany({ where: { actorUserId: { in: ids } } });
  await prisma.nx00UserWarehouse.deleteMany({ where: { userId: { in: ids } } });
  await prisma.nx00UserRole.deleteMany({ where: { userId: { in: ids } } });
  await prisma.nx00User.deleteMany({ where: { id: { in: ids } } });
  console.log(`✅ SEED_RESET_USERS_ADMIN_ONLY：已刪除 DEV-INNOVA 其他使用者 ${ids.length} 筆`);
}

function envTruthy(v: string | undefined): boolean {
  return v === '1' || v === 'true';
}

async function seedSubscriptionForTenant(args: {
  tenantId: string;
  planCode: string;
  seats: number;
  currencyId: string;
  prmoIdByCode: Map<string, string>;
  nx99ProductModules: Nx99ModSeed[];
}): Promise<void> {
  const plan = await prisma.nx99Plan.findUnique({ where: { code: args.planCode } });
  if (!plan) return;

  await prisma.nx99SubscriptionItem.deleteMany({
    where: { subscription: { tenantId: args.tenantId } },
  });
  await prisma.nx99Subscription.deleteMany({ where: { tenantId: args.tenantId } });

  const bundled = args.nx99ProductModules.filter(
    (m) => m.applicablePlanCode === args.planCode && m.isBundleDefault,
  );
  const subStart = new Date('2020-01-01T00:00:00.000Z');
  const subEnd = new Date('2099-12-31T23:59:59.999Z');
  const baseFeeSnapshot = plan.baseFeeMonth;
  const seatFeeSnapshot = plan.seatFeeMonth;
  const subtotalSnapshot = baseFeeSnapshot + args.seats * seatFeeSnapshot;

  const itemCreates = bundled
    .map((m) => {
      const refId = args.prmoIdByCode.get(m.code);
      if (!refId) return null;
      return {
        itemType: 'PRODUCT_MODULE',
        refId,
        status: 'ACTIVE',
        isIncluded: true,
        billingCycle: 'M',
        priceSnapshot: m.monthlyFee,
        discountTypeSnapshot: 'N',
        discountValueSnapshot: 0,
        totalSnapshot: m.monthlyFee,
        startAt: subStart,
        endAt: subEnd,
      };
    })
    .filter(Boolean) as {
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
  }[];

  await prisma.nx99Subscription.create({
    data: {
      tenantId: args.tenantId,
      planId: plan.id,
      status: 'A',
      billingCycle: 'M',
      seats: args.seats,
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
      currencyId: args.currencyId,
      items: { create: itemCreates },
    },
  });
  console.log(`✅ nx99_subscription：${args.planCode} seats=${args.seats} tenant=${args.tenantId.slice(0, 8)}…`);
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

  await seedCountries();
  await seedCurrencies();

  const tenantIds = await seedTenants();
  await seedRoles(tenantIds);
  await seedUsers(tenantIds);

  await seedDemoData(tenantIds.demoLite, DEMO_LITE_USERS);
  await seedDemoData(tenantIds.demoPlus, DEMO_PLUS_USERS);

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

  const nx99ProductModules: Nx99ModSeed[] = [
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

  const twdCurrency = await prisma.nx00Currency.findUnique({ where: { code: 'TWD' }, select: { id: true } });
  if (!twdCurrency) throw new Error('缺少 TWD 幣別（seedCurrencies）');

  await seedSubscriptionForTenant({
    tenantId: tenantIds.dev,
    planCode: 'NEXORA-PRO',
    seats: 10,
    currencyId: twdCurrency.id,
    prmoIdByCode,
    nx99ProductModules,
  });
  await seedSubscriptionForTenant({
    tenantId: tenantIds.demoLite,
    planCode: 'NEXORA-LITE',
    seats: 10,
    currencyId: twdCurrency.id,
    prmoIdByCode,
    nx99ProductModules,
  });
  await seedSubscriptionForTenant({
    tenantId: tenantIds.demoPlus,
    planCode: 'NEXORA-PLUS',
    seats: 20,
    currencyId: twdCurrency.id,
    prmoIdByCode,
    nx99ProductModules,
  });

  const views = [
    { code: 'NX00_LOGIN', name: '使用者登入', moduleCode: 'nx00', path: '/login', sortNo: 1 },
    { code: 'NX00_HOME', name: '系統首頁', moduleCode: 'nx00', path: '/home', sortNo: 2 },
    { code: 'NX00_USER', name: '使用者基本資料', moduleCode: 'nx00', path: '/base/user', sortNo: 3 },
    { code: 'NX00_ROLE', name: '權限角色基本資料', moduleCode: 'nx00', path: '/base/role', sortNo: 4 },
    { code: 'NX00_USER_ROLE', name: '使用者職位設定', moduleCode: 'nx00', path: '/base/user-role', sortNo: 5 },
    { code: 'NX00_USER_WAREHOUSE', name: '使用者據點設定', moduleCode: 'nx00', path: '/base/user-warehouse', sortNo: 6 },
    { code: 'NX00_ROLE_VIEW', name: '使用者權限設定', moduleCode: 'nx00', path: '/base/role-view', sortNo: 7 },
    { code: 'NX00_PART', name: '零件基本資料', moduleCode: 'nx00', path: '/base/part', sortNo: 8 },
    { code: 'NX00_BRAND', name: '廠牌主檔', moduleCode: 'nx00', path: '/base/brand', sortNo: 9 },
    { code: 'NX00_CAR_BRAND', name: '汽車廠牌主檔', moduleCode: 'nx00', path: '/base/car-brand', sortNo: 10 },
    { code: 'NX00_PART_BRAND', name: '零件廠牌主檔', moduleCode: 'nx00', path: '/base/part-brand', sortNo: 11 },
    { code: 'NX00_WAREHOUSE', name: '倉庫基本資料', moduleCode: 'nx00', path: '/base/location', sortNo: 12 },
    { code: 'NX00_LOCATION', name: '庫位基本資料', moduleCode: 'nx00', path: '/base/location', sortNo: 13 },
    { code: 'NX00_PARTNER', name: '往來客戶基本資料', moduleCode: 'nx00', path: '/base/partner', sortNo: 14 },
  ];

  for (const view of views) {
    await prisma.nx00View.upsert({
      where: { code: view.code },
      update: { name: view.name, path: view.path, sortNo: view.sortNo },
      create: {
        code: view.code,
        name: view.name,
        moduleCode: view.moduleCode,
        path: view.path,
        sortNo: view.sortNo,
        isActive: true,
      },
    });
  }
  console.log('✅ nx00_view seed 完成，共 14 筆');

  await seedNx00RoleViewsForTenants(tenantIds);
}

/**
 * 各租戶 × 各職務 × 各畫面：預設五維全開（API 依 nx00_role_view 檢查；可於 role-view 頁再收斂）。
 */
async function seedNx00RoleViewsForTenants(tenantIds: TenantIds): Promise<void> {
  const tids = [tenantIds.dev, tenantIds.demoLite, tenantIds.demoPlus];
  const viewRows = await prisma.nx00View.findMany({ select: { id: true, code: true } });
  if (viewRows.length === 0) return;

  let n = 0;
  for (const tid of tids) {
    const roleMap = await getRoleIdMap(tid);
    for (const spec of ROLE_SPECS) {
      const roleId = roleMap.get(spec.code);
      if (!roleId) continue;
      for (const v of viewRows) {
        await prisma.nx00RoleView.upsert({
          where: { tenantId_roleId_viewId: { tenantId: tid, roleId, viewId: v.id } },
          update: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canToggleActive: true,
            canExport: true,
            isActive: true,
          },
          create: {
            tenantId: tid,
            roleId,
            viewId: v.id,
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canToggleActive: true,
            canExport: true,
            isActive: true,
          },
        });
        n += 1;
      }
    }
  }
  console.log(`✅ nx00_role_view seed：三租戶 × 職務 × 畫面，共 ${n} 筆 upsert`);
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
