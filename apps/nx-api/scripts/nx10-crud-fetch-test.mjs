/**
 * Phase 5 NX10：遊戲化 API fetch 驗證（PRO）。
 * 用法：repo 根目錄 `node apps/nx-api/scripts/nx10-crud-fetch-test.mjs`
 * 環境：`NX_API_BASE` 須與執行中的 nx-api 一致（例：`http://localhost:3001` 或 `.env` 的 `PORT`）。
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

const base = process.env.NX_API_BASE || 'http://localhost:3001';

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
      'User-Agent': 'nx10-crud-fetch-test/1.0',
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
  const preview = typeof j === 'object' ? JSON.stringify(j).slice(0, 240) : String(j).slice(0, 240);
  console.log(`${ok ? 'OK' : 'FAIL'} ${method} ${path} -> ${r.status} ${preview}`);
  if (!ok) throw new Error(`${method} ${path} ${r.status} ${text}`);
  return j;
}

async function apiExpectStatus(token, method, path, body, expectedStatus) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'nx10-crud-fetch-test/1.0',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  console.log(`EXPECT ${expectedStatus} ${method} ${path} -> ${r.status} ${text.slice(0, 120)}`);
  if (r.status !== expectedStatus) throw new Error(`Expected ${expectedStatus}, got ${r.status}`);
}

async function fixture() {
  const { PrismaClient } = await import('db-core');
  const pg = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL missing');
  const pool = new pg.default.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const tenant = await prisma.nx99Tenant.findFirst({ where: { code: 'HENGYIN' }, select: { id: true } });
    if (!tenant) throw new Error('HENGYIN tenant missing');
    const admin = await prisma.nx01User.findFirst({
      where: { tenantId: tenant.id, userAccount: 'admin' },
      select: { id: true },
    });
    if (!admin) throw new Error('admin missing');

    let tpl = await prisma.nx10TaskTemplate.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
        code: { not: { startsWith: 'STREAK_' } },
      },
    });
    if (!tpl) {
      tpl = await prisma.nx10TaskTemplate.upsert({
        where: { code: 'NX10_FETCH_TEST' },
        create: {
          tenantId: tenant.id,
          code: 'NX10_FETCH_TEST',
          name: 'NX10 fetch test task',
          taskCycle: 'D',
          expBase: 10,
          isSystem: false,
          isActive: true,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        update: {
          expBase: 10,
          isActive: true,
          updatedBy: admin.id,
        },
      });
    }
    if (tpl) {
      const pv = new Date().toISOString().slice(0, 10);
      const existing = await prisma.nx10EmpTaskLog.findFirst({
        where: {
          tenantId: tenant.id,
          userId: admin.id,
          taskTemplateId: tpl.id,
          periodValue: pv,
        },
      });
      if (!existing) {
        await prisma.nx10EmpTaskLog.create({
          data: {
            tenantId: tenant.id,
            userId: admin.id,
            taskTemplateId: tpl.id,
            periodValue: pv,
            isCompleted: false,
            expEarned: 0,
          },
        });
        console.log(`Fixture: nx10_emp_task_log for template ${tpl.code}`);
      }
    }

    const tzRow = await prisma.nx99Tenant.findFirst({
      where: { id: tenant.id },
      select: { timezone: true },
    });
    const tz = (tzRow?.timezone || 'Asia/Taipei').trim() || 'Asia/Taipei';
    const todayYmd = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const checkinDate = new Date(`${todayYmd}T12:00:00.000Z`);

    await prisma.nx10CheckinLog.deleteMany({
      where: { tenantId: tenant.id, userId: admin.id, checkinDate },
    });
    const medal = await prisma.nx10EmpMedal.findUnique({ where: { userId: admin.id } });
    if (medal) {
      await prisma.nx10EmpMedal.update({
        where: { userId: admin.id },
        data: {
          lastCheckinDate: null,
          consecutiveCheckin: 0,
        },
      });
    }
    console.log('Fixture: cleared today check-in for repeatable STREAK_D1 test');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  await fixture();
  const token = await login();

  await api(token, 'GET', '/nx10/tasks/today', undefined);
  const expBefore = await api(token, 'GET', '/nx10/exp/me', undefined);
  const totalBefore = expBefore.totalExp;

  await api(token, 'GET', '/nx10/checkin/today', undefined);
  const chk = await api(token, 'POST', '/nx10/checkin', undefined);
  if (!chk.expEarned || chk.expEarned < 1) throw new Error('checkin should grant exp');
  if ((chk.consecutiveCheckin ?? 0) < 1) throw new Error('expected streak >= 1');

  const expAfter = await api(token, 'GET', '/nx10/exp/me', undefined);
  if (expAfter.totalExp < totalBefore + chk.expEarned) {
    throw new Error(`EXP not increased: before ${totalBefore} after ${expAfter.totalExp} earned ${chk.expEarned}`);
  }

  await apiExpectStatus(token, 'POST', '/nx10/checkin', undefined, 409);

  await api(token, 'GET', '/nx10/medals', undefined);
  await api(token, 'GET', '/nx10/medals/me', undefined);
  await api(token, 'GET', '/nx10/leaderboard?period=week', undefined);
  await api(token, 'GET', '/nx10/leaderboard?period=month', undefined);
  await api(token, 'GET', '/nx10/leaderboard?period=all', undefined);
  await api(token, 'GET', '/nx10/tasks?isCompleted=false', undefined);

  const { PrismaClient } = await import('db-core');
  const pg = await import('pg');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL?.trim() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  let taskLogId;
  try {
    const admin = await prisma.nx01User.findFirst({
      where: { userAccount: 'admin' },
      select: { id: true, tenantId: true },
    });
    const open = await prisma.nx10EmpTaskLog.findFirst({
      where: { userId: admin.id, tenantId: admin.tenantId, isCompleted: false },
      include: { taskTemplate: true },
    });
    if (open && open.taskTemplate.expBase > 0) {
      taskLogId = open.id;
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
  if (taskLogId) {
    await api(token, 'PATCH', `/nx10/tasks/${taskLogId}/done`, undefined);
  }

  console.log('nx10-crud-fetch-test: all OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
