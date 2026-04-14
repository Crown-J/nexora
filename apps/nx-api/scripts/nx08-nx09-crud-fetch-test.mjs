/**
 * Phase 5 NX08 / NX09：經營分析 + 知識管理 fetch 驗證（PRO）。
 * 用法：repo 根目錄 `node apps/nx-api/scripts/nx08-nx09-crud-fetch-test.mjs`
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
      'User-Agent': 'nx08-nx09-crud-fetch-test/1.0',
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
    let tpl = await prisma.nx01KpiTemplate.findFirst({
      where: { tenantId: tenant.id, code: 'NX08_FETCH_TEST' },
    });
    if (!tpl) {
      tpl = await prisma.nx01KpiTemplate.create({
        data: {
          tenantId: tenant.id,
          code: 'NX08_FETCH_TEST',
          name: 'NX08 fetch KPI',
          applicableRoleCode: 'ADMIN',
          sourceModule: 'NX08',
          sourceTable: 'nx08_daily_report',
          sourceField: 'id',
          calcMethod: 'COUNT',
          periodType: 'M',
          targetDirection: 'GTE',
          unit: '筆',
          isSystem: false,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });
    }
    let tag = await prisma.nx09KmTag.findFirst({
      where: { tenantId: tenant.id, name: 'nx08-nx09-fetch' },
    });
    if (!tag) {
      tag = await prisma.nx09KmTag.create({
        data: {
          tenantId: tenant.id,
          name: 'nx08-nx09-fetch',
          isSystem: false,
          sortNo: 999,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });
    }
    return { tenantId: tenant.id, adminId: admin.id, kpiTemplateId: tpl.id, tagId: tag.id };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const { adminId, kpiTemplateId, tagId } = await fixture();
  const token = await login();
  const day = `2099-12-${String((Date.now() % 28) + 1).padStart(2, '0')}`;
  const ym = day.slice(0, 7);
  const periodMonth = Number(day.slice(8, 10));

  console.log('\n--- NX08 daily-report + complete / attendance ---');
  await api(token, 'GET', '/nx08/daily-report', null);
  const dr = await api(token, 'POST', '/nx08/daily-report', {
    userId: adminId,
    reportDate: day,
    doneItems: 'NX08 test',
  });
  await api(token, 'POST', '/nx07/attendance/checkin', { workDate: day });
  const before = await (async () => {
    const { PrismaClient } = await import('db-core');
    const pg = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    try {
      const row = await prisma.nx07Attendance.findFirst({
        where: { userId: adminId, workDate: new Date(`${day}T00:00:00.000Z`) },
        select: { clockOutAt: true },
      });
      return row?.clockOutAt;
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  })();
  if (before) throw new Error('Expected no checkout before daily-report complete');
  await api(token, 'PATCH', `/nx08/daily-report/${dr.id}/complete`, {});
  const after = await (async () => {
    const { PrismaClient } = await import('db-core');
    const pg = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    try {
      const row = await prisma.nx07Attendance.findFirst({
        where: { userId: adminId, workDate: new Date(`${day}T00:00:00.000Z`) },
        select: { clockOutAt: true },
      });
      return row?.clockOutAt;
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  })();
  if (!after) throw new Error('Expected clockOutAt after daily-report complete');
  console.log(`(nx08) checkout synced: clockOutAt set`);

  console.log('\n--- NX08 monthly-report (kpi_record) ---');
  await api(token, 'GET', `/nx08/monthly-report/summary?yearMonth=${encodeURIComponent(ym)}`, null);
  await api(token, 'GET', `/nx08/monthly-report?yearMonth=${encodeURIComponent(ym)}`, null);

  console.log('\n--- NX08 kpi-target / kpi-record ---');
  await api(token, 'GET', '/nx08/kpi-target', null);
  const tgt = await api(token, 'POST', '/nx08/kpi-target', {
    kpiTemplateId,
    targetType: 'U',
    userId: adminId,
    periodYear: 2099,
    periodValue: periodMonth,
    targetValue: 100,
  });
  await api(token, 'PATCH', `/nx08/kpi-target/${tgt.id}`, { targetValue: 120 });
  await api(token, 'POST', '/nx08/kpi-record', {
    kpiTemplateId,
    userId: adminId,
    periodYear: 2099,
    periodValue: periodMonth,
    actualValue: 50,
    kpiTargetId: tgt.id,
  });
  await api(token, 'GET', '/nx08/kpi-record?periodYear=2099', null);

  console.log('\n--- NX09 articles / documents / meetings ---');
  const art = await api(token, 'POST', '/nx09/articles', {
    question: 'Q?',
    answer: 'A.',
    tagIds: [tagId],
  });
  await api(token, 'GET', `/nx09/articles?tagId=${encodeURIComponent(tagId)}`, null);
  await api(token, 'PATCH', `/nx09/articles/${art.id}`, { question: 'Q2?' });
  const doc = await api(token, 'POST', '/nx09/documents', {
    title: 'NX09 doc',
    docCategory: 'OT',
    effectiveDate: day,
    fileUrl: 'https://example.com/v1.pdf',
  });
  await api(token, 'GET', `/nx09/documents/${doc.id}`, null);
  await api(token, 'PATCH', `/nx09/documents/${doc.id}`, { fileUrl: 'https://example.com/v2.pdf' });
  const d2 = await api(token, 'GET', `/nx09/documents/${doc.id}`, null);
  const verCount = d2.rev_Nx09DocumentVersion_documentId?.length ?? 0;
  if (verCount < 2) throw new Error('Expected at least 2 document versions after PATCH');
  const start = `${day}T10:00:00.000Z`;
  const end = `${day}T11:00:00.000Z`;
  const mt = await api(token, 'POST', '/nx09/meetings', {
    title: 'NX09 meeting',
    meetingType: 'AD',
    startAt: start,
    endAt: end,
    organizerId: adminId,
    minutes: { content: '討論', decisions: '通過 A 案' },
    attendees: [{ userId: adminId, confirmStatus: 'Y' }],
    actions: [{ title: 'Follow up', assigneeId: adminId, dueDate: day }],
  });
  await api(token, 'GET', `/nx09/meetings/${mt.id}`, null);
  await api(token, 'PATCH', `/nx09/meetings/${mt.id}`, {
    minutes: { decisions: '通過 A 案（修訂）' },
  });
  await api(token, 'DELETE', `/nx09/meetings/${mt.id}`, null);
  await api(token, 'DELETE', `/nx09/documents/${doc.id}`, null);
  await api(token, 'DELETE', `/nx09/articles/${art.id}`, null);

  console.log('\nAll NX08/NX09 fetch checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
