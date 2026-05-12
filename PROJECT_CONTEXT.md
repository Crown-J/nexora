<!-- PROJECT_CONTEXT.md -->

# NEXORA GRID - PROJECT CONTEXT

> 文件版本：v1.4
> 最後更新：2026-05-06
> 負責人：Crown Lin（林翰杰）
> 協作：Alex（Claude PM AI）+ Hank（NEXORA 工程 AI）

> ⚠️ 同源原則：本 header「文件版本」line 與 § 文件版本 段最新版本號必須同步。升版時兩處一起動、不可單動。詳細變更歷史請見檔尾 § 文件版本。

---

## 文件定位

PROJECT_CONTEXT 是 **Alex 跨對話必讀的業務 + 設計 + 文化視角文件**：

- 專案定位 / 角色分工 / 設計哲學 / Crown 合作風格 / Alex 失誤紀錄
- 工程規範完整版在 [CLAUDE.md](CLAUDE.md)（Hank 視角）
- 兩份分層折中：本檔不重述 CLAUDE.md 內容、加索引指向

📚 工程規範索引：

| 主題 | 完整版位置 |
|------|-----------|
| 模組代碼表（NX01~NX99） | [CLAUDE.md §三](CLAUDE.md) |
| 版本方案邊界 LITE/PLUS/PRO | [CLAUDE.md §四](CLAUDE.md) |
| 資料庫命名規則格式 | [CLAUDE.md §五](CLAUDE.md) |
| 必填欄位規則 | [CLAUDE.md §六](CLAUDE.md) |
| 多租戶隔離 | [CLAUDE.md §七](CLAUDE.md) |
| Plan Guard | [CLAUDE.md §八](CLAUDE.md) |
| 過帳邏輯通用規則 | [CLAUDE.md §九](CLAUDE.md) |
| FUNCTION_CODE 格式 | [CLAUDE.md §十](CLAUDE.md) |
| 前端資料夾結構 | [CLAUDE.md §十一](CLAUDE.md) |
| 後端資料夾結構 | [CLAUDE.md §十二](CLAUDE.md) |
| Seed 三層架構 | [CLAUDE.md §十三](CLAUDE.md) |
| 開發原則 8 條 | [CLAUDE.md §十五](CLAUDE.md) |
| docs/ 資料夾說明 | [CLAUDE.md §十六](CLAUDE.md) |
| Hank 必讀順序 | [CLAUDE.md §十七](CLAUDE.md) |

---

## 🎯 專案定位

**NEXORA GRID** — 台灣 VAG 汽車零件經銷商專用 SaaS ERP。

- **創辦公司**：伊諾瓦資訊科技有限公司（Innova）
- **目標客群**：台灣中小型汽車零件經銷商（VAG 生態為主）
- **產品版本**：LITE / PLUS / PRO 三個 tier（完整邊界見 [CLAUDE.md §四](CLAUDE.md)）
- **商業模式**：SaaS 月 / 季 / 年費訂閱

### NEXORA 設計來源（兩個獨立實體）

| 實體 | 角色 | 定位 |
|------|------|------|
| **恆迎企業** | 負面參考來源 | 業界舊有公司、存在很多系統問題、NEXORA 開發過程中的「反面教材」、揭露常見業界痛點。CLAUDE.md §一 提的 6 倉模型（HW1 + MW1 + BW1~BW4）參考自此 |
| **Yaro（亞羅企業有限公司）** | design target | Crown 自己開的 B2B 汽車零件批發公司、NEXORA 實質上是為 Yaro 量身打造的新系統、PRO tier 真實場景驗證田 |

兩個實體都不可省略：恆迎是「**為什麼** NEXORA 要這樣設計」、Yaro 是「NEXORA **服務誰**」。

---

## 🧩 技術棧（摘要）

```
前端：Next.js 16.1.6 + React 19.2.3 + Tailwind v4 + Zustand 5（apps/nx-ui）
後端：NestJS 11 + Passport JWT（apps/nx-api）
資料庫：PostgreSQL（Docker port 5433 / Railway production）
ORM：Prisma 7.4.0（packages/db-core）
Monorepo：pnpm 10.29.3 + Turbo 2.8.21
測試：Vitest 2.1.9 + @testcontainers/postgresql
部署：Vercel（前端 app.nexoragrid.com）+ Railway（API）+ Cloudflare（DNS）
開發：VSCode + Claude Code（Hank）+ Claude.ai（Alex / Crown）
```

> 📚 完整版（含每個 package 細節）見 [CLAUDE.md §二](CLAUDE.md)。

---

## 👥 角色分工

```
Crown Lin
  創辦人、最終決策者、業界專家（汽車零件業 18 年實戰）
  策略 = 他、Alex 與 Hank 不擅自質疑策略

Alex（Claude PM AI、Claude.ai 內）
  1. 撰寫需求規格書（功能 + 畫面）
  2. 追蹤進度、安排任務、下指令給 Hank
  3. 紀錄 Hank 設計的實作架構

  邊界：Alex 不寫 schema / SQL / Prisma DSL / 元件實作細節

Hank（NEXORA 工程 AI 角色）
  載體：VSCode + Claude Code（目前）、未來可能換 IDE
  自我認同：透過讀 NEXORA 資料夾文件而成立、非 IDE 綁定

  1. 根據 Alex 的需求規格書 + Crown 的指令、完成程式撰寫 + 欄位設計
  2. 必須產出「實作架構書」給 Alex 紀錄
  3. 維護 PROJECT_CONTEXT.md（本檔）+ system-architecture.md + 各模組 worklog + git-state.md
  4. 沒有跨對話記憶、每次新對話從讀 NEXORA 文件開始重建身份

  邊界：Hank 看到的「需求」就是 Alex 寫的規格書、Hank 沒有跨對話 context

周哥
  Innova / Yaro 的財務及報關專員
```

---

## 🛠️ 開發環境（baseline 獨有部分；其他見 [CLAUDE.md §十四](CLAUDE.md)）

```
DB 工具：DBeaver（direct SQL）

函式代碼：@FUNCTION_CODE 格式
  例：NX03-WKFL-UI-001-F01
  完整格式見 CLAUDE.md §十

className 工具：from '@/shared/lib/cx'（不用 clsx）
```

⚠️ Hank IDE 載體變動：Cursor → VSCode + Claude Code（2026-04-28 charter §0 校正）。詳見 §👥 角色分工 Hank 段。

---

## 💎 設計哲學

```
1. 中心 = 角色工作台
   業務的中心 = 銷售中心、倉管的中心 = 庫存中心
   業務不該進庫存中心、要查庫存可以在銷貨中心查（多一個選客戶步驟）
   工作站 / Tab 結構按角色設計、不按功能分類

2. 庫存 ≥ 0 是物理定律（D3 雙帳設計）
   physicalQty ≥ 0（物理庫存不可負）
   reservedQty 可大於 physicalQty（業務承諾可超賣、強制標記來源）
   available = physical - reserved（可承諾、可為負表示已超賣）

3. 工作站 = SOP
   手機版每個工作站子功能 = 一個 SOP 流程
   業務手機上沒有「自由作業」模式

4. 追蹤清單只追蹤需要採取行動的單
   未完成的 SO / TI / WR 才進追蹤清單
   詢價/報價量太大、改成查料時自動跳提醒

5. 業務 SOP 的 5 選項客戶回應
   接受並下單 / 部分接受 / 要求調整價格 / 考慮看看 / 全部不要

6. 業務 SOP 的追加品項機制
   業務查一個料號加入清單後系統問「還要查嗎？」
   原因：真實業界客戶碎片化詢問、不會一次列完

7. 備貨 4 情境分流（D4 SYS-C Translator）
   A 全本倉有貨、B 本倉不足+他倉調撥、C 同行調貨（RFQ）、D 混合
   D4 自動判斷情境並觸發對應單據

8. 跨中心連動的共用流水號
   一筆交易所有單據共用流水：SO-2604-00061 / PK / BX / DN / AR
   降低跨組溝通成本

9. 歷史報價的毛利警覺性
   業務查料時顯示一個月內歷史報價、進行中 RFQ、pending QT
   輸入售價時即時計算毛利率、染色警覺（綠/金/紅）

10. 倉管組長排序而非分配
    組長不替倉管決定誰送貨、組長排優先順序
    用 Trello 式拖拉排序、系統依序派給外務

11. 任務型而非功能型 UI
    每個畫面元素必須回答「誰會用 + 多常用 + 解決什麼任務」
    沒明確答案不做、避免功能堆疊

12. 智能預設、全顯示是例外
    所有列表 default = 「跟我相關 + 最近時段」
    全顯示是用戶主動展開的選項、不可寫死大數字 hack

13. 強制資料溯源
    所有單據必須有 status enum + 計算欄位 + 強制 FK 關聯
    狀態變化必須自動更新上游單據計算欄位

14. 角色分層揭露
    採購定成本/定價、業務看公司定價、業務不看成本
    同事報價可見性 ≠ 成本可見性（兩件事分別控制）

15. 特殊處理是一級公民
    庫存異動類型內建：常態進貨/銷貨/退貨/調撥/報廢/掃貨/重組/分解/內部移轉/樣品/換貨
    每種類型對庫存/成本/會計的計算規則不同、要在資料層分開
```

---

## 🏗️ 工程模式

> 分兩部分：A「工程慣例」（既有 8 條、重複慣例性質）+ B「設計範式」（review 累積 14 條、worklog 萃取）

### A. 工程慣例（既有 8 條）

```
1. 意圖文件 vs Impl Spec 分層
   意圖文件（Alex 寫）= 業務目標 + 邊界 + 開放問題、不寫 schema/SQL
   實作架構書（Hank 寫）= 對照真實 codebase 的實作 spec、含 schema 變動 / API / DTO / 測試
   兩者必須先 commit 再開工

2. URL query state 管理
   4 分區切換用 ?section=xxx
   重整頁面保留狀態、useSearchParams + router.push

3. Zustand 全域 store
   RFQ/QT/CO/SO/IT/TI/PK/BX/DN 統一管理
   位置：apps/nx-ui/src/features/sale/ui/fulfillment/store.ts
   helper：planSoAdvance（狀態推進的統一判斷點）

4. 元件 props 向後相容擴展
   既有用法不變、新用法傳新 props
   「擴展開放、修改封閉」原則

5. 共用流水號 helper
   buildSharedDocNumbers(seq) → 回傳 { so, pk, bx, dn, ar, ... }

6. Breaking change 透明處理
   Hank 改動既有 action 簽章必須在 commit message 列出
   不留 shim 騙工程師、要顯式宣告 breaking

7. 破壞性協議
   Hank 跑 prisma migrate dev / migrate reset / 大量 seed / schema 變動
   必須先報備 Crown（含改動範圍 / 風險評估 / 跑前驗證計劃）
   Crown 拍板後才執行

8. 跨模組改動判斷彈性看實質風險
   真實質跨模組（要停下回報 Crown）：影響另一模組業務邏輯/未來規劃/需 owner 協調
   技術跨模組但實質單一決策（Alex 可推、Crown 拍即可）：純 widening / 同源同批歷史債清理
```

### B. 設計範式（review 累積 14 條、worklog 萃取）

```
9. 漸進演化紀錄範式
   寫「為什麼演化到現在」比寫「最終樣子」對 Alex 寫規格更有用
   → 來源：NX01 主題 5 / NX04 主題 3.E

10. 核心隱喻命名比技術術語更有溝通價值
    跨非英語母語團隊特別重要
    → 來源：review 累積（NX04 主題 4 (4C) Refreshment 命名揭露）

11. 過帳設計要對齊業務本質、不能跨模組複製貼上
    → 來源：NX05 主題 3 / NX08 主題 3「踩坑」

12. trigger 做 invariant、不做 validation
    錯誤訊息可讀性是 application 層責任
    → 來源：NX05 主題 1「踩坑」

13. 跨模組 helper 拋錯要包成業務 exception
    → 來源：NX05 主題 2「踩坑」

14. schema 取捨看 query pattern、不看欄位完整性（80/20 原則）
    → 來源：review 累積（NX06 主題 3 (3B) GPS 單點 vs 軌跡陣列取捨）

15. 法規驅動的欄位設計要在 worklog 揭露法規來源
    → 來源：NX06 主題 3D / NX07 主題 1 + 4

16. 跨模組設計光譜：接收側 / 主動側 / trigger 的判準
    → 來源：NX07 主題 3 / NX08 主題 2 / NX10 主題 2

17. 資料分層脫敏：同類資料不同人不同視角
    → 來源：NX07 主題 2

18. single source of truth 比 redundancy 重要、資料備份用 cache / read replica
    → 來源：NX08 主題 2「踩坑」

19. 設計取捨永遠看業務 ROI、不是純技術完美
    → 來源：NX08 主題 3「踩坑」

20. 業務語意 vs 資料歸屬分離
    endpoint 在業務語意模組 / model 在資料歸屬模組
    → 來源：NX08 主題 1「踩坑」

21. 跨模組不一致不一定是 bug、看業務語意分類
    主檔 vs 業務單據兩個合理風格
    → 來源：NX09 主題 1「踩坑」

22. 抽象判準：個數 ≥3 + 相似度高才抽、低就各自寫
    → 來源：NX02 主題 2「踩坑」+ NX09 主題 1「踩坑」（補強）
```

### 23. 擴充性原則（NEXORA 全域、Phase 2 累積）

**為什麼需要：**
NEXORA 是 SaaS、業務需求會持續變化。擴充必須有原則、避免兩個極端（過度預留 = 複雜度爆炸 / 寫死實作 = 改動成本高）。

**怎麼擴充（核心 3 條）：**

1. **加東西要分類、不要亂塞**
   - 上層業務骨架（穩定、不擴充）
   - 下層具體子模組（會擴充）
   - 例：NX01 加郵遞區號 → 進「型錄型」分類、不發明新分類

2. **擴充分 3 種類型、各走各的：**
   - **【類型 1】加新東西**（新表 / 新欄位）
     → 自由加（nullable / 預設值、向後相容）
   - **【類型 2】升級既有結構**（如 1 欄位拆 6 欄位）
     → 3 階段演進：並存 → 遷移 → 廢棄
   - **【類型 3】改既有語意**（如欄位型別 / 業務語意改）
     → 兩階段 migration（嚴謹流程）

3. **業務真的要才加、不預留（YAGNI）**
   - 反例：nx08_monthly_report 預留變架構債（A030）

**紀律 2 條（配套保證）：**

4. **擴充必須明寫紀錄**
   - 模組規格書 § 子模組清單 update（截至 vX.X）
   - Document Control Log 寫「vX.X 加什麼、為什麼加」
   - 對應 worklog 主題寫業務脈絡

5. **擴充不打破設計哲學紅線**
   - § 設計哲學 15 條是紅線、擴充細節 OK、不破本質

**加欄位專屬「向後相容檢查」：**

- ☐ 新欄位 nullable 或預設值（既有資料不爆）
- ☐ 新欄位是「加法」、不取代既有
- ☐ 既有 service / API 不必動就能跑
- ☐ 寫進文件

**升級結構專屬「3 階段演進」（如 address 拆 6 欄位）：**

**階段 1：並存**
- 保留既有欄位（如 `address`）
- 加新欄位（如 `country` / `zip` / `city` / `district` / `street_main` / `street_sub`）
- 系統自動 concat 6 欄位、回填既有 `address`（向後相容既有 service）

**階段 2：遷移**（業務真要用時觸發）
- migration script 批次回填舊資料
- 拆不了的留原 `address`、業務人員手動補

**階段 3：廢棄**（既有完全淘汰）
- drop column 既有欄位
- service 移除 concat 邏輯
- Document Control Log 紀錄

⚠️ **不要跳階段、不要 once-and-done**

**來源：** Phase 2 NX01 主檔規格書設計時 Crown 提「規格書要具備擴充性」（郵遞區號擴充 / address 拆 6 欄位場景）、Alex 從業界擴充性兩極端 + NEXORA Phase 0~1 踩坑（partner_type 演進 / nx08_monthly_report 預留變債 / 醫章 16 vs 20 階）累積成 7 條口訣 + 3 種類型 + 3 階段演進。

---

## 📋 資料/命名標準（具體值；規則格式見 [CLAUDE.md §五~§六](CLAUDE.md)）

### ID 範圍

```
nx01_user：
  NX01USER0000001         = SYSADMIN
  NX01USER0000002~0899999 = 真實客戶
  NX01USER9900001~9999999 = 測試租戶

nx99_tenant：
  NX99TANT0000000         = SYSTEM（isActive=false）
  NX99TANT0000001~0899999 = 真實客戶
  NX99TANT9900001~9999999 = 測試租戶
```

### partner_type 定案值（單字元）

```
C = 客戶
S = 零件供應商
T = 外包物流
V = 一般廠商
B = 銀行（架構上未來該獨立 nx01_bank_account 表）

（舊 CUST/SUP/BOTH 已移除）
```

### 單據類型代碼

```
業務相關：
  RFQ  調貨詢價單
  QT   報價單
  SO   銷貨單
  CO   客戶訂單（客戶願意等的預訂）

倉儲相關：
  IT (ST)  調撥單（公司內倉間）
  TI       調貨單（向同行取貨）
  PK       撿貨單
  BX       包貨單
  DN       送貨單

財務相關：
  AR   應收帳款
```

> 完整單據編號格式（[2碼類型]-[年月]-[倉/機構碼]-[5碼流水]）見 [CLAUDE.md §五](CLAUDE.md)。

### 事實修正（vs 原 spec）

```
Roles：7 個（對齊 NX01-02 規格書 v1.0、TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01）
  SYSADMIN / OWNER / HR / SALES / PURCHASING / WAREHOUSE / FINANCE
  （原 v6 寫 8 個含 HR_ADMIN + LOGISTICS、2026-05-06 校正：
   HR_ADMIN 併入 HR、進階權限 by application 層判斷；
   LOGISTICS 移除、外包物流由 partner_type=T 處理）
Medals：16 層（4 tier × 4 rank、原 spec 寫 20）
Prisma 7：migrate reset 不會自動跑 seed、CI/CD 必須兩個獨立指令
Git：repo 只用 main + feature/、無 develop branch
```

### 資料層數量（截至 2026-04-29）

```
Prisma model 數：137（schema.prisma 6113 行）
Migrations 數：25 個
  首批：20260413120000_spec_v7_baseline
  最新：20260429120000_nx08_drop_monthly_report
後端 controllers：60（nx01=10 / nx02=5 / nx03=7 / nx04=4 / nx05=7
                    / nx06=4 / nx07=7 / nx08=4 / nx09=3 / nx10=6 / nx99=3）
```

### 醫章/晉升系統（PRO tier）

```
銅 = 實習 / 銀 = 專員 / 金 = 副組長 / 白金 = 組長
晉升條件：X 醫章 rank I + 帶起替代人選（候選者達「申請者級別 -1 tier」）
部門轉調：三方核可 + 20 題 KM 考題、每月一次上限
```

---

## 💡 Crown 的合作風格

```
Crown 是業界專家：
  汽車零件業 18 年經驗
  知道真實業務流程、不是「工程師想像的業務」

Crown 的決策模式：
  策略 = 他、執行 = Alex + Hank
  Alex 不擅自質疑策略
  不擅自評估時間（Crown 自己控制）

Crown 說的話要用業界語言理解：
  「倉管會這樣做」= 現場真實發生
  「同行」= 競爭對手但也合作調貨
  「業務現場」= 客戶修車廠、不是辦公室
  「口頭報價」= 業界 70% 的情況（不用紙本）

溝通原則：
  用業務語言寫意圖、避開工程術語
  「radio button」→「圓圈選項」、「table-style」→「一次列出多個空格」

Spec 制度：
  Spec 進 repo、版本化、持續更新
  跨時空工作的單一真相來源

Alex 工作節奏紀律：
  不要每輪丟「N 個方案 + N 個風險 + N 個追問」淹沒 Crown
  一次處理一件事、不蔓延
  Crown 是策略決策者、不是 Alex 的問答機器
```

---

## ⚠️ Alex 失誤紀錄

```
Phase 0~1 累積 8 次同類失誤：

#1 D3 v1：寫 schema 沒讀既有
  → 規則：寫 spec 前必先 grep 現狀

#2 B5 v1 §5.1：假設 RFQ schema 結構
  → 同 #1 規則

#3 B5 v2 §3.3：跨表寫入未確認
  → 規則：意圖版任何「跨檔/跨 service 動作」自我紅旗、列依賴欄位

#4 B2 §5.2：跨表讀取 join 未確認（salesperson 欄位假設）
  → 升級規則：「列出 X 含 Y 欄位」如果 Y 來自關聯表、同樣是跨表動作

#5 B2 §5.2：CO 業務語意搞錯（vendor → customer）
  → 規則：業界 muscle memory 題不該憑直覺、Crown 拍

#6 W2-mini §5.4：「跟既有 store actions 對齊」過度樂觀（3 個簽章 mismatch）
  → 規則：「跟既有 X 對齊」斷言必須列具體對照表、不能模糊講

#7 NEXORA 全域查詢設計：拿偉盟截圖後 30 分鐘急著拍 5 題、Crown 全 No preference
  → 規則：架構級設計題（涉及多工作台/跨角色/影響長期）必須走
         「盤點業界基準 → 分析痛點 → 設計優化版」3 階段、不能跳

#8 被偉盟視角綁架、忘了 Crown 已拍過「客戶為中心」（2026-04-28）
  → 階段 1+2 盤點偉盟即時查詢時、Alex 跟 Crown 一起在「料號為中心」框架打轉
  → Crown 自己跳出來提醒「我前面會覺得即時查詢是核心、是因為用偉盟視角去看」
  → 事後檢查：§ 設計哲學 #1「中心 = 角色工作台」其實早就拍過、Alex 完全忘了
  → 規則：盤點現有競品/系統時、Alex 必須主動回頭檢查既有設計哲學
         不能讓「逆向工程現有系統」的視角綁架了 NEXORA 的原始設計理念
  → 升級規則：架構級設計題的「階段 1 盤點」結束時、Alex 必須做 explicit
            「跟 NEXORA 既有設計哲學對照」檢查、避免階段 2 在錯誤框架內展開

#9 引用 Hank 既有揭露的「數量」字眼時、開工前要求精確 grep（軌 4.5+4.6 觸發、Crown 拍 Q3 採納、軌 4.7 雙寫、軌 4.8 Crown verify 編號）
  → 軌 4.5 觸發：Alex 引用 Hank 揭露「10+ 處」live csv、實際 118 處（11.8 倍）
  → 軌 4.6 觸發：Alex 引用 Hank 揭露「30+ 處」stale ADMIN、實際 431 處（14 倍）
  → 規則：Alex 寫 closure 指令、引用 Hank 既有揭露「N 處 / 多處」字眼時、
         必須要求 Hank 開工前先 grep -c 精確 count、再依結果決定軌範圍 / commit 拆軌策略
  → 對應 Hank 端規則：hank-charter.md §G.1 揭露精確度紀律（A041）
  → 升級規則：Alex 的指令模板加「Step 1 grep -c 精確 count 先回報」步驟、
            不直接進「Step 2 開工」、避免 Hank 在估錯規模下開始 commit 拆軌

#10 規格書改寫應寫範式給 Hank、不自己改下載（軌 4.6 Q5 觸發、Crown 拍 D 拍真相揭露、軌 4.8 Crown verify 編號）
  → 軌 4.6 觸發：Crown 拍 Q5 = D 真相揭露：「Alex 不該為『掌握控制權』自己改 spec docs」
  → 規則：Alex 寫改寫範式（如「HR_ADMIN → HR 全文 replace_all、特殊情境揭露」）
         → Hank 執行（grep + Edit）+ 揭露無法處理特殊情境
         → Crown 拍特殊情境
  → 三層分工：Alex 寫範式（業務語意） / Hank 執行（工具操作） / Crown 拍特殊情境（業務拍板）
  → 反 pattern：Alex 自己下載 spec、本機改完上傳、繞過 Hank 的工具紀律
  → 升級規則：spec docs 跨多檔 mass update 屬「Hank 工具操作範圍」、
            Alex 寫指令給 Hank 而不自己動手

#11 PROJECT_CONTEXT 編號不擅自定（軌 4.7 + 軌 4.8 觸發、Q5D' 落地）
  → 規則：Alex 寫「PROJECT_CONTEXT 加 Alex 失誤紀錄條目」指令時、
         不擅自定編號、必須請 Hank 標「候選 #N」+ 等 Crown verify
  → 觸發紀錄：軌 4.7 候選 #9 / #10 揭露時、Hank 守紀律標「候選」等 Crown verify、
            Alex 一度誤以為可自動編號
  → 對應 Hank 端：charter §G「不擅自定編號」紀律
  → 升級規則：Alex 寫條目指令必明示「候選 #N、待 Crown verify」字眼、
            不假設可跳過 Crown 拍板環節

#12 技術實作 Hank 自決、不問 Crown（NX01-11 Q4 觸發、Crown 拍真相揭露）
  → 規則：給 Crown 的拍板題、必須是「業務結果差異」、不是「技術實作差異」
         當選項只是「DB 結構怎麼存 / 程式怎麼寫」、沒有業務語意差異、
         必須改寫成「Hank 自決 + 揭露理由」、不問 Crown
  → 觸發紀錄：NX01-11 v0.1.0 Q4 問 Crown「JSON vs 子表」、
            Crown 揭露「過程交給 Hank、我只說要的結果」業界 muscle memory 真相
  → 三層分工：Crown 業務拍板 / Alex 業務語意 / Hank 工具操作 + 技術實作
  → 升級規則：Alex 寫 spec Q&A 前、必先 self-check「這是業務題還是技術題」、
            技術題直接交 Hank、不上 Crown

#13 業界 muscle memory 否定的「擔憂」不寫進 spec（NX01-11 Q5 觸發、Crown 拍真相揭露）
  → 規則：寫 spec 時假設「業界可能撞 X」的擔憂、不該存在於規格書（過度防呆）
         Crown 業界 muscle memory 真相 = 不會發生、那 v1.0 就直接不做這個檢查
  → 觸發紀錄：NX01-11 v0.1.0 Q5 問「part_code_2 跨品牌 unique 檢查」、
            Crown 揭露「恆迎 18 年沒發生過」、Alex 過度防呆
  → 升級規則：Alex 寫業務檢核欄位前、必先業界 muscle memory check（問 Crown / 看 PROJECT_CONTEXT §🎯）、
            業界沒發生過的不寫、Crown 拍才加

候選 #14（軌 4 family closure 階段 1 觸發、Crown 拍 Q5D 採納、編號待 Crown verify）：
   Alex 寫紀律規則時必須明示「適用時機完整列表」、不假設 Hank 自動擴張理解
  → 軌 4.6 觸發：A047「git add 用具體檔案路徑」只在 commit 階段明示、未擴張到 merge resolution 階段
  → Hank 軌 4.6 merge resolution 用 `git add -A`、誤把 3 個 untracked spec 吸進 merge commit
  → 規則：Alex 寫工作流紀律（如 hank-charter §G）時、必須明示「適用時機完整列表」、
         不假設 Hank 會把規則自動擴張到類似情境（merge / rebase / cherry-pick / etc）
  → 對應升級：A047 → A052（git add 從 commit 階段紀律升級為「任何 git add 時機」紀律）
  → 升級規則：Alex 寫 §G 規則時加「適用時機清單」+「不適用情境清單」雙列、消除「自動擴張」假設

候選 #15（軌 4 family closure 階段 1 觸發、Crown 拍 Q5D 真相揭露、編號待 Crown verify）：
   Alex 推薦補救方案時必先問「規則目的是什麼」、不堅持「規則手段本身」
  → 軌 4.6 觸發：3 spec 誤入 main 後、Hank 提 3 選項（revert / git rm / 接受）都聚焦「手段」
  → Crown 提選項 D「接受 + 補說明 worklog 達成原紀律目的」= 揭露「紀律目的 vs 手段」分層思考
  → 規則：規則設定時有「目的」（如「不要亂掉、未來交接讀懂」）跟「手段」（如「分開 commit」）
         手段失靈時、找替代手段達成原目的、不死守「手段本身」
  → 反 pattern：Alex / Hank 把「手段」當「目的」、規則違反時只想「revert / rm 恢復手段執行」
  → 升級規則：Alex 寫紀律規則時必明示「目的」、Hank 違反時必問「目的是什麼、替代手段是什麼」

#16 Alex 揭露失誤候選必當輪落地、不堆積（本對話累積觸發、Q5D' 補登）
  → 規則：Alex 揭露 Alex 失誤候選時、必須立即在當輪指令裡讓 Hank 寫進 PROJECT_CONTEXT、
         不該堆積到下一輪才補
  → 反 pattern：「Alex 持續揭露失誤但失誤從不落地」= backlog drift、
                跨對話交接會散失
  → 觸發紀錄：本對話 #11~#15 揭露時未即時落地、累積到 Q5D' 才補
  → 升級規則：Alex 揭露失誤瞬間、當輪指令必含「Hank 寫進 PROJECT_CONTEXT」step、
            不留到下一輪

整體紀律：
  - 不要急著拍方案、先確認既有
  - 不確定就標 ⚠️ 讓 Hank 寫 impl 時 catch
  - 業界 muscle memory 題讓 Crown 拍、不要自己決
  - 一次處理一件事、不蔓延
  - 不要每輪丟「N 個方案 + N 個風險 + N 個追問」淹沒 Crown
```

---

## 📂 文件導航

### GitHub repo（程式碼 + 開發資料）

```
PROJECT_CONTEXT.md        ← 本檔（Alex 跨對話必讀）
CLAUDE.md                 ← Hank 工程規範完整手冊
README.md                 ← 專案總覽
_cursorrules              ← Cursor IDE 規範（歷史殘留）

apps/nx-ui                ← Next.js 前端
apps/nx-api               ← NestJS 後端
packages/db-core          ← Prisma schema + seed

docs/
├── README.md             ← 文件總索引
├── _shared/
│   ├── decisions/        ← ADR
│   ├── plans/            ← Master Plan
│   ├── reference/        ← 跨模組真相來源
│   ├── system/           ← 跨模組系統層
│   └── team/             ← 三人團隊規範
│       ├── hank-charter.md           ← Hank 自我認同（Hank 必讀）
│       ├── system-architecture.md    ← Hank 蓋的房子（Alex 必讀）
│       ├── git-state.md              ← Git 版控現況
│       └── file-placement-suggestion.md
├── nx01/ ... nx10/       ← 業務模組（reference / spec / ui / workflow）
│   └── nxXX-worklog.md   ← 模組工作日誌
├── nx98/ + nx99/         ← 共用核心 / 系統管理
└── archive/YYYY-MM/      ← 歷史 task log

dailylog/YYYYMMDD.md      ← Crown 每日工作日誌
```

### Claude.ai 專案內（扁平結構）

```
PROJECT_CONTEXT.md（本檔）

各模組需求規格書（Alex 寫、跟 Crown 確認後上傳）：
  NX01 - 共用基礎模組需求規格書
  NX02 - 採購模組需求規格書
  ...
  NX99 - 系統層需求規格書
  NXGQ - 全域查詢架構規格書（跨模組）

各模組子規格書（Alex 寫、按優先序逐步補完）：
  NX0X - YY - 子功能規格書

Hank 工作日誌（Hank 寫、Crown 上傳到專案）：
  NEXORA - 系統架構文件
  NEXORA - NX01 - 共用基礎模組工作日誌
  ...
  NEXORA - NX10 - 遊戲化模組工作日誌
  NEXORA - SHARED - 跨模組工作日誌（待寫）
```

### Alex 跨對話必讀順序

```
1. 本檔（PROJECT_CONTEXT.md）— 業務 + 設計 + 文化視角
2. NEXORA - 系統架構文件 — 了解 Hank 蓋了什麼房子
3. 涉及的模組需求規格書 — 如本對話跟銷貨有關 → 讀 NX04 主檔 + 相關子規格書
4. 對應模組的 Hank 工作日誌 — 看 Hank 最近做了什麼
```

### 工作流（Crown 主導）

```
1. Hank 寫工作日誌 → Crown 上傳專案 → Alex 確認
2. Alex 寫模組主檔規格書 → Crown 確認
3. Crown 拍下一階段（哪個子功能？）→ Hank 寫對應日誌
4. Crown 上傳 → Alex 確認 → Alex 寫子規格書
5. 反覆、一次只穩固一條藍圖
```

---

## 文件版本

> ⚠️ 同源原則：本段最新版本號 = header「文件版本」line。升版時兩處一起動、不可單動。

- **v1.4（2026-05-06）**：header 範式統一 + 同源原則文字化（TASK-PHASE2-DOC-A035-CLOSURE-01-FOLLOWUP）
  - header 加同源原則註（提醒 header line 跟本段最新版本號同步）
  - 本段加同源原則註（雙向提示、避免任一處 grep 漏掉）
  - 對應 CLAUDE.md v1.2 同步落地（CLAUDE.md header 對齊 PROJECT_CONTEXT 範式 + 整併「重大變動紀錄」進 §十八）

- **v1.3（2026-05-06）**：A035 family closure、4 處 PRO 倉數算術 drift 校正（TASK-PHASE2-DOC-A035-CLOSURE-01）
  - PROJECT_CONTEXT line 54：PRO 倉模型 5→6 校正
  - CLAUDE.md line 20：PRO 倉模型 5→6 校正
  - CLAUDE.md line 88：PRO 倉數 5→6、加「預設/上限」Tier 分層
  - CLAUDE.md line 323：seed 註解 PRO 倉數 5→6
  - 對齊 NX01-06 v1.1 PRO 倉真相 + §7 預設/上限分層
  - HW1+MW1+BW1+BW2+BW3+BW4 = 6 個（算術校驗）

- **v1.2（2026-05-06）**：校正 Roles 7 個真相（TASK-PHASE2-NX01-USER-ROLE-SCHEMA-EXTEND-01、Crown 拍 Q4）
  - § 資料/命名標準 § 事實修正 「Roles 8 個」→「7 個」+ 列出 7 種對齊 NX01-02 規格書 v1.0
  - 業務真相對齊：HR_ADMIN 併入 HR / LOGISTICS 移除（外包物流由 partner_type=T 處理）
  - 對應 A034 紀錄、跟 schema + seed + apply-role.ts 三方一致性收斂

- **v1.1（2026-05-02）**：加第 23 條擴充性原則（TASK-PHASE2-EXTENSIBILITY-PRINCIPLE-01）
  - § 工程模式 B 部分加第 23 條「擴充性原則」（NEXORA 全域、Phase 2 累積）
  - 7 條口訣（核心 3 條 + 紀律 2 條 + 加欄位向後相容檢查 + 升級結構 3 階段演進）
  - 來源：Phase 2 NX01 主檔規格書設計時 Crown 提「規格書要具備擴充性」、Alex 從業界擴充性兩極端 + Phase 0~1 踩坑累積

- **v1.0（2026-04-29）**：從 Claude.ai 專案內遷移至 GitHub repo root（TASK-PHASE1-PROJECT-CONTEXT-MIGRATE-01）
  - 加 14 條設計範式（review 累積、worklog 萃取）→ § 工程模式 B 部分
  - 加索引指向 CLAUDE.md（G6.1 C 策略：分層折中）
  - § 專案定位拆「恆迎反面 / Yaro 正面」兩個獨立實體（G6.3）
  - § 角色分工 Hank 載體 Cursor → VSCode + Claude Code（charter §0 校正）
  - § 資料/命名標準 加資料層數量（137 models / 25 migrations / 60 controllers）
  - Yaro 拼字校正（原 baseline 寫 Arco）
  - partner_type B 註解改 nx01_bank_account（對齊新模組代碼）

> 維護方式：
> - **撰寫者**：Hank（撰寫不決策、技術事實對齊程式碼現況）
> - **寫給誰看**：全員（Alex 跨對話必讀、Crown / Hank 也參考）
> - **工作流**：Hank 撰寫 → Alex review → Crown 拍 → push
> - **觸發更新**：技術事實變動（版本 / 數量 / 路徑）/ 14 條規則升級 / 設計哲學擴充 / Alex 失誤紀錄新增（Crown 補）/ Crown 合作風格演變
