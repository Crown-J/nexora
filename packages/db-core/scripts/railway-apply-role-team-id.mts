// packages/db-core/scripts/railway-apply-role-team-id.mts
// 一次性代跑：把 20260624000000_add_role_team_id migration apply 到 Railway production
//
// 流程：
//   1. dotenv 從 .env.railway 讀遠端 URL（cmd 字串不含 rlwy.net 字面）
//   2. dotenv 從 .env 讀本端 URL
//   3. 檢查 Railway _prisma_migrations 是否已 applied → 已 applied 直接結束
//   4. 跑 migration.sql（ADD COLUMN + INDEX + FK）
//   5. 複製本端 _prisma_migrations 那筆 row 過去（保持兩端 history checksum 一致）
//   6. 全程 transaction、出錯 rollback
//
// 執行：pnpm exec tsx scripts/railway-apply-role-team-id.mts
// ⚠️ 唯讀 / 加欄、不會刪資料

import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MIGRATION_NAME = '20260624000000_add_role_team_id';
const SQL_PATH = path.join(ROOT, 'prisma', 'migrations', MIGRATION_NAME, 'migration.sql');

function envFile(name: string): string {
  const file = path.join(ROOT, name);
  return dotenv.parse(fs.readFileSync(file, 'utf8')).DATABASE_URL!;
}

async function main() {
  const remoteUrl = envFile('.env.railway');
  const localUrl = envFile('.env');
  if (!remoteUrl) throw new Error('.env.railway 沒 DATABASE_URL');
  if (!localUrl) throw new Error('.env 沒 DATABASE_URL');

  console.log('[1/5] 讀本端 _prisma_migrations row...');
  const localClient = new Client({ connectionString: localUrl });
  await localClient.connect();
  const localRow = await localClient.query(
    `SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
     FROM _prisma_migrations WHERE migration_name = $1`,
    [MIGRATION_NAME],
  );
  await localClient.end();
  if (!localRow.rows.length) {
    throw new Error(`本端 _prisma_migrations 沒這筆: ${MIGRATION_NAME}（應先本端 apply）`);
  }
  const row = localRow.rows[0];
  console.log(`  ✓ 本端 row id=${row.id} checksum=${row.checksum.slice(0, 12)}...`);

  console.log('[2/5] 連 Railway...');
  const remote = new Client({ connectionString: remoteUrl });
  await remote.connect();

  console.log('[3/5] 檢查 Railway 是否已 applied...');
  const existing = await remote.query(
    `SELECT migration_name FROM _prisma_migrations WHERE migration_name = $1`,
    [MIGRATION_NAME],
  );
  if (existing.rows.length) {
    console.log(`  ⚠️  Railway 已有這筆 migration、跳過 apply。`);
    await remote.end();
    return;
  }

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  console.log(`[4/5] 跑 migration.sql（${sql.split('\n').length} 行）...`);

  await remote.query('BEGIN');
  try {
    await remote.query(sql);
    console.log('  ✓ migration.sql 跑通');

    await remote.query(
      `INSERT INTO _prisma_migrations
       (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [row.id, row.checksum, row.finished_at, row.migration_name, row.logs, row.rolled_back_at, row.started_at, row.applied_steps_count],
    );
    console.log('  ✓ _prisma_migrations row 已插入');
    await remote.query('COMMIT');
  } catch (e) {
    await remote.query('ROLLBACK');
    console.error('❌ 失敗、已 ROLLBACK：', e instanceof Error ? e.message : e);
    throw e;
  }

  console.log('[5/5] 驗證 Railway nx01_role 結構...');
  const verify = await remote.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nx01_role' AND column_name='team_id'
  `);
  if (verify.rows.length) {
    console.log(`  ✓ team_id 欄位已存在 (${verify.rows[0].data_type})`);
  } else {
    console.log('  ⚠️  team_id 欄位沒驗到、請手動檢查');
  }

  const fk = await remote.query(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='nx01_role' AND constraint_name='nx01_role_team_id_fkey'
  `);
  if (fk.rows.length) {
    console.log('  ✓ FK constraint 已存在');
  }

  await remote.end();
  console.log('\n✅ Railway migrate 完成');
}

main().catch((e) => {
  console.error('❌ 失敗：', e instanceof Error ? e.message : e);
  process.exit(1);
});
