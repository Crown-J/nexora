/**
 * NEXORA db-core Prisma Seed
 * 執行：pnpm prisma db seed（需在 packages/db-core 目錄或由根目錄透過 workspace 執行）
 */
import { PrismaClient, Prisma } from '../generated/prisma';
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
    }
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
   * @FUNCTION_CODE NX02-NX06-SVC-SEED-F01 / NX01-SVC-SEED-F01
   * 說明：DEV-INNOVA 下 nx04→nx05→nx02→nx03→nx06；以及 nx01 詢價／進貨單（含明細）測試資料
   */
  if (devTenant && adminUser) {
    const tenantId = devTenant.id;
    const uid = adminUser.id;
    const d0 = new Date('2026-03-01T00:00:00.000Z');

    const unitPcs = await prisma.nx04Unit.upsert({
      where: { tenantId_unitCode: { tenantId, unitCode: 'PCS' } },
      update: { unitName: '件', remark: 'seed', updatedBy: uid },
      create: {
        tenantId,
        unitCode: 'PCS',
        unitName: '件',
        remark: 'seed',
        createdBy: uid,
        updatedBy: uid,
      },
    });

    const unitBox = await prisma.nx04Unit.upsert({
      where: { tenantId_unitCode: { tenantId, unitCode: 'BOX' } },
      update: { unitName: '箱', updatedBy: uid },
      create: {
        tenantId,
        unitCode: 'BOX',
        unitName: '箱',
        createdBy: uid,
        updatedBy: uid,
      },
    });

    const catFilter = await prisma.nx05Category.upsert({
      where: { tenantId_categoryCode: { tenantId, categoryCode: 'CAT-FILTER' } },
      update: { categoryName: '濾清類', updatedBy: uid },
      create: {
        tenantId,
        categoryCode: 'CAT-FILTER',
        categoryName: '濾清類',
        createdBy: uid,
        updatedBy: uid,
      },
    });

    const catBrake = await prisma.nx05Category.upsert({
      where: { tenantId_categoryCode: { tenantId, categoryCode: 'CAT-BRAKE' } },
      update: { categoryName: '煞車類', updatedBy: uid },
      create: {
        tenantId,
        categoryCode: 'CAT-BRAKE',
        categoryName: '煞車類',
        createdBy: uid,
        updatedBy: uid,
      },
    });

    const dept = await prisma.nx02Dept.upsert({
      where: { tenantId_deptCode: { tenantId, deptCode: 'DEPT-OPS' } },
      update: { deptName: '營運部', updatedBy: uid },
      create: {
        tenantId,
        deptCode: 'DEPT-OPS',
        deptName: '營運部',
        remark: 'seed',
        createdBy: uid,
        updatedBy: uid,
      },
    });

    await prisma.nx03Emp.upsert({
      where: { tenantId_empCode: { tenantId, empCode: 'E001' } },
      update: { empName: '林大同', title: '倉管', deptId: dept.id, updatedBy: uid },
      create: {
        tenantId,
        empCode: 'E001',
        empName: '林大同',
        deptId: dept.id,
        title: '倉管',
        phone: '02-20000000',
        createdBy: uid,
        updatedBy: uid,
      },
    });

    await prisma.nx06Product.upsert({
      where: { tenantId_productCode: { tenantId, productCode: 'P-OC001' } },
      update: {
        productName: '機油濾芯（樣品）',
        spec: 'MANN W712/75',
        unitId: unitPcs.id,
        categoryId: catFilter.id,
        price: new Prisma.Decimal('280.0000'),
        cost: new Prisma.Decimal('180.0000'),
        updatedBy: uid,
      },
      create: {
        tenantId,
        productCode: 'P-OC001',
        productName: '機油濾芯（樣品）',
        spec: 'MANN W712/75',
        unitId: unitPcs.id,
        categoryId: catFilter.id,
        price: new Prisma.Decimal('280.0000'),
        cost: new Prisma.Decimal('180.0000'),
        remark: 'seed',
        createdBy: uid,
        updatedBy: uid,
      },
    });

    await prisma.nx06Product.upsert({
      where: { tenantId_productCode: { tenantId, productCode: 'P-BP001' } },
      update: {
        productName: '煞車來令（樣品）',
        unitId: unitBox.id,
        categoryId: catBrake.id,
        price: new Prisma.Decimal('1200.0000'),
        cost: new Prisma.Decimal('800.0000'),
        updatedBy: uid,
      },
      create: {
        tenantId,
        productCode: 'P-BP001',
        productName: '煞車來令（樣品）',
        unitId: unitBox.id,
        categoryId: catBrake.id,
        price: new Prisma.Decimal('1200.0000'),
        cost: new Prisma.Decimal('800.0000'),
        createdBy: uid,
        updatedBy: uid,
      },
    });

    console.log('✅ nx02_dept / nx03_emp / nx04_unit / nx05_category / nx06_product seed 完成（DEV-INNOVA）');

    const supplier = await prisma.nx00Partner.findUnique({ where: { code: 'S0001' } });
    const partOc = await prisma.nx00Part.findUnique({ where: { code: 'OC-001' } });
    const partAf = await prisma.nx00Part.findUnique({ where: { code: 'AF-001' } });
    const whZ01 = await prisma.nx00Warehouse.findUnique({ where: { code: 'Z01' } });
    const locA0101 = whZ01
      ? await prisma.nx00Location.findFirst({
          where: { warehouseId: whZ01.id, code: 'A-01-01' },
        })
      : null;

    if (supplier && partOc && partAf && whZ01 && locA0101) {
      const rfqDocNo = 'R-DEV2026-00001';
      const poDocNo = 'I-DEV2026-00001';

      const rfq = await prisma.nx01Rfq.upsert({
        where: { docNo: rfqDocNo },
        update: {
          tenantId,
          rfqDate: d0,
          supplierId: supplier.id,
          status: 'D',
          currency: 'TWD',
          updatedBy: uid,
        },
        create: {
          tenantId,
          docNo: rfqDocNo,
          rfqDate: d0,
          supplierId: supplier.id,
          contactName: supplier.contactName,
          contactPhone: supplier.phone,
          currency: 'TWD',
          status: 'D',
          remark: 'seed',
          createdBy: uid,
          updatedBy: uid,
        },
      });

      await prisma.nx01RfqItem.deleteMany({ where: { rfqId: rfq.id } });
      await prisma.nx01RfqItem.createMany({
        data: [
          {
            tenantId,
            rfqId: rfq.id,
            lineNo: 1,
            partId: partOc.id,
            partNo: partOc.code,
            partName: partOc.name,
            qty: new Prisma.Decimal('10.0000'),
            unitPrice: new Prisma.Decimal('185.0000'),
            currency: 'TWD',
            leadTimeDays: 7,
            status: 'R',
            createdBy: uid,
            updatedBy: uid,
          },
          {
            tenantId,
            rfqId: rfq.id,
            lineNo: 2,
            partId: partAf.id,
            partNo: partAf.code,
            partName: partAf.name,
            qty: new Prisma.Decimal('5.0000'),
            unitPrice: new Prisma.Decimal('320.0000'),
            currency: 'TWD',
            leadTimeDays: 14,
            status: 'P',
            createdBy: uid,
            updatedBy: uid,
          },
        ],
      });

      const lineAmount1 = new Prisma.Decimal('10.0000').mul(new Prisma.Decimal('185.5000'));
      const po = await prisma.nx01Po.upsert({
        where: { docNo: poDocNo },
        update: {
          tenantId,
          poDate: d0,
          supplierId: supplier.id,
          rfqId: rfq.id,
          currency: 'TWD',
          subtotal: new Prisma.Decimal('1855.00'),
          taxAmount: new Prisma.Decimal('0.00'),
          totalAmount: new Prisma.Decimal('1855.00'),
          status: 'D',
          updatedBy: uid,
        },
        create: {
          tenantId,
          docNo: poDocNo,
          poDate: d0,
          supplierId: supplier.id,
          rfqId: rfq.id,
          currency: 'TWD',
          subtotal: new Prisma.Decimal('1855.00'),
          taxAmount: new Prisma.Decimal('0.00'),
          totalAmount: new Prisma.Decimal('1855.00'),
          status: 'D',
          remark: 'seed',
          createdBy: uid,
          updatedBy: uid,
        },
      });

      await prisma.nx01PoItem.deleteMany({ where: { poId: po.id } });
      await prisma.nx01PoItem.create({
        data: {
          tenantId,
          poId: po.id,
          lineNo: 1,
          partId: partOc.id,
          partNo: partOc.code,
          partName: partOc.name,
          warehouseId: whZ01.id,
          locationId: locA0101.id,
          qty: new Prisma.Decimal('10.0000'),
          unitCost: new Prisma.Decimal('185.5000'),
          lineAmount: lineAmount1,
          createdBy: uid,
          updatedBy: uid,
        },
      });

      console.log(`✅ nx01_rfq / nx01_po seed 完成（doc_no=${rfqDocNo}, ${poDocNo}）`);
    } else {
      console.log(
        '⚠ nx01 seed 略過：缺少 S0001／OC-001／AF-001／Z01／A-01-01 等相依主檔',
      );
    }
  }

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
