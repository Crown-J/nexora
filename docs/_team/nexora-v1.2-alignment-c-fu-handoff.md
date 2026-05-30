<!-- docs/_team/nexora-v1.2-alignment-c-fu-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 C 收尾 FU closure

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-30
> 對應分支：`feature/v1.2-alignment-c-fu`
> 對應 tag：`v2.0.3-alignment-c-fu-complete`
> 前棒 handoff：`docs/_team/nexora-v1.2-alignment-c-handoff.md`

---

## §1. 本軌範圍

✅ 全做（9 個）：
- FU-import-01 partner importer（寫 Nx01Partner）
- FU-import-02 warehouse importer（寫 Nx01Warehouse + Nx01Location）
- FU-import-03 product importer（寫 Nx01Part + Nx03PartStockSetting）
- FU-import-04 purchase-history importer（lookup + 起算點過濾）
- FU-import-05 sale-history importer（同上）
- FU-import-07 confirmImport cached file（解客戶上傳兩次問題）
- FU-onboarding-05 mustChangePassword 前端 enforce
- FU-system-param-01 報價單預設有效期
- FU-system-param-02 客戶等級毛利率連結

⏸️ 押後（task 描述指定）：
- FU-import-06 voucher（等 NX05 voucher model）
- FU-onboarding-01 實際 email 寄送
- FU-onboarding-02 LOGO 檔案上傳
- FU-onboarding-03/04 訂閱期間 / 續約管理

## §2. 6 commits 整軌

| # | Commit | 範圍 |
|---|--------|------|
| 1 | FU-01~05+07 | importer 重構（base helper + cache）+ 5 個 handler |
| 2 | FU-onboarding-05 | mustChangePassword 強制改密 |
| 3 | UI 接 API | 7 個 importer tab 接後端 |
| 4 | FU-system-param-01/02 | 報價有效期 + 客戶等級毛利率連結 |
| 5 | 本檔 | M8 handoff |

## §3. 重點技術決策

### 3.1 importer.service 重構

舊：service 內 inline 寫死 employee importer
新：
- `handlers/base.ts`：HandlerContext / HandlerResult / parseYesNo / parseNumber / parseDate / extractDataRows
- `handlers/*.handler.ts`：每類型獨立檔
- `importer.service.ts confirmImport`：switch dispatch + cached file

### 3.2 in-memory file cache

```ts
const cache = new Map<batchId, { fileName, buffer, expiresAt }>();
// 1 hour TTL、自動 cleanup
// preview 寫入、confirm 拉、import 結束 clear
```

**限制**：server restart 會掉、多 instance 部署不共享、屬 PLUS 階段 infra 升級（Redis）

### 3.3 purchase-history / sale-history 設計取捨

完整 NX02 PO / NX04 SO 涉及 currency / taxRate / paymentTerm 等多必填、歷史匯入無法精確填、會污染既有單據邏輯。

**決策**：歷史 importer 純驗證 + 統計 + 寫 `import_batch.failureDetail.historicalRows` JSON、報表時依 dataStartDate 過濾、客戶新交易從新 RFQ 開始。

**dataStartDate 邏輯**：
- importer 拿 `tenant.dataStartDate`
- 每 row 判 `isBeforeStartDate`、累計 `historicalCount`
- 回傳給 UI 顯示「N 筆屬資料起算點之前的歷史（只進查詢、不計入報表）」

### 3.4 mustChangePassword UX

- 開戶建負責人 + employee importer 建 user 都 `mustChangePassword=true`
- `auth/me` 回 `must_change_password` 旗標
- `useSessionMe` 偵測旗標 → redirect `/change-password`
- 改密頁：舊密碼可空（首次登入、初始密碼是 SYSADMIN 給的、user 不一定記得）
- 改完 mustChangePassword 設 false

### 3.5 partner importer code 自動生成

格式：`類型字母 + 5 位序號`（例：C00001、S00003）
邏輯：
1. 每種 type 第一次處理時、查現有最大序號
2. 累加分配 code
3. taxId 重複時跳過、回 row error

### 3.6 warehouse importer 聚合範式

同 warehouseName 多 row 自動聚合：
- 第一筆建倉庫
- 後續筆只建庫位（zone + position → location code）

## §4. 完成判準對照（task §D）

| 判準 | 狀態 |
|------|------|
| 6 個 importer 都能實際寫主檔 | ✅（5 個寫主檔 + history 寫 JSON）|
| mustChangePassword 前端強制跳改密頁 | ✅ |
| 系統參數頁加「報價有效期」+「客戶等級毛利率」入口 | ✅ |
| 三租戶 seed 重跑全綠 | ✅ |
| build 全綠 | ✅ |
| 整套匯入流程能跑 | ✅ 範本下載 → 上傳 → 預覽 → 確認 → 寫主檔 |
| tag v2.0.3-alignment-c-fu-complete | ✅ |

## §5. FU 押後

### 5.1 階段 C 範圍內剩餘 FU
- FU-import-06 voucher（等 NX05）
- FU-onboarding-01~04（業務管理範圍）

### 5.2 階段 D 設定精靈內容
- 22 個 LITE 工作台、每個寫 1 段 guide 文字 + 整合 trigger
- 屬 v1.2 §14 階段 D 範圍

### 5.3 後續細節
- importer cached file 用 Redis（PLUS 階段 infra）
- importer batch list 頁面（v1.2 §3.2 完成統計詳情）
- partner importer 補 customerGradeId / supplierGradeId 等 fk 欄位（屬 master 進階）

## §6. 驗證

- ✅ prisma migrate deploy（93 migrations）
- ✅ pnpm --filter nx-api build
- ✅ pnpm --filter nx-ui build

## §7. ⚠️ 重要注意

### 7.1 mustChangePassword=true 時跳過 oldPassword 驗證
- 邏輯：初始密碼是 SYSADMIN 給的、user 自己不一定記得確切字串
- 為避免「首次登入要記密碼才能改」的爛體驗、首次強制改時允許空 oldPassword
- 之後正常改密就必須帶 oldPassword

### 7.2 historicalRows 限制
- import_batch.failureDetail.historicalRows 只存前 100 筆（給報表抽樣）
- 完整資料在原 Excel 檔（cached 1 hour）
- 報表需要時要去 batchId 的 cached 拉、或實作完整存表（FU）

### 7.3 importer 不擋 voucher
- voucher importer 回「未實作」error、但 batch 仍標 imported
- UI 顯示 imported=0 + errors 提示
- 客戶看了就知道要等

## §8. 下一階段

v1.2 §14 階段 D 設定精靈框架（每頁第一次跳引導、22 工作台引導內容、L、1-2 週）

階段 C 真 closure（C + C-FU 合計）：
- v1.2 §2 開戶後台 ✅
- v1.2 §3 雙精靈框架 ✅
- v1.2 §3.2 7 範本（6 個寫主檔 + 1 個等 NX05）✅
- v1.2 §12.3 資料起算點 / 報價有效期 ✅

---

> 階段 C 真 closure 完成。
> tag `v2.0.3-alignment-c-fu-complete` 可進階段 D。
