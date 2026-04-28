<!-- docs/_shared/reference/seed-scope.md -->
# NEXORA Seed Scope Reference

> 用途：列三波 seed 各自涉及的表 + 情境覆蓋
> 維護：每新增一波 seed（demo01/demo02/未來 demo03）同步擴此文件
> 跟 nx-table.csv 的關係：nx-table.csv 是 schema 表目錄（保持純粹）、本文件是 seed scope 索引
> 最後更新：2026-04-28

---

## 0. 三波 seed 架構

NEXORA 採三波疊加式 seed：

```
seed:system          ←  跑一次（部署時）
  ↓
seed:test            ←  跑一次（dev/test 環境初始化）
  ↓
seed:demo02          ←  跑 N 次（demo 資料新增/refresh）
```

各波職責：

| 波 | 主題 | tenant 範圍 | 跑幾次 |
|---|---|---|---|
| `seed:system` | 系統層全域資料 | SYSTEM 租戶（NX99TANT9900000）| 1 次（部署） |
| `seed:test` | 三租戶結構 + template 套用 | LITE/PLUS/PRO（9900001/2/3） | 1 次（環境初始化） |
| `seed:demo02` | 業務 mock 資料 | LITE/PLUS/PRO 各自獨立 | N 次（demo refresh）|

⚠️ **執行順序強制**：seed:demo02 必須在 seed:test 後執行（依賴 template + tenant + warehouse）。

---

## 1. seed:system 涵蓋表

| 表 | row 數 | 用途 |
|---|---|---|
| nx99_tenant (SYSTEM) | 1 | 系統租戶 |
| nx01_user (SYSADMIN) | 1 | NX01USER0000001 |
| nx99_plan | 9 | LITE-S/M、PLUS-S/M/L、PRO-S/M/L/XL |
| nx01_view | 118 | 系統畫面代碼 |
| nx01_country | 6 | 國家清單 |
| nx01_currency | 5 | TWD/USD/EUR/JPY/CNY |
| nx01_warehouse_type | 4 | HW/MW/BW/RW |

**特性**：跨租戶共享、不需 tenantId 過濾。每次 deploy 跑、idempotent upsert。

---

## 2. seed:test 涵蓋表（每租戶）

每個 tenant（LITE/PLUS/PRO）跑：

| 表 | row 數 | 用途 |
|---|---|---|
| nx99_tenant | 1 | 租戶本體 |
| nx99_subscription | 1 | 訂閱方案 |
| nx01_user (admin) | 1 | NX01USER990000{1,2,3} |
| nx01_role | 8 | ADMIN/PURCHASE/SALES/WAREHOUSE/FINANCE/LOGISTICS/HR/HR_ADMIN |
| nx01_user_role (admin) | 1 | admin → ADMIN role |
| nx01_role_view | 826 | 預設角色權限 |
| nx01_warehouse | 1/2/6 | LITE 1 / PLUS 2 / PRO 6 |
| nx01_department | 0/4/6 | LITE 0 / PLUS 4 / PRO 6 |
| nx01_part_brand | 10 | 預設品牌 |
| nx01_car_brand | 5 | 預設車品牌 |
| nx01_part_group | 6 | 零件群組 |
| nx01_customer_grade | 4 | VIP/好客戶/一般/觀察 |
| nx01_discount_code | 4 | 折扣碼 |
| nx05_account_code | 12 | 會計科目 |
| nx07_leave_type | 6 (PRO only) | 假別 |
| nx10_medal_level | 16 (PRO only) | 勳章等級 |
| nx01_user (test users) | 4/6/8 | 測試使用者 |
| nx01_welcome_bulletin | 1 | 歡迎公告 |

**特性**：建立租戶骨架 + template 主檔。跑 1 次。多次跑會 idempotent upsert（不重複建）。

---

## 3. seed:demo02 涵蓋表（每租戶）

業務資料層、依 §3.1 各租戶規模：

### 3.1 主檔（master）

| 表 | LITE | PLUS | PRO | 用途 |
|---|---|---|---|---|
| nx01_partner (C 客戶) | 8 | 40 | 120 | 含分級分布 VIP/好/一般/觀察 |
| nx01_partner (S 同行) | 5 | 10 | 18 | 同行詢價對象 |
| nx01_brand_code_rule | 13 | 13 | 13 | VAG 4 + Asian 5 + Euro/US 4 |
| nx01_part | 50 | 200 | 400 | 品牌混搭 70/20/10 |
| nx01_location | 5 | 10 | 30 | 每倉 ~5 個 |
| nx03_stock_balance | 50 | 400 | 2,400 | 起帳存（金字塔 + 30% 缺貨）|

### 3.2 歷史交易（dormant：5.5 月）

| 表 | LITE | PLUS | PRO | 用途 |
|---|---|---|---|---|
| nx04_so | ~30 | ~120 | ~400 | 半年穩定營運 SO |
| nx04_so_item | ~50 | ~250 | ~1,000 | dormant SO 平均 1~2 line items |

### 3.3 異常情境（busy：7 天 anchor 前）

| 表 | LITE | PLUS | PRO | 用途 |
|---|---|---|---|---|
| nx04_so (busy) | ~15 | ~70 | ~228 | 涵蓋 5 種 transferSourceType |
| nx04_so_item (busy) | ~30 | ~110 | ~500 | busy SO 平均 2 line items |
| nx02_rfq | ~5 | ~25 | ~80 | type='G' 觸發 |
| nx02_qt | ~10 | ~60 | ~200 | 採購採用 + 中間態 |
| nx02_ti / nx02_ti_item | ~3 / ~6 | ~20 / ~40 | ~70 / ~140 | 採用 QT 後建 TI |
| nx04_co | ~2 | ~10 | ~40 | type='B' 觸發 |
| nx03_st / nx03_st_item | 0 / 0 | ~10 / ~20 | ~60 / ~120 | type='T' 觸發（PLUS+ 才有） |

### 3.4 自動維護（trigger）

| 表 | 來源 | 備註 |
|---|---|---|
| nx03_stock_ledger | seed 寫 SO/IT/TI 觸發 trigger | ~500/~1500/~5000 row |
| nx04_so_item.reservedQty | trigger 1 維護 | seed 不直接寫 |
| nx04_so_item.itemStatus | trigger 3 雙寫 | seed 不直接寫 |

### 3.5 不在 seed:demo02 範圍

- nx02_po / nx02_rr / nx02_pr：採購單據（Phase 2 採購工作台才需要）
- nx05_*：財務 ledger（Phase 2/3）
- nx06_dn：物流單（後端 Phase 2）
- nx07_* / nx08_* / nx09_* / nx10_*：HR/分析/KM/遊戲化（Phase 2+）

---

## 4. seed:demo02 業務情境覆蓋（busy 7 天）

依 [seed-demo-02-intent.md §5 Q8](../../nx99/spec/intent/seed-demo-02-intent.md) 拍板表格：

| 情境 | LITE | PLUS | PRO | W2-mini 對應 |
|---|---|---|---|---|
| type='S' 本倉夠 | 8 | 30 | 80 | 桌面節點 4 簡單 SO |
| type='T' 自倉調撥 | 0 | 5 | 30 | 桌面節點 4 跳 W6 |
| type='G' 已採用 QT | 3 | 15 | 50 | 桌面節點 2 → adopt → TI |
| type='G' 中間態（pending）| 2 | 10 | 30 | 桌面節點 2 看 RFQ list |
| type='B' 客戶預訂 | 1 | 5 | 20 | 桌面節點 4 缺貨 fallback |
| 銷退（不在 W2-mini Phase 1）| 1 | 3 | 10 | Phase 2 完整版 |
| 折讓（不在 W2-mini Phase 1）| 0 | 2 | 8 | Phase 2 |
| **加總（busy SO）** | **~15** | **~70** | **~228** | 對齊 §3.1 時間軸 |

**B2 endpoint 驗證點**：每個租戶跑完後、`GET /nx03/stock/reservations?partId=X&warehouseId=Y` 應該至少看到 5 種接龍鎖狀態各 1 個。

---

## 5. Idempotency 策略

| 表類型 | unique key | 策略 |
|---|---|---|
| Partner / Part / Location | (tenantId, code) | findFirst + create fallback |
| Brand code rule | (tenantId, partBrandId) | upsert 嘗試 → fallback findFirst |
| Stock balance | (tenantId, partId, warehouseId) | upsert by composite unique |
| SO / RFQ / QT / TI / CO / ST | docNo @@unique | upsert by docNo |
| SO item / RFQ item / TI item | (parentId, lineNo) — 但無 unique constraint | findFirst + skip-or-create |

**docNo 命名規範**（demo seed 專用，避開生產序號）：

```
{type}-{anchor_yymm}-{warehouseCode}-99{idx:03d}

範例：
  SO-202604-MW1-99001     ← LITE 第一張 SO
  RF-202604-MW1-99005     ← LITE 第五張 RFQ
  TI-202604-Z01-99012     ← PRO 第十二張 TI
```

`99XXX` 序號範圍給 demo seed 專屬、避免跟生產序號（00001~98999）撞。

---

## 6. seed:demo02 三波 staging（Crown 拍板）

依 Crown 拍板「分批跑 + 每波 review 才進下一波」：

```
Stage 1：LITE 誠心汽修
  └─ pnpm --filter db-core seed:demo02:lite
  └─ Crown + Alex review 樣本 → 過了才進下一階段
  └─ commit [WP-PHASE1-DEMO02] seed LITE 誠心汽修

Stage 2：PLUS 順發
  └─ pnpm --filter db-core seed:demo02:plus
  └─ commit [WP-PHASE1-DEMO02] seed PLUS 順發

Stage 3：PRO 全台汽材
  └─ pnpm --filter db-core seed:demo02:pro
  └─ commit [WP-PHASE1-DEMO02] seed PRO 全台汽材
```

如果某波 review 發現問題（業務情境覆蓋不對、fixture 不真實）→ **單一波修正 + 重跑該波**（不影響後續波）。

---

## 7. 跟既有文件的關係

| 文件 | 關係 |
|---|---|
| [nx-table.csv](nx-table.csv) | schema 表目錄（保持純粹、不動）|
| [seed-demo-02-intent.md](../../nx99/spec/intent/seed-demo-02-intent.md) | DEMO-02 intent + 8 題 Crown 拍板 |
| 各 tenant `seed-master.ts` / `seed-dormant.ts` / `seed-busy.ts` | 實際 seed code（Hank 寫）|
| [doc-number-rules.csv](doc-number-rules.csv) | docNo 命名規範（生產用、demo seed 用 99XXX 範圍避開） |

---

## 8. 文件版本

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-28 | 1.0 | 初版，列三波 seed scope + DEMO-02 stage 規劃 |

---

*文件結束。新增 demo seed wave 時擴此文件 §3 + §4 即可。*
