// apps/nx-api/src/shared/dev/dev-auth.ts
//
// v3.0.0 開發期免登入開關（執行長 2026-08-01 拍板：先拔掉登入與權限、直接從功能開始修）
//
// ⛔ 這支只是「開發期把門打開」，不是把登入與權限刪掉。
//    原本的守衛程式碼一行都沒動掉，關掉開關就完全恢復，規格階段 6 再把安全控制接回來。
//
// 兩道保險，⚠️ 兩道都成立才會打開：
//   1. NODE_ENV 不是 production —— 正式環境永遠關著，就算 .env 誤帶旗標也開不了
//   2. NX_DEV_OPEN_AUTH=true    —— 本機要自己開，不是預設值
//
// 打開之後：
//   · 前端不必登入，API 不必帶 token
//   · 每個 request 一律當成 NX_DEV_USER_ID 這個人（預設給負責人身分、權限全通）
//   · 職務守衛 / 權限碼守衛 / 模組訂閱守衛一律放行
//
// ⚠️ 使用者與租戶 ID 走環境變數、本檔不查 DB：
//    JwtAuthGuard 是用 @UseGuards(JwtAuthGuard) 掛上去的（158 個檔案），
//    給它加建構子相依會牽動每個模組的 DI，⛔ 不值得為一個開發開關承擔那個風險。
//    ID 填錯的話 /auth/me 會直接回 User not found，不會靜默錯給空資料。

/** 開發期免登入時，注入到 req.user 的身分（欄位對齊 auth/strategies/jwt.strategy 的 RequestUser） */
export type DevRequestUser = {
  sub: string;
  username: string;
  roles: string[];
  tenantId: string | null;
  tenantCode: string | null;
  planCode: string | null;
  permissionLevelCode: string | null;
  enabledModules: string[];
};

let warned = false;

/**
 * 免登入開關是否打開。⚠️ NODE_ENV=production 時永遠回 false。
 */
export function isDevAuthOpen(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (String(process.env.NX_DEV_OPEN_AUTH ?? '').trim().toLowerCase() !== 'true') return false;

  if (!warned) {
    warned = true;
    // 開著的時候每次啟動吼一聲，避免有人忘了它開著
    console.warn(
      '⚠️  [DEV] 免登入模式已開啟（NX_DEV_OPEN_AUTH=true）：所有 API 不驗 token、不檢查權限。' +
        `目前一律當成 ${devUserId()} / 租戶 ${devTenantId() ?? '(無)'}。⛔ 這個狀態不可上正式環境。`,
    );
  }
  return true;
}

function devUserId(): string {
  return String(process.env.NX_DEV_USER_ID ?? '').trim();
}

function devTenantId(): string | null {
  const v = String(process.env.NX_DEV_TENANT_ID ?? '').trim();
  return v === '' ? null : v;
}

/**
 * 組出開發期的假身分。
 * roles 給 OWNER：既有的守衛都認 SYSADMIN / OWNER 全通行，
 * 走這條就不必在每個守衛裡另外寫一套放行邏輯（少一種行為分歧）。
 */
export function buildDevRequestUser(): DevRequestUser {
  const tenantId = devTenantId();
  return {
    sub: devUserId(),
    username: String(process.env.NX_DEV_USER_ACCOUNT ?? 'dev').trim(),
    roles: ['OWNER'],
    tenantId,
    tenantCode: (() => {
      const v = String(process.env.NX_DEV_TENANT_CODE ?? '').trim();
      return v === '' ? null : v;
    })(),
    planCode: null,
    // 權限等級 S ＝ 全通行（2026-06-28 職務↔權限拆分軌的既有約定）
    permissionLevelCode: 'S',
    // 模組訂閱守衛在免登入模式下直接放行，這裡不必列舉
    enabledModules: [],
  };
}
