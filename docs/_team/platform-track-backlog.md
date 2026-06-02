<!-- docs/_team/platform-track-backlog.md -->

# 平台層 vs 租戶層分離軌 — 後續延伸 backlog

> 撰寫者：Hank（Phase 1~6 closure 後、總經理開恆迎時陸續發現）
> 起寫時間：2026-06-02
> 用途：本軌外明確認可邊界、未來軌啟動時參考
> ⚠️ 本檔不更新「已完成項」、只列待辦；完成項應移至 PROJECT_CONTEXT 範式或刪除

---

## A. 已登記但不在本軌（按軌分類）

### A.1 平台後台 UI 打磨軌（未啟動）

| 項 | 來源 | 嚴重度 | 內容 |
|---|---|---|---|
| 開戶成功畫面對比過低 | 總經理 2026-06-02 開恆迎 TW-100001 實測 | ⚠️ **高**（含初始密碼、抄錯風險） | OnboardingFormView 成功區段淺底+淺字、關鍵資訊（租戶 ID/代碼/Email/初始密碼/主倉 ID）需反白選取才看得到。修方向：深字/淺底 或 淺字/深底、確保 WCAG AA 對比比例。`features/sys-admin/onboarding/ui/OnboardingFormView.tsx` 成功畫面段（`if (result) return ...`） |
| _其他 polish 待累積_ | — | — | 留位、後續總經理走查累積 |

### A.2 通知 / Email 軌（未啟動）

| 項 | 嚴重度 | 上線前狀態 |
|---|---|---|
| 開戶歡迎信 | ⚠️ **上線前必做** | 現況：onboarding service 只 `console.log` 印初始密碼到 server log、未接 mailer。客戶拿不到帳號通知。`onboarding.service.ts` 約 L156 `logger.log('[ONBOARDING-EMAIL] ...')` |
| 信件內容欄位 | — | 公司帳號 TW-xxxxx / 登入 Email / 初始密碼 / 登入網址 / 「首次登入會強制改密」提示 |
| 改密成功通知 | 中 | 客戶改完密寄一封「密碼已更新」郵件、防盜用 |
| 訂閱到期 / 續約提醒 | 中 | 訂閱管理軌一起做 |
| 寄信服務選型 | — | 待評估（SendGrid / Resend / AWS SES / Cloudflare Email Workers）|

⭐ 跟 `TASK-RAILWAY-ENV-SPLIT` 同期評估、production 環境一起接。

### A.3 認證 / 安全強化（已認可邊界、簽約前必補）

| 項 | 來源 | 嚴重度 |
|---|---|---|
| L3 平台登入限流 | 階段 4 規劃 | 中（防爆破）|
| L4 平台後台 IP 白名單 / VPN-only | 階段 4 規劃 | 中（防外部掃到） |

→ 排入 `TASK-RAILWAY-ENV-SPLIT`（簽約前 2-4 週）

### A.4 LOGO 上傳軌外（已認可邊界）

| 項 | 嚴重度 |
|---|---|
| LOGO 替換 UI（customer 自己改）| 低 |
| Orphan 檔案 cleanup | 中（檔案系統會慢慢漲）|
| R2 雲端儲存遷移 | 中（與 Railway 軌同期）|
| LOGO crop / resize 預處理 | 低 |
| 客戶 dashboard 設定頁 LOGO 替換 | 中 |

### A.5 文件債（已認可邊界）

| 項 | 嚴重度 |
|---|---|
| 8 個歷史文件含 `TEST-LITE/PLUS/PRO` 字串 | 低（dailylog/_archive 不該改、operation manual 排「LITE 操作手冊 v2」軌）|

### A.6 員工編號制改造後續（2026-06-02 新登記）

| 項 | 嚴重度 |
|---|---|
| 員編修改歷史追溯（誰、什麼時候改了 user_account）| 低（audit log 軌）|
| Excel 員工匯入範本 v2（新增「員工編號」欄、Email 改選填）| 中（操作手冊 v2 軌、配合 importer handler 已支援新欄位）|

---

## B. 來源

- Phase 1~6 closure tag `v2.2.0-platform-tenant-separation`（commit `2d266b6`、跨 14 commits）
- LOGO 上傳軌 commit `98246ad` + `debaeda` + `c003bab`
- 總經理 2026-06-02 開恆迎企業 TW-100001 實測回報

---

## C. 維護紀律

- 完成項：移至 PROJECT_CONTEXT 對應段落（如 §6.5）、本檔刪除該行
- 新發現項：先登記在此、不插隊主線實測
- 軌啟動時：從本檔挑相關項拆出 STOP / 子軌
