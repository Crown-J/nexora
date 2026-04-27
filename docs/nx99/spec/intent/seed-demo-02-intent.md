<!-- docs/nx99/spec/intent/seed-demo-02-intent.md -->
# TASK-SEED-DEMO-02 — 業務 mock 資料 seed 規劃

> 文件類型：規劃文件（Hank 寫，列拍板問題清單給 Crown）
> 撰寫者：Hank
> 日期：2026-04-27
> 對應計畫：plan v1.1（Phase 1 W2-mini 雙線並行 task）
> 狀態：**待 Crown 拍板問題清單** → 拍板後才寫 seed 程式碼

---

## 0. 文件性質

這份規劃 W2-mini 上線前需要的「業務 mock 資料 seed」。**不是寫程式、是規劃 + 列拍板問題**。

W2-mini Phase 1 目標 = 業務跑 5~10 次都順（Crown Q4 拍板）。「跑得順」需要：
- 真實感的客戶結構（不是 customer-001/002/003）
- 真實感的料號（VAG/Asian/Euro 零件號 + 對應品牌）
- 真實感的庫存狀態（不是每倉每料 999）
- 真實感的歷史交易（最近 7 天 busy + 之前 5.5 月 dormant）
- 真實感的詢價/報價歷史（同行調貨情境覆蓋）

DEMO-02 是**取代既有 client-side mock-data 的後端 seed 版本**。LITE/PLUS/PRO 三租戶各自有完整故事線。

---

## 1. 三租戶結構（Crown 過往拍板）

| 租戶 | 角色 | user | 部門 | 倉 | 客戶 | 同行 | 料號 |
|---|---|---|---|---|---|---|---|
| LITE：誠心汽修 | 單店、夫妻檔 | 5 | 無 | 1（MW1）| 8 | 5 | 50 |
| PLUS：順發 | 中型、有 SOP | 7 | 4（業務/採購/倉管/財務）| 2（MW1+BW1）| 40 | 10 | 200 |
| PRO：全台汽材 | 大型、多店 | 9 | 6（+人資/管理）| 6（HW1+MW1+BW1~4）| 120 | 18 | 400 |

**故事線分歧**：
- LITE：夫妻店、報價靠經驗、缺貨直接打電話、無 SOP
- PLUS：中型、有採購 SOP、開始用同行調貨補缺、業務分區
- PRO：多店、調撥頻繁、客戶有 VIP/好/一般/觀察分級、業務+業助分工

---

## 2. W2-mini 用得到的表（涵蓋範圍）

### 2.1 必要 seed（W2-mini Phase 1 直接讀）

| 表 | LITE | PLUS | PRO | 用途 |
|---|---|---|---|---|
| nx01_user | 5 | 7 | 9 | 業務 / 採購 / 倉管 / 主管 |
| nx01_role_user | × | ✓（4 roles）| ✓（6 roles）| RBAC |
| nx01_department | 0 | 4 | 6 | 部門歸屬 |
| nx01_warehouse | 1 | 2 | 6 | 已 seed（template）|
| nx01_partner (C) | 8 | 40 | 120 | 客戶（含分級）|
| nx01_partner (S) | 5 | 10 | 18 | 同行（type='S'）|
| nx01_part_brand | 已有 | 已有 | 已有 | template seed |
| nx01_brand_code_rule | 各品牌 1 條 | 同 | 同 | 給 part 編碼 |
| nx01_part | 50 | 200 | 400 | 料號主檔（含品牌混搭）|
| nx01_location | 每倉 ~5 個 | ~5/倉 | ~5/倉 | 庫位 |
| nx01_customer_grade | 已有 | 已有 | 已有 | template |
| nx03_stock_balance | 50 row | 200×2=400 | 400×6=2400 | 起帳存（每倉每料一筆）|

### 2.2 歷史交易 seed（asymmetric：5.5 月 dormant + 7 天 busy）

| 表 | LITE | PLUS | PRO | 備註 |
|---|---|---|---|---|
| nx04_so | ~30 | ~120 | ~400 | 銷貨歷史 |
| nx04_so_item | ~80 | ~360 | ~1500 | line items |
| nx02_rfq | ~5 | ~25 | ~80 | 同行詢價 |
| nx02_qt | ~10 | ~60 | ~200 | 報價（多筆同 RFQ）|
| nx02_ti | ~3 | ~20 | ~70 | 調貨單 |
| nx04_co | ~2 | ~10 | ~40 | 客戶預訂 |
| nx03_st | 0（單倉沒調撥）| ~10 | ~60 | 自倉調撥 |
| nx03_stock_ledger | 由 trigger 維護 | 同 | 同 | 庫存異動歷史 |

### 2.3 不在 DEMO-02 範圍

- nx02_po / nx02_rr / nx02_pr：採購單據（Phase 2 採購工作台才需要）
- nx05_*：財務 ledger（Phase 2/3）
- nx06_dn：物流單（已被 fulfillment store mock 涵蓋，後端 Phase 2）
- nx07_* / nx08_* / nx09_* / nx10_*：HR/分析/KM/遊戲化（PRO only，Phase 2+）

---

## 3. Asymmetric 6 個月歷史的設計理由

### 3.1 時間軸（按租戶規模調整、對齊 §5 Q8）

```
[2025-11-01]                                              [2026-04-27]
    │                                                          │
    ├──── 5.5 月 dormant period ────┤  ├── 最後 7 天 busy ────┤
    │   依租戶規模穩定營運          │  │ 大量 SO + 詢價 + 缺貨 │
    │   零星詢價（每月 1~2 筆）     │  │ 業務跑 W2-mini 試用   │

各租戶 busy 期 SO 量（對齊 §5 Q8 加總、業界規模真實對應）：

  LITE 誠心汽修（單店）：       7 天 ~15 筆 SO（每天 ~2 筆）
  PLUS 順發（中型有 SOP）：     7 天 ~70 筆 SO（每天 ~10 筆）
  PRO  全台汽材（多店大型）：   7 天 ~228 筆 SO（每天 ~30 筆）

各租戶 dormant 期 SO 量（5.5 月平均）：

  LITE: 平均每週 1 筆（半年 ~30 筆）
  PLUS: 平均每週 5 筆（半年 ~120 筆）
  PRO:  平均每週 15 筆（半年 ~400 筆）
```

### 3.2 為什麼這樣設計

- **dormant 5.5 月**：建立「真實營運紀錄」感，讓 W2-mini 業務查料號時可以看到「這個料客戶 X 半年前買過 5 個」之類的歷史
- **busy 7 天**：模擬「業務開始上 W2-mini 系統的這週」— 大量 SO/RFQ/QT 都集中在這週，模擬「線上系統剛上線、業務認真試用」的故事
- **缺貨情境集中後 7 天**：reserved_qty 反查（B2）才有東西可以看（接龍鎖、type='G' 中間態等）

### 3.3 給 Crown 校對的時間錨點

「現在」= 2026-04-27（今天）
- dormant 起點：2025-11-01（5 月 27 天前 ≈ 5.5 月）
- busy 起點：2026-04-21（7 天前）
- 最後一筆 SO：2026-04-26（昨天）

⚠️ **拍板問題 §5 Q3** 確認這個時間錨點是否合理。

---

## 4. 品牌混搭設計（Crown 拍板：VAG 70% + Asian 20% + Euro/US 10%）

### 4.1 為什麼這樣分布

NEXORA 主場 = VAG（Volkswagen Audi Group）零件經銷商，所以 VAG 70%。
但實務上汽修廠也會修日系（豐田、本田）跟其他歐系（BMW、Benz）甚至美系（Ford、GM），demo 要覆蓋這些情境讓業務跑 W2-mini 時看到真實混搭。

### 4.2 三租戶分布（Hank 提案，等 Crown §5 Q4 確認）

| 租戶 | VAG | Asian | Euro/US | 料號數 |
|---|---|---|---|---|
| LITE | 70% (35) | 20% (10) | 10% (5) | 50 |
| PLUS | 70% (140) | 20% (40) | 10% (20) | 200 |
| PRO | 70% (280) | 20% (80) | 10% (40) | 400 |

### 4.3 品牌覆蓋

VAG: VW / Audi / SEAT / Skoda（4 個 sub-brand）
Asian: Toyota / Honda / Nissan / Mazda / Hyundai（5 個）
Euro/US: BMW / Benz / Ford / GM（4 個）

每個 sub-brand 對應 1 條 brand_code_rule（如 VAG 的 8K0-XXX-XXX 格式、Toyota 的 90919 格式）。

⚠️ **拍板問題 §5 Q5** 確認 sub-brand 覆蓋度。

---

## 5. ⚠️ Crown 拍板問題清單（業界 muscle memory 題，Hank 不該自己決定）

### Q1：客戶分級分布

每租戶的 customer_grade 分布：

| 級別 | LITE | PLUS | PRO | 備註 |
|---|---|---|---|---|
| VIP | 1 | 5 | 15 | 月結 60、優先供貨 |
| 好客戶 | 3 | 15 | 50 | 月結 30、正常供貨 |
| 一般 | 3 | 15 | 40 | 月結 30 |
| 觀察 | 1 | 5 | 15 | 先付款 |

⚠️ Crown 拍板：分布是這樣，還是要調整？實務上「好客戶」應該佔最多嗎？

### Q2：同行 partner 是否能跟客戶重疊（同一個 partner 同時有 type='C' + type='S'）

業界常見：A 修車廠是我們客戶（買零件），但偶爾我們缺貨也跟 A 調貨（A 變我們同行）。schema 限制每個 partner 只有一個 partner_type，**不能重疊**。

選項：
- (a) demo 不重疊（partner 分兩組、各自獨立）— 最簡單
- (b) demo 內 1~2 筆同名 partner 在不同 type 各建一筆（partner code 加 -C/-S 後綴）— 模擬真實
- (c) 改 schema 讓 partner_type 可多值 — 不在 DEMO-02 範圍、屬 schema patch

⚠️ Crown 拍板：選哪個？

### Q3：時間錨點

- 「現在」= 2026-04-27
- dormant 起點 = 2025-11-01（5.5 月前）
- busy 起點 = 2026-04-21（7 天前）

⚠️ Crown 拍板：時間錨點 OK？或要寫死特定起點（避免 demo 跑時 "今天" 變動讓 dormant 跨年）？

**Hank 工程提案**：seed 寫死 anchor date（例如 hardcode `DEMO_ANCHOR_DATE = '2026-04-27'`），不依 `new Date()`。Crown 確認後 W2-mini 上線時若要刷新可手動改 anchor date 重 seed。

### Q4：每租戶業務員 vs 客戶配比

- LITE 5 user：1 老闆 + 1 業務 + 1 採購 + 1 倉管 + 1 sysadmin
- PLUS 7 user：誰負責業務？誰負責採購？8 客戶 / 業務 = 1 業務帶 8 客戶；40 客戶要 5 個業務？

⚠️ Crown 拍板：
- (a) PLUS 業務 1 人帶全 40 客戶
- (b) PLUS 業務 2 人各帶 20
- (c) PLUS 業務 3~4 人各帶 10~13

PRO 同理：
- (a) PRO 業務 2 人各帶 60
- (b) PRO 業務 4 人各帶 30
- (c) PRO 業務 6 人各帶 20

業界 muscle memory：中型 1 業務帶 20~30 客戶常見，大型業務分區（區域分配）。

### Q5：品牌混搭粒度（§4.2 提案是否 OK）

提案：VAG 70% + Asian 20% + Euro/US 10%（三租戶都同比例）。
sub-brand：VAG 4 個 / Asian 5 個 / Euro/US 4 個 = 13 個 sub-brand。

⚠️ Crown 拍板：
- 比例 OK 嗎？
- sub-brand 覆蓋度 OK 嗎？或要改（例如 VAG 加 Bentley / Lamborghini？Asian 加 Suzuki？）
- LITE 50 料號要不要每個 sub-brand 都覆蓋（每個 sub-brand 至少 1 個）or 集中在 VAG 主品牌？

### Q6：庫存「起帳存」哲學

W2-mini 業務查料號時看到的 stock_balance 起點怎麼設？

選項：
- (a) **均勻**：每倉每料 onHandQty 隨機 5~30
- (b) **金字塔**：熱門 20% 料號庫存高（30~100）、長尾 80% 料號庫存低（0~10）
- (c) **缺貨集中**：故意讓 30% 料號 onHandQty=0、強制 W2-mini 觸發缺貨分流（type='T'/'G'/'B'）
- (d) 其他

業界真實：金字塔 + 部分缺貨（b+c 混合）。

⚠️ Crown 拍板：W2-mini 5~10 次跑要看到多少缺貨情境？建議 30% 料號缺貨（讓業務每跑 3 次就會撞到一次）。

### Q7：平均成本 / 售價真實值

DEMO-02 要不要塞「真實業界價格」？

- VAG 機油濾芯 ~150 元、煞車片 ~800 元、避震器 ~5000 元（業界真實）
- 還是 demo 用 round numbers（100 / 500 / 1000）省事？

⚠️ Crown 拍板：
- (a) 真實價格範圍（業務看了感覺對）
- (b) Round numbers 簡化（demo 階段省事）

**Hank 工程提案**：seed 程式碼用「分類別 → 隨機區間」方式（耗材類 50~300、消耗品 200~1500、結構件 1000~10000），不寫死每筆。Crown 拍 (a) 的話我會用區間 random。

### Q8：異常情境覆蓋（最後 7 天 busy 期間）

W2-mini 跑得順 = 業務要看到各種情境。Hank 提案 7 天 busy 內覆蓋：

| 情境 | LITE | PLUS | PRO |
|---|---|---|---|
| type='S' 本倉夠（直接出貨） | 8 筆 | 30 | 80 |
| type='T' 自倉調撥（不夠調別倉）| - | 5 | 30 |
| type='G' 同行調貨（採用 QT 採購到）| 3 | 15 | 50 |
| type='G' 同行調貨（RFQ 中間態還沒採用）| 2 | 10 | 30 |
| type='B' 客戶預訂（缺貨改預訂）| 1 | 5 | 20 |
| 銷退（return） | 1 | 3 | 10 |
| 折讓 | 0 | 2 | 8 |

⚠️ Crown 拍板：覆蓋面 OK？要不要加「業務改 transferSource」「同行報價拒絕重 RFQ」「採購採用後反悔」等邊角情境？

---

## 6. Hank 工程判斷（不問 Crown，這些自己決定）

### 6.1 Idempotency 機制

每筆 seed row 用 `${FIXTURE_PREFIX}-${tenant_short}-${idx}` 作為 code（如 `DEMO02-LITE-CUST-001`），upsert by code。多次跑 seed 不會重複建。

### 6.2 Seed 命令結構

擴 [packages/db-core/package.json](packages/db-core/package.json) 加：
```
"seed:demo02": "tsx prisma/seed/index.ts --mode demo --tier all"
"seed:demo02:lite": "tsx prisma/seed/index.ts --mode demo --tier lite"
"seed:demo02:plus": "tsx prisma/seed/index.ts --mode demo --tier plus"
"seed:demo02:pro":  "tsx prisma/seed/index.ts --mode demo --tier pro"
```

### 6.3 跑批順序（dependency 順序）

```
1. partner（customer + supplier）         ← 沒依賴
2. brand_code_rule                        ← 依賴 part_brand（template）
3. part                                    ← 依賴 brand_code_rule + part_brand
4. location                                ← 依賴 warehouse（template）
5. stock_balance（起帳存）                 ← 依賴 part + warehouse
6. SO history（dormant 期）                ← 依賴 customer + part + warehouse
7. SO history（busy 期 + 各情境）           ← 依賴所有上面 + 觸發 D4 translator 自動建 IT/RFQ/CO
```

⚠️ Step 6/7 是否要走 D4 translator endpoint（呼叫 nx-api）還是直接 INSERT 繞過？提案：直接 INSERT（不走 nx-api，避免 seed 對 server runtime 依賴），但**手動模擬** D4 行為（建 SO + IT/RFQ/CO + stock_balance.reservedQty 更新）。

### 6.4 Seed 跟 Phase 0 已落地的關係

- 不動 schema（DEMO-02 純資料 seed）
- 不動 D4/B5/B2 service code
- 跟 template seed 並存（template 提供 system row、demo 提供業務 row）
- 三波 seed 是疊加：`seed:system` → `seed:test`（template + 3 tenants 殼）→ `seed:demo02`（業務資料填進殼）

### 6.5 跟 W2-mini 的時序關係

- DEMO-02 階段一（這份規劃 + Crown 拍板）= 今天
- DEMO-02 階段二（寫 seed code）= W2-mini 意圖版寫好後（避免設計衝突）
- DEMO-02 階段三（跑 seed + 驗 W2-mini）= W2-mini Phase 1 落地時

---

## 7. 給 Crown 的拍板要求

請拍板以下 8 題：

| Q# | 問題 | Hank 建議 |
|---|---|---|
| 1 | 客戶分級分布 | 提案表格（§5 Q1）|
| 2 | 同行 vs 客戶重疊 | (a) demo 不重疊（最簡）|
| 3 | 時間錨點 + hardcode anchor date | 採 hardcode `DEMO_ANCHOR_DATE = '2026-04-27'` |
| 4 | 業務員 vs 客戶配比 | LITE 1 業務 / PLUS 2 業務 / PRO 4 業務（業界中型偏好）|
| 5 | 品牌混搭粒度 | VAG 70% / Asian 20% / Euro/US 10%、13 sub-brand 全覆蓋 |
| 6 | 庫存起帳存哲學 | 金字塔 + 30% 缺貨混合 |
| 7 | 真實價格 | (a) 分類隨機區間 |
| 8 | 異常情境覆蓋 | §5 Q8 提案表格 |

拍板後 Hank 進階段二（寫 seed 程式碼），預計 1~2 天落地（依 W2-mini 進度同步）。

---

## 8. 不在這份文件範圍

- W2-mini intent / impl spec（Alex / Hank 後續寫）
- Phase 0 schema 變動（DEMO-02 不動 schema）
- 跨租戶 demo 場景（DEMO-02 三租戶各自獨立、不模擬「LITE 升級到 PLUS」資料遷移）
- 國際版（多語系）— Phase 2+
- 真實客戶資料（DEMO-02 只塞 mock，不能用真實業務資料）

---

## 9. 文件版本

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-27 | 1.0 | 初版規劃，列 8 題 Crown 拍板問題清單 |
| 2026-04-27 | 1.1 | Crown 拍板全 8 題；§3.1 時間軸按租戶規模拆分對齊 §5 Q8 加總（PRO 7 天 ~228 SO 對齊大型廠真實業界）|

---

*文件結束。Crown 拍板 §5 Q1~Q8 後 Hank 進階段二寫 seed 程式碼。*
