/**
 * Phase 5 NX07：人資 API fetch 驗證（PRO + 非財務角色；薪資明細權限）。
 * 用法：repo 根目錄 `node apps/nx-api/scripts/nx07-crud-fetch-test.mjs`
 * 需：nx-api 已啟動、`packages/db-core/.env` 含 DATABASE_URL（腳本會載入）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMIN_PASSWORD_HASH =
  '$2b$10$H269i.oPp5pRGqcV2dzzb.viPbIMP4BMFR62oxD17CGiWvciXNWIq';

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

async function login(username, password) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      tenantCode: 'HENGYIN',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login ${username} ${r.status} ${JSON.stringify(j)}`);
  return j.token;
}

async function api(token, method, path, body) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'nx07-crud-fetch-test/1.0',
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

async function apiExpectStatus(token, method, path, body, expectStatus) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'nx07-crud-fetch-test/1.0',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  console.log(`${r.status === expectStatus ? 'OK' : 'FAIL'} ${method} ${path} -> ${r.status} (expect ${expectStatus}) ${text.slice(0, 120)}`);
  if (r.status !== expectStatus) throw new Error(`${method} ${path} expected ${expectStatus} got ${r.status}`);
}

async function ensureFixtureUsers() {
  const { PrismaClient } = await import('db-core');
  const pg = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL missing (packages/db-core/.env)');
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
    if (!admin) throw new Error('admin not found');
    const financeRole = await prisma.nx01Role.findFirst({ where: { tenantId, code: 'FINANCE' } });
    const hrRole = await prisma.nx01Role.findFirst({ where: { tenantId, code: 'HR' } });
    if (!financeRole || !hrRole) throw new Error('FINANCE or HR role missing (re-run seed)');

    async function upsertSingleRoleUser(account, roleId) {
      let u = await prisma.nx01User.findFirst({ where: { tenantId, userAccount: account } });
      if (!u) {
        u = await prisma.nx01User.create({
          data: {
            tenantId,
            userAccount: account,
            userName: account,
            passwordHash: ADMIN_PASSWORD_HASH,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
        });
      }
      await prisma.nx01UserRole.deleteMany({ where: { userId: u.id, tenantId } });
      await prisma.nx01UserRole.create({
        data: {
          tenantId,
          userId: u.id,
          roleId,
          isPrimary: true,
          isActive: true,
          assignedBy: admin.id,
        },
      });
      return u.id;
    }

    const financeUserId = await upsertSingleRoleUser('nx07ftest_finance', financeRole.id);
    const hrUserId = await upsertSingleRoleUser('nx07ftest_hr', hrRole.id);

    let resignTarget = await prisma.nx01User.findFirst({
      where: { tenantId, userAccount: 'nx07ftest_resign' },
    });
    if (!resignTarget) {
      resignTarget = await prisma.nx01User.create({
        data: {
          tenantId,
          userAccount: 'nx07ftest_resign',
          userName: 'NX07 resign target',
          passwordHash: ADMIN_PASSWORD_HASH,
          createdBy: admin.id,
          updatedBy: admin.id,
          isActive: true,
        },
      });
    } else {
      await prisma.nx01User.update({
        where: { id: resignTarget.id },
        data: { isActive: true, updatedBy: admin.id },
      });
    }
    const whRole = await prisma.nx01Role.findFirst({ where: { tenantId, code: 'WAREHOUSE' } });
    if (whRole) {
      await prisma.nx01UserRole.deleteMany({ where: { userId: resignTarget.id, tenantId } });
      await prisma.nx01UserRole.create({
        data: {
          tenantId,
          userId: resignTarget.id,
          roleId: whRole.id,
          isPrimary: true,
          isActive: true,
          assignedBy: admin.id,
        },
      });
    }

    return {
      tenantId,
      adminId: admin.id,
      financeUserId,
      hrUserId,
      resignUserId: resignTarget.id,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const fixture = await ensureFixtureUsers();

  const adminTok = await login('admin', 'Nexoragrid2026');
  const financeTok = await login('nx07ftest_finance', 'Nexoragrid2026');
  const hrTok = await login('nx07ftest_hr', 'Nexoragrid2026');

  console.log('\n--- FINANCE must get 403 on all nx07 ---');
  await apiExpectStatus(financeTok, 'GET', '/nx07/leave', null, 403);
  await apiExpectStatus(financeTok, 'GET', '/nx07/payroll', null, 403);

  console.log('\n--- NX07 list smoke (admin) ---');
  await api(adminTok, 'GET', '/nx07/leave', null);
  await api(adminTok, 'GET', '/nx07/overtime', null);
  await api(adminTok, 'GET', '/nx07/payroll', null);
  await api(adminTok, 'GET', '/nx07/performance', null);
  await api(adminTok, 'GET', '/nx07/training', null);
  await api(adminTok, 'GET', '/nx07/employee-change', null);
  await api(adminTok, 'GET', '/nx07/attendance', null);

  const today = new Date().toISOString().slice(0, 10);

  console.log('\n--- attendance checkin/checkout (admin) ---');
  await api(adminTok, 'POST', '/nx07/attendance/checkin', { workDate: today });
  await api(adminTok, 'POST', '/nx07/attendance/checkout', { workDate: today });

  console.log('\n--- performance lifecycle ---');
  const perf = await api(adminTok, 'POST', '/nx07/performance', {
    userId: fixture.adminId,
    title: 'NX07 fetch perf',
    periodLabel: '2026-Q1',
  });
  await api(adminTok, 'PATCH', `/nx07/performance/${perf.id}`, { status: 'IN_PROGRESS' });
  await api(adminTok, 'PATCH', `/nx07/performance/${perf.id}`, { status: 'REVIEWING' });
  await api(adminTok, 'PATCH', `/nx07/performance/${perf.id}`, { status: 'CONFIRMED' });

  console.log('\n--- training lifecycle + void ---');
  const tr = await api(adminTok, 'POST', '/nx07/training', {
    title: 'NX07 fetch training',
    startAt: `${today}T09:00:00.000Z`,
    endAt: `${today}T12:00:00.000Z`,
  });
  await api(adminTok, 'PATCH', `/nx07/training/${tr.id}`, { status: 'IN_PROGRESS' });
  await api(adminTok, 'DELETE', `/nx07/training/${tr.id}`, null);

  console.log('\n--- payroll detail: admin vs HR ---');
  const ym = `2099-${String((Date.now() % 12) + 1).padStart(2, '0')}`;
  const pr = await api(adminTok, 'POST', '/nx07/payroll', {
    userId: fixture.adminId,
    yearMonth: ym,
    baseSalary: 100,
  });
  const adminDetail = await api(adminTok, 'GET', `/nx07/payroll/${pr.id}`, null);
  if (!adminDetail.salaryDetailVisible) throw new Error('admin should see salaryDetailVisible');
  const hrDetail = await api(hrTok, 'GET', `/nx07/payroll/${pr.id}`, null);
  if (hrDetail.salaryDetailVisible !== false) throw new Error('HR should have salaryDetailVisible false');
  if (hrDetail.items != null) throw new Error('HR payroll detail must not include items');

  console.log('\n--- employee change RESIGN -> is_active false ---');
  const ec = await api(adminTok, 'POST', '/nx07/employee-change', {
    targetUserId: fixture.resignUserId,
    changeType: 'RESIGN',
    effectiveDate: today,
  });
  await api(adminTok, 'PATCH', `/nx07/employee-change/${ec.id}`, { status: 'PENDING' });
  await api(adminTok, 'PATCH', `/nx07/employee-change/${ec.id}`, { status: 'APPROVED' });

  const { PrismaClient } = await import('db-core');
  const pg = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const u = await prisma.nx01User.findUnique({ where: { id: fixture.resignUserId }, select: { isActive: true } });
    if (u?.isActive !== false) throw new Error('RESIGN APPROVED should set nx01_user.is_active = false');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  console.log('\nAll NX07 fetch checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
