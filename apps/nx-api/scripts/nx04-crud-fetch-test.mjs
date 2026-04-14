/**
 * Phase 5 NX04：fetch 驗證銷售 API（需 nx-api 與 DB）。
 * 用法：repo 根目錄 `node apps/nx-api/scripts/nx04-crud-fetch-test.mjs`
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDbCoreEnv() {
  const p = resolve(__dirname, '../../../packages/db-core/.env');
  if (!existsSync(p)) return;
  const raw = readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadDbCoreEnv();

const base = process.env.NX_API_BASE || 'http://localhost:3011';

async function login() {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'Nexoragrid2026',
      tenantCode: 'HENGYIN',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login ${r.status} ${JSON.stringify(j)}`);
  return j.token;
}

async function api(token, method, path, body) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    j = text;
  }
  const ok = r.ok;
  const preview = typeof j === 'object' ? JSON.stringify(j).slice(0, 200) : String(j).slice(0, 200);
  console.log(`${ok ? 'OK' : 'FAIL'} ${method} ${path} -> ${r.status} ${preview}`);
  if (!ok) throw new Error(`${method} ${path} ${r.status} ${text}`);
  return j;
}

async function fixtureIds() {
  const { PrismaClient } = await import('db-core');
  const pg = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL missing (loaded packages/db-core/.env?)');
  const pool = new pg.default.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const tenant = await prisma.nx99Tenant.findFirst({ where: { code: 'HENGYIN' }, select: { id: true } });
    if (!tenant) throw new Error('Tenant HENGYIN not found');
    const tenantId = tenant.id;
    const admin = await prisma.nx01User.findFirst({
      where: { tenantId, userAccount: 'admin' },
      select: { id: true },
    });
    if (!admin) throw new Error('admin user not found');
    const wh = await prisma.nx01Warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true },
    });
    if (!wh) throw new Error('No warehouse');
    const part = await prisma.nx01Part.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    if (!part) throw new Error('No part');
    let customer = await prisma.nx01Partner.findFirst({
      where: { tenantId, isActive: true, partnerType: 'C' },
      select: { id: true },
    });
    if (!customer) {
      customer = await prisma.nx01Partner.create({
        data: {
          tenantId,
          code: `NX04C-${Date.now().toString(36)}`,
          name: 'NX04 fetch-test customer',
          partnerType: 'C',
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true },
      });
      console.log(`(fixture) created nx01_partner ${customer.id} (partnerType=C)`);
    }
    let loc = await prisma.nx01Location.findFirst({
      where: { tenantId, warehouseId: wh.id },
      select: { id: true },
    });
    if (!loc) {
      loc = await prisma.nx01Location.create({
        data: {
          tenantId,
          warehouseId: wh.id,
          code: `NX04-L-${Date.now().toString(36)}`,
          name: 'NX04 test location',
          sortNo: 0,
          isActive: true,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true },
      });
      console.log(`(fixture) created nx01_location ${loc.id}`);
    }
    return { tenantId, warehouseId: wh.id, partId: part.id, locationId: loc.id, customerId: customer.id };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function readBalanceQty(tenantId, warehouseId, partId) {
  const { PrismaClient } = await import('db-core');
  const pg = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const url = process.env.DATABASE_URL?.trim();
  const pool = new pg.default.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const row = await prisma.nx03StockBalance.findFirst({
      where: { tenantId, warehouseId, partId },
      select: { onHandQty: true },
    });
    return row ? Number(String(row.onHandQty)) : 0;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const { tenantId, warehouseId, partId, locationId, customerId } = await fixtureIds();
  const token = await login();
  const today = new Date().toISOString().slice(0, 10);
  const far = '2099-12-31';

  console.log('logged in + fixture ok\n');

  console.log('--- ensure stock (NX03 inbound) ---');
  const ib = await api(token, 'POST', '/nx03/inbound', {
    warehouseId,
    inboundDate: today,
    items: [{ partId, locationId, qty: 25, unitCost: 40 }],
  });
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'INSPECTING' });
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'POSTED' });
  const stock0 = await readBalanceQty(tenantId, warehouseId, partId);
  console.log(`(db) on_hand after seed inbound: ${stock0}\n`);

  console.log('--- quote CRUD ---');
  const q = await api(token, 'POST', '/nx04/quote', {
    warehouseId,
    quoteDate: today,
    customerId,
    validUntil: far,
    taxRate: 5,
    items: [{ partId, qty: 2, unitPriceSnapshot: 120 }],
  });
  await api(token, 'GET', '/nx04/quote', null);
  await api(token, 'GET', `/nx04/quote/${q.id}`, null);
  await api(token, 'PATCH', `/nx04/quote/${q.id}`, { status: 'SENT' });

  console.log('\n--- SO from-quote + state + SHIPPED (stock-) ---');
  const so = await api(token, 'POST', `/nx04/so/from-quote/${q.id}`, {});
  const soItemId = so.items[0].id;
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'PICKING' });
  const beforeShip = await readBalanceQty(tenantId, warehouseId, partId);
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'SHIPPED' });
  const afterShip = await readBalanceQty(tenantId, warehouseId, partId);
  const shippedQty = Number(so.items[0].qty);
  console.log(`(db) on_hand before SO SHIPPED: ${beforeShip}, after: ${afterShip} (expect delta -${shippedQty})`);
  if (Math.abs(afterShip - beforeShip + shippedQty) > 0.0001) {
    throw new Error(`SO SHIPPED stock delta unexpected: ${beforeShip} -> ${afterShip}`);
  }

  console.log('\n--- sales-return POSTED (stock+) ---');
  const sr = await api(token, 'POST', '/nx04/sales-return', {
    soId: so.id,
    srDate: today,
    returnMethod: 'S',
    taxRate: 5,
    items: [{ soItemId, qty: 1, returnReason: 'O' }],
  });
  await api(token, 'PATCH', `/nx04/sales-return/${sr.id}`, { status: 'INSPECTING' });
  const beforeSr = await readBalanceQty(tenantId, warehouseId, partId);
  await api(token, 'PATCH', `/nx04/sales-return/${sr.id}`, { status: 'POSTED' });
  const afterSr = await readBalanceQty(tenantId, warehouseId, partId);
  console.log(`(db) on_hand before SR POSTED: ${beforeSr}, after: ${afterSr} (expect +1)`);
  if (Math.abs(afterSr - beforeSr - 1) > 0.0001) {
    throw new Error(`SR POSTED stock delta unexpected: ${beforeSr} -> ${afterSr}`);
  }

  console.log('\n--- SO list / ledger NX04 ---');
  await api(token, 'GET', '/nx04/so', null);
  await api(token, 'GET', '/nx03/stock-ledger?sourceModule=NX04', null);

  console.log('\nAll NX04 endpoint checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
