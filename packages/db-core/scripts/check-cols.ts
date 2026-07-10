// packages/db-core/scripts/check-cols.ts
// 臨時：確認欄位已落 DB。用法：tsx check-cols.ts <column_name>
import { prisma, disconnectPrisma } from '../prisma/seed/client';
async function main() {
  const col = process.argv[2] || 'invoice_title';
  const r = await prisma.$queryRawUnsafe<any[]>(
    `SELECT table_name, column_name, data_type, character_maximum_length FROM information_schema.columns WHERE column_name=$1 ORDER BY table_name`, col);
  console.log(r.length ? JSON.stringify(r) : `（無 ${col} 欄）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
