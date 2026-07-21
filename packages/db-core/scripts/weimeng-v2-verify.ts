// packages/db-core/scripts/weimeng-v2-verify.ts
// 偉盟窗口重灌 v2 Step7：驗核（對照文件 §6 驗核清單）。
//   基準：RSIM 表頭數（3:90794 / M:23611 / 4:5243 / 1:4584 / 6:459 / 2:280）。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { loadRsim } from './weimeng-v2-rsim';

const MARK = '偉盟匯入';
const FROM = '202506', TO = '202607';

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const win = { tenantId: tid, remark: { startsWith: MARK }, legacyDocNo: { gte: FROM, lt: TO } };
  const { map: rsim } = loadRsim();
  const base = new Map<string, { n: number; amt: number }>();
  for (const r of rsim.values()) {
    const b = base.get(r.cls) ?? { n: 0, amt: 0 };
    b.n++; b.amt += r.amt; base.set(r.cls, b);
  }

  console.log('=== 1) 筆數：NEXORA vs RSIM 基準 ===');
  const so = await prisma.nx04So.count({ where: win });
  const rr = await prisma.nx02Rr.count({ where: win });
  const sr = await prisma.nx04Sr.count({ where: win });
  const st = await prisma.nx03St.count({ where: win });
  const tk = await prisma.nx03StockTake.count({ where: win });
  const pr = await prisma.nx02Pr.count({ where: win });
  const row = (name: string, got: number, cls: string) => console.log(`${name}  ${got} / ${base.get(cls)?.n ?? 0}  ${got === (base.get(cls)?.n ?? 0) ? 'OK' : '⚠ 差 ' + ((base.get(cls)?.n ?? 0) - got)}`);
  row('銷貨 SO', so, '3'); row('調撥 ST', st, 'M'); row('銷退 SR', sr, '4');
  row('進貨 RR', rr, '1'); row('盤點 TK', tk, '6'); row('進退 PR', pr, '2');

  console.log('\n=== 2) 金額：Σ totalAmount vs Σ RSIM.ROAMT ===');
  const soAmt = await prisma.nx04So.aggregate({ where: win, _sum: { totalAmount: true } });
  const rrAmt = await prisma.nx02Rr.aggregate({ where: win, _sum: { totalAmount: true } });
  const srAmt = await prisma.nx04Sr.aggregate({ where: win, _sum: { totalAmount: true } });
  const amtRow = (name: string, got: number, cls: string) => { const b = base.get(cls)?.amt ?? 0; console.log(`${name}  ${got.toFixed(0)} / ${b.toFixed(0)}  差 ${(got - b).toFixed(0)}`); };
  amtRow('SO', +(soAmt._sum.totalAmount ?? 0), '3');
  amtRow('RR', +(rrAmt._sum.totalAmount ?? 0), '1');
  amtRow('SR', +(srAmt._sum.totalAmount ?? 0), '4');

  console.log('\n=== 3) 日期分布（月鍵病灶檢查：2026-06 應 ~25 個營業日）===');
  const dd = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(DISTINCT so_date)::bigint AS n FROM nx04_so
    WHERE tenant_id=${tid} AND legacy_doc_no >= ${FROM} AND legacy_doc_no < ${TO}
      AND so_date >= DATE '2026-06-01' AND so_date < DATE '2026-07-01'`;
  console.log(`2026-06 銷貨 distinct 日期數: ${dd[0].n}`);

  console.log('\n=== 4) 成本欄（G2）與稅額 ===');
  const cost = await prisma.$queryRaw<{ total: bigint; withcost: bigint }[]>`
    SELECT COUNT(*)::bigint AS total, COUNT(*) FILTER (WHERE i.unit_cost > 0)::bigint AS withcost
    FROM nx04_so_item i JOIN nx04_so s ON s.id=i.so_id
    WHERE s.tenant_id=${tid} AND s.legacy_doc_no >= ${FROM} AND s.legacy_doc_no < ${TO}`;
  console.log(`SO 明細 ${cost[0].total} 列、unitCost>0 佔 ${cost[0].withcost}`);
  const tax = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM nx04_so
    WHERE tenant_id=${tid} AND legacy_doc_no >= ${FROM} AND legacy_doc_no < ${TO}
      AND tax_amount > 0 AND ABS(subtotal + tax_amount - total_amount) > 1`;
  console.log(`SO subtotal+tax≠total（容差1元）: ${tax[0].n} 張（應 0）`);

  console.log('\n=== 5) 調撥收斂品質 ===');
  const imb = await prisma.$queryRaw<{ docs: bigint; lines: bigint }[]>`
    SELECT COUNT(DISTINCT s.id)::bigint AS docs, COUNT(*)::bigint AS lines
    FROM nx03_st_item i JOIN nx03_st s ON s.id=i.st_id
    WHERE s.tenant_id=${tid} AND s.legacy_doc_no >= ${FROM} AND s.legacy_doc_no < ${TO}
      AND (i.received_qty IS DISTINCT FROM i.qty OR i.remark LIKE '%孤兒%')`;
  console.log(`不平衡/孤兒：${imb[0].docs} 張單、${imb[0].lines} 列（偉盟鑑識：窗口內問題單約 60±）`);

  console.log('\n=== 6) 新欄位使用率（G3/G4/G5）===');
  console.log(`SO 帳款對象≠客戶: ${await prisma.nx04So.count({ where: { ...win, billingPartnerId: { not: null } } })}`);
  console.log(`RR 帳款對象≠廠商: ${await prisma.nx02Rr.count({ where: { ...win, billingPartnerId: { not: null } } })}`);
  console.log(`RR 有廠商發票號: ${await prisma.nx02Rr.count({ where: { ...win, supplierInvoiceNo: { not: null } } })}`);
  console.log(`RR 代購綁銷貨(refSoId): ${await prisma.nx02Rr.count({ where: { ...win, refSoId: { not: null } } })}`);
  console.log(`SO 替代出貨(actualPart): ${(await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM nx04_so_item i JOIN nx04_so s ON s.id=i.so_id
    WHERE s.tenant_id=${tid} AND s.legacy_doc_no >= ${FROM} AND s.legacy_doc_no < ${TO} AND i.actual_part_id IS NOT NULL`)[0].n}`);

  console.log('\n=== 7) 抽樣深驗（1 張銷貨：明細加總 vs 表頭）===');
  const sample = await prisma.nx04So.findFirst({
    where: { ...win, taxAmount: { gt: 0 } },
    select: { docNo: true, soDate: true, subtotal: true, taxAmount: true, totalAmount: true, rev_Nx04SoItem_soId: { select: { lineAmount: true, unitCost: true, qty: true } } },
  });
  if (sample) {
    const lineSum = sample.rev_Nx04SoItem_soId.reduce((s, i) => s + +i.lineAmount, 0);
    console.log(sample.docNo, sample.soDate.toISOString().slice(0, 10),
      `表頭未稅 ${sample.subtotal} 稅 ${sample.taxAmount} 總 ${sample.totalAmount}；明細Σ ${lineSum}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
