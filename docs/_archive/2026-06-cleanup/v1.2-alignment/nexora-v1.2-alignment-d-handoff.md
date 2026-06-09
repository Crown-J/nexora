<!-- docs/_team/nexora-v1.2-alignment-d-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 D closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-30
> 對應分支：`feature/v1.2-alignment-d`
> 對應 tag：`v2.0.4-alignment-d-complete`
> 前棒：`docs/_team/nexora-v1.2-alignment-c-fu-handoff.md`

---

## §1. 本軌範圍 — D1~D4 全做

| 子任務 | 範圍 | 狀態 |
|--------|------|------|
| D1 | 設定精靈 framework（Provider + Hook + Overlay + ? 按鈕）| ✅ |
| D2 | 22 工作台引導內容 | ✅ |
| D3 | 22 頁面 trigger 整合（AutoPageGuide 全自動）| ✅ |
| D4 | 設定→引導精靈頁 | ✅ |

## §2. 3 commits 整軌

| Commit | 範圍 |
|--------|------|
| D1+D2 | framework + 22 工作台內容 |
| D3 | AutoPageGuide（pathname → pageKey）|
| D4 | /settings/wizard 重置頁 + 設定 hub 標 ready |

## §3. 重點技術決策

### 3.1 framework 範式

**前棒 C 階段已建好**：
- schema `Nx01UserPageGuide` (user × page_key)
- backend：`/wizard/status` / `/wizard/page/:k/seen` / `/wizard/page/reset-mine`

**D 階段補前端**：
- `PageGuideProvider` Context 管 `seenSet` 快取
- 初始載入呼叫 `/wizard/status` 同步
- `markSeen(pageKey)` 樂觀更新 + 背景 POST
- `reopen(pageKey)` 清前端快取（? 按鈕用）
- `resetAll()` 呼叫 `/wizard/page/reset-mine`

### 3.2 AutoPageGuide 全自動 trigger

**問題**：22 個工作台、若每個 page.tsx 都手動加 `<PageGuideHost pageKey="..." />`、改動很大、容易漏。

**解法**：
- `AutoPageGuide` 元件 `usePathname()` 自動解析對應 pageKey
- 集中維護 `PATH_TO_PAGE_KEY` mapping
- 放在 `DashboardShell`、整個 `/dashboard/**` 自動覆蓋

**好處**：
- 22 個頁面 0 編輯
- 加新 page guide 只改 `content.ts` + `AutoPageGuide.tsx` 兩處
- pathPrefix 順序「細到粗」、第一個命中為準

### 3.3 22 工作台內容統計

| 模組 | 頁面數 | pageKey 範例 |
|------|-------|-------------|
| 進貨 | 7 | purchase.rfq / po / rr / pr / warranty-claim / vendor / product |
| 庫存 | 6 | inventory.stocktake / stock-query / issue-report / conversion / location / part-stock-setting |
| 銷貨 | 5 | sale.quote / so / sr / ti / customer-grade-history |
| 主檔 | 4 | master.partners / parts / warehouses / users |
| 設定 | 3 | settings.roles / system-param / wizard |

每個內容格式：
- title（含 emoji）
- purpose（一句話描述）
- features（3-6 個重點）
- workflow（可選、狀態流轉）
- tip（可選、amber 警示）

### 3.4 兩種 wizard 並存

- **匯入精靈**（C 階段 ImportWizardOverlay）：tenant 層級、全螢幕浮層、首次登入跳
- **設定精靈**（D 階段 TutorialOverlay）：user × page 層級、小視窗浮層、每頁第一次進跳

兩者各自獨立、各自的「重開 / 重置」button 也分開。

### 3.5 ? 按鈕跟自動跳的「我知道了」行為差異

| 觸發來源 | 點「我知道了」行為 |
|---------|-------------------|
| 自動跳（seen=false）| `markSeen` API、標 seen、下次不跳 |
| ? 按鈕重開 | 只關 overlay、不打 API、不改 seen 狀態 |

理由：user 重看不算「初次看」、不該改變記憶旗標。

## §4. 完成判準

| 項目 | 狀態 |
|------|------|
| D1 framework | ✅ |
| D2 22 內容 | ✅ |
| D3 整合各頁面 | ✅ AutoPageGuide |
| D4 設定→引導精靈頁 | ✅ |
| 三租戶 seed 仍綠 | ✅（schema 未變、不需重 seed）|
| build 全綠 | ✅ |
| tag v2.0.4 | ✅ |

## §5. FU 押後

- **FU-guide-01**：guide 內容對齊操作手冊 cross-check（content.ts 已寫、但可能跟最新操作手冊細節有 drift、之後逐 module audit）
- **FU-guide-02**：guide 圖片 / 截圖（v1.2 §3.3 純文字、未來可加 screenshot）
- **FU-guide-03**：更細粒度（detail page vs list page 不同 guide）
- **FU-guide-04**：i18n（目前繁中 hard-code）
- **FU-guide-05**：A/B test guide 內容 effectiveness

## §6. 驗證

- ✅ `pnpm --filter nx-ui build`
- 後端：本軌沒改 backend（用 C 階段既有 endpoints）

## §7. 下一階段建議

v1.2 §14 階段 E 主檔分區編輯（L）：
- 各模組頁面只顯示該區欄位
- 主檔中心顯示完整 4 區
- 例：客戶在 /sale/customer 看銷貨欄位、/finance/account 看財務欄位、/base/partners 看完整

或階段 F NX05 財務（L）：
- AR / AP / 票據 / 關帳 / 帳戶管理

依 audit §X.2 推薦順序：E → F → G 手機 → H 報表 → I 補連線。

---

> 階段 D closure 完成。
> tag `v2.0.4-alignment-d-complete` 可進階段 E。
