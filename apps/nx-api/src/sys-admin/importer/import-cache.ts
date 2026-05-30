// apps/nx-api/src/sys-admin/importer/import-cache.ts
// v1.2 對齊軌 C-FU：in-memory 檔案 cache
//
// FU-import-07：preview 時 cache 檔案、confirm 用 batchId 拉
// 避免「客戶要再上傳一次」的爛體驗
//
// ⚠️ in-memory cache 限制：
// - 容量有限（依 v8 heap）、適合 LITE 階段
// - server restart 會掉、預覽後 1 小時內 confirm 即可
// - 多 instance 部署時 cache 不共享、要用 Redis（屬 PLUS 階段 infra 升級）
//
// TTL：1 小時自動清掉（避免 leak）

interface CacheEntry {
  fileName: string;
  buffer: Buffer;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}

export function cacheFile(batchId: string, fileName: string, buffer: Buffer): void {
  cleanup();
  cache.set(batchId, {
    fileName,
    buffer,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function getCachedFile(batchId: string): { fileName: string; buffer: Buffer } | null {
  const entry = cache.get(batchId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(batchId);
    return null;
  }
  return { fileName: entry.fileName, buffer: entry.buffer };
}

export function clearCachedFile(batchId: string): void {
  cache.delete(batchId);
}
