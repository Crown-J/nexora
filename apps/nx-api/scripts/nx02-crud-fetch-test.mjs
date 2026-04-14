/**
 * Phase 5 NX02：fetch 驗證 RFQ / PO / RR / purchase-return（需 nx-api 與 DB）。
 * 用法：在 repo 根目錄 `node apps/nx-api/scripts/nx02-crud-fetch-test.mjs`
 * 或 `cd apps/nx-api && node scripts/nx02-crud-fetch-test.mjs`
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
    const partner = await prisma.nx01Partner.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    if (!partner) throw new Error('No partner');
    const part = await prisma.nx01Part.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    if (!part) throw new Error('No part');
    let loc = await prisma.nx01Location.findFirst({
      where: { tenantId, warehouseId: wh.id },
      select: { id: true },
    });
    if (!loc) {
      loc = await prisma.nx01Location.create({
        data: {
          tenantId,
          warehouseId: wh.id,
          code: `NX02-L-${Date.now().toString(36)}`,
          name: 'NX02 test location',
          sortNo: 0,
          isActive: true,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true },
      });
      console.log(`(fixture) created nx01_location ${loc.id} for warehouse ${wh.code}`);
    }
    return { tenantId, userId: admin.id, warehouseId: wh.id, partnerId: partner.id, partId: part.id, locationId: loc.id };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const { warehouseId, partnerId, partId, locationId } = await fixtureIds();
  const token = await login();
  console.log('logged in + fixture ok\n');

  const today = new Date().toISOString().slice(0, 10);

  console.log('--- RFQ ---');
  const rfq = await api(token, 'POST', '/nx02/rfq', {
    rfqDate: today,
    warehouseId,
    supplierId: partnerId,
    items: [{ partId, qty: 1, unitPrice: 100 }],
  });
  await api(token, 'GET', '/nx02/rfq', null);
  await api(token, 'GET', `/nx02/rfq/${rfq.id}`, null);
  await api(token, 'PATCH', `/nx02/rfq/${rfq.id}`, { status: 'SENT' });
  await api(token, 'POST', `/nx02/rfq/${rfq.id}/items`, { partId, qty: 2, unitPrice: 110 });
  const rfqItem2 = (await api(token, 'GET', `/nx02/rfq/${rfq.id}`, null)).items[1];
  await api(token, 'PATCH', `/nx02/rfq/${rfq.id}/items/${rfqItem2.id}`, { qty: 3 });
  await api(token, 'DELETE', `/nx02/rfq/${rfq.id}/items/${rfqItem2.id}`, null);
  await api(token, 'PATCH', `/nx02/rfq/${rfq.id}`, { status: 'REPLIED' });
  await api(token, 'PATCH', `/nx02/rfq/${rfq.id}`, { status: 'CLOSED' });

  console.log('\n--- PO ---');
  const po = await api(token, 'POST', '/nx02/po', {
    poDate: today,
    supplierId: partnerId,
    items: [{ partId, qty: 5, unitPriceSnapshot: 200 }],
  });
  await api(token, 'GET', '/nx02/po', null);
  await api(token, 'GET', `/nx02/po/${po.id}`, null);
  await api(token, 'PATCH', `/nx02/po/${po.id}`, { status: 'CONFIRMED' });
  await api(token, 'POST', `/nx02/po/${po.id}/items`, { partId, qty: 1, unitPriceSnapshot: 50 });
  const poItems = (await api(token, 'GET', `/nx02/po/${po.id}`, null)).items;
  const lastPoItem = poItems[poItems.length - 1];
  await api(token, 'PATCH', `/nx02/po/${po.id}/items/${lastPoItem.id}`, { qty: 2 });
  await api(token, 'DELETE', `/nx02/po/${po.id}/items/${lastPoItem.id}`, null);

  console.log('\n--- RR (stock on POST) ---');
  const rr = await api(token, 'POST', '/nx02/rr', {
    rrDate: today,
    warehouseId,
    supplierId: partnerId,
    poId: po.id,
    items: [{ partId, locationId, qty: 1, unitPriceSnapshot: 200, actualQty: 1 }],
  });
  await api(token, 'GET', '/nx02/rr', null);
  await api(token, 'PATCH', `/nx02/rr/${rr.id}`, { status: 'INSPECTING' });
  await api(token, 'PATCH', `/nx02/rr/${rr.id}`, { status: 'POSTED' });
  await api(token, 'GET', `/nx02/rr/${rr.id}`, null);

  const rrItems = (await api(token, 'GET', `/nx02/rr/${rr.id}`, null)).items;
  const rrItem0 = rrItems[0];

  console.log('\n--- purchase-return ---');
  const pr = await api(token, 'POST', '/nx02/purchase-return', {
    prDate: today,
    warehouseId,
    supplierId: partnerId,
    rrId: rr.id,
    items: [
      {
        rrItemId: rrItem0.id,
        partId,
        qty: 1,
        unitPriceSnapshot: 200,
        locationId,
      },
    ],
  });
  await api(token, 'GET', '/nx02/purchase-return', null);
  await api(token, 'DELETE', `/nx02/purchase-return/${pr.id}`, null);

  await api(token, 'DELETE', `/nx02/po/${po.id}`, null);

  console.log('\nAll NX02 endpoint checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
