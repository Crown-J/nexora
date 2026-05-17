<!-- docs/nx09/nx09-audit-02.md -->

# NX09-AUDIT-02 — 亞羅特色（VIN 對照 + 維修 SOP）業界專業真相 verify

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-17
> 觸發：NEXORA v1.4 八角完整化 + NX10 雙軌全 closure（main HEAD `018ed4b`、12 tag）後、Crown 啟動深化期第一軌 NX09-IMPL-02 亞羅特色前 verify
> 對齊：NX09-IMPL-01 closure 範式（v1.2.0、Crown Q2=b 拆 2 軌、IMPL-02 留亞羅特色）+ §I.5 #22 鐵律「Alex 寫業務需求前 verify 業界專業真相」+ §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §0 IMPL-01 closure 狀態快照（A041 精確）

```
grep -c "^model Nx09" packages/db-core/prisma/schema.prisma    → 11
ls apps/nx-api/src/nx09/ | grep -v module                       → article / document / meeting / system-manual / fulltext-search / sub-tables（6 子模組）
grep -c "@(Get|Post|Patch|Delete)\(" apps/nx-api/src/nx09/**/*.controller.ts  → 26
```

**A041 真實**：11 model / 6 controller / 26 endpoint（IMPL-01 後）。

### NX01 vehicle chain 完整化揭露（IMPL-02 上下文）

- ✅ `Nx01CarBrand`（line 301）+ `Nx01Model`（line 7223、含 `modelYearFrom/To` + `engineId` + `carBrandId`）+ `Nx01Engine`（7058）+ `Nx01PartModel`（7336、partId + modelId + fitLevel 1=原廠/2=副廠/3=通用）
- ✅ NX01-12/13/14/15/16 規格書全落地（拓樸 12→15→14→13→07→05→17→16）
- ⭐ **重大揭露**：`grep -ni 'vin|chassis_no|chassis_number' schema.prisma` → **0 hit**（schema 全棧無 VIN 欄位）

⚠️ 意涵：VIN 對照若本軌做、必新建 schema（最小化 = VIN→Model 對照表 + 既有 PartModel 鏈完成 VIN→Parts 查詢）。

### §I.6.3 §0 揭露不完整

- 未 verify Yaro 30 年知識資產真實匯入狀態（NX01-16 plan 揭露走獨立 A 系列軌、本軌前無 verify）
- 未 verify NX01-15 `vehicle_classification` 是否含 VIN 欄位（spec 文件未 grep）

---

## §1 VIN 業界真相 verify

### 1.1 VIN 17 碼國際標準

| 段 | 碼數 | 範圍 | 業務語意 |
|---|---|---|---|
| **WMI**（World Manufacturer Identifier）| 3 | 1-3 | 製造商 / 國家代碼（如 `WVW`=VW 德國、`JHM`=Honda 日本、`1G1`=GM 美國）|
| **VDS**（Vehicle Descriptor Section）| 6 | 4-9 | 車型 / 車身 / 引擎 / 變速箱 / 約束系統等（OEM 自定義）|
| **VIS**（Vehicle Identifier Section）| 8 | 10-17 | 第 10 碼 = model year（1980 起、A-Y/1-9 循環）/ 第 11 碼 = plant code / 12-17 = serial |

依據：ISO 3779 / SAE J853 / 49 CFR Part 565（美國 NHTSA）

### 1.2 表 1：VIN 結構 + 業界查詢流程

| 業界場景 | 查詢路徑 | 落地範式 | 亞羅可行度 |
|---|---|---|---|
| **VIN → 車型/年份**（VIN decode） | 17 碼解析（WMI 查廠 + 第 10 碼查 year + VDS 查 model）| 走 NHTSA vPIC API（免費）/ 商業服務 / 本地 lookup table | ⚠️ NHTSA 主要美規車、台灣車覆蓋有限 |
| **車型/年份 → 適配料件**（part lookup） | model_id → part_model JOIN → parts list | ✅ NEXORA NX01-16 PartModel 已落地（partId + modelId + fitLevel） | ⭐⭐⭐ 既有 schema 直接走 |
| **VIN → 適配料件**（end-to-end） | VIN decode → model_id → PartModel | NEXORA 需補 VIN→Model 對照 + 既有 PartModel 鏈 | ⭐⭐ 本軌候選 |
| **業務員手動查詢**（Yaro 30 年腦中記憶） | 「Golf 7 GTI 適配什麼機油濾芯？」→ 直接查 model | ✅ 既有 PartModel 直接走（不需 VIN） | ⭐⭐⭐ 高頻場景、不依賴 VIN |
| **客戶來電報 VIN**（客戶不知道車型） | VIN → decode → model → parts | 需 VIN decode 能力 | ⭐⭐ 低頻、但提升專業度 |

⭐ **重大揭露**：業界中小汽配店日常 95% 業務走「車主口報車型/年份/排氣量」、5% 走 VIN（多為進口車 / 客戶不確定車型時）。**Yaro 戰略資產核心是 PartModel 對照表（已落地）、VIN decode 是錦上添花**。

### 1.3 業界對標範式

| 範式 | 場景 | 真實性 | 亞羅 fit |
|---|---|---|---|
| **NHTSA vPIC API** | 免費 VIN decode（美規車為主）| ✅ 真實免費（vpic.nhtsa.dot.gov）| ⚠️ 台灣車覆蓋有限 |
| **ACES / PIES**（Auto Care Association）| 北美料件適配標準（XML 交換格式）| ✅ 業界標準 | ⚠️ 北美格式、台灣未通用 |
| **TecDoc**（EU）| 歐洲 OEM/廠商共建 VIN→Parts | ✅ 商業授權 | ⚠️ 歐洲為主、需 licensing |
| **OEM workshop manual** | 各廠原廠維修手冊 | ✅ 各 OEM 私有 | ⚠️ 取得難 |
| **業務員手動建檔**（Yaro 30 年知識）| 紙本筆記 → 系統化 | ✅ Yaro 真實狀態 | ⭐⭐⭐ NEXORA NX01-16 範式 |

### §I.6.3 §1 揭露不完整

- 未 verify 台灣本土 VIN decode 服務（如 VSCC 車輛安全資訊網、各 OEM 台灣經銷商 API）
- 未 verify Yaro 客戶是否實際會口報 VIN（業務真實場景比例）
- 未 verify NEXORA 是否需 supports 第三方 VIN decode call out（vs 純本地對照表）

---

## §2 Partslink API verify（PROJECT_CONTEXT 提及「未來整合」）

### 2.1 memory + PROJECT_CONTEXT 揭露真相

`grep -n 'Partslink' docs/PROJECT_CONTEXT.md` → 1 hit：

```
docs/PROJECT_CONTEXT.md:209: - Partslink（VIN / 車架號零件查詢、未來整合）
```

- ⚠️ memory 全棧（`C:/Users/User/.claude/projects/c--nexora/memory/`）→ **0 hit Partslink/VIN**
- ⚠️ 全 docs 棧 → **僅 PROJECT_CONTEXT 1 處**（標「業界參考資源 / 未來整合」、無具體技術方案）

### 2.2 Partslink 業界真相 verify

`Partslink` 是 **LKQ Corporation 旗下產品**：
- 主要範圍：**北美 collision repair industry**（碰撞修復、外觀件、保桿、燈具、葉子板）
- 商業模式：經銷商網路 + 廠商目錄 lookup
- **API 公開性**：未公開 RESTful API（需 partnership / licensing、無公開 API doc）
- 適用範圍：北美 OEM 後市場 collision parts、不涵蓋全車料件（如機油 / 煞車 / 引擎內部件）
- **VIN decode 能力**：間接（透過經銷商系統、非直接 API endpoint）

⭐ **重大揭露**：Crown PROJECT_CONTEXT 標「Partslink 未來整合」= **brainstorm 階段 / 業界知名度引用**、未 verify 商業可行性。本軌不適合做 Partslink 整合（無公開 API + 北美 collision 範圍 ≠ 亞羅台灣全車料件業務）。

### 2.3 表 2：Partslink / 其他 VIN API 比較

| 服務 | 真實性 | API 公開 | 費用 | 資料覆蓋 | 亞羅 fit |
|---|---|---|---|---|---|
| **Partslink**（LKQ）| ✅ 真實 product | ❌ 未公開 RESTful API | 商業 licensing | 北美 collision parts | ❌ 不適合（範圍 + 授權）|
| **NHTSA vPIC**（美國政府）| ✅ 真實 | ✅ 公開 REST API | **免費** | 美規 VIN decode（含日德系美規） | ⚠️ 適合測試 / 試水溫 |
| **Mitchell 1**（aftermarket）| ✅ 真實 | ⚠️ subscription | 商業（~$200/月+）| 北美 OEM 維修資料 + estimating | ❌ 北美為主 |
| **Identifix**（診斷）| ✅ 真實 | ⚠️ subscription | 商業 | 診斷碼 + 維修方案 | ❌ 北美為主 |
| **Carfax**（VIN 歷史）| ✅ 真實 | ✅ partner API | 商業 | VIN 歷史報告（事故 / 里程）| ❌ 場景錯（不是料件對照）|
| **TecDoc**（EU）| ✅ 真實 | ⚠️ partnership | 商業 licensing | 歐洲 VIN→Parts | ⚠️ 歐洲為主 |
| **VSCC**（台灣車輛安全資訊網）| ✅ 真實政府 | ⚠️ 限定查詢介面 | 免費 | 台灣車型 / 召回 / 法規 | ⚠️ 非料件對照 |
| **OEM 台灣經銷商**（如和泰 / 中華 / 裕隆）| ✅ 真實 | ❌ 0 公開 API | - | 該品牌台灣車型 | ❌ 取得難 |
| **業務員手動建檔**（Yaro 30 年）| ✅ 真實 | N/A | 內部成本 | 亞羅實際業務範圍 | ⭐⭐⭐ **本軌主路徑** |

### 2.4 本軌處理範式建議

⭐ **建議**：本軌 **不做 API 整合**、走「純手動建檔 + 未來軌補 NHTSA fallback」：
1. ✅ **手動建檔**：VIN→Model 對照表（業務員建檔）、覆蓋亞羅實際客戶車輛
2. ✅ **既有鏈直接走**：Model→PartModel→Parts（NX01-16 已落地）
3. 🔵 **後續軌候選**：NHTSA vPIC API mock helper（免費、低風險試水溫、台灣車覆蓋差但可作為「未知 VIN fallback」）
4. ❌ **不適合本軌**：Partslink / Mitchell / TecDoc / OEM 經銷商整合（範圍 + 授權 + 商業成本）

### §I.6.3 §2 揭露不完整

- 未 verify NHTSA vPIC 台灣車型實測覆蓋率（如日系/德系/韓系在台版本是否被收錄）
- 未 verify VSCC 台灣資料庫是否提供 API（業界揭露為「查詢介面」、可能僅 web）
- 未 verify Crown 對「VIN API 整合 vs 純手動」戰略偏好（PROJECT_CONTEXT 標「未來整合」未拍板時間軸）

---

## §3 維修 SOP 業界結構 verify

### 3.1 業界範式對標

| 範式 | 結構 | 來源 | 亞羅 fit |
|---|---|---|---|
| **OEM workshop manual** | 步驟編號 / 工具 / 注意事項 / 圖示 / labor time / 故障代碼 | 各 OEM 私有（Toyota / Honda / VW / BMW）| ⚠️ 取得難、商業授權貴 |
| **ALLDATA / Mitchell 1** | OEM data 整合 + estimating + DTC | 北美 subscription service | ❌ 北美為主 |
| **AAIA / Auto Care Association** | ACES / PIES 標準（料件 + 工時 + 適配）| 美國產業協會 | ⚠️ 北美格式 |
| **Identifix Direct-Hit** | 故障案例 + 維修方案 + 診斷流程 | 北美 subscription | ❌ 北美 |
| **業界 ASE 認證標準** | 維修流程 + 安全規範 + 知識考核 | 美國 ASE 認證 | ⚠️ 認證範式、非 SOP 模板 |
| **OEM 台灣維修廠手冊**（如和泰原廠手冊） | 各廠自家格式 | 經銷商系統 | ❌ 取得難 |
| **獨立汽修廠口傳知識** | 老師傅口傳 + 筆記 | 各廠內部 | ⭐⭐⭐ **Yaro 模式** |
| **YouTube / 維修論壇**（如 mobile01 改裝版）| 自由格式 | 公開但非結構化 | ⚠️ 取得易但品質參差 |

### 3.2 表 3：維修 SOP 業界範式（欄位最大公約數）

| 欄位 | 必填 | 業界範式 | 亞羅 fit |
|---|---|---|---|
| `sop_no` / `code` | ✅ | OEM 編號 / 自編 | ⭐⭐⭐ |
| `title`（如「Golf 7 GTI 機油更換」）| ✅ | 全範式有 | ⭐⭐⭐ |
| `model_id`（適用車型）| ✅ | OEM 必標 | ⭐⭐⭐ 既有 NX01-13 走 |
| `category`（保養 / 故障 / 改裝）| ✅ | OEM 分類 | ⭐⭐ |
| `steps`（JSON 陣列）| ✅ | 步驟編號 + 描述 + 圖示 + 工具 + 警示 | ⭐⭐⭐ |
| `tools`（工具清單）| ⚠️ | OEM 必列、獨立廠選列 | ⭐⭐ |
| `parts_needed`（料件清單）| ⚠️ | OEM 必列、可 FK 到 PartModel | ⭐⭐⭐ wire 機會 |
| `labor_time_hours`（標準工時）| ⚠️ | OEM 必列（ALLDATA 範式）| ⭐⭐ |
| `safety_notes`（安全警示）| ⚠️ | OEM 必列 | ⭐⭐ |
| `dtc_codes`（故障代碼、OBD-II）| 🔵 | 進階範式 | 🔵 後續軌 |
| `images` / `video_url` | 🔵 | OEM + YouTube | 🔵 後續軌 |
| `difficulty`（難度 1-5）| 🔵 | 獨立廠範式 | 🔵 |

### 3.3 亞羅可能的維修 SOP 範圍

對齊 Yaro 業務本質（中小汽配 + 維修）+ 業界中小汽修廠常見 SOP：

| # | SOP 類別 | 頻率 | 業界範式 | 亞羅優先級 |
|---|---|---|---|---|
| 1 | **保養類**（機油 / 變速箱油 / 冷卻液 / 火星塞 / 空濾 / 機油芯）| 每日高頻 | 業界標準 | ⭐⭐⭐ |
| 2 | **煞車類**（煞車皮 / 煞車盤 / 煞車油 / ABS）| 每週高頻 | 業界標準 | ⭐⭐⭐ |
| 3 | **引擎類**（正時皮帶 / 水泵 / 引擎墊片 / 凸輪軸感知器）| 每月中頻 | 中等難度 | ⭐⭐ |
| 4 | **電裝類**（電瓶 / 發電機 / 啟動馬達 / 燈泡）| 每週高頻 | 業界標準 | ⭐⭐⭐ |
| 5 | **空調類**（壓縮機 / 冷媒 / 鼓風機 / 蒸發器）| 季節高頻 | 進階 | ⭐⭐ |
| 6 | **變速箱類**（離合器 / AT 過濾器 / 油封）| 每月中頻 | 進階 | ⭐⭐ |
| 7 | **懸吊類**（避震器 / 彈簧 / 三角架 / 球頭）| 每月中頻 | 業界標準 | ⭐⭐ |
| 8 | **故障診斷**（OBD-II DTC 代碼）| 不定 | 進階 / 需 OBD 工具 | 🔵 後續軌 |

### 3.4 既有 NX09 schema 對 REPAIR_SOP 預留度

`grep -i 'repair|sop|maintenance' schema.prisma KmArticle Document`：

| 欄位 | 既有 enum | REPAIR_SOP 預留 |
|---|---|---|
| `Nx09KmArticle.category` | SO/BP/RG/CX/EM/OT（6 個）| ❌ 0 預留 |
| `Nx09Document.docCategory` | **CR/SP**/JD/FM/OT（5 個）| ⭐⭐ **SP=SOP 已預留**（但業務 SOP ≠ 維修 SOP）|
| `Nx09SystemManual.category` | GENERAL / FAQ / TROUBLESHOOT（3 個）| ⚠️ 偏系統 manual、非維修 SOP |

⭐ **重大揭露**：既有 schema **無「維修 SOP」專用欄**：
- KmArticle SO/BP/RG/CX/EM/OT 全偏「業務知識 / 客戶處理 / 緊急狀況」、非汽車維修
- Document SP=SOP 偏「公司作業流程 SOP」、非「車輛維修 SOP」
- SystemManual TROUBLESHOOT 偏「系統 troubleshooting」、非「車輛故障診斷」

→ IMPL-02 需 Crown 拍板：A=KmArticle category 擴 REPAIR + B=新表 RepairSop + C=Document SP 子分類

### §I.6.3 §3 揭露不完整

- 未 verify Yaro 是否有現成紙本 SOP（如老師傅筆記、原廠手冊副本）可作為 seed
- 未 verify Crown 對「維修 SOP 圖文支援」優先級（純文字 vs 含圖 vs 含影片）
- 未 verify 是否需 wire 到 NX01-16 PartModel（維修 SOP → 料件清單 → 自動帶到報價單）

---

## §4 既有 NX09 schema 對應 verify

### 4.1 表 4：既有 NX09 schema 對 IMPL-02 業務需求對應度

| IMPL-02 候選功能 | 既有 schema | 預留度 | 結論 |
|---|---|---|---|
| **VIN→Model 對照** | ❌ 0（schema 全棧無 VIN）| 0 | 新表 `Nx09VinLookup`（vin VARCHAR(17) UNIQUE + modelId FK + meta JSON）|
| **Model→Parts 查詢** | ✅ NX01-16 PartModel（partId + modelId + fitLevel）| ⭐⭐⭐ 直接走 | 純 service + endpoint 復用 |
| **維修 SOP 結構化** | ⚠️ KmArticle 可承載文字（無步驟結構）/ Document 可上傳 PDF | ⭐ | A=複用 KmArticle + category 擴 / B=新表 `Nx09RepairSop`（steps JSON + 圖示 + 工時）|
| **故障代碼 → 維修方案** | ⚠️ KmArticle QA 天然適合 | ⭐⭐ | 復用 KmArticle category=DTC（擴 enum）|
| **4 子表補**（ArticleTag / MeetingAttendee / Minutes / Action）| ✅ schema-only 完整 | ⭐⭐⭐ | 純 CRUD endpoint |
| **DocumentVersion 自動寫入** | ✅ schema + IMPL-01 endpoint | ⭐⭐ | service 升級（patch document 自動衍生一版）|
| **KmArticle 統計 writer** | ✅ viewCount + helpfulCount schema | ⭐⭐ | service 升級（getById → +1 view / feedback POST → +1 helpful）|
| **NX07 Training wire** | ❌ 0 接點 | 0 | wire helper（NX07 Training → 自動建 Document）|
| **NX04 SR wire** | ❌ 0 接點 | 0 | wire helper（SR PATCH '已處理' → 自動建 KmArticle 候選）|
| **NX08 dashboard wire** | ⚠️ 既有 NX08 dashboard endpoint | ⭐ | dashboard query KM 熱門排行 |

### 4.2 IMPL-01 + IMPL-02 範式定型對比

| 軌 | schema 動作 | 範式 |
|---|---|---|
| IMPL-01 | 新 1 表（SystemManual）+ 3 主檔加 tsvector + 3 軌 migration | **重戰場升級**（Crown Q1=全要 + Q5=b 新表）|
| **IMPL-02 候選 A** | 新 2 表（VinLookup + RepairSop）+ 1~2 軌 migration | **亞羅特色軌**（Crown 拍板 §4 候選）|
| **IMPL-02 候選 B** | 0 新表、復用 KmArticle category 擴 + Document docCategory 擴 | **最小化軌**（純 enum 擴 + service）|
| **IMPL-02 候選 C** | 4 子表補 endpoint + service 升級（auto-version + writer）| **schema-only 補軌**（IMPL-01 揭露剩 4 子表）|

⭐ Hank 推薦：**A + C 合軌**（亞羅特色新表 + 4 子表補 endpoint + 跨模組 wire）、規模 ≈ IMPL-01。

### §I.6.3 §4 揭露不完整

- 未 verify IMPL-01 SystemManual 是否有 seed 資料（plan 揭露「大量 seed 留後續軌」、但實際 0 seed？）
- 未 verify FTS tsvector trigger 對 RepairSop 新表是否需擴（IMPL-01 trigger 限定 3 主檔）

---

## §5 4 子表補 + 跨模組 wire 範圍 verify

### 5.1 audit-01 揭露的 schema-only 子表 verify（IMPL-01 後狀態）

| 子表 | IMPL-01 補了嗎？ | IMPL-02 範圍 |
|---|---|---|
| `Nx09DocumentVersion` | ✅ list endpoint 補 | ⚠️ 升級候選：document.patch 自動寫入 |
| `Nx09KmTag` | ✅ list + create endpoint 補 | ❌ 已 closure |
| `Nx09KmArticleTag` | ❌ schema-only（IMPL-01 未補）| **本軌候選 1**：CRUD（attach + detach tag）|
| `Nx09KmFeedback` | ✅ create endpoint 補（POST `/km-article/:id/feedback`）| ⚠️ 升級候選：自動 +1 helpfulCount writer |
| `Nx09MeetingAction` | ❌ schema-only | **本軌候選 2**：CRUD + 自動提醒 |
| `Nx09MeetingAttendee` | ❌ schema-only | **本軌候選 3**：CRUD + 出席率統計 |
| `Nx09MeetingMinutes` | ❌ schema-only | **本軌候選 4**：CRUD + 與 Action 關聯 |

⭐ **重大揭露**：Crown 在 TASK prompt 標「4 子表補（ArticleTag / MeetingAttendee / Minutes / Action）」與 audit-01 揭露對齊 ✅、KmTag + DocumentVersion + KmFeedback 已 IMPL-01 補完。

### 5.2 表 5：4 子表 + 跨模組 wire 本軌 vs 後續軌

| # | 範圍 | 性質 | 本軌建議 | 後續軌候選 |
|---|---|---|---|---|
| **4 子表 endpoint 補** | | | | |
| 1 | KmArticleTag CRUD（attach / detach） | schema-only 補 | ✅ 本軌 | - |
| 2 | MeetingAction CRUD（待辦 + 截止 + 負責人）| schema-only 補 | ✅ 本軌 | - |
| 3 | MeetingAttendee CRUD（出席 / 請假）| schema-only 補 | ✅ 本軌 | 出席率統計（dashboard 軌）|
| 4 | MeetingMinutes CRUD（決議 + 討論）| schema-only 補 | ✅ 本軌 | - |
| **亞羅特色** | | | | |
| 5 | VinLookup 新表（vin + modelId + meta）⭐⭐⭐ | 業界改革 | ✅ 本軌（最小化新表）| NHTSA mock fallback |
| 6 | RepairSop 新表（steps JSON + 圖示 + 工時）⭐⭐⭐ | 業界改革 | ✅ 本軌（最小化新表）| 圖文升級 / DTC wire |
| 7 | RepairSop → PartModel 反向 wire（維修 SOP → 自動帶料件）| ⭐⭐ | ⚠️ 本軌或後續軌 | - |
| **跨模組 wire** | | | | |
| 8 | NX07 Training → NX09 Document（教育訓練文件入庫）| ⭐⭐ | 🔵 後續軌 | TASK-NX09-IMPL-03-CROSS-WIRE |
| 9 | NX04 SR PATCH '已處理' → NX09 KmArticle 候選 | ⭐⭐ | 🔵 後續軌 | - |
| 10 | NX02 PR → NX09 KmArticle（採購退貨 FAQ）| ⭐ | 🔵 後續軌 | - |
| 11 | NX08 dashboard → NX09 KM 熱門排行 | ⭐ | 🔵 後續軌 | TASK-NX08-IMPL-02 |
| 12 | NX10 KmArticle 貢獻 → Exp wire | ⭐⭐ | 🔵 後續軌 | TASK-NX10-IMPL-03 |
| **既有升級** | | | | |
| 13 | DocumentVersion 自動寫入（document.patch 衍生）| ⭐⭐ | ⚠️ 本軌或後續軌 | - |
| 14 | KmArticle viewCount / helpfulCount writer | ⭐⭐ | ⚠️ 本軌或後續軌 | - |

### §I.6.3 §5 揭露不完整

- 未 verify Crown 對「亞羅特色 + 4 子表」是否同軌（vs 拆兩軌：先 4 子表 / 後亞羅特色）
- 未 verify Crown 對「跨模組 wire 全部留後續軌」vs 「本軌帶 1-2 個 wire」優先級
- 未 verify Crown 對「auto-version + writer」（既有升級類）是否本軌

---

## §6 ✅ 推薦組合（Alex 寫 overview-v0.2 前的技術選型基底）

### 6.1 ✅ 推薦組合 — Hank 視角技術選型基底

⭐ **最佳組合 = A 亞羅特色（最小化新表）+ C 4 子表補 + 自動升級 1~2 個**：

| Phase | 範圍 | 規模 | 業界改革 |
|---|---|---|---|
| Phase 0 | overview v0.2 + plan v0.1.0 | 1 commit | - |
| Phase 1 | **M1 schema**：VinLookup 新表 + RepairSop 新表（最小化欄位）| 1 commit / 1 migration | ⭐⭐⭐ |
| Phase 2 | **4 子表 endpoint 補**：ArticleTag + MeetingAction + MeetingAttendee + MeetingMinutes（純 CRUD）| 1 commit | ⭐ |
| Phase 3 | **VinLookup service**（CRUD + VIN→Model→Parts 查詢 endpoint）| 1 commit | ⭐⭐⭐ |
| Phase 4 | **RepairSop service**（CRUD + Model 過濾 + steps JSON）| 1 commit | ⭐⭐⭐ |
| Phase 5（選配）| 既有升級：DocumentVersion 自動寫入 + KmArticle 統計 writer | 1 commit | ⭐⭐ |
| Phase 6 | UI 4-5 placeholder + menu.nx09 升 | 1 commit | - |
| Phase 7 | docs（summary v2.0 + worklog 主題 3 + _team + merge-verify）| 1 commit | - |

⭐ **預估 7-8 commit / 1 migration**（命中 IMPL-01 範式、規模 ≈ IMPL-01）。

跨模組 wire（NX07 / NX04 / NX08 / NX10）**全留後續軌 TASK-NX09-IMPL-03-CROSS-WIRE**。

### 6.2 ⚠️ Crown 拍板戰略題（推估 5-7 題）

1. **VIN 對照範圍**
   - A=新表 VinLookup（業務員手動建檔）⭐ 推薦
   - B=純 NHTSA API call out（mock fallback）
   - C=A+B（手動為主 + NHTSA fallback）
   - D=純 PartModel（不做 VIN、純車型查料）= 不做本軌

2. **維修 SOP 範圍**
   - A=新表 RepairSop（steps JSON 結構化）⭐ 推薦
   - B=KmArticle category 擴 REPAIR_SOP（純文字）
   - C=Document docCategory 擴 RP（PDF 上傳）

3. **4 子表 endpoint 補**
   - A=全 4 補本軌 ⭐ 推薦
   - B=分軌
   - C=保留 schema-only

4. **既有升級**（auto-version + writer）
   - A=本軌帶 1-2 個
   - B=後續軌 TASK-NX09-IMPL-AUTO-VERSION
   - C=不做

5. **跨模組 wire**
   - A=本軌不帶 ⭐ 推薦（後續軌專門做）
   - B=本軌帶 1 個 high-value（NX07 Training → Document）
   - C=本軌全帶（NX07 + NX04 + NX08）

6. **RepairSop → PartModel 反向 wire**（維修 SOP → 自動帶料件清單）
   - A=本軌（提升業界改革等級 ⭐⭐⭐）⭐ 推薦
   - B=後續軌

7. **UI 範圍**
   - A=純 stub placeholder ⭐ 推薦
   - B=VIN 查詢 UI 真實實作
   - C=維修 SOP 步驟編輯器

### 6.3 🔵 後續軌候選（不在本軌）

- **TASK-NX09-IMPL-03-CROSS-WIRE**：4 跨模組 wire（NX07 / NX04 / NX02 / NX08）
- **TASK-NX09-IMPL-04-RAG**：Phase 2 RAG 向量化（pgvector + OpenAI embedding）
- **TASK-NX09-IMPL-VIN-API-FALLBACK**：NHTSA vPIC API mock + fallback chain
- **TASK-NX09-IMPL-UI-01**：UI 真實表單 + VIN 查詢面板 + 維修 SOP 步驟編輯器
- **TASK-NX09-IMPL-UI-MANUAL-WIRE**：NEXORA UI「？」按鈕 wire SystemManual（IMPL-01 backlog 沿用）
- **TASK-NX09-IMPL-AUTO-VERSION**：DocumentVersion 自動寫入 + KmArticle 統計 writer（若 Q4=B）
- **TASK-NX09-IMPL-DTC-LIBRARY**：故障代碼（OBD-II DTC）→ RepairSop wire（亞羅進階軌）
- **TASK-NX09-IMPL-YARO-IMPORT**：Yaro 30 年知識資料匯入軌（接 NX01-16 plan §5 Crown Q5=A）
- **TASK-NX09-IMPL-02-TEST**：4 service unit test

---

## §7 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / Yaro 業務員補揭露：

1. **§0** Yaro 30 年知識資產真實匯入狀態（走獨立 A 系列軌 vs 本軌 seed）
2. **§0** NX01-15 vehicle_classification 是否含 VIN 欄位
3. **§1** 台灣本土 VIN decode 服務（VSCC API / OEM 經銷商 API）
4. **§1** Yaro 客戶實際口報 VIN 比例（業務真實場景）
5. **§1** NEXORA 是否需 supports 第三方 VIN decode call out
6. **§2** NHTSA vPIC 台灣車型實測覆蓋率
7. **§2** Crown 對「VIN API 整合 vs 純手動」戰略偏好時間軸
8. **§3** Yaro 是否有現成紙本 SOP 可作為 seed
9. **§3** Crown 對「維修 SOP 圖文支援」優先級
10. **§3** RepairSop 是否需 wire 到 PartModel（料件清單自動帶出）
11. **§4** IMPL-01 SystemManual 是否有 seed 資料
12. **§4** FTS tsvector trigger 是否需擴 RepairSop 新表
13. **§5** Crown 對「亞羅特色 + 4 子表 + 跨模組 wire + 既有升級」拆軌策略
14. **§6** 5-7 戰略題確切答案

---

## §8 與 NX09-AUDIT-01 對齊揭露

對齊 [docs/nx09/nx09-audit-01.md](./nx09-audit-01.md)：

- audit-01 §6.3 揭露 4 亞羅汽配特色候選（VIN ⭐⭐⭐ / 維修 SOP ⭐⭐⭐ / 故障代碼 ⭐⭐ / FAQ 自動回覆 ⭐⭐）→ **本 audit-02 verify VIN + 維修 SOP 兩個 ⭐⭐⭐ 業界真相、故障代碼留後續軌**
- audit-01 §6.4 揭露 4 跨模組整合候選 → **本 audit-02 verify 全部留後續軌**
- audit-01 §7 預告 IMPL-01 Phase 框架 → **IMPL-01 已 closure（v1.2.0）、本軌 IMPL-02 重新拍 Phase 框架**

⭐ 本 audit-02 補揭：
- 11 model / 6 controller / 26 endpoint 真實 closure 狀態（IMPL-01 後）
- NX01 vehicle chain（CarBrand → Model → PartModel）完整化、PartModel 已落地（IMPL-02 直接走）
- schema 全棧 **0 VIN 欄位**重大揭露
- Partslink 業界真相 verify（北美 collision + 商業授權、本軌不適合）
- 8 種 VIN API 比較表 + 業界 7 種維修 SOP 範式對標
- KmArticle SO/BP/RG/CX/EM/OT + Document SP=SOP 既有 enum vs REPAIR_SOP 預留度揭露
- 5 拓樸 Phase + 7 戰略題 + 9 後續軌候選池

---

> 文件版本：v1.0（NX09-AUDIT-02 純諮詢、8 段揭露 + 5 表 + 1 推薦組合 + 7 戰略題 + 9 後續軌池）
> 待 Crown 拍板 5-7 戰略題（§6.2）→ Alex 寫 nx09-overview v0.2 → Hank 寫 nx09-impl-02-plan
