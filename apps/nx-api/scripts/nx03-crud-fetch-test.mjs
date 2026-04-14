/**
 * Phase 5 NX03：fetch 驗證庫存 API（需 nx-api 與 DB）。
 * 用法：repo 根目錄 `node apps/nx-api/scripts/nx03-crud-fetch-test.mjs`
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
    const whs = await prisma.nx01Warehouse.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
      take: 2,
      select: { id: true, code: true },
    });
    if (!whs.length) throw new Error('No warehouse');
    const wh = whs[0];
    const wh2 = whs[1] ?? null;
    const part = await prisma.nx01Part.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    if (!part) throw new Error('No part');
    async function ensureLoc(warehouseId) {
      let loc = await prisma.nx01Location.findFirst({
        where: { tenantId, warehouseId },
        select: { id: true },
      });
      if (!loc) {
        loc = await prisma.nx01Location.create({
          data: {
            tenantId,
            warehouseId,
            code: `NX03-L-${Date.now().toString(36)}`,
            name: 'NX03 test location',
            sortNo: 0,
            isActive: true,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
          select: { id: true },
        });
        console.log(`(fixture) created nx01_location ${loc.id} for warehouse ${warehouseId}`);
      }
      return loc.id;
    }
    const locationId = await ensureLoc(wh.id);
    let locationId2 = null;
    if (wh2) locationId2 = await ensureLoc(wh2.id);
    return { tenantId, userId: admin.id, warehouseId: wh.id, warehouseId2: wh2?.id ?? null, partId: part.id, locationId, locationId2 };
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
    return row ? String(row.onHandQty) : '0';
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const { tenantId, warehouseId, warehouseId2, partId, locationId, locationId2 } = await fixtureIds();
  const token = await login();
  console.log('logged in + fixture ok\n');

  const today = new Date().toISOString().slice(0, 10);

  console.log('--- stock-balance / stock-ledger ---');
  await api(token, 'GET', '/nx03/stock-balance', null);
  await api(token, 'GET', `/nx03/stock-balance/${partId}`, null);
  await api(token, 'GET', '/nx03/stock-ledger?sourceModule=NX03', null);

  const qtyBefore = await readBalanceQty(tenantId, warehouseId, partId);
  console.log(`(db) on_hand before NX03 inbound POST: ${qtyBefore}`);

  console.log('\n--- inbound (POST -> stock+) ---');
  const ib = await api(token, 'POST', '/nx03/inbound', {
    warehouseId,
    inboundDate: today,
    items: [{ partId, locationId, qty: 3, unitCost: 50 }],
  });
  await api(token, 'GET', '/nx03/inbound', null);
  await api(token, 'GET', `/nx03/inbound/${ib.id}`, null);
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'INSPECTING' });
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'POSTED' });
  const qtyAfter = await readBalanceQty(tenantId, warehouseId, partId);
  console.log(`(db) on_hand after inbound POST: ${qtyAfter}`);

  console.log('\n--- outbound (SHIPPED -> stock-) ---');
  const ob = await api(token, 'POST', '/nx03/outbound', {
    warehouseId,
    outboundDate: today,
    items: [{ partId, locationId, qty: 1 }],
  });
  await api(token, 'PATCH', `/nx03/outbound/${ob.id}`, { status: 'PICKING' });
  await api(token, 'PATCH', `/nx03/outbound/${ob.id}`, { status: 'PACKED' });
  await api(token, 'PATCH', `/nx03/outbound/${ob.id}`, { status: 'SHIPPED' });

  console.log('\n--- stocktake ---');
  const st = await api(token, 'POST', '/nx03/stocktake', {
    warehouseId,
    stockTakeDate: today,
    scopeType: 'P',
  });
  await api(token, 'POST', `/nx03/stocktake/${st.id}/items`, {
    partId,
    locationId,
  });
  const stWithItems = await api(token, 'GET', `/nx03/stocktake/${st.id}`, null);
  const stItem0 = stWithItems.items[0];
  const bump = Number(stItem0.systemQty) + 0.0001;
  await api(token, 'PATCH', `/nx03/stocktake/${st.id}/items/${stItem0.id}`, { countedQty: bump });
  await api(token, 'PATCH', `/nx03/stocktake/${st.id}`, { status: 'COUNTING' });
  await api(token, 'PATCH', `/nx03/stocktake/${st.id}`, { status: 'ADJUSTING' });
  await api(token, 'PATCH', `/nx03/stocktake/${st.id}`, { status: 'POSTED' });

  if (warehouseId2 && locationId2) {
    console.log('\n--- transfer (PLUS+) ---');
    const tr = await api(token, 'POST', '/nx03/transfer', {
      fromWarehouseId: warehouseId,
      toWarehouseId: warehouseId2,
      stDate: today,
      items: [{ partId, fromLocationId: locationId, toLocationId: locationId2, qty: 0.5 }],
    });
    await api(token, 'PATCH', `/nx03/transfer/${tr.id}`, { status: 'TRANSIT' });
    await api(token, 'PATCH', `/nx03/transfer/${tr.id}`, { status: 'RECEIVED' });
  } else {
    console.log('\n--- transfer: skipped (need 2 active warehouses + locations) ---');
  }

  console.log('\nAll NX03 endpoint checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
