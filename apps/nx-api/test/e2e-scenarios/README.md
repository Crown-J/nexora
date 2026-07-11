<!-- apps/nx-api/test/e2e-scenarios/README.md -->
<!-- 位置：apps/nx-api/test/e2e-scenarios/ -->
<!-- 版本：v1.0（2026-07-11、Hank；0711 驗收戰役腳本轉正） -->
<!-- 說明：對「跑著的 dev server + 本機 Docker DB」打真 API 的情境回歸測試。 -->

# E2E 情境回歸測試

2026-07-11 全系統驗收戰役（dailylog 0711-M~T、97 項 assert）的腳本轉正版。
改過帳邏輯 / 單據狀態機 / 補位鏈之後跑這套、十分鐘內知道有沒有踩壞東西。

## ⚠️ 鐵則

- **只能對本機開發 DB 跑**——腳本會真的建單、過帳、動庫存帳（測後自清還原），
  絕不可把 `apps/nx-api/.env` 指向 Railway production 時執行。
- 各腳本結尾強制清理：單據精準刪（依收集的 id、不整表掃）、庫存餘額備份還原、
  當日流水與稽核清除。中途 Ctrl+C 可能留殘（重跑一次同腳本通常會自清、或手查 remark 含 E2E）。

## 前置

1. 本機 Docker DB 起著（`nexora-postgres`）
2. nx-api dev server 跑著：`pnpm --filter nx-api start:dev`（預設 :3001、可設環境變數 `E2E_API` 覆寫）
3. 認證免設定：自動讀 `.env` 的 `JWT_SECRET` 簽 OWNER token（帳號動態挑租戶第一個 OWNER）

## 跑法

```powershell
# 全套
pnpm --filter nx-api test:scenarios

# 單支
node apps/nx-api/test/e2e-scenarios/05-sales-flow-b.mjs
```

## 情境清單

| 腳本 | 覆蓋 | 回歸重點 |
|---|---|---|
| 01-master-a | 客戶主檔 CRUD、預設出貨倉 | 客戶預設倉優先於使用者補位倉 |
| 02-so-warehouse-fallback | 銷貨建單三層倉補位 | 0711-M DTO 漏鬆綁修復 |
| 03-barcode | 條碼 CRUD/預設搶佔/唯一/resolve | WEIMENG-P2 Step 1/2 |
| 04-batch-price | 批次調價 preview=apply 口徑/防呆 | WEIMENG-P2 Step 3、動態挑小品牌靶 |
| 05-sales-flow-b | 報價→轉單→缺貨 G 分流→同行調貨 | SENT 閘、行級雙向回連 |
| 06-ap-billto | AP 歸戶、付款對象優先序 | 0711-L 有欄無帳收尾 |
| 07-purchase-inventory-cd | 採購入庫、進退+保固、調撥、異常鏈 | ⭐ Plan Guard 拆除、⭐ 保固自動建 bug 修 |
| 08-finance-flow-e | 出貨→AR→收款、銷退全循環、AP 分段沖、關帳鎖 | 帳貨咬合、期間鎖 |

## 設計原則（新增腳本照此）

- 角色/靶料**全動態查詢**（`lib.mjs` 的 `actors()`）、不寫死快照 ID——換 DB 快照仍可跑
- TEMP 資料掛 `E2E-*-TEMP` 標記；清理用 `ctx.wipeDocs(ids)`（FK 順序內建）
- 動庫存的腳本用 `backupBalances`/`restoreBalances` 守衛（連當日流水一起清）
- 業務閘（4xx）也是資產：擋下來＝PASS、訊息可讀性順便驗
- 已知待 CTO 定案的口徑（如折讓未稅、沖銷明細列）只驗存在、不鎖數值——定案後再收緊
