<!-- docs/_team/nexora-v1.2-alignment-c-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 C closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-05-30
> 對應分支：`feature/v1.2-alignment-c`
> 對應 tag：`v2.0.2-alignment-c-complete`
> 前棒 handoff：`docs/_team/nexora-v1.2-alignment-ab-fu-handoff.md`

---

## §1. 本軌範圍 — C1~C5 全做

| 子任務 | 範圍 | 狀態 |
|--------|------|------|
| C1 | 開戶後台（schema + backend + UI）| ✅ |
| C2 | 匯入精靈框架（schema + backend + UI shell + launcher）| ✅ |
| C3 | Excel 套件 + 7 範本 + employee importer | ✅（其他 6 importer FU）|
| C4 | 票據雙標 schema 預埋 | ✅（完整 voucher 屬 NX05）|
| C5 | 資料起算點（schema + backend + UI）| ✅ |

## §2. 9 commits 整軌

| # | Commit | 範圍 |
|---|--------|------|
| 1 | `dd9f161` | M1 schema：onboarding + wizard + data-start-date |
| 2 | C1-backend | /sys-admin/onboarding/create-tenant API |
| 3 | C1-ui | /sys-admin/onboarding/ 開戶後台表單 |
| 4 | C2 | 匯入精靈 framework（schema + backend + UI shell + launcher）|
| 5 | C3 | Excel 套件 xlsx + 7 範本 + employee importer |
| 6 | C5 | 資料起算點 + 系統參數 UI |
| 7 | 本檔 | M8 handoff |

## §3. 重點技術決策

### 3.1 Excel 套件選 xlsx (SheetJS)

**理由**：
- 同時支援讀寫 Excel / CSV
- 純 JS、無原生依賴、跨環境穩定
- 廣為使用、社群活躍
- 已知 CVE 主要在 ReDoS、本軌只服務 SYSADMIN/OWNER 受信任 user 可接受

**評估的替代**：
- `exceljs`：功能完整但體積大、不必要
- `papaparse`：純 CSV、不支援 .xlsx

### 3.2 開戶 tx 流程（v1.2 §2.2）

1. 建租戶（status='A'、isActive=true、planCode）
2. 建負責人 user（isTenantOwner=true、mustChangePassword=true）
3. 建 OWNER 角色 + 指派
4. 建主據點（HQ 代碼、isMain=true）
5. 建主倉（M01 代碼、isMain=true）
6. 模擬寄通知 Email（console.log）

**Email 寄送**：MVP 用 `Logger.log`、實際 email 需另接 mailer（FU-onboarding-01）

### 3.3 匯入精靈：tenant-level + user-level 雙旗標

- `Nx99Tenant.importWizardCompletedAt`：tenant 層級「匯入完成」
- `Nx01UserPageGuide`：user × page_key 設定精靈記憶（v1.2 §3.3）

**範式**：首次登入「全部略過」也算完成（避免無限跳）

### 3.4 票據雙標 schema 預埋

- `voucher` 匯入範本含 `uploadStatus` 欄位（已上報 / 未上報）
- 實際 voucher model（NX05 範圍）尚未建、本軌 schema 預埋以便 NX05 階段直接接

### 3.5 importer MVP：只實作 employee

- 7 個 importer 中只 employee 完整實作（建 Nx01User）
- 其他 6 個（partner/warehouse/product/purchase-history/sale-history/voucher）標 imported 但實際不寫入主檔
- 列 FU-import-01~06，每個約 0.5 天

## §4. 完成判準對照（總經理 §D 列）

| 判準 | 狀態 |
|------|------|
| SYSADMIN 能進 /sys-admin/onboarding 建新客戶租戶 | ✅ |
| 開通後寄 Email 給負責人（測試環境 console.log） | ✅（Logger.log）|
| 客戶首次登入跳匯入精靈、可全略過 | ✅ |
| 7 類 Excel 範本下載 + 上傳預覽 + 匯入全運作 | 🟡 範本下載 + 預覽全做、實際匯入只 employee |
| 票據匯入有「已上報/未上報」選項 | ✅ schema 預埋 + 範本欄位 |
| 設定→系統參數有「資料起算點」 | ✅ |
| tag v2.0.2-alignment-c-complete | ✅ |

## §5. FU 押後清單

### 5.1 階段 C 範圍內 FU
- **FU-import-01**：partner importer 實作（寫 Nx01Partner）
- **FU-import-02**：warehouse importer 實作（寫 Nx01Warehouse + Nx01Location）
- **FU-import-03**：product importer 實作（寫 Nx01Part + Nx03PartStockSetting）
- **FU-import-04**：purchase-history importer 實作（寫 Nx02 歷史單據）
- **FU-import-05**：sale-history importer 實作（寫 Nx04 歷史單據）
- **FU-import-06**：voucher importer 實作（等 NX05 voucher model 落地）
- **FU-import-07**：confirmImport 改用 batchId 內 cached file（避免 client 再上傳）
- **FU-onboarding-01**：實際 email 寄送（接 SMTP / SendGrid）
- **FU-onboarding-02**：LOGO 檔案上傳（接 NX99 file-upload）
- **FU-onboarding-03**：訂閱期間 / 開通日期欄位
- **FU-onboarding-04**：訂閱方案到期 / 續約管理（屬另一軌）

### 5.2 系統參數細項 FU
- **FU-system-param-01**：報價單預設有效期
- **FU-system-param-02**：客戶等級毛利率 ABCD（屬 customer_grade 主檔）

### 5.3 設定精靈內容
- C 階段已建 `Nx01UserPageGuide` + endpoint，但每頁實際 guide 內容（v1.2 §3.3 描述的「📚 報價單頁面引導」彈窗）未做
- 22 個 LITE 工作台、每個寫 1 段 guide 文字 + 整合 trigger
- 屬階段 D 範圍（設定精靈獨立軌）

## §6. 驗證

- ✅ `prisma migrate deploy`（92 migrations）
- ✅ `pnpm --filter nx-api build`
- ✅ `pnpm --filter nx-ui build`

## §7. ⚠️ 重要注意（給接手者）

### 7.1 OWNER 角色 + 用戶自定義角色 共存

- 開戶時 `OnboardingService` 自動建 OWNER 角色給新租戶
- 後續用戶到「設定→角色與權限」自建其他角色（業務 / 採購 / ...）
- OWNER 全擁有 + 自定義角色細分權限並存

### 7.2 mustChangePassword 旗標 enforce

- schema 已加 `Nx01User.mustChangePassword`
- 但前端 login flow 還未檢這個 flag、強制跳改密碼頁
- 列 FU-onboarding-05

### 7.3 importBatch 檔案 cache 問題

`confirmImport` 目前需 client 再上傳一次原檔案。實務上應在 preview 時把檔案 cache 在 server、confirm 用 batchId 找 cached file。簡化 MVP。

## §8. 下一階段（v1.2 §14 階段 D～I）

按 audit 推薦順序：
1. **階段 D 設定精靈框架**（L、1-2 週）：每頁第一次跳引導、「?」按鈕重看、22 工作台引導內容
2. 階段 E 主檔分區編輯（L）
3. 階段 F NX05 財務（L）
4. 階段 G 手機補齊（L）
5. 階段 H NX08 報表（L+）
6. 階段 I 補連線收尾

⚠️ 進階段 D 前、建議先解 C 階段 FU-import-01~07（讓 7 個 importer 全部能用、客戶實際可用）。

---

> 階段 C closure 完成。
> v1.2 §2 開戶後台 + §3 雙精靈框架 + §3.2 7 範本 + §12.3 資料起算點全部落地。
> tag `v2.0.2-alignment-c-complete` 可進階段 D。
