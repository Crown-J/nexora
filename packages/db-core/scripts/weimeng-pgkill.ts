// packages/db-core/scripts/weimeng-pgkill.ts
// 臨時：terminate 指定 pid（卡住的舊刪除 backend）。用法：tsx weimeng-pgkill.ts <pid>
import { prisma, disconnectPrisma } from '../prisma/seed/client';
async function main() {
  const pid = Number(process.argv[2]);
  if (!pid) { console.log('需給 pid'); return; }
  const r = await prisma.$queryRawUnsafe<any[]>(`SELECT pg_terminate_backend(${pid}) AS killed`);
  console.log(`terminate ${pid}:`, JSON.stringify(r));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
