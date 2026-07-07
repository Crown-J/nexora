// packages/db-core/scripts/weimeng-purchase-cleanup.ts
// 偉盟續作：清掉全部「偉盟匯入」進貨 Nx02Rr + Nx02RrItem，供 Phase D 乾淨重跑。
//   批次迴圈刪除（避免大單一 DELETE / FK 順序問題）。預設只報告；帶 go 才刪。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
const MARK = '偉盟匯入';
const GO = process.argv.includes('go');
const BATCH = 100000;
async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const rr = await prisma.nx02Rr.count({ where: { tenantId: tid, remark: MARK } });
  const it = await prisma.nx02RrItem.count({ where: { rr: { tenantId: tid, remark: MARK } } });
  console.log(`偉盟進貨：RR ${rr} 張 / 明細 ${it} 列`);
  if (!GO) { console.log('[dry] 未刪。加 go 才刪。'); return; }
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tmp_rritem_rrid ON nx02_rr_item(rr_id)`);
  let ti = 0;
  for (;;) {
    const n: number = await prisma.$executeRawUnsafe(
      `DELETE FROM nx02_rr_item WHERE ctid IN (SELECT ri.ctid FROM nx02_rr_item ri
         WHERE ri.rr_id IN (SELECT id FROM nx02_rr WHERE tenant_id=$1 AND remark=$2) LIMIT ${BATCH})`, tid, MARK);
    ti += n; if (n) console.log(`  刪明細 +${n}（累計 ${ti}）`); if (n < BATCH) break;
  }
  let th = 0;
  for (;;) {
    const n: number = await prisma.$executeRawUnsafe(
      `DELETE FROM nx02_rr WHERE ctid IN (SELECT ctid FROM nx02_rr WHERE tenant_id=$1 AND remark=$2 LIMIT ${BATCH})`, tid, MARK);
    th += n; if (n) console.log(`  刪表頭 +${n}（累計 ${th}）`); if (n < BATCH) break;
  }
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS tmp_rritem_rrid`);
  const left = await prisma.nx02Rr.count({ where: { tenantId: tid, remark: MARK } });
  console.log(`完成。偉盟進貨剩 ${left} 張。`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
