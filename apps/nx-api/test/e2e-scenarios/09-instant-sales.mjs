// apps/nx-api/test/e2e-scenarios/09-instant-sales.mjs
// 即時銷售站全面驗證：模擬前端 buildOrder 真實 payload、7 情境、DB 驗真相、自清。
// 只能對本機開發 DB 跑。
import { makeCtx } from './lib.mjs';

const ctx = await makeCtx('即時銷售全面測試');
const created = { sos: [], sts: [] };
const quoteRecIds = [];
try {
  const T = ctx.tenant;
  const one = async (sql, p) => (await ctx.db.query(sql, p)).rows[0] ?? null;
  const many = async (sql, p) => (await ctx.db.query(sql, p)).rows;
  const today = ctx.today;

  // ── 演員 ──────────────────────────────────────────────
  const customer = (await ctx.actors()).customer; // 信用乾淨、無預設倉
  const custRow = await one(
    `SELECT payment_term_domestic, default_invoice_copies FROM nx01_partner WHERE id=$1`, [customer.id]);

  // 倉1（拿有貨料）
  const whA = await one(
    `SELECT w.id, w.code FROM nx01_warehouse w
     WHERE w.tenant_id=$1 AND w.is_active AND EXISTS
       (SELECT 1 FROM nx03_stock_balance b WHERE b.warehouse_id=w.id AND b.available_qty>20)
     ORDER BY w.sort_no LIMIT 1`, [T]);
  // 有貨料 ×2（A 倉 available > 20）
  const stockParts = await many(
    `SELECT b.part_id, p.code, b.available_qty FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     WHERE b.tenant_id=$1 AND b.warehouse_id=$2 AND b.available_qty>20
     ORDER BY b.available_qty DESC LIMIT 2`, [T, whA.id]);
  // 全倉皆無庫存的料（T4 用）
  const deadPart = await one(
    `SELECT p.id, p.code FROM nx01_part p
     WHERE p.tenant_id=$1 AND p.is_active
       AND NOT EXISTS (SELECT 1 FROM nx03_stock_balance b WHERE b.part_id=p.id AND b.available_qty>0)
     LIMIT 1`, [T]);
  // A 倉沒貨、他倉有貨的料（T2 用）
  const splitPart = await one(
    `SELECT b.part_id AS id, p.code, w.code AS src_wh, b.available_qty
     FROM nx03_stock_balance b
     JOIN nx01_part p ON p.id=b.part_id AND p.is_active
     JOIN nx01_warehouse w ON w.id=b.warehouse_id
     WHERE b.tenant_id=$1 AND b.available_qty>10 AND b.warehouse_id<>$2
       AND NOT EXISTS (SELECT 1 FROM nx03_stock_balance b2
                       WHERE b2.tenant_id=$1 AND b2.part_id=b.part_id AND b2.warehouse_id=$2 AND b2.available_qty>0)
     ORDER BY w.sort_no LIMIT 1`, [T, whA.id]);
  console.log(`客戶 ${customer.code}（預設付款 ${custRow.payment_term_domestic}／發票 ${custRow.default_invoice_copies} 聯）`);
  console.log(`A倉=${whA.code}；有貨料=${stockParts.map((r) => r.code).join(' / ')}；死料=${deadPart?.code}；跨倉料=${splitPart?.code}(${splitPart?.src_wh}有貨)`);

  // 模擬前端 buildOrder 的送單（回 {so, err}）
  const submitOrder = async ({ items, paymentTerm, invoiceCopies, accountPeriod, deliveryType, confirm = true }) => {
    const res = await ctx.call('POST', '/nx04/so', {
      customerId: customer.id,
      warehouseId: items[0]?.warehouseId,
      soDate: today,
      deliveryType: deliveryType ?? 'P',
      taxRate: invoiceCopies === 0 ? 0 : 5,
      invoiceCopies,
      paymentTerm: paymentTerm || undefined,
      accountPeriod: accountPeriod ? `${accountPeriod}-01` : undefined,
      salesMethod: '即時銷售',
      items,
    });
    if (res.status !== 201) return { so: null, err: res };
    created.sos.push(res.data.id);
    if (!confirm) return { so: res.data, err: null };
    const c = await ctx.call('PATCH', `/nx04/so/${res.data.id}`, { status: 'CONFIRMED' });
    return { so: res.data, err: c.status === 200 ? null : c, confirmed: c.status === 200 };
  };
  const mkItem = (partId, whId, qty, src, price = 10) => ({
    partId, warehouseId: whId, qty, unitPriceSnapshot: price,
    transferSourceType: src, belowMinReason: '即時銷售',
  });

  // ══ T1 主線：兩行全現貨 + 指定付款/發票/帳期 ══
  console.log('\n══ T1 主線（全現貨、CASH、二聯、帳期下月） ══');
  const r1 = await submitOrder({
    items: [
      mkItem(stockParts[0].part_id, whA.id, 2, 'S', 100),
      mkItem(stockParts[1].part_id, whA.id, 3, 'S', 50),
    ],
    paymentTerm: 'CASH', invoiceCopies: 2, accountPeriod: '2026-08',
  });
  ctx.check('T1 建單+確認成功', !!r1.so && r1.confirmed, JSON.stringify(r1.err?.data ?? {}));
  if (r1.so) {
    const so1 = await one(
      `SELECT status, payment_term, invoice_copies, account_period::date::text AS ap, tax_rate,
              subtotal, tax_amount, total_amount, delivery_type, sales_method
       FROM nx04_so WHERE id=$1`, [r1.so.id]);
    ctx.check('T1 status=CONFIRMED', so1.status === 'CONFIRMED', so1.status);
    ctx.check('T1 paymentTerm=CASH（前端指定生效）', so1.payment_term === 'CASH', so1.payment_term);
    ctx.check('T1 invoiceCopies=2', so1.invoice_copies === 2, String(so1.invoice_copies));
    ctx.check('T1 帳期=2026-08-01', so1.ap === '2026-08-01', so1.ap);
    ctx.check('T1 金額 350+5%=367.50', Number(so1.total_amount) === 367.5,
      `sub=${so1.subtotal} tax=${so1.tax_amount} total=${so1.total_amount}`);
    ctx.check('T1 salesMethod=即時銷售', so1.sales_method === '即時銷售', so1.sales_method);
    const st1 = await many(`SELECT id FROM nx03_st WHERE ref_so_id=$1`, [r1.so.id]);
    ctx.check('T1 全現貨 → 不開調撥單', st1.length === 0, `ST×${st1.length}`);
  }

  // ══ T2 拆單：同料 5 現貨 + 5 等調撥 ══
  console.log('\n══ T2 同料拆「A倉現貨5 + A倉等調撥5」（跨倉料、A倉0庫存 → 全 T 一行 + 有貨料現貨行） ══');
  // 用跨倉料模擬：A 倉沒貨 → 前端 autoAllocate 會產「A倉 TRANSFER×qty」單行；搭一行有貨料現貨
  const r2 = await submitOrder({
    items: [
      mkItem(stockParts[0].part_id, whA.id, 2, 'S', 80),
      mkItem(splitPart.id, whA.id, 5, 'T', 60),
    ],
    paymentTerm: '', invoiceCopies: 3, accountPeriod: '2026-07',
  });
  ctx.check('T2 建單+確認成功', !!r2.so && r2.confirmed, JSON.stringify(r2.err?.data ?? {}));
  if (r2.so) {
    const items2 = await many(
      `SELECT part_no, transfer_source_type, transfer_status, st_id FROM nx04_so_item WHERE so_id=$1 ORDER BY line_no`, [r2.so.id]);
    const tLine = items2.find((i) => i.transfer_source_type === 'T');
    ctx.check('T2 T行 補貨中I + 綁ST', tLine?.transfer_status === 'I' && !!tLine?.st_id,
      JSON.stringify(items2.map((i) => `${i.transfer_source_type}/${i.transfer_status}`)));
    const st2 = await one(
      `SELECT st.doc_no, fw.code AS f, tw.code AS t, i.qty FROM nx03_st st
       JOIN nx01_warehouse fw ON fw.id=st.from_warehouse_id JOIN nx01_warehouse tw ON tw.id=st.to_warehouse_id
       JOIN nx03_st_item i ON i.st_id=st.id WHERE st.ref_so_id=$1`, [r2.so.id]);
    if (st2) created.sts.push((await one(`SELECT id FROM nx03_st WHERE ref_so_id=$1`, [r2.so.id])).id);
    ctx.check('T2 自動開ST（來源=系統挑倉、目標=A倉、qty=5）',
      !!st2 && st2.t === whA.code && Number(st2.qty) === 5 && st2.f === splitPart.src_wh,
      st2 ? `${st2.doc_no} ${st2.f}→${st2.t} x${st2.qty}` : '無 ST');
    // 頭倉 fallback：付款條件空 → 沿用客戶主檔
    const so2 = await one(`SELECT payment_term FROM nx04_so WHERE id=$1`, [r2.so.id]);
    ctx.check('T2 未指定付款 → 沿用客戶預設', so2.payment_term === custRow.payment_term_domestic, so2.payment_term);
  }

  // ══ T3 不開發票 → 稅 0 ══
  console.log('\n══ T3 不開發票（invoiceCopies=0、taxRate=0） ══');
  const r3 = await submitOrder({
    items: [mkItem(stockParts[0].part_id, whA.id, 1, 'S', 200)],
    paymentTerm: 'CASH', invoiceCopies: 0, accountPeriod: '2026-07',
  });
  ctx.check('T3 建單+確認成功', !!r3.so && r3.confirmed, JSON.stringify(r3.err?.data ?? {}));
  if (r3.so) {
    const so3 = await one(
      `SELECT invoice_copies, tax_rate, tax_amount, total_amount FROM nx04_so WHERE id=$1`, [r3.so.id]);
    ctx.check('T3 invoice_copies=0 + 稅=0 + 總額=200',
      so3.invoice_copies === 0 && Number(so3.tax_amount) === 0 && Number(so3.total_amount) === 200,
      JSON.stringify(so3));
  }

  // ══ T4 等調撥但全倉都沒貨 → 確認應失敗、SO 卡 DRAFT ══
  console.log('\n══ T4 死料標 T（全倉無貨）→ CONFIRMED 應被擋 ══');
  if (deadPart) {
    const r4 = await submitOrder({
      items: [mkItem(deadPart.id, whA.id, 2, 'T', 30)],
      paymentTerm: 'CASH', invoiceCopies: 3, accountPeriod: '2026-07',
    });
    ctx.check('T4 建單成功但確認被擋（無倉可調）', !!r4.so && !r4.confirmed,
      r4.err ? `HTTP ${r4.err.status}` : '確認竟成功');
    if (r4.so) {
      const so4 = await one(`SELECT status FROM nx04_so WHERE id=$1`, [r4.so.id]);
      ctx.check('T4 SO 卡在 DRAFT（前端顯示錯誤、單已存在）', so4.status === 'DRAFT', so4.status);
    }
  } else console.log('（找不到全倉無貨料、跳過 T4）');

  // ══ T5 標 T 但目標倉其實有貨 → 不開 ST、行卡「待補 P」 ══
  console.log('\n══ T5 有貨卻標 T（模擬業務誤標）→ 行為觀察 ══');
  const r5 = await submitOrder({
    items: [mkItem(stockParts[0].part_id, whA.id, 1, 'T', 90)],
    paymentTerm: 'CASH', invoiceCopies: 3, accountPeriod: '2026-07',
  });
  if (r5.so && r5.confirmed) {
    const it5 = await one(
      `SELECT transfer_source_type, transfer_status, st_id FROM nx04_so_item WHERE so_id=$1`, [r5.so.id]);
    console.log(`  觀察：來源=${it5.transfer_source_type} 狀態=${it5.transfer_status} ST=${it5.st_id ?? '無'}`);
    ctx.check('T5 目標倉有貨 → 不開 ST（合理）', !it5.st_id, it5.st_id ?? '');
    // ⚠ 若 transfer_status 停在 P（待補）且無任何單據會來解鎖 → 行卡死（揭露、非 assert）
    if (it5.transfer_status === 'P') console.log('  ⚠ 行停在 P（待補）且無 ST/TI 會來回寫 → 潛在卡單，回報執行長');
  } else ctx.check('T5 建單+確認成功', false, JSON.stringify(r5.err?.data ?? {}));

  // ══ T6 報價紀錄：建立 + 重送重複性 ══
  console.log('\n══ T6 報價紀錄（INSTANT）建立與重複 ══');
  const recBefore = await one(
    `SELECT count(*)::int AS n FROM nx04_quote_record WHERE tenant_id=$1 AND customer_id=$2 AND part_id=$3`,
    [T, customer.id, stockParts[1].part_id]);
  const rec1 = await ctx.call('POST', '/nx04/quote-record', {
    customerId: customer.id, partId: stockParts[1].part_id, qty: 3, unitPrice: 50,
    warehouseId: whA.id, source: 'INSTANT',
  });
  ctx.check('T6 報價紀錄建立成功', rec1.status === 201, JSON.stringify(rec1.data));
  if (rec1.data?.id) quoteRecIds.push(rec1.data.id);
  const rec2 = await ctx.call('POST', '/nx04/quote-record', {
    customerId: customer.id, partId: stockParts[1].part_id, qty: 3, unitPrice: 50,
    warehouseId: whA.id, source: 'INSTANT',
  });
  if (rec2.data?.id) quoteRecIds.push(rec2.data.id);
  const recAfter = await one(
    `SELECT count(*)::int AS n FROM nx04_quote_record WHERE tenant_id=$1 AND customer_id=$2 AND part_id=$3`,
    [T, customer.id, stockParts[1].part_id]);
  console.log(`  觀察：同料重送 → 紀錄 ${recBefore.n} → ${recAfter.n}（無防重、前端 retry 會重複生成）`);

  // ══ T7 配送 D 但客戶無預設送貨地址 → 建單行為 ══
  console.log('\n══ T7 deliveryType=D、客戶無送貨地址 ══');
  const r7 = await submitOrder({
    items: [mkItem(stockParts[0].part_id, whA.id, 1, 'S', 70)],
    paymentTerm: 'CASH', invoiceCopies: 3, accountPeriod: '2026-07', deliveryType: 'D', confirm: true,
  });
  if (r7.so) {
    const so7 = await one(`SELECT delivery_type, delivery_address, status FROM nx04_so WHERE id=$1`, [r7.so.id]);
    console.log(`  觀察：D 建單${r7.confirmed ? '+確認成功' : '、確認被擋 ' + JSON.stringify(r7.err?.data)}，地址=${so7.delivery_address ?? 'NULL'}`);
    if (so7.delivery_type === 'D' && !so7.delivery_address)
      console.log('  ⚠ 配送單無地址仍放行 → 倉庫端配送作業會缺資訊，回報執行長');
  } else console.log(`  建單被擋：${JSON.stringify(r7.err?.data)}`);
} finally {
  // 自清：SO/ST + 報價紀錄
  await ctx.wipeDocs(created);
  if (quoteRecIds.length) {
    await ctx.db.query(`DELETE FROM nx04_quote_record WHERE tenant_id=$1 AND id = ANY($2)`, [ctx.tenant, quoteRecIds]);
  }
  // buildOrder 也會生報價紀錄?（本腳本直接打 API、僅 T6 生成、已清）
  console.log(`\n【自清】SO×${created.sos.length}、ST×${created.sts.length}、報價紀錄×${quoteRecIds.length}`);
  ctx.summary();
  await ctx.db.end();
}
