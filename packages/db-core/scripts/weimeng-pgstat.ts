// packages/db-core/scripts/weimeng-pgstat.ts
// 臨時：看 Postgres 目前活動查詢 / 鎖等待，診斷刪除卡住。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
async function main() {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT pid, state, wait_event_type AS wt, wait_event AS we, (now()-query_start)::text AS dur, left(query,90) AS q
     FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()
       AND state <> 'idle' ORDER BY query_start`);
  for (const r of rows) console.log(`pid ${r.pid} | ${r.state} | wait ${r.wt}/${r.we} | ${r.dur} | ${r.q}`);
  console.log(`(${rows.length} 個非 idle 連線)`);
  const blk = await prisma.$queryRawUnsafe<any[]>(
    `SELECT blocked.pid AS blocked_pid, blocking.pid AS blocking_pid, left(blocked.query,50) AS blocked_q
     FROM pg_stat_activity blocked
     JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
     WHERE blocked.datname = current_database()`);
  for (const b of blk) console.log(`⛔ pid ${b.blocked_pid} 被 pid ${b.blocking_pid} 卡：${b.blocked_q}`);
  if (!blk.length) console.log('(無鎖阻擋)');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
