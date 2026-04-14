/**
 * Phase 5 NX06：fetch 驗證物流 API（需 nx-api 與 DB）。
 * 用法：repo 根目錄 `node apps/nx-api/scripts/nx06-crud-fetch-test.mjs`
 * 環境：`NX_API_BASE` 須與執行中的 nx-api 一致（`apps/nx-api/.env` 預設 `PORT=3001`；未設時本腳本預設 3011 與 nx05 腳本一致）。
 * 程式變更後請先 `pnpm exec nest build`（於 `apps/nx-api`）再啟動 API，避免 dist 過舊（例如缺 `/nx06/*` 路由）。
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
      'User-Agent': 'nx06-crud-fetch-test/1.0',
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
      select: { id: true, code: true, name: true },
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
          code: `NX06C-${Date.now().toString(36)}`,
          name: 'NX06 fetch-test customer',
          partnerType: 'C',
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
          code: `NX06-L-${Date.now().toString(36)}`,
          name: 'NX06 test location',
          sortNo: 0,
          isActive: true,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true },
      });
    }
    return {
      adminUserId: admin.id,
      warehouseId: wh.id,
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      locationId: loc.id,
      customerId: customer.id,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function shipSoWithDelivery(token, ids, { qty }) {
  const today = new Date().toISOString().slice(0, 10);
  const far = '2099-12-31';
  const q = await api(token, 'POST', '/nx04/quote', {
    warehouseId: ids.warehouseId,
    quoteDate: today,
    customerId: ids.customerId,
    validUntil: far,
    taxRate: 5,
    items: [{ partId: ids.partId, qty, unitPriceSnapshot: 100 }],
  });
  await api(token, 'PATCH', `/nx04/quote/${q.id}`, { status: 'SENT' });
  const so = await api(token, 'POST', `/nx04/so/from-quote/${q.id}`, {});
  await api(token, 'PATCH', `/nx04/so/${so.id}`, {
    deliveryType: 'D',
    deliveryAddress: '台北市信義區 NX06 測試配送地址 88 號',
  });
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'PICKING' });
  await api(token, 'PATCH', `/nx04/so/${so.id}`, { status: 'SHIPPED' });
  return { today, so };
}

async function main() {
  const ids = await fixtureIds();
  const token = await login();
  const today = new Date().toISOString().slice(0, 10);
  console.log('logged in + fixture ok\n');

  const ib = await api(token, 'POST', '/nx03/inbound', {
    warehouseId: ids.warehouseId,
    inboundDate: today,
    items: [{ partId: ids.partId, locationId: ids.locationId, qty: 200, unitCost: 40 }],
  });
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'INSPECTING' });
  await api(token, 'PATCH', `/nx03/inbound/${ib.id}`, { status: 'POSTED' });

  console.log('--- NX06 list smoke ---');
  await api(token, 'GET', '/nx06/delivery', null);
  await api(token, 'GET', '/nx06/pickup', null);
  await api(token, 'GET', '/nx06/intl-shipping', null);
  await api(token, 'GET', '/nx06/return-pickup', null);

  console.log('\n--- SO SHIPPED -> auto delivery DN ---');
  const { so } = await shipSoWithDelivery(token, ids, { qty: 2 });
  const dnList = await api(token, 'GET', '/nx06/delivery?pageSize=100', null);
  const dnRow = dnList.rows?.find((r) => r.sourceSoId === so.id);
  if (!dnRow) throw new Error('Delivery DN not auto-created for SHIPPED SO (D + address)');
  const dnId = dnRow.id;
  console.log(`(nx06) delivery from SO: ${dnId} docNo=${dnRow.docNo}`);

  await api(token, 'PATCH', `/nx06/delivery/${dnId}/location`, {
    lat: 25.033964,
    lng: 121.564468,
    timestamp: new Date().toISOString(),
  });
  const afterGps = await api(token, 'GET', `/nx06/delivery/${dnId}`, null);
  if (Number(afterGps.lastLat) !== 25.033964 || Number(afterGps.lastLng) !== 121.564468) {
    throw new Error(`GPS not persisted: lastLat=${afterGps.lastLat} lastLng=${afterGps.lastLng}`);
  }
  console.log('(nx06) GPS patch ok');

  await api(token, 'PATCH', `/nx06/delivery/${dnId}`, { status: 'DISPATCHED' });
  const delivered = await api(token, 'PATCH', `/nx06/delivery/${dnId}`, {
    status: 'DELIVERED',
    signature: { signerType: 'C', signerName: '簽收人甲' },
  });
  const stop0 = delivered.stops?.[0];
  if (!stop0?.signedAt || stop0.signerType !== 'C' || stop0.signedByName !== '簽收人甲') {
    throw new Error(`e-sign mismatch: ${JSON.stringify(stop0)}`);
  }
  if (stop0.items?.some((it) => it.deliveryStatus !== 'C')) {
    throw new Error('expected all line items deliveryStatus=C after DELIVERED');
  }
  console.log('(nx06) DELIVERED e-sign ok');

  console.log('\n--- pickup flow ---');
  const pk = await api(token, 'POST', '/nx06/pickup', {
    dnDate: new Date().toISOString().slice(0, 10),
    warehouseId: ids.warehouseId,
    driverUserId: ids.adminUserId,
    partnerId: ids.customerId,
    address: '新北市 NX06 取貨點',
    items: [
      {
        sourceDocType: 'TI',
        sourceDocId: 'NX02TI000099999',
        partId: ids.partId,
        partNo: ids.partNo,
        partName: ids.partName,
        qty: 1,
      },
    ],
  });
  await api(token, 'PATCH', `/nx06/pickup/${pk.id}`, { status: 'DISPATCHED' });
  await api(token, 'PATCH', `/nx06/pickup/${pk.id}`, {
    status: 'PICKED_UP',
    signature: { signerType: 'W', signerName: '倉管乙' },
  });
  const pkDone = await api(token, 'GET', `/nx06/pickup/${pk.id}`, null);
  if (pkDone.status !== 'PICKED_UP' || !pkDone.stops?.[0]?.signedAt) throw new Error('pickup completion failed');
  console.log('(nx06) pickup PICKED_UP ok');

  console.log('\n--- intl-shipping flow ---');
  const eta = '2099-06-01';
  const intl = await api(token, 'POST', '/nx06/intl-shipping', {
    dnDate: new Date().toISOString().slice(0, 10),
    warehouseId: ids.warehouseId,
    driverUserId: ids.adminUserId,
    customsDeclarationNo: `C${Date.now().toString(36)}`.slice(0, 20),
    originPort: 'KHH',
    destinationPort: 'LAX',
    etaDate: eta,
    address: '國際貨運收件地址',
    items: [{ sourceDocType: 'SO', sourceDocId: so.id, qty: 1 }],
  });
  await api(token, 'PATCH', `/nx06/intl-shipping/${intl.id}`, { status: 'CUSTOMS' });
  await api(token, 'PATCH', `/nx06/intl-shipping/${intl.id}`, { status: 'IN_TRANSIT' });
  await api(token, 'PATCH', `/nx06/intl-shipping/${intl.id}`, {
    status: 'DELIVERED',
    signature: { signerType: 'C', signerName: '海外收件人' },
  });
  console.log('(nx06) intl DELIVERED ok');

  console.log('\n--- return-pickup from SR ---');
  const { so: so2 } = await shipSoWithDelivery(token, ids, { qty: 1 });
  const so2Full = await api(token, 'GET', `/nx04/so/${so2.id}`, null);
  const soItemId = so2Full.items[0].id;
  const sr = await api(token, 'POST', '/nx04/sales-return', {
    soId: so2.id,
    srDate: new Date().toISOString().slice(0, 10),
    returnMethod: 'P',
    taxRate: 5,
    items: [{ soItemId, qty: 1, returnReason: 'O' }],
  });
  const rp = await api(token, 'POST', '/nx06/return-pickup', {
    srId: sr.id,
    driverUserId: ids.adminUserId,
    pickupAddress: '退貨取件：桃園市 NX06 測試路',
  });
  if (rp.sourceSrId !== sr.id) throw new Error('return pickup sourceSrId');
  await api(token, 'PATCH', `/nx06/return-pickup/${rp.id}`, { status: 'DISPATCHED' });
  await api(token, 'PATCH', `/nx06/return-pickup/${rp.id}`, {
    status: 'PICKED_UP',
    signature: { signerType: 'C', signerName: '退貨簽收' },
  });
  console.log('(nx06) return-pickup PICKED_UP ok');

  console.log('\n--- void draft delivery (manual create) ---');
  const manual = await api(token, 'POST', '/nx06/delivery', {
    dnDate: new Date().toISOString().slice(0, 10),
    warehouseId: ids.warehouseId,
    driverUserId: ids.adminUserId,
    stops: [
      {
        address: '手動建立待作廢',
        items: [{ sourceDocType: 'SO', sourceDocId: so.id, qty: 1 }],
      },
    ],
  });
  await api(token, 'DELETE', `/nx06/delivery/${manual.id}`, null);
  const voided = await api(token, 'GET', `/nx06/delivery/${manual.id}`, null);
  if (voided.status !== 'VOIDED') throw new Error('void expected VOIDED');
  console.log('(nx06) DELETE void ok');

  console.log('\nAll NX06 endpoint checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
