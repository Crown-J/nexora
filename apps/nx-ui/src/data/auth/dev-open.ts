// apps/nx-ui/src/data/auth/dev-open.ts
//
// v3.0.0 開發期免登入開關（前端側）
// 執行長 2026-08-01 拍板：先拔掉登入與權限、直接從功能開始修。
//
// ⛔ 這支只是「開發期把門打開」，不是把登入刪掉。
//    登入頁、session hook、外殼守衛全都留著，關掉開關就完全恢復。
//
// 兩道保險，⚠️ 兩道都成立才會打開（與後端 shared/dev/dev-auth.ts 同一套規則）：
//   1. NODE_ENV 不是 production —— 上線後永遠關著
//   2. NEXT_PUBLIC_DEV_OPEN_AUTH=true —— 本機要自己開
//
// 打開之後：
//   · 進站直接到工作區，不經過登入頁
//   · 沒有 token 也不會被踢回登入頁
//   · 後端一律當成 .env 裡設定的那個人（見 nx-api/.env 的 NX_DEV_USER_ID）
//
// ⚠️ 與既有的「展示模式」（NEXT_PUBLIC_NEXORA_RUN_MODE=demo）不同：
//    展示模式是假資料、不接後端；這個開關接的是真後端真資料庫，只是不驗身分。

export function isDevOpenAuth(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return String(process.env.NEXT_PUBLIC_DEV_OPEN_AUTH ?? '').trim().toLowerCase() === 'true';
}
