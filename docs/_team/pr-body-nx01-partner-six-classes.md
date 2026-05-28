<!-- docs/_team/pr-body-nx01-partner-six-classes.md -->
<!-- 一次性檔、PR 開完即可刪。給 Crown 複製貼上用。 -->

## Summary

NEXORA LITE 藍圖**階段 0 partner 改制** closure（Crown 2026-05-28 拍板）。
六分類定案：**C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商**
同行用獨立代號 O + `canTransferStock` 旗標（對齊 `can_*` 範式），保留少數「保養廠偶爾調貨」彈性。

## Commits（11 個、依時序）

| Step | Hash | 內容 |
|------|------|------|
| 2 | `48ac49e` | schema.prisma 6 處註解 + `canTransferStock` 欄位、migration SQL |
| 3 | `4fdf2e8` | 17 個後端 service filter（同行 'S'→'O'、客戶 'C'→IN('C','O')） |
| 4 | `281eedf` | DTO `PARTNER_TYPES` 清舊（BOTH/CUST/SUP）+ service 支援 `canTransferStock`（同行 O 預設 true） |
| 5 | `f9b36d3` | 前端 active 元件改新六分類（base/api、master-view、catalog-masters、stock-replenishment、nx00 types） |
| 9 提前 | `0835969` | 刪 4 個 nx00 partner 孤兒元件（901 行死碼） |
| 6 | `b0fd466` | seed 三 tier `nx01_partner.csv` 清空業務資料（空殼）、加 `can_transfer_stock` header |
| 7 | `67f8c97` | test fixtures 同行 'S'→'O'（3 處） |
| 8 | `8a21d56` | `_ddl_fragment.sql` partner 對齊（default 'C' + 加 can_transfer_stock） |
| 10a | `c5acaeb` | 整軌 grep 補漏（4 處 `isSupplier` helper 移除 SUP backward-compat） |
| 10b | `4938dd0` | seed `apply-car-brand` drift 順手修（NX01-11 軸翻轉殘留、out-of-scope） |

> Step 1 跑 migration = 純 DB action 無檔案 commit、`prisma migrate deploy` 成功套用 + generate。
> Step 9 提前到 Step 5 後：避免 ts compile fail 留在 commit history。

## 關鍵業務語意

- **客戶選單篩選**：`partner_type IN ('C', 'O')` — 同行也會買貨
- **供應商選單篩選**：`partner_type='S'` only — 純供應商、O 不進採購比價
- **調貨對象篩選**：`partner_type='O' OR canTransferStock=true`
- **ABCD 定價**：保養廠+同行通用（`customer_grade_id` 註解放寬）
- **同行 O service 層 create 時自動帶 `canTransferStock=true`**

## 影響範圍

- 41 檔（+173 / -1085、多刪 = nx00 孤兒 901 + seed 業務資料 98）
- 1 個 migration：`20260528100000_nx01_partner_six_classes_partner_type_and_can_transfer_stock`
- 防禦性 backfill：BOTH/CUST→C、SUP→S（seed 0 筆、prod 防禦 idempotent）

## 驗證結果

- ✅ `prisma migrate deploy` 套用、`migrate status` up to date
- ✅ `nx-api build (nest/tsc)` EXIT=0
- ✅ `nx-ui build (next/tsc)` EXIT=0、所有 routes build 出來
- ✅ Apps grep BOTH/CUST/SUP = 0 殘留
- ✅ Seed 三租戶（LITE/PLUS/PRO）開通成功、admin 帳號 + template 全套用
- ⚠️ Packages 殘留全在歷史 migrations / 本軌 backfill SQL（合法保留、§III.8.4 範式）

## Test plan

- [ ] Alex `pnpm dev` 啟動驗 UI：
  - [ ] partner 主檔 6 分類下拉（C/O/S/T/V/B）
  - [ ] 選 O 同行 → service 自動帶 `canTransferStock=true`
  - [ ] 各模組空畫面（partner 列表 0 筆、可新增第一筆）
  - [ ] `stock-replenishment` 供應商 picker 只看 `partner_type='S'`
- [ ] Crown 最終確認後 merge main

## ⚠️ 不確定點（待 review）

1. nx00 SplitView/FormPanel 認定為孤兒（grep 0 外部 import）、若有 dynamic import 漏掉可 revert `0835969`
2. `sales-rep-dashboard` ['C','B']→['C','O']（Alex 判定為筆誤）— 若銀行真該包含需揭露
3. Step 10b `apply-car-brand` try/catch 範式 — NX01-11 軸翻轉後是否該完全廢棄該 cleanup 段、Alex 可決定 follow-up
4. `_ddl_fragment.sql` 仍有 7 欄位 drift（short_name / name_en / fax / website / service_location / sales_user_id / default_currency_id / default_warehouse_id）— A 系列 backlog

## Out of scope / 不動

- Railway production migration 仍落後 67 支（A077、`.env` 維持 localhost）
- `_ddl_fragment.sql` 7 欄位 drift（非本軌範圍）
- 階段 1 進貨（待本 PR closure + Alex 給指令）
