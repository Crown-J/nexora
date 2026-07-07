<!-- docs/_team/weimeng-import-handoff.md -->
<!-- 位置：docs/_team/weimeng-import-handoff.md -->
<!-- 版本：v1（2026-07-07 Hank 執行）— 動工報告書 + 交接（對話將滿、供下一棒接手）-->
<!-- 說明：偉盟進銷存歷史「銷貨」匯入的完成報告與續作交接。跨對話接手先讀本檔 + git log。 -->

# 偉盟進銷存匯入 — 動工報告書 + 交接

## 0. 一句話
把偉盟 2.23GB / 640 萬列的進銷存歷史，**只取「銷貨(類型3) 2024-01~2026-06-22」共 41.7 萬列**，當**唯讀歷史單**（不過帳、不動庫存）灌進 `Nx04So/Nx04SoItem`，孤兒客戶/料號自動建 placeholder，並做查詢壓測。**已完成、待執行長驗收**。

---

## 1. 決策脈絡（執行長拍板）
- 原檔 `docs/專案/測試資料/20260707_進銷存單據.csv`（2.23GB、6,388,456 列、**無表頭**、73 欄對照用上一版表頭）。
- 類型碼（偉盟選單由上至下）：**1 進貨 / 2 進退 / 3 銷貨 / 4 銷退 / 5 重組盈虧 / 6 盤點盈虧 / 7 報廢 / M 多倉庫位調撥**。
- **庫存＝6/22 各倉庫存快照當期初、不用交易重建**（執行長採納 Hank 建議，推翻早先「重播過帳」）。原因：重播需含 5/6/7 盤點/報廢否則對不回 6/22，投報差；且 2001 年舊價對「近一個月自動帶價」無用。
- **歷史交易只當唯讀紀錄匯入**，聚焦近期銷貨（價格記憶價值）。
- **壓力測試改測「大量資料下的查詢效能」**，非測 bulk 塞入本身。
- **孤兒（缺客戶/料號）全建 placeholder + 給維護清單**，日後執行長回頭維護。
- ⚠️ **只在本機 dev DB（租戶 TW-100001 = NX99TANT9900004）；Railway 絕不碰。**

---

## 2. 做了什麼（Phase 1~4 完成）
| Phase | 內容 | 產出 |
|---|---|---|
| 1 抽取 | csv-parse 引號感知串流 2GB → 篩銷貨(3)+2024~6/22 | 41.7 萬列 → `sales.tsv`（scratchpad，會消失、可重抽）；不重複 客戶1213/料號35979/庫位48 |
| 2 placeholder | 缺客戶 **30**、缺料號 **1063**（倉庫缺 0） | 建檔完成；維護清單見 §4 |
| 3 載入 | 組 SO 表頭+明細 bulk 載入、status='C' 唯讀、remark='偉盟匯入'、**不過帳不動庫存** | **SO 208,934 張 / 明細 417,655 列** |
| 4 壓測 | 量關鍵讀取路徑 | 全部 5~16ms（見 §5）✅ |

**注意欄位對照**：表頭 73 欄、資料列 69 欄，前 52 欄對齊已驗證（總價=數量×單價 驗過）。0-based index：單號0/類型3/客戶4(舊碼)/日期5/料號6/品名8/廠牌24/庫位27/數量29/單價30/總價32/未稅39/建單人48/建單時間49。~5.6% 列品名或備註含逗號、**必須用 csv-parse（引號感知）不能用 awk**。

---

## 3. 匯入設計要點
- **客戶**：偉盟舊碼 → `Nx01Partner.legacyCode` 對應（原本就保留、98% 命中）。
- **料號**：偉盟料號 → `Nx01Part.code`（或 secCode）。placeholder 的 code=料號本身、secCode=同、name=品名+「【待維護-偉盟匯入】」。
- **倉庫**：庫位前 3 碼（Z01A→Z01）→ `Nx01Warehouse`（Z01~Z04 都已存在）。SO 明細只需倉庫、不需庫位。
- **SO 表頭**：docNo=偉盟單號、status='C'+completedAt、remark='偉盟匯入'、createdBy=租戶首位使用者、soDate=偉盟日期。
- ⚠️ **currencyId 必須帶真正 TWD 的 id（NX01CURR…）**，不能靠 schema 預設 `"TWD"`（那是字串、非 FK id、會炸 FK）。這是踩過的坑。
- ⚠️ **記憶體**：一次把 41.7 萬明細建成陣列再插會 OOM（heap 4GB）。作法：**邊建邊 flush（每 2000 筆 createMany）+ `NODE_OPTIONS=--max-old-space-size=8192`**。

---

## 4. 給執行長維護的產出（已入 git）
- `docs/_team/weimeng-placeholder-customers.tsv`（30 筆：代號/舊碼/名稱）
- `docs/_team/weimeng-placeholder-parts.tsv`（1063 筆：料號/品名）
- （`docs/專案/測試資料/` 被 gitignore，故清單放 `docs/_team/`）
- 這些是「因銷貨用到、但主檔沒有、系統自動補的」，名稱都標【待維護-偉盟匯入】，回頭補正資料即可。

---

## 5. 壓測結果（41.7 萬明細 / 20.9 萬 SO）
| 查詢 | 耗時 |
|---|---|
| 銷貨列表 前100 | 5.1 ms |
| 自動帶價：同客戶該料最近成交 | 16.3 ms |
| 比價⑤：同料市場最近成交 | 6.1 ms |
| 歷史價：同客戶該料近一個月 | 8.0 ms |
| 客戶交易數 count | 15.6 ms |
| 該料被賣過幾次 count | 4.2 ms |
**結論：索引有效、此量級下讀取無瓶頸、不需優化。**

---

## 6. 續作 / 待辦（下一棒）
- **範圍是切片**：只匯了「銷貨(3) 2024~6/22」。**未匯**：2001~2023 舊銷貨、銷退(4)、進貨(1)、及全部 5/6/7/M（依建議略過）。要擴：改 `weimeng-extract-sales.ts` 的 `DATE_FROM`/類型再跑一輪 → placeholder → load-items。
- **動工報告書＝本檔**，可直接給執行長驗收。
- 若執行長要「銷退/進貨」也進來：進貨要落 `Nx02Rr`（不是 Ti，Ti 明細必填 sourceSoItemId 卡 SO）、且 RrItem 必填「庫位(Location)」需另做庫位對照+placeholder。

---

## 7. 腳本（packages/db-core/scripts/，已入 git、可重跑）
- `weimeng-extract-sales.ts` — 串流抽取 → sales.tsv + 不重複集合（scratchpad）。
- `weimeng-placeholders.ts` — 建缺客戶/料號 placeholder + 維護清單。
- `weimeng-load-sales.ts` — 組表頭+明細載入（⚠️ 明細段會 OOM、僅用其表頭邏輯參考）。
- `weimeng-load-items.ts` — **明細專用、記憶體精簡版（先刪半途再重灌）**＝實際用這支補明細。
- `weimeng-stress.ts` — 壓測計時。
- 重跑順序：extract → placeholders → (表頭) → load-items（帶 8GB heap）。

---

## 8. 本 session 其他資料異動（客戶主檔，同租戶）
- 名稱**開頭 `*` 或結尾 `-待開檔`/`-結束`/`-不存在`** 的客戶 → 停用（614 筆停用）。
- **無上述標記卻被停用的 1620 筆 → 重新啟用**（停用與否純由名稱標記決定）。
- **A0490（振群汽車材料）** 原錯歸保養廠(C0489) → 改**同行 O0969**、canTransferStock=true、啟用；PARTNER_O 計數器已推到 970。
- 主檔搜尋維持「停用客戶正常搜尋不出現、要用垃圾桶」的既有行為（曾改又收回）。

---

## 9. 關聯文件
- NX04 報價/詢價紀錄軌（A~D 已完成）：`docs/_team/nx04-quote-pricing-architecture.md`
- 記憶：[[project_nx04_quote_pricing_architecture]]、[[project_henyin_part_import]]
