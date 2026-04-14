/**
 * Phase 5 NX05：fetch 驗證財務 API（需 nx-api 與 DB）。
 * 用法：repo 根目錄 `node apps/nx-api/scripts/nx05-crud-fetch-test.mjs`
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

async function api(token, method, path, body, extraHeaders = {}) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'nx05-crud-fetch-test/1.0',
      ...extraHeaders,
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
          code: `NX05C-${Date.now().toString(36)}`,
          name: 'NX05 fetch-test customer',
          partnerType: 'C',
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true },
      });
    }
    let supplier = await prisma.nx01Partner.findFirst({
      where: { tenantId, isActive: true, partnerType: 'S' },
      select: { id: true },
    });
    if (!supplier) {
      supplier = await prisma.nx01Partner.create({
        data: {
          tenantId,
          code: `NX05S-${Date.now().toString(36)}`,
          name: 'NX05 fetch-test supplier',
          partnerType: 'S',
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true },
      });
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
          code: `NX05-L-${Date.now().toString(36)}`,
          name: 'NX05 test location',
          sortNo: 0,
          isActive: true,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true },
      });
    }
    return { tenantId, warehouseId: wh.id, partId: part.id, locationId: loc.id, customerId: customer.id, supplierId: supplier.id };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const { warehouseId, partId, locationId, customerId, supplierId } = await fixtureIds();
  const token = await login();
  const today = new Date().toISOString().slice(0, 10);
  const far = '2099-12-31';

  console.log('logged in + fixture ok\n');

  console.log('--- NX05 list smoke ---');
  await api(token, 'GET', '/nx05/ar', null);
  await api(token, 'GET', '/nx05/ap', null);
  await api(token, 'GET', '/nx05/receipt', null);
  await api(token, 'GET', '/nx05/payment', null);
  await api(token, 'GET', '/nx05/note', null);
  await api(token, 'GET', '/nx05/allowance', null);
  await api(token, 'GET', '/nx05/period-close', null);

  console.log('\n--- SO SHIPPED -> AR ---');
  const ib = await api(token, 'POST', '/nx03/inbound', {
    warehouseId,
    inboundDate: today,
    items: [{ partId, locationId, qty: 30, unitCost: 40 }],
  });
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'INSPECTING' });
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'POSTED' });

  const q = await api(token, 'POST', '/nx04/quote', {
    warehouseId,
    quoteDate: today,
    customerId,
    validUntil: far,
    taxRate: 5,
    items: [{ partId, qty: 3, unitPriceSnapshot: 100 }],
  });
  await api(token, 'PATCH', `/nx04/quote/${q.id}`, { status: 'SENT' });
  const so = await api(token, 'POST', `/nx04/so/from-quote/${q.id}`, {});
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'PICKING' });
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'SHIPPED' });

  const arList = await api(token, 'GET', `/nx05/ar?search=${encodeURIComponent(so.docNo)}`, null);
  const arRow = arList.rows?.find((r) => r.soId === so.id);
  if (!arRow) throw new Error('AR not auto-created for SHIPPED SO');
  console.log(`(nx05) AR for SO: ${arRow.id} balance=${arRow.balanceAmount} displayStatus=${arRow.displayStatus}`);

  const payPart = Number(String(arRow.balanceAmount)) * 0.5;
  const rc = await api(token, 'POST', '/nx05/receipt', {
    payDate: today,
    arId: arRow.id,
    amount: payPart,
    payMethod: 'CA',
  });
  await api(token, 'PATCH', `/nx05/receipt/${rc.id}`, { status: 'POSTED' });
  const arAfter = await api(token, 'GET', `/nx05/ar/${arRow.id}`, null);
  console.log(`(nx05) AR after receipt: paid=${arAfter.paidAmount} balance=${arAfter.balanceAmount} status=${arAfter.status}`);

  console.log('\n--- PO CONFIRMED -> AP (items before confirm) ---');
  const po = await api(token, 'POST', '/nx02/po', {
    poDate: today,
    supplierId,
    taxRate: 5,
    items: [{ partId, qty: 2, unitPriceSnapshot: 80 }],
  });
  await api(token, 'PATCH', `/nx02/po/${po.id}`, { status: 'CONFIRMED' });
  const apList = await api(token, 'GET', `/nx05/ap?search=${encodeURIComponent(po.docNo)}`, null);
  const apRow = apList.rows?.find((r) => r.poId === po.id);
  if (!apRow) throw new Error('AP not created for CONFIRMED PO');
  console.log(`(nx05) AP for PO: ${apRow.id} balance=${apRow.balanceAmount}`);

  const cp = await api(token, 'POST', '/nx05/payment', {
    payDate: today,
    apId: apRow.id,
    amount: Number(String(apRow.balanceAmount)),
    payMethod: 'CA',
  });
  await api(token, 'PATCH', `/nx05/payment/${cp.id}`, { status: 'POSTED' });
  const apAfter = await api(token, 'GET', `/nx05/ap/${apRow.id}`, null);
  console.log(`(nx05) AP after payment: paid=${apAfter.paidAmount} balance=${apAfter.balanceAmount} status=${apAfter.status}`);

  console.log('\n--- note / allowance / period-close minimal ---');
  const nt = await api(token, 'POST', '/nx05/note', {
    noteType: 'CK',
    direction: 'R',
    partnerId: customerId,
    noteNo: `T${Date.now()}`,
    bankName: 'Test Bank',
    amount: 1000,
    issueDate: today,
    dueDate: far,
  });
  await api(token, 'PATCH', `/nx05/note/${nt.id}`, { status: 'ACTIVE' });

  const al = await api(token, 'POST', '/nx05/allowance', {
    allowanceType: 'S',
    partnerId: customerId,
    allowanceDate: today,
    refArId: arRow.id,
    items: [{ reason: 'test', amount: 1 }],
  });
  await api(token, 'PATCH', `/nx05/allowance/${al.id}`, { status: 'APPROVED' });

  const cl = await api(token, 'POST', '/nx05/period-close', { closingDate: today });
  await api(token, 'PATCH', `/nx05/period-close/${cl.id}`, { status: 'CLOSING' });
  await api(token, 'PATCH', `/nx05/period-close/${cl.id}`, { status: 'CLOSED' });

  console.log('\nAll NX05 endpoint checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
