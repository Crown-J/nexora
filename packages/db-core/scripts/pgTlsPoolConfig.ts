/**
 * 供 `pg` Client／Pool 與 Prisma `adapter-pg` 使用：對 Railway Public 等 URI 處理 TLS，
 * 避免 `sslmode=require` 經 connection-string 解析後覆寫 `ssl`，導致
 * `self-signed certificate in certificate chain`（與 P0 腳本邏輯一致）。
 */
import type { ClientConfig, PoolConfig } from 'pg';

export function looksLikeRailwayPublic(url: string): boolean {
  return /\.proxy\.rlwy\.net|rlwy\.net/i.test(url);
}

export function stripSslQueryParams(connectionUrl: string): string {
  try {
    const normalized = connectionUrl.replace(/^postgresql:/i, 'http:');
    const u = new URL(normalized);
    for (const key of ['sslmode', 'ssl', 'uselibpqcompat']) {
      u.searchParams.delete(key);
    }
    return u.toString().replace(/^http:/i, 'postgresql:');
  } catch {
    return connectionUrl;
  }
}

/**
 * @param url 通常為 `DATABASE_URL` 或 `RAILWAY_DATABASE_URL`
 * @returns 傳給 `new pg.Pool(...)` 或 `new pg.Client(...)` 的設定
 *
 * - `RAILWAY_TLS_STRICT=1`：嚴格校驗伺服器憑證（不剝除 URL 上 ssl 相關參數）。
 * - 預設：對 Railway／sslmode=require|prefer 使用 `rejectUnauthorized: false` 並剝參（僅開發／連通性）。
 */
export function poolConfigFromDatabaseUrl(url: string): PoolConfig {
  const strictTls = process.env.RAILWAY_TLS_STRICT === '1' || process.env.RAILWAY_TLS_STRICT === 'true';
  let ssl: ClientConfig['ssl'] | undefined;
  let connectionString = url;

  if (url.includes('sslmode=disable')) {
    ssl = undefined;
  } else if (looksLikeRailwayPublic(url) || url.includes('sslmode=require') || url.includes('sslmode=prefer')) {
    if (strictTls) {
      ssl = { rejectUnauthorized: true };
    } else {
      ssl = { rejectUnauthorized: false };
      connectionString = stripSslQueryParams(url);
    }
  }

  return { connectionString, ssl };
}
