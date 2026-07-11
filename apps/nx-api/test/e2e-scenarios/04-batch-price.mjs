// apps/nx-api/test/e2e-scenarios/04-batch-price.mjs
// 批次調價（WEIMENG-P2 Step 3 回歸）：preview/apply 口徑一致、防手滑閘、負價保護、0 價不動
// 靶＝動態挑「同品牌 2~8 顆全有 A 價」的小品牌；價格測前備份測後還原
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('04-batch-price');
const { call, check, db } = ctx;
let priceBak = [];
try {
  const a = await ctx.actors();
  if (!a.brandId) throw new Error('找不到 2~8 顆全有價的小品牌靶、環境不符前置');
  const scope = { brandId: a.brandId };
  const n = a.brandParts.length;
  priceBak = (await db.query(
    `SELECT id, price_a, price_b, price_c, price_d, price_updated_at, price_updated_by, updated_at, updated_by
     FROM nx01_part WHERE tenant_id=$1 AND brand_id=$2`, [ctx.tenant, a.brandId])).rows;
  const exp = (v) => Math.max(0, Math.round(Number(v) * 1.1));
  const olds = Object.fromEntries(a.brandParts.map((p) => [p.id, p]));

  const pv = await call('POST', '/nx01/part-batch-price/preview', {
    filter: scope, adjust: { mode: 'PCT', value: 10, targets: ['A', 'B', 'C', 'D'], rounding: 'INT' },
  });
  const pvOk = pv.status === 201 && pv.data?.total === n &&
    pv.data.rows.every((r) =>
      r.new.A === exp(olds[r.partId].price_a) && r.new.B === exp(olds[r.partId].price_b) &&
      r.new.C === exp(olds[r.partId].price_c) && r.new.D === exp(olds[r.partId].price_d));
  check(`P1 preview 範圍=${n} 顆、+10% 取整逐欄正確`, pvOk, JSON.stringify(pv.data).slice(0, 200));

  const guard = await call('POST', '/nx01/part-batch-price/apply', {
    filter: {}, adjust: { mode: 'PCT', value: 10, targets: ['A'], rounding: 'INT' },
  });
  check('P2 無 filter 無 confirmAll → 400 防手滑', guard.status === 400 && String(guard.data?.message).includes('confirmAll'));
  const zero = await call('POST', '/nx01/part-batch-price/apply', {
    filter: scope, adjust: { mode: 'PCT', value: 0, targets: ['A'], rounding: 'INT' },
  });
  check('P3 調幅 0 → 400', zero.status === 400);

  const ap = await call('POST', '/nx01/part-batch-price/apply', {
    filter: scope, adjust: { mode: 'PCT', value: 10, targets: ['A', 'B', 'C', 'D'], rounding: 'INT' },
  });
  check(`P4 apply 影響 ${n} 顆`, ap.status === 201 && ap.data?.affected === n, JSON.stringify(ap.data));

  const after = (await db.query(
    `SELECT id, price_a FROM nx01_part WHERE tenant_id=$1 AND brand_id=$2`, [ctx.tenant, a.brandId])).rows;
  check('P5 apply 後 DB 現值＝preview 承諾值（JS/SQL 口徑一致）',
    after.every((r) => Number(r.price_a) === exp(olds[r.id].price_a)));
} finally {
  for (const r of priceBak) {
    await db.query(
      `UPDATE nx01_part SET price_a=$2, price_b=$3, price_c=$4, price_d=$5,
         price_updated_at=$6, price_updated_by=$7, updated_at=$8, updated_by=$9 WHERE id=$1`,
      [r.id, r.price_a, r.price_b, r.price_c, r.price_d, r.price_updated_at, r.price_updated_by, r.updated_at, r.updated_by]);
  }
  await db.query(
    `DELETE FROM nx01_audit_log WHERE tenant_id=$1 AND entity_code='BATCH-PRICE' AND occurred_at::date=CURRENT_DATE`, [ctx.tenant]);
  ctx.summary();
  await ctx.dispose();
}
process.exit(ctx.failCount ? 1 : 0);
