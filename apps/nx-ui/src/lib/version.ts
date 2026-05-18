// apps/nx-ui/src/lib/version.ts
// NEXORA 版本號集中管理（蘋果範式：v{x.y.z} / v{x.y.z} beta）
//
// 對齊：docs/_team/nexora-error-code-spec.md v1.2 §13
// Crown 拍板 Q4=b：hardcode 常數（集中此檔、非讀 package.json）
//
// 為何不讀 package.json？
//   - package.json version='0.1.0' 是 Next.js scaffold 預設、與業務 tag v1.5.0 不對齊
//   - hardcode 在此檔對齊 git tag v1.5.0-nx09-yaro-feature-closure（main HEAD 業務真實版本）
//   - 後續軌 TASK-VERSION-DYNAMIC-FETCH 升級為 NX99_release API（規範 §13.8 階段 2）

/**
 * NEXORA 業務版本號（對齊 git tag 真實版本）。
 * 升版觸發：每次 NEXORA-vX.Y.Z-xxx-closure tag 發布時 Crown 拍板更新此常數。
 */
export const NEXORA_VERSION = '1.5.0';

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
 * 顯示用版本字串。
 * - 'v1.5.0 beta'（suffix='beta'）
 * - 'v1.5.0'（suffix=''、正式版）
 */
export function getVersionDisplay(): string {
  const suffix = getVersionSuffix();
  return suffix ? `v${NEXORA_VERSION} ${suffix}` : `v${NEXORA_VERSION}`;
}

/** 是否為 beta 版（用於視覺顏色判斷：beta=灰黃 / 正式=amber #FFB800）。 */
export function isBetaVersion(): boolean {
  return getVersionSuffix().toLowerCase() === 'beta';
}
