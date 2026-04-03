/**
 * P0（計畫書階段 0）：本機經 Railway Public URL 連線並執行 DDL 煙霧測試。
 *
 * 於 packages/db-core：
 *   在 .env 設定 RAILWAY_DATABASE_URL（勿覆寫本機用的 DATABASE_URL），然後：
 *   pnpm run p0:railway-ddl
 *
 * 連線字串請使用 Railway「Public Network」URI。預設對 `*.rlwy.net` 使用 TLS 但
 * `rejectUnauthorized: false`（常見於公開代理）；若需嚴格憑證驗證可設 RAILWAY_TLS_STRICT=1。
 */
import 'dotenv/config';
import pg from 'pg';
import { poolConfigFromDatabaseUrl } from './pgTlsPoolConfig';

const TABLE = 'p0_connectivity_probe';

async function main(): Promise<void> {
  const url = process.env.RAILWAY_DATABASE_URL?.trim();
  if (!url) {
    console.error(
      '[P0] 未設定 RAILWAY_DATABASE_URL。\n' +
        '請在 packages/db-core/.env 加入 Railway Postgres「Public Network」連線字串，例如：\n' +
        '  RAILWAY_DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway?sslmode=require"\n' +
        '既有 DATABASE_URL／DIRECT_URL 維持本機 Docker 即可。',
    );
    process.exit(1);
  }

  const { connectionString, ssl } = poolConfigFromDatabaseUrl(url);
  const client = new pg.Client({ connectionString, ssl });

  try {
    await client.connect();
    console.log('[P0] 連線成功。');

    await client.query(
      `CREATE TABLE IF NOT EXISTS "${TABLE}" (id SERIAL PRIMARY KEY, checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    );
    console.log(`[P0] CREATE TABLE "${TABLE}" 成功。`);

    await client.query(`DROP TABLE IF EXISTS "${TABLE}"`);
    console.log(`[P0] DROP TABLE "${TABLE}" 成功。`);

    console.log('[P0] 完成：Public URL、連線與 DDL 正常。');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[P0] 失敗:', msg);
    if (msg.includes('certificate') || msg.includes('SSL') || msg.includes('TLS')) {
      console.error(
        '[P0] 若為憑證鏈錯誤：預設已對寬鬆 TLS 移除 URL 內 sslmode 並使用 rejectUnauthorized:false；' +
          '若仍失敗請確認已更新腳本。需嚴格校驗時設 RAILWAY_TLS_STRICT=1。',
      );
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main();
