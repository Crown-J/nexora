// apps/nx-api/src/nx02/qt/__tests__/integration/test-helpers.ts
// B5 整合測試共用工具：DB 連線、fixture 建立、cleanup。
//
// 自帶 fixture（不依賴 TASK-SEED-DEMO-02）：
//   建 brand_code_rule + part + location + customer/inquiry partners 在 LITE 租戶。
//   使用 upsert-by-code 模式，多次跑 test 不會重複建。
//
// Gate：INTEGRATION_DB=1 才會真跑（同 D4 模式）。

import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { PrismaClient } from 'db-core';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { Nx01AuditLogWriterService } from '../../../../shared/services/nx01-audit-log-writer.service';
import { Nx02QtService } from '../../qt.service';

export const INTEGRATION_GATE = process.env.INTEGRATION_DB === '1';

let _client: PrismaClient | null = null;
let _pool: pg.Pool | null = null;

export function getPrisma(): PrismaClient {
  if (_client) return _client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  _pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(_pool);
  _client = new PrismaClient({ adapter });
  return _client;
}

export async function disconnectPrisma() {
  if (_client) await _client.$disconnect();
  if (_pool) await _pool.end();
  _client = null;
  _pool = null;
}

export interface B5Fixture {
  tenantId: string;
  userId: string;
  warehouseId: string;
  warehouseCode: string;
  customerId: string;
  inquiryPartnerXId: string;
  inquiryPartnerYId: string;
  partId: string;
  locationId: string;
}

const FIXTURE_PREFIX = 'B5TEST';

/** 在 LITE 租戶建 minimal fixture（idempotent；多次呼叫不會重複建）。 */
export async function loadOrCreateB5Fixture(prisma: PrismaClient): Promise<B5Fixture> {
  const tenant = await prisma.nx99Tenant.findFirst({
    where: { code: 'TEST-LITE' },
    select: { id: true },
  });
  if (!tenant) throw new Error('TEST-LITE tenant not found — run pnpm seed:test:lite');

  const user = await prisma.nx01User.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true },
  });
  if (!user) throw new Error('No user in LITE tenant');

  const warehouse = await prisma.nx01Warehouse.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, code: true },
  });
  if (!warehouse) throw new Error('No warehouse in LITE tenant');

  const partBrand = await prisma.nx01PartBrand.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  if (!partBrand) throw new Error('No part_brand in LITE tenant');

  // car_brand：給 brand_code_rule.carBrandId 用（NX01-11 spec v1.0 對齊、commit 2 schema rename）
  const carBrand = await prisma.nx01CarBrand.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  if (!carBrand) throw new Error('No car_brand in LITE tenant');

  // brand_code_rule：每個 car_brand 只允許 1 筆，upsert
  const segDefinitions = [
    { seg_no: 1, name: 'SEG1', length_min: 3, length_max: 3, charset: 'numeric', required: true, description: '' },
    { seg_no: 2, name: 'SEG2', length_min: 3, length_max: 3, charset: 'numeric', required: true, description: '' },
    { seg_no: 3, name: 'SEG3', length_min: 3, length_max: 3, charset: 'numeric', required: true, description: '' },
  ];
  const codeRule = await prisma.nx01BrandCodeRule.upsert({
    where: { tenantId_carBrandId: { tenantId: tenant.id, carBrandId: carBrand.id } } as never,
    create: {
      tenantId: tenant.id,
      carBrandId: carBrand.id,
      name: 'B5TEST-RULE',
      segCount: 3,
      segDefinitions,
      createdBy: user.id,
      updatedBy: user.id,
    } as never,
    update: {},
    select: { id: true },
  } as never).catch(async () => {
    // upsert 若 unique key 不對，fallback 找/建
    const found = await prisma.nx01BrandCodeRule.findFirst({
      where: { tenantId: tenant.id, carBrandId: carBrand.id },
      select: { id: true },
    });
    if (found) return found;
    return prisma.nx01BrandCodeRule.create({
      data: {
        tenantId: tenant.id,
        carBrandId: carBrand.id,
        name: 'B5TEST-RULE',
        segCount: 3,
        segDefinitions,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: { id: true },
    });
  });

  // part：upsert by code
  const partCode = `${FIXTURE_PREFIX}-PART-001`;
  let part = await prisma.nx01Part.findFirst({
    where: { tenantId: tenant.id, code: partCode },
    select: { id: true },
  });
  if (!part) {
    part = await prisma.nx01Part.create({
      data: {
        tenantId: tenant.id,
        codeRuleId: (codeRule as { id: string }).id,
        code: partCode,
        name: 'B5 測試用零件',
        partBrandId: partBrand.id,
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: { id: true },
    });
  }

  // location：upsert by (warehouseId, code)
  const locCode = `${FIXTURE_PREFIX}-LOC-01`;
  let location = await prisma.nx01Location.findFirst({
    where: { tenantId: tenant.id, warehouseId: warehouse.id, code: locCode },
    select: { id: true },
  });
  if (!location) {
    location = await prisma.nx01Location.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        code: locCode,
        name: 'B5 測試庫位',
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: { id: true },
    });
  }

  // partners：1 customer (C) + 2 inquiry partners (S)
  const customerCode = `${FIXTURE_PREFIX}-CUST`;
  let customer = await prisma.nx01Partner.findFirst({
    where: { tenantId: tenant.id, code: customerCode },
    select: { id: true },
  });
  if (!customer) {
    customer = await prisma.nx01Partner.create({
      data: {
        tenantId: tenant.id,
        code: customerCode,
        name: 'B5 測試客戶',
        partnerType: 'C',
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: { id: true },
    });
  }

  const partnerXCode = `${FIXTURE_PREFIX}-INQ-X`;
  let inquiryX = await prisma.nx01Partner.findFirst({
    where: { tenantId: tenant.id, code: partnerXCode },
    select: { id: true },
  });
  if (!inquiryX) {
    inquiryX = await prisma.nx01Partner.create({
      data: {
        tenantId: tenant.id,
        code: partnerXCode,
        name: 'B5 同行 X',
        partnerType: 'S',
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: { id: true },
    });
  }

  const partnerYCode = `${FIXTURE_PREFIX}-INQ-Y`;
  let inquiryY = await prisma.nx01Partner.findFirst({
    where: { tenantId: tenant.id, code: partnerYCode },
    select: { id: true },
  });
  if (!inquiryY) {
    inquiryY = await prisma.nx01Partner.create({
      data: {
        tenantId: tenant.id,
        code: partnerYCode,
        name: 'B5 同行 Y',
        partnerType: 'S',
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: { id: true },
    });
  }

  return {
    tenantId: tenant.id,
    userId: user.id,
    warehouseId: warehouse.id,
    warehouseCode: warehouse.code,
    customerId: customer.id,
    inquiryPartnerXId: inquiryX.id,
    inquiryPartnerYId: inquiryY.id,
    partId: part.id,
    locationId: location.id,
  };
}

export interface B5Scenario {
  soId: string;
  soItemId: string;
  rfqId: string;
  rfqItemId: string;
}

let _scenarioCounter = 0;

/** 建一套 SO + RFQ stub（不走 D4 translator，直接 INSERT；給每個 test 用）。 */
export async function buildRfqScenario(
  prisma: PrismaClient,
  fixture: B5Fixture,
): Promise<B5Scenario> {
  _scenarioCounter += 1;
  const ts = Date.now();
  const suffix = `${ts}-${_scenarioCounter}`.slice(-12);

  const twdId = await resolveTwd(prisma);

  // SO header
  const so = await prisma.nx04So.create({
    data: {
      tenantId: fixture.tenantId,
      docNo: `B5T-${suffix}`,
      warehouseId: fixture.warehouseId,
      soDate: new Date(),
      customerId: fixture.customerId,
      deliveryType: 'D',
      sourceType: 'S', // trigger 4 強制
      currencyId: twdId,
      taxRate: 5,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      status: 'CONFIRMED',
      paymentTerm: 'NET30',
      createdBy: fixture.userId,
      updatedBy: fixture.userId,
    },
    select: { id: true },
  });

  // SO line item（type='G' 同行調貨）
  const soItem = await prisma.nx04SoItem.create({
    data: {
      soId: so.id,
      lineNo: 1,
      partId: fixture.partId,
      partNo: 'B5TEST-PART-001',
      partName: 'B5 測試用零件',
      warehouseId: fixture.warehouseId,
      locationId: fixture.locationId,
      qty: 5,
      unitPrice: 1000,
      lineAmount: 5000,
      reservedQty: 0,
      transferSourceType: 'G',
      transferStatus: 'I',
      fulfillStatus: 'W',
      createdBy: fixture.userId,
      updatedBy: fixture.userId,
    },
    select: { id: true },
  });

  // RFQ stub（type='P' 同行調貨）
  const rfq = await prisma.nx02Rfq.create({
    data: {
      tenantId: fixture.tenantId,
      docNo: `RFB5-${suffix}`,
      rfqDate: new Date(),
      warehouseId: fixture.warehouseId,
      currency: 'TWD',
      status: 'DRAFT',
      rfqType: 'P',
      rfqReason: 'T',
      sourceSoItemId: soItem.id,
      createdBy: fixture.userId,
      updatedBy: fixture.userId,
    },
    select: { id: true },
  });

  const rfqItem = await prisma.nx02RfqItem.create({
    data: {
      rfqId: rfq.id,
      lineNo: 1,
      partId: fixture.partId,
      partNo: 'B5TEST-PART-001',
      partName: 'B5 測試用零件',
      qty: 5,
      currencyId: twdId,
      createdBy: fixture.userId,
      updatedBy: fixture.userId,
    },
    select: { id: true },
  });

  return { soId: so.id, soItemId: soItem.id, rfqId: rfq.id, rfqItemId: rfqItem.id };
}

async function resolveTwd(prisma: PrismaClient): Promise<string> {
  const twd = await prisma.nx01Currency.findFirst({
    where: { code: 'TWD', isActive: true },
    select: { id: true },
  });
  if (!twd) throw new Error('TWD currency not seeded');
  return twd.id;
}

export async function cleanupScenario(
  prisma: PrismaClient,
  scenario: B5Scenario,
): Promise<void> {
  // 反向順序：TI items → TI → QT → RFQ items → RFQ → SO items → SO
  // 先撈同 RFQ 所有 TI 跟 QT
  const tis = await prisma.nx02Ti.findMany({
    where: { rfqId: scenario.rfqId },
    select: { id: true },
  });
  for (const ti of tis) {
    await prisma.nx02TiItem.deleteMany({ where: { tiId: ti.id } });
    await prisma.nx02Ti.delete({ where: { id: ti.id } }).catch(() => undefined);
  }
  await prisma.nx02Qt.deleteMany({ where: { rfqId: scenario.rfqId } });
  await prisma.nx02RfqItem.deleteMany({ where: { rfqId: scenario.rfqId } });
  await prisma.nx02Rfq.delete({ where: { id: scenario.rfqId } }).catch(() => undefined);

  await prisma.nx04SoItem.update({
    where: { id: scenario.soItemId },
    data: { tiId: null, stId: null, coId: null },
  }).catch(() => undefined);
  await prisma.nx04SoItem.deleteMany({ where: { soId: scenario.soId } });
  await prisma.nx04So.delete({ where: { id: scenario.soId } }).catch(() => undefined);
}

export function buildSvc(prisma: PrismaClient): Nx02QtService {
  const audit = new Nx01AuditLogWriterService(prisma as never);
  const svc = new Nx02QtService(prisma as never, audit);
  Reflect.set(svc, 'logger', new Logger(Nx02QtService.name));
  return svc;
}

export function makeRequestUser(fixture: B5Fixture) {
  return {
    sub: fixture.userId,
    username: 'b5-integration-test',
    roles: ['SYSADMIN'],
    tenantId: fixture.tenantId,
    tenantCode: 'TEST-LITE',
    planCode: 'LITE',
  } as never;
}
