// apps/nx-ui/src/lib/version.ts
// NEXORA 版本號集中管理（蘋果範式：v{x.y.z} / v{x.y.z} beta）
//
// 對齊：docs/_team/nexora-error-code-spec.md v1.3 §13
// Crown 拍板 Q4=b：hardcode 常數（集中此檔、非讀 package.json）
//
// 為何不讀 package.json？
//   - package.json version='0.1.0' 是 Next.js scaffold 預設、與業務 tag v1.5.x 不對齊
//   - hardcode 在此檔對齊業務真實版本
//   - 後續軌 TASK-VERSION-DYNAMIC-FETCH 升級為 NX99_release API（規範 §13.8 階段 2）

/**
 * NEXORA 業務版本號（對齊業務真實版本）。
 * 升版觸發：每次 UI iterate / 業務 closure 時 Crown 拍板更新此常數。
 *
 * 版本歷史：
 *   1.5.0  V1（TASK-AUTH-UI-ITERATE-01：字級 + ❌ + padding + 蘋果版本範式首落地）
 *   1.5.1  V2（TASK-AUTH-UI-ITERATE-01-V2：warning 橙色 4 主題 + 版本號位置校正 + NEXORA GRID 品牌格式）
 */
export const NEXORA_VERSION = '1.5.1';

/** 品牌名稱（規範 v1.3 §13.4 版本號完整格式：'NEXORA GRID | v1.5.1 beta'）。 */
export const NEXORA_BRAND = 'NEXORA GRID';

/**
 * 版本後綴（從環境變數讀、build time 注入）。
 * 對齊規範 §13.7：本機 / Railway / Vercel / 封測 = 'beta'；首位客戶簽約後 Crown 拍板清空。
 */
function getVersionSuffix(): string {
  const raw = process.env.NEXT_PUBLIC_NEXORA_VERSION_SUFFIX;
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

/**
 * 顯示用版本字串（不含品牌、用於精簡場景）。
 * - 'v1.5.1 beta'（suffix='beta'）
 * - 'v1.5.1'（suffix=''、正式版）
 */
export function getVersionDisplay(): string {
  const suffix = getVersionSuffix();
  return suffix ? `v${NEXORA_VERSION} ${suffix}` : `v${NEXORA_VERSION}`;
}

/** 是否為 beta 版（用於 'beta' 字串獨立 styling、其他部分仍用 design token）。*/
export function isBetaVersion(): boolean {
  return getVersionSuffix().toLowerCase() === 'beta';
}

/**
 * 拆解版本顯示為 3 段、給 UI 各段分開 styling 用：
 *   { brand: 'NEXORA GRID', version: 'v1.5.1', suffix: 'beta' | '' }
 * 對齊規範 v1.3 §13.5：
 *   - brand：text-muted-foreground
 *   - version：text-primary（amber 主色、4 主題自動）
 *   - suffix：text-muted-foreground（偏灰、提示測試性質）
 */
export function getVersionParts(): { brand: string; version: string; suffix: string } {
  return {
    brand: NEXORA_BRAND,
    version: `v${NEXORA_VERSION}`,
    suffix: getVersionSuffix(),
  };
}
