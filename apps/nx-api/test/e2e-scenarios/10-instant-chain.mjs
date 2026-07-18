// apps/nx-api/test/e2e-scenarios/10-instant-chain.mjs
// 即時工作檯全鏈路：站2 即時報價 → 站3 調貨詢價 → 站4 即時銷貨，驗資料拋接與價格記憶閉環。
// 拋接①報價紀錄→帶價 ②詢價紀錄+調貨報價(isTransfer) ③銷貨→ST/回寫報價紀錄→下次帶價(含成交價)。
// 只能對本機開發 DB 跑；自清。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('即時工作檯全鏈路');
const created = { sos: [], sts: [] };
const recIds = []; // quote_record
const inqIds = []; // inquiry_record
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const A = await ctx.actors();
  const customer = A.customer;
  const peer = A.peer; // 同行 O

  // 演員料：P1/P2 = A倉有貨；P3 = A倉無貨他倉有貨（銷貨時走等調撥）
  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w
     WHERE w.tenant_id=$1 AND w.is_active AND EXISTS
       (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>20)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  const [P1, P2] = await many(
    `SELECT b.part_id AS id, p.code FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>20
     ORDER BY b.available_qty DESC LIMIT 2`, [T, whA.id]);
  const P3 = await one(
    `SELECT b.part_id AS id, p.code, w.code AS src_wh FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     JOIN nx01_warehouse w ON w.id=b.warehouse_id
     WHERE b.tenant_id=$1 AND b.available_qty>10 AND b.warehouse_id<>$2
       AND NOT EXISTS (SELECT 1 FROM nx03_stock_balance b2
                       WHERE b2.tenant_id=$1 AND b2.part_id=b.part_id AND b2.warehouse_id=$2 AND b2.available_qty>0)
     ORDER BY w.sort_no LIMIT 1`, [T, whA.id]);
  // 前置：三顆料在本客戶不得已有近一月報價紀錄（否則帶價驗證失真）
  for (const p of [P1, P2, P3]) {
    const n = await one(
      `SELECT count(*)::int AS n FROM nx04_quote_record
       WHERE tenant_id=$1 AND customer_id=$2 AND part_id=$3 AND record_date >= CURRENT_DATE - 31`,
      [T, customer.id, p.id]);
    if (n.n > 0) throw new Error(`前置不符：${p.code} 已有近一月報價紀錄、換靶料再跑`);
  }
  console.log(`客戶 ${customer.code}／同行 ${peer?.code ?? '無'}／A倉 ${whA.code}`);
  console.log(`P1=${P1.code}(有貨) P2=${P2.code}(有貨) P3=${P3.code}(A倉無貨、${P3.src_wh}有)`);

  const intel = async (partId) => {
    const r = await ctx.call('GET', `/nx04/quote/price-intel?customerId=${customer.id}&partId=${partId}`);
    return r.data;
  };

  // ══ 站2 即時報價：P1 報 123 ══
  console.log('\n══ 站2 即時報價（P1 報 123） ══');
  const q1 = await ctx.call('POST', '/nx04/quote-record', {
    customerId: customer.id, partId: P1.id, qty: 2, unitPrice: 123, warehouseId: whA.id, source: 'INSTANT',
  });
  ctx.check('站2 報價紀錄建立', q1.status === 201, JSON.stringify(q1.data));
  if (q1.data?.id) recIds.push(q1.data.id);
  const i1 = await intel(P1.id);
  ctx.check('拋接① 帶價：P1 近一月報價=123', Number(i1?.sameCustomerQuote?.amount) === 123,
    JSON.stringify(i1?.sameCustomerQuote));

  // ══ 站3 調貨詢價：問同行 P2 成本 80 → 報客戶 150（調貨旗標） ══
  console.log('\n══ 站3 調貨詢價（P2 問同行 80 → 報 150、isTransfer） ══');
  if (peer) {
    const inq = await ctx.call('POST', '/nx04/inquiry-record', {
      sourcePartnerId: peer.id, partId: P2.id, qty: 5, unitPrice: 80, remark: '全鏈路測試',
    });
    ctx.check('站3 詢價紀錄建立', inq.status === 201, JSON.stringify(inq.data));
    if (inq.data?.id) inqIds.push(inq.data.id);
    const inqRow = await one(
      `SELECT source_partner_id, unit_price FROM nx04_inquiry_record WHERE id=$1`, [inq.data?.id]);
    ctx.check('站3 詢價入庫（同行+價80）', inqRow?.source_partner_id === peer.id && Number(inqRow?.unit_price) === 80,
      JSON.stringify(inqRow));
  } else console.log('（租戶無同行 O、詢價段跳過）');
  const q2 = await ctx.call('POST', '/nx04/quote-record', {
    customerId: customer.id, partId: P2.id, qty: 5, unitPrice: 150, warehouseId: whA.id,
    source: 'INSTANT', isTransfer: true,
  });
  ctx.check('站3 調貨報價紀錄建立', q2.status === 201, JSON.stringify(q2.data));
  if (q2.data?.id) recIds.push(q2.data.id);
  const q2row = await one(`SELECT is_transfer FROM nx04_quote_record WHERE id=$1`, [q2.data?.id]);
  ctx.check('拋接② 調貨旗標入庫 is_transfer=true', q2row?.is_transfer === true, JSON.stringify(q2row));
  const i2 = await intel(P2.id);
  ctx.check('拋接② 帶價：P2 近一月報價=150', Number(i2?.sameCustomerQuote?.amount) === 150,
    JSON.stringify(i2?.sameCustomerQuote));

  // ══ 站4 即時銷貨：P1@123(帶價) + P2@150(帶價) + P3@60(手填、等調撥) ══
  console.log('\n══ 站4 即時銷貨（三行、P3 等調撥、模擬前端 buildOrder） ══');
  // 模擬前端帶價/旗標判定
  const had1 = !!i1?.sameCustomerQuote; // true
  const had3 = !!(await intel(P3.id))?.sameCustomerQuote; // false
  ctx.check('站4 帶價旗標：P1 有紀錄／P3 無紀錄', had1 === true && had3 === false, `P1=${had1} P3=${had3}`);
  const soRes = await ctx.call('POST', '/nx04/so', {
    customerId: customer.id, warehouseId: whA.id, soDate: ctx.today,
    deliveryType: 'D', deliveryAddress: '送林口B店　王先生收',
    taxRate: 5, invoiceCopies: 3, paymentTerm: 'NET30', salesMethod: '即時銷售',
    // belowMinReason：測試價可能低於該料成本、模擬「前端加入時守門已要求填原因」的送出
    //（守門防線本身 09-T8 專測：無原因 400、有原因放行）
    items: [
      { partId: P1.id, warehouseId: whA.id, qty: 2, unitPriceSnapshot: 123, transferSourceType: 'S', belowMinReason: '全鏈路測試' },
      { partId: P2.id, warehouseId: whA.id, qty: 5, unitPriceSnapshot: 150, transferSourceType: 'S', belowMinReason: '同行調貨價' },
      { partId: P3.id, warehouseId: whA.id, qty: 3, unitPriceSnapshot: 60, transferSourceType: 'T', belowMinReason: '全鏈路測試' },
    ],
  });
  ctx.check('站4 建單成功', soRes.status === 201, JSON.stringify(soRes.data));
  const so = soRes.data;
  if (so?.id) created.sos.push(so.id);
  const conf = await ctx.call('PATCH', `/nx04/so/${so.id}`, { status: 'CONFIRMED' });
  ctx.check('站4 確認成功', conf.status === 200, JSON.stringify(conf.data));
  // 模擬前端「確認成功後補報價紀錄」（只補 P3）
  const q3 = await ctx.call('POST', '/nx04/quote-record', {
    customerId: customer.id, partId: P3.id, qty: 3, unitPrice: 60, warehouseId: whA.id,
    source: 'INSTANT', sourceDocId: so.id,
  });
  if (q3.data?.id) recIds.push(q3.data.id);

  // 驗證：行價格、ST、紀錄數、回鏈
  const soItems = await many(
    `SELECT part_id, unit_price, transfer_source_type, transfer_status, st_id
     FROM nx04_so_item WHERE so_id=$1 ORDER BY line_no`, [so.id]);
  const p1L = soItems.find((r) => r.part_id === P1.id);
  const p2L = soItems.find((r) => r.part_id === P2.id);
  const p3L = soItems.find((r) => r.part_id === P3.id);
  ctx.check('站4 行價格＝帶價（123/150/60）',
    Number(p1L?.unit_price) === 123 && Number(p2L?.unit_price) === 150 && Number(p3L?.unit_price) === 60,
    soItems.map((r) => r.unit_price).join('/'));
  ctx.check('站4 P3 等調撥→補貨中I+綁ST', p3L?.transfer_source_type === 'T' && p3L?.transfer_status === 'I' && !!p3L?.st_id,
    JSON.stringify(p3L));
  const st = await one(
    `SELECT st.id, fw.code AS f, tw.code AS t, i.qty FROM nx03_st st
     JOIN nx01_warehouse fw ON fw.id=st.from_warehouse_id JOIN nx01_warehouse tw ON tw.id=st.to_warehouse_id
     JOIN nx03_st_item i ON i.st_id=st.id WHERE st.ref_so_id=$1`, [so.id]);
  if (st) created.sts.push(st.id);
  ctx.check('站4 ST 自動開（來源倉=P3有貨倉、qty=3）', !!st && st.f === P3.src_wh && st.t === whA.code && Number(st.qty) === 3,
    st ? `${st.f}→${st.t} x${st.qty}` : '無');
  const counts = await many(
    `SELECT part_id, count(*)::int AS n, max(source_doc_id) AS sdoc FROM nx04_quote_record
     WHERE tenant_id=$1 AND customer_id=$2 AND part_id = ANY($3) GROUP BY part_id`,
    [T, customer.id, [P1.id, P2.id, P3.id]]);
  const cnt = (pid) => counts.find((c) => c.part_id === pid);
  ctx.check('拋接③ 紀錄不重複：P1×1、P2×1（有紀錄不再生成）', cnt(P1.id)?.n === 1 && cnt(P2.id)?.n === 1,
    JSON.stringify(counts.map((c) => c.n)));
  ctx.check('拋接③ P3 補紀錄×1 且回鏈 SO', cnt(P3.id)?.n === 1 && cnt(P3.id)?.sdoc === so.id,
    JSON.stringify(cnt(P3.id)));

  // ══ 閉環：下次報價帶價 ══
  console.log('\n══ 閉環驗證（下次報價的帶價來源） ══');
  const i3b = await intel(P3.id);
  ctx.check('閉環 P3 下次帶價=60（本次銷貨補的紀錄）', Number(i3b?.sameCustomerQuote?.amount) === 60,
    JSON.stringify(i3b?.sameCustomerQuote));
  const i1b = await intel(P1.id);
  ctx.check('閉環 P1 成交價回饋=123（sameCustomerSale 撿到本張 SO）',
    Number(i1b?.sameCustomerSale?.amount) === 123, JSON.stringify(i1b?.sameCustomerSale));
} finally {
  await ctx.wipeDocs(created);
  if (recIds.length) await ctx.db.query(`DELETE FROM nx04_quote_record WHERE tenant_id=$1 AND id = ANY($2)`, [ctx.tenant, recIds]);
  if (inqIds.length) await ctx.db.query(`DELETE FROM nx04_inquiry_record WHERE tenant_id=$1 AND id = ANY($2)`, [ctx.tenant, inqIds]);
  console.log(`\n【自清】SO×${created.sos.length}、ST×${created.sts.length}、報價紀錄×${recIds.length}、詢價紀錄×${inqIds.length}`);
  ctx.summary();
  await ctx.db.end();
}
