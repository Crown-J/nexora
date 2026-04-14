/**
 * Phase 5 NX01：以 fetch 模擬 curl，逐資源驗證 CRUD（需已啟動 nx-api 且 DATABASE_URL 可用）。
 * 用法：node scripts/nx01-crud-fetch-test.mjs
 * 預設 http://localhost:3011、種子 admin / Nexoragrid2026 / HENGYIN
 */
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
  const preview = typeof j === 'object' ? JSON.stringify(j).slice(0, 160) : String(j).slice(0, 160);
  console.log(`${ok ? 'OK' : 'FAIL'} ${method} ${path} -> ${r.status} ${preview}`);
  if (!ok) throw new Error(`${method} ${path} ${r.status} ${text}`);
  return j;
}

function rnd(prefix, maxLen) {
  const n = String(Date.now()).slice(-6);
  const s = `${prefix}${n}`;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

async function crudResource(name, paths, token, createBody, patchBody) {
  console.log(`\n--- ${name} ---`);
  await api(token, 'GET', paths.list, null);
  const created = await api(token, 'POST', paths.list, createBody);
  const id = created.id;
  await api(token, 'GET', `${paths.list}/${id}`, null);
  await api(token, 'PATCH', `${paths.list}/${id}`, patchBody);
  await api(token, 'DELETE', `${paths.list}/${id}`, null);
  await api(token, 'PATCH', `${paths.list}/${id}`, { isActive: true });
}

async function main() {
  const token = await login();
  console.log('logged in\n');

  await crudResource(
    'currencies',
    { list: '/nx01/currencies' },
    token,
    { code: rnd('X', 3), name: 'NX01 test currency', decimalPlaces: 2, sortNo: 99 },
    { name: 'NX01 test currency (patched)' },
  );

  await crudResource(
    'warehouses',
    { list: '/nx01/warehouses' },
    token,
    { code: rnd('WHP5', 10), name: 'NX01 test WH', sortNo: 99 },
    { name: 'NX01 test WH patched' },
  );

  await crudResource(
    'part-brands',
    { list: '/nx01/part-brands' },
    token,
    { code: rnd('P', 3), name: 'NX01 PB', sortNo: 99 },
    { name: 'NX01 PB patched' },
  );

  const brands = await api(token, 'GET', '/nx01/part-brands?pageSize=1', null);
  const brandId = brands.rows[0]?.id;
  if (!brandId) throw new Error('no part brand for part test');

  await crudResource(
    'parts',
    { list: '/nx01/parts' },
    token,
    {
      partBrandId: brandId,
      code: `Z-${Date.now()}`.slice(0, 50),
      name: 'NX01 test part',
    },
    { name: 'NX01 test part patched' },
  );

  await crudResource(
    'partners',
    { list: '/nx01/partners' },
    token,
    { code: `P5V${Date.now()}`.slice(0, 30), name: 'NX01 vendor', partnerType: 'V' },
    { name: 'NX01 vendor patched' },
  );

  await api(token, 'GET', '/nx01/partners?partnerType=V&pageSize=5', null);

  await crudResource(
    'users',
    { list: '/nx01/users' },
    token,
    {
      userAccount: `p5u${Date.now()}`.slice(0, 50),
      password: 'TestPass123',
      userName: 'NX01 Test User',
    },
    { userName: 'NX01 Test User Patched' },
  );

  await crudResource(
    'roles',
    { list: '/nx01/roles' },
    token,
    { code: `P5RK${Date.now()}`.slice(0, 30), name: 'NX01 Role', sortNo: 99 },
    { name: 'NX01 Role Patched' },
  );

  await crudResource(
    'bulletins',
    { list: '/nx01/bulletins' },
    token,
    { title: `NX01 bulletin ${Date.now()}`, content: 'body', type: 'C' },
    { title: `NX01 bulletin patched ${Date.now()}` },
  );

  console.log('\nAll NX01 CRUD checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
