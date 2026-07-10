// packages/db-core/scripts/weimeng-sr-cleanup.ts
// 銷退軌：清掉全部「偉盟匯入」銷退 Nx04Sr + Nx04SrItem，供乾淨重跑。
//   臨時索引 tmp_sritem_srid 加速 FK 檢查 + 批次迴圈刪。預設只報告；帶 go 才刪。
//   ⚠️ 執行前確認無載入程序在跑。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
const MARK = '偉盟匯入';
const GO = process.argv.includes('go');
const BATCH = 100000;
async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const c = await prisma.nx04Sr.count({ where: { tenantId: tid, remark: MARK } });
  console.log(`偉盟銷退：SR ${c} 張`);
  if (!GO) { console.log('[dry] 未刪。加 go 才刪。'); return; }
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tmp_sritem_srid ON nx04_sr_item(sr_id)`);
  let ti = 0;
  for (;;) {
    const n: number = await prisma.$executeRawUnsafe(`DELETE FROM nx04_sr_item WHERE ctid IN (SELECT ri.ctid FROM nx04_sr_item ri WHERE ri.sr_id IN (SELECT id FROM nx04_sr WHERE tenant_id=$1 AND remark=$2) LIMIT ${BATCH})`, tid, MARK);
    ti += n; if (n) console.log(`  刪明細 +${n}`); if (n < BATCH) break;
  }
  let th = 0;
  for (;;) {
    const n: number = await prisma.$executeRawUnsafe(`DELETE FROM nx04_sr WHERE ctid IN (SELECT ctid FROM nx04_sr WHERE tenant_id=$1 AND remark=$2 LIMIT ${BATCH})`, tid, MARK);
    th += n; if (n) console.log(`  刪表頭 +${n}`); if (n < BATCH) break;
  }
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS tmp_sritem_srid`);
  console.log(`完成。刪明細 ${ti} / 表頭 ${th}。剩 ${await prisma.nx04Sr.count({ where: { tenantId: tid, remark: MARK } })} 張。`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
