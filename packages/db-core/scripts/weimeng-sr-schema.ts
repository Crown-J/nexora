// packages/db-core/scripts/weimeng-sr-schema.ts
// 銷退軌 Step1：本機 DB 套用 soId/soItemId 可空（對齊 schema.prisma 2026-07-07 改動）。
//   Crown 拍板：DB 可空供偉盟歷史銷退匯入、系統內建立仍必填（應用層 DTO/service 驗證不變）。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE nx04_sr ALTER COLUMN so_id DROP NOT NULL`);
  console.log('nx04_sr.so_id DROP NOT NULL ✓');
  await prisma.$executeRawUnsafe(`ALTER TABLE nx04_sr_item ALTER COLUMN so_item_id DROP NOT NULL`);
  console.log('nx04_sr_item.so_item_id DROP NOT NULL ✓');
  // 驗證
  const r = await prisma.$queryRawUnsafe<any[]>(
    `SELECT table_name, column_name, is_nullable FROM information_schema.columns
     WHERE (table_name='nx04_sr' AND column_name='so_id') OR (table_name='nx04_sr_item' AND column_name='so_item_id')`);
  console.log(JSON.stringify(r));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
