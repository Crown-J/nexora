// packages/db-core/scripts/weimeng-early-cleanup.ts
// 偉盟續作：清掉「早年（soDate<=2023-12-31）偉盟匯入」SO+明細，供 Phase C 乾淨重跑。
//   ⚠️ nx04_so_item 無 so_id 單獨索引 → 建臨時索引 tmp_soitem_soid 讓刪除快。
//   批次迴圈刪除（每次 10 萬、迴圈到 0），避免巨大單一 DELETE。
//   ⚠️ 執行前務必確認無載入程序在跑（否則邊刪邊插永遠清不完）。
//   預設只報告；帶參數 go 才刪。近三年（2024~）不受影響。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
const MARK = '偉盟匯入';
const CUT = '2023-12-31';
const GO = process.argv.includes('go');
const BATCH = 100000;

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const soCnt = await prisma.nx04So.count({ where: { tenantId: tid, remark: MARK, soDate: { lte: new Date(CUT + 'T23:59:59') } } });
  console.log(`早年殘留：SO ${soCnt} 張`);
  if (!GO) { console.log('[dry] 未刪。加 go 才刪。'); return; }

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tmp_soitem_soid ON nx04_so_item(so_id)`);
  console.log('臨時索引就緒。批次刪明細…');
  let tot = 0;
  for (;;) {
    const n: number = await prisma.$executeRawUnsafe(
      `DELETE FROM nx04_so_item WHERE ctid IN (
         SELECT si.ctid FROM nx04_so_item si
         WHERE si.so_id IN (SELECT id FROM nx04_so WHERE tenant_id=$1 AND remark=$2 AND so_date<=$3::date)
         LIMIT ${BATCH})`, tid, MARK, CUT);
    tot += n; if (n) console.log(`  刪明細 +${n}（累計 ${tot}）`);
    if (n < BATCH) break;
  }
  console.log(`明細刪除合計 ${tot}`);

  let toth = 0;
  console.log('批次刪表頭…');
  for (;;) {
    const n: number = await prisma.$executeRawUnsafe(
      `DELETE FROM nx04_so WHERE ctid IN (
         SELECT ctid FROM nx04_so WHERE tenant_id=$1 AND remark=$2 AND so_date<=$3::date LIMIT ${BATCH})`, tid, MARK, CUT);
    toth += n; if (n) console.log(`  刪表頭 +${n}（累計 ${toth}）`);
    if (n < BATCH) break;
  }
  console.log(`表頭刪除合計 ${toth}`);

  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS tmp_soitem_soid`);
  const left = await prisma.nx04So.count({ where: { tenantId: tid, remark: MARK, soDate: { lte: new Date(CUT + 'T23:59:59') } } });
  console.log(`完成。早年殘留剩 ${left} 張。`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
