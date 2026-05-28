// apps/nx-api/src/nx04/so/translator/__tests__/integration/test-helpers.ts
// 整合測試共用工具：DB 連線、租戶 seed 資料抓取、cleanup。
// 假設：dev 機已跑 seed.ts，存在 LITE/PLUS/PRO 三租戶與基礎主檔資料。

import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { PrismaClient } from 'db-core';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { Nx04SoTranslatorService } from '../../translator.service';
import { TransferSourceResolver } from '../../transfer-source-resolver';
import { RefreshmentDocCreator } from '../../refreshment-doc-creator';
import type { RequestUser } from '../../../../../auth/strategies/jwt.strategy';

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

export interface TestSeed {
  tenantId: string;
  userId: string;
  warehouseId: string;
  customerId: string;
  partIds: string[];
  inquiryPartnerId: string | null; // 可能 null（測試環境沒同行）
  otherWarehouseId: string | null; // 給 transfer 測試用（同租戶第 2 個倉）
}

/** 抓 LITE 租戶的第一組可用 seed 資料（不污染 dev DB） */
export async function loadLiteSeed(): Promise<TestSeed> {
  const p = getPrisma();
  const tenant = await p.nx99Tenant.findFirst({
    where: { code: 'TEST-LITE' },
    select: { id: true },
  });
  if (!tenant) throw new Error('TEST-LITE tenant not found — run pnpm prisma db seed');
  const warehouses = await p.nx01Warehouse.findMany({
    where: { tenantId: tenant.id, isActive: true },
    take: 2,
    select: { id: true },
  });
  if (warehouses.length === 0) throw new Error('No warehouse in LITE tenant');
  const customer = await p.nx01Partner.findFirst({
    where: { tenantId: tenant.id, isActive: true, partnerType: 'C' },
    select: { id: true },
  });
  if (!customer) throw new Error('No type=C customer in LITE tenant');
  const parts = await p.nx01Part.findMany({
    where: { tenantId: tenant.id, isActive: true },
    take: 4,
    select: { id: true },
  });
  if (parts.length < 2) throw new Error('Need at least 2 parts in LITE tenant');
  const inquiryPartner = await p.nx01Partner.findFirst({
    where: { tenantId: tenant.id, isActive: true, partnerType: 'O' },
    select: { id: true },
  });
  const user = await p.nx01User.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true },
  });
  if (!user) throw new Error('No user in LITE tenant');
  return {
    tenantId: tenant.id,
    userId: user.id,
    warehouseId: warehouses[0].id,
    otherWarehouseId: warehouses[1]?.id ?? null,
    customerId: customer.id,
    partIds: parts.map((x) => x.id),
    inquiryPartnerId: inquiryPartner?.id ?? null,
  };
}

export function makeRequestUser(seed: TestSeed): RequestUser {
  return {
    sub: seed.userId,
    username: 'integration-test',
    roles: ['SYSADMIN'],
    tenantId: seed.tenantId,
    tenantCode: null,
    planCode: 'LITE',
  } as RequestUser;
}

/** 直接 new 一條 translator service（不依賴 NestJS DI） */
export function buildTranslator(prisma: PrismaClient): Nx04SoTranslatorService {
  // PrismaService extends PrismaClient — 把 client 當 PrismaService 用即可
  const svc = new Nx04SoTranslatorService(
    prisma as unknown as never,
    new TransferSourceResolver(),
    new RefreshmentDocCreator(),
  );
  // 安撫 NestJS Logger 的 nested logger（vitest console capture）
  Reflect.set(svc, 'logger', new Logger(Nx04SoTranslatorService.name));
  return svc;
}

/** 清理一張 SO 跟其相關 row（給 afterEach 用）。RECALCULATE trigger 會反向修正 reserved_qty。*/
export async function cleanupSo(prisma: PrismaClient, soId: string) {
  // 順序很重要：先刪有 FK 引用的下游，再刪上游
  // 1. nx04_so_item.coId → nx04_co.sourceSoItemId 雙向 FK，先解開
  await prisma.nx04SoItem.updateMany({
    where: { soId },
    data: { coId: null, stId: null, tiId: null },
  });
  // 2. 刪 RFQ items + RFQ headers
  const rfqRows = await prisma.nx02Rfq.findMany({
    where: { rfqType: 'P', supplierId: { not: null }, remark: null },
    select: { id: true },
  });
  for (const r of rfqRows) {
    await prisma.nx02RfqItem.deleteMany({ where: { rfqId: r.id } });
    await prisma.nx02Rfq.delete({ where: { id: r.id } }).catch(() => undefined);
  }
  // 3. 刪 ST items（FK to so_item，要先把 sourceSoItemId set null 不行 — 改 delete by sourceSoItemId
  const soItems = await prisma.nx04SoItem.findMany({ where: { soId }, select: { id: true } });
  for (const it of soItems) {
    await prisma.nx03StItem.deleteMany({ where: { sourceSoItemId: it.id } });
    await prisma.nx02TiItem.deleteMany({ where: { sourceSoItemId: it.id } });
    await prisma.nx04Co.deleteMany({ where: { sourceSoItemId: it.id } });
  }
  // 4. 刪 ST header（refSoId = soId 的孤兒）
  await prisma.nx03St.deleteMany({ where: { refSoId: soId } });
  // 5. 刪 SO items + SO header
  await prisma.nx04SoItem.deleteMany({ where: { soId } });
  await prisma.nx04So.delete({ where: { id: soId } }).catch(() => undefined);
}
