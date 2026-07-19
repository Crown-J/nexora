// apps/nx-api/test/e2e-scenarios/13-sales-return-chain.mjs
// S4 銷售退回全鏈（SR-CHAIN 2026-07-19）：SO 出貨 → 銷退三分支驗證
//   T1 直接銷退 R 退錢＋好品 G：庫存沖回(source R) + 銷貨折讓(Allowance S)
//   T2 壞品 B：不入庫 → 異常登記簿 IR(W5) → dispose W 一鍵開保固（S4-4 保固鏈）
//   T3 換新 X：skip ledger（換貨開新單拍板、庫存不動）
//   T4 超退擋單；T5 未檢查(無 dispositionFlag)不可過帳（W4-3 倉庫實收把關）
// 只能對本機開發 DB 跑；庫存快照還原、自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('S4銷退全鏈');
const created = { sos: [], srs: [], irs: [] };
const wcIds = [];
const alwIds = [];
let balBak = null;
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const customer = (await ctx.actors()).customer;

  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w
     WHERE w.tenant_id=$1 AND w.is_active AND EXISTS
       (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>20)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const P1 = await one(
    `SELECT b.part_id AS id, p.code FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>20
     ORDER BY b.available_qty DESC LIMIT 1`, [T, whA.id]);
  console.log(`客戶 ${customer.code}／A倉 ${whA.code}／料 ${P1.code}`);
  balBak = await ctx.backupBalances(P1.id);
  const balOf = async () =>
    Number((await one(
      `SELECT on_hand_qty FROM nx03_stock_balance WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3`,
      [T, P1.id, whA.id]))?.on_hand_qty ?? 0);

  // ── 前置：SO 出貨（賣 6 顆、扣庫存、成為可退單） ──
  console.log('\n── 前置：SO 出貨 6 顆 ──');
  const soRes = await ctx.call('POST', '/nx04/so', {
    customerId: customer.id, warehouseId: whA.id, soDate: ctx.today,
    deliveryType: 'P', deliveryAddress: '客戶自取（銷退測試）', taxRate: 5, invoiceCopies: 3,
    items: [{ partId: P1.id, warehouseId: whA.id, qty: 6, unitPriceSnapshot: 100, transferSourceType: 'S', belowMinReason: '測試' }],
  });
  const so = soRes.data;
  created.sos.push(so.id);
  await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'PICKING' });
  const ship = await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'SHIPPED' });
  ctx.check('前置 SO 出貨', ship.status === 200, JSON.stringify(ship.data));
  const soItem = await one(`SELECT id FROM nx04_so_item WHERE so_id=$1`, [so.id]);
  const balAfterShip = await balOf();

  // 建 SR helper（DRAFT → INSPECTING）
  const mkSr = async (qty, reason) => {
    const r = await ctx.call('POST', '/nx04/sales-return', {
      soId: so.id, srDate: ctx.today, taxRate: 5,
      returnMethod: 'S', // S=客戶自行送回
      initiationType: 'A', // A=業務發起（S4-1 業務受理）
      items: [{ soItemId: soItem.id, qty, returnReason: reason }],
    });
    if (r.status !== 201) return { sr: null, err: r };
    created.srs.push(r.data.id);
    const insp = await ctx.call('PATCH', `/nx04/sales-return/${r.data.id}`, { status: 'INSPECTING' });
    return { sr: r.data, err: insp.status === 200 ? null : insp };
  };
  const setFlag = async (srId, flag) => {
    const it = await one(`SELECT id FROM nx04_sr_item WHERE sr_id=$1`, [srId]);
    return ctx.call('PATCH', `/nx04/sales-return/${srId}/items/${it.id}`, { dispositionFlag: flag });
  };

  // ══ T1 直接銷退 R 退錢＋好品 G ══
  console.log('\n══ T1 直接銷退（R 退錢、好品 G 入庫、折讓） ══');
  const t1 = await mkSr(2, 'C');
  ctx.check('T1a SR 建立+收貨檢查中', !!t1.sr && !t1.err, JSON.stringify(t1.err?.data ?? {}));
  const f1 = await setFlag(t1.sr.id, 'G');
  ctx.check('T1b 倉管檢查標好品 G', f1.status === 200, JSON.stringify(f1.data));
  const p1 = await ctx.call('PATCH', `/nx04/sales-return/${t1.sr.id}`, { status: 'POSTED', returnAction: 'R' });
  ctx.check('T1c 過帳成功', p1.status === 200, JSON.stringify(p1.data));
  const balAfterT1 = await balOf();
  ctx.check('T1d 好品入庫 +2', balAfterT1 - balAfterShip === 2, `${balAfterShip}→${balAfterT1}`);
  const led1 = await one(
    `SELECT count(*)::int AS n FROM nx03_stock_ledger WHERE tenant_id=$1 AND source_doc_id=$2 AND source_doc_type='R'`,
    [T, t1.sr.id]);
  ctx.check('T1e 沖回流水 source=R', led1.n === 1, `n=${led1.n}`);
  const alw = await one(
    `SELECT id, allowance_type, total_amount FROM nx05_allowance
     WHERE tenant_id=$1 AND allowance_type='S' ORDER BY created_at DESC LIMIT 1`, [T]);
  if (alw?.id) alwIds.push(alw.id);
  // ⚠ 現行設計：折讓金額=未稅 lineAmount 加總（200）、無稅額欄——含稅與否列拍板項回報執行長
  ctx.check('T1f 銷貨折讓建立（Allowance S、金額 200 未稅=現行設計）',
    !!alw && Number(alw.total_amount) === 200, JSON.stringify(alw));

  // ══ T2 壞品 B → IR → 一鍵開保固（S4-4） ══
  console.log('\n══ T2 壞品 B → 異常登記簿 → dispose W 保固 ══');
  const t2 = await mkSr(1, 'D');
  const f2 = await setFlag(t2.sr.id, 'B');
  ctx.check('T2a 倉管標壞品 B', f2.status === 200, JSON.stringify(f2.data));
  const p2 = await ctx.call('PATCH', `/nx04/sales-return/${t2.sr.id}`, { status: 'POSTED', returnAction: 'R' });
  ctx.check('T2b 過帳成功', p2.status === 200, JSON.stringify(p2.data));
  const balAfterT2 = await balOf();
  ctx.check('T2c 壞品不入庫（庫存不動）', balAfterT2 === balAfterT1, `${balAfterT1}→${balAfterT2}`);
  const ir = await one(
    `SELECT id, doc_no, issue_type, status FROM nx03_issue_report
     WHERE tenant_id=$1 AND source_doc_type='SR' AND source_doc_id=$2`, [T, t2.sr.id]);
  if (ir?.id) created.irs.push(ir.id);
  ctx.check('T2d 異常登記簿一筆（issueType=D 損毀）', !!ir && ir.issue_type === 'D', JSON.stringify(ir));
  // ⚠ 現況揭露（拍板項）：一鍵開保固僅支援「進貨驗收來源」IR（需原進貨明細反查供應商）；
  //   銷退來源（S4-4 客戶保固）只能手動建保固單再以 relatedDocId 連結——自動反查最近進貨的補做候選
  const disp = await ctx.call('POST', `/nx03/issue-report/${ir.id}/dispose`, { dispositionType: 'W', autoCreate: true });
  ctx.check('T2e 銷退來源一鍵開保固 → 400 明確擋（現行設計、手動建單路徑仍通）',
    disp.status === 400 && /進貨驗收來源/.test(disp.data?.message ?? ''), JSON.stringify(disp.data));
  // 不帶 autoCreate、純標處置 W（手動路徑第一步）→ IR 進 PROCESSING
  const disp2 = await ctx.call('POST', `/nx03/issue-report/${ir.id}/dispose`, { dispositionType: 'W' });
  const irAfter = await one(
    `SELECT disposition_type, status FROM nx03_issue_report WHERE id=$1`, [ir.id]);
  ctx.check('T2f 手動路徑：標處置 W → IR 進 PROCESSING（保固單後補連結）',
    disp2.status === 201 || disp2.status === 200
      ? irAfter?.disposition_type === 'W' && irAfter?.status === 'PROCESSING'
      : false,
    JSON.stringify({ http: disp2.status, ir: irAfter }));

  // ══ T3 換新 X：skip ledger ══
  console.log('\n══ T3 換新 X（不沖庫存、換貨開新單拍板） ══');
  const t3 = await mkSr(1, 'W');
  const p3 = await ctx.call('PATCH', `/nx04/sales-return/${t3.sr.id}`, { status: 'POSTED', returnAction: 'X' });
  ctx.check('T3a 換新過帳（免倉管檢查、skip ledger）', p3.status === 200, JSON.stringify(p3.data));
  const balAfterT3 = await balOf();
  ctx.check('T3b 庫存不動', balAfterT3 === balAfterT2, `${balAfterT2}→${balAfterT3}`);
  const led3 = await one(
    `SELECT count(*)::int AS n FROM nx03_stock_ledger WHERE tenant_id=$1 AND source_doc_id=$2`, [T, t3.sr.id]);
  ctx.check('T3c 無沖回流水', led3.n === 0, `n=${led3.n}`);

  // ══ T4 超退擋單（已退 2+1+1=4、原 6、再退 3 應擋） ══
  console.log('\n══ T4 超退擋單 ══');
  const t4 = await ctx.call('POST', '/nx04/sales-return', {
    soId: so.id, srDate: ctx.today, taxRate: 5, returnMethod: 'S', initiationType: 'A',
    items: [{ soItemId: soItem.id, qty: 3, returnReason: 'O' }],
  });
  if (t4.status === 201) created.srs.push(t4.data.id);
  ctx.check('T4 累計超退 → 400 擋', t4.status === 400, `HTTP ${t4.status}`);

  // ══ T5 未檢查不可過帳（W4-3 倉庫實收把關） ══
  console.log('\n══ T5 無 dispositionFlag 不可過帳 ══');
  const t5 = await mkSr(1, 'O');
  const p5 = await ctx.call('PATCH', `/nx04/sales-return/${t5.sr.id}`, { status: 'POSTED', returnAction: 'R' });
  ctx.check('T5 未標好壞品 → 400 擋（倉庫實收確認才算）', p5.status === 400, `HTTP ${p5.status}`);
} finally {
  if (wcIds.length) await ctx.db.query(`DELETE FROM nx02_warranty_claim WHERE tenant_id=$1 AND id = ANY($2)`, [ctx.tenant, wcIds]);
  if (alwIds.length) {
    await ctx.db.query(`DELETE FROM nx05_allowance_item WHERE allowance_id = ANY($1)`, [alwIds]);
    await ctx.db.query(`DELETE FROM nx05_allowance WHERE tenant_id=$1 AND id = ANY($2)`, [ctx.tenant, alwIds]);
  }
  await ctx.wipeDocs(created);
  if (balBak) await ctx.restoreBalances(balBak);
  console.log(`\n【自清】SO×${created.sos.length}、SR×${created.srs.length}、IR×${created.irs.length}、保固×${wcIds.length}、折讓×${alwIds.length}`);
  ctx.summary();
  await ctx.db.end();
}
