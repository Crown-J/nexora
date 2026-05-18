<!-- docs/_team/nx02-04-flow-audit-01.md -->

# NX02-04-FLOW-AUDIT-01 — NEXORA 採購 + 銷售業務流程 + 既有 UI 操作真相揭露

> 性質：純諮詢、不開工、不 commit production code（僅 commit 本 audit 文件）
> 撰寫：Hank
> 日期：2026-05-18
> 觸發：NEXORA UI 真實化軌深化期、Crown 揭露「部門 × 業務情境 = 工作站」範式、Alex 之前推 163 page 完全錯方向、需 verify 既有業務流程 + UI 真相重新規劃
> 對齊：[NX-UI-AUDIT-01](./ui-audit-01.md) + [NX-UI-AUDIT-02](./ui-audit-02-crud-pattern.md) + [NX06-PWA-AUDIT-01](./nx06-pwa-audit-01.md) + §I.5 #22 鐵律 + §G.9 通配 grep + §I.6.3 揭露不完整每段尾標

---

## §0 結論先說（給 Alex 校正用）

⭐⭐⭐ **NEXORA 工作站範式 = 既有實作教科書範例已存在**：

| 既有實作 | 路徑 | 戰略價值 |
|---|---|---|
| **MobileSaleSopPage**（國內銷售 9 步驟 SOP 工作站）⭐⭐⭐ | `/dashboard/sale/sop-demo` | **業界改革標桿 + Crown「工作站」哲學完美落地** |
| **PurchaseDomesticWorkbenchView**（國內採購 6 流程節點）| `/dashboard/purchase/domestic` | 流程圖式工作站範式 |
| **SalesWorkflowPage**（庫存銷售工作台）| ⚠️ features 寫了 / page 未掛 | 範式可借鏡 |
| **SalesHubMobile**（銷售中心手機版 4 分區）| `/dashboard/sale?section=...` | hub-as-tabs 範式 |
| **ProNx10LeftPanel**（八角遊戲化首頁 panel）| `/dashboard` PRO 模式 | dashboard-side-panel 範式 |
| **BaseMasterModalFrame**（主檔 CRUD）| 21 主檔共用 | 主檔操作標準範式 |

⭐ **「業務情境聚合工作站」≠「表格 CRUD」**、NEXORA 已有 5 個落地範式可參考。

→ **Alex 校正建議**：
- 163 page → **約 25-35 工作站 + 30 主檔頁 + 30 業務單據獨立頁 + 20 dashboard = ~110 page**（縮約 ~33%）
- v0 模板核心：1）**工作站範式**（MobileSaleSop 為標桿、9 步驟 + 進度條 + 對話）2）流程節點工作台（PurchaseDomesticWorkbench 為標桿）3）主檔 List+Modal（BaseMasterModalFrame）4）業務單據 List/New/Detail 3-page

### §I.6.3 §0 揭露不完整

- 未 verify Alex 163 page 是按什麼粒度估算（每個 endpoint 1 page vs 每個 entity 3 page）

---

## §1 NX02 採購完整業務流程

### 1.1 9 主流程（A041 精確 = docs/nx02/workflow/primary/）

對齊 `docs/nx02/workflow/primary/`：

```
p-w01-domestic-purchase.md           國內採購
p-w02-international-purchase.md      國外採購（含進口攤分）
p-w03-purchase-return.md             採購退貨
p-w04-special-purchase.md            特殊採購（掃貨 + 機會採購）
p-w05-pricing.md                     產品定價
p-w06-stock-thresholds.md            庫存閾值
p-w07-vendor-management.md           廠商管理
p-w08-warranty-claim.md              保固申請（跨部門 ⭐⭐⭐）
p-w09-new-brand-line.md              新品牌新產品線
```

### 1.2 P-W01 國內採購 5 階段（業務情境）

```
階段 1：需求收集（DR）
  ├─ 觸發 1：SYS-I01~（庫存低於安全量自動觸發、來源 = NX03）
  ├─ 觸發 2：S01（銷售專員提交客訂需求、來源 = NX04 SO）⭐ 跨部門
  └─ 觸發 3：P01^（廠商通知特價/新品、組長評估、走 P-W04B）
      ↓
階段 2：採購詢價（RFQ）
  ├─ P02 採購專員建立詢價
  ├─ P03^ 廠商回覆報價（外部）
  └─ ⊗ 詢價逾期 → 通知組長重新詢價或換廠商
      ↓
階段 3：採購單（PO）
  ├─ P04 採購專員建單（purchase_type=D 國內）
  ├─ P04* 採購組長審核（核准 / 退件）
  ├─ P05 寄出採購單
  ├─ P05^ 廠商確認接單（外部）
  └─ ⊗ 廠商無法供貨 → 流程結束
      ↓
階段 4：進貨驗收（RR）
  ├─ P06 採購專員建立進貨單（從 PO 匯入明細）
  ├─ P07 倉管專員執行驗收（料號/數量/外觀逐筆核對）
  ├─ P07* 倉管組長確認
  └─ ⚠️ 異常 → 引用 P01 退供應商作業
      ↓
階段 5：入帳
  ├─ P08 倉管組長執行入帳
  ├─ 跨模組觸發 P08→I（NX03 stock_ledger）
  └─ 跨模組觸發 P08→F（NX05 AP 應付帳款）
```

### 1.3 P-W04 特殊採購（跳階段）

⭐ **跳關情境揭露**：

| 情境 | 跳過階段 | 走法 |
|---|---|---|
| **P-W04A 掃貨**（同行/廠商整批出清）| **跳過階段 2 詢價** + **跳過階段 4 一般驗收** | 直接組長評估 → 建 PO type=B 整批喊價 → 現場清單核對（多算送、少採購組長決定）→ SYS-P01~ 系統成本攤分 |
| **P-W04B 機會採購**（廠商特價/新品）| **跳過階段 1 需求收集 + 階段 2 詢價** | 採購組長主動評估 → 建 PO type=D → 走一般驗收 |

⭐ **業務員實際動作**：
- 掃貨：採購組長現場與廠商喊整批價、回 NEXORA 開 PO type=B + 上傳料號清單 + 倉管現場核對 → 系統自動成本攤分
- 機會採購：廠商 LINE 通知特價 → 組長口頭評估 → 採購員建 PO type=D → 寄發採購單

### 1.4 P-W02 國外採購（含進口攤分）

```
階段 1：需求 + 國際詢價（含 forwarder / 報關行）
階段 2：建立 PO（含 incoterm / 幣別）
階段 3：押匯 / 報關 / 進口
階段 4：進貨驗收 + 進口費用攤分（運費 / 關稅 / 報關費）→ 攤入料號成本
階段 5：入帳（含外幣換算）
```

### 1.5 P-W08 保固申請（跨部門 ⭐⭐⭐ 關鍵流程）

對齊 `docs/nx02/workflow/primary/p-w08-warranty-claim.md`：

```
階段 1：倉管組長初判（W01-W03）
  └─ 查 SO 購買記錄 + 確認保固期 + 判斷損壞原因
      ↓
階段 2：業務向客戶索取證明文件（W04-W08）
  ├─ 必要文件：照片/影片 + 行照 + 維修記錄 + 保固貼紙照片
  ├─ W06 業務在系統填保固申請單
  ├─ W07 上傳證明文件
  └─ W08 系統通知採購組長
      ↓
階段 3：採購接洽廠商（W09-W11）
  ├─ W09 採購專員確認廠商保固政策
  ├─ W10* 採購組長審核
  ├─ W11 向廠商提出申請
  └─ W11^ 廠商審核回覆（外部）
      ↓
階段 4：處理結果（W12-W14）
  ├─ 廠商補發良品 → 走進貨驗收後配送
  ├─ 廠商退款 → AP 沖銷
  └─ 廠商折讓 → 引用 F02 折讓作業
```

⭐ **業務真相**：客戶聯絡業務 → 業務通知倉管組長 → 倉管組長初判 → 業務索證明 → 採購接廠商 → 結果通知業務 → 業務通知客戶。**4 角色 14 動作、UI 上應該是「保固單一工作站」串起 4 角色 collaboration**。

### §I.6.3 §1 揭露不完整

- 未 verify P-W03 採購退貨 detailed flow（只列代碼 P01）
- 未 verify P-W05 產品定價（掃貨入帳後設定建議售價）UI 流程
- 未 verify P-W06 庫存閾值 + P-W07 廠商管理是純主檔維護 vs 業務流程
- 未 verify P-W09 新品牌新產品線（涉 NX01 brand-code-rule）UI 入口

---

## §2 NX02 既有 UI 操作真相

### 2.1 採購業務員打開 NEXORA 第一個頁面

```
登入 → /dashboard（SysDashboardPage 個人首頁 mock：calendar + tasks + Pro 八角 panel）
  ↓ TopBar 模組 Tabs：base / purchase / inventory / sales / finance（只 5 tab、缺 NX06-10）
  ↓ 點「採購管理」
  → /dashboard/purchase（採購中心 Hub）
```

⭐ **採購中心 Hub 結構**（對齊 `apps/nx-ui/src/app/dashboard/purchase/page.tsx`）：

```
主檔管理（1 section、count=1）
  └─ HubLinkCard「產品管理」→ /dashboard/purchase/product（placeholder）

國內採購（1 section、count=5）
  ├─ STEP 1「需求」→ /dashboard/purchase/domestic（PurchaseDomesticWorkbenchView 流程圖工作台）
  ├─ STEP 2「詢價」→ /dashboard/purchase/rfq（RfqDocPage、document-demo）
  ├─ STEP 3「採購單」→ /dashboard/purchase/po（PoDocPage、document-demo）
  ├─ STEP 4「進貨單」→ /dashboard/purchase/rr（RrDocPage、document-demo）
  └─ STEP 5「退貨單」→ /dashboard/purchase/pr（placeholder）

特殊採購（1 section、count=4）
  ├─ STEP 1「採購單」→ ? （無 href、純展示）
  ├─ STEP 2「進貨單」→ ?
  ├─ STEP 3「退貨單」→ ?
  └─ STEP 4「廠商管理」→ /dashboard/purchase/vendor（placeholder）
```

⚠️ **整體 hub = HubLinkCard 11 個跳轉**、**0 真實工作站聚合**（每個 STEP 跳到獨立頁、業務員看不到整個流程進度）。

### 2.2 從打開 → 建一筆採購單所需操作步驟

```
1. 登入                                           （1 點）
2. TopBar 點「採購管理」                          （1 點）
3. 點「採購單」HubLinkCard                        （1 點 → /purchase/po）
4. RfqDocPage / PoDocPage 內點「新增」（document-demo 範式）（1 點）
5. 填表單 + 加 items 明細                         （N 點）
6. 寄出採購單                                     （1 點）

≈ 5-6 點 + N 表單欄位
```

⚠️ **沒有「採購工作台」概念既有實作**（PurchaseDomesticWorkbenchView 是流程圖式工作台、但只在 `/purchase/domestic` 顯示需求節點、其他 5 節點均跳獨立頁）。

### 2.3 既有 7 業務單據 UI 串聯範式

| 單據 | UI 路徑 | 範式 | 串聯方式 |
|---|---|---|---|
| **DR 需求**（demand）| `/purchase/domestic` 流程圖 | PurchaseDomesticWorkbenchView | 流程圖點 needs node |
| **RFQ 詢價**| `/purchase/rfq` | RfqDocPage（document-demo）| 獨立頁 |
| **QT 報價**（外部）| - | - | NX04 銷售用、不在採購 |
| **PO 採購單**| `/purchase/po` | PoDocPage（document-demo）| 獨立頁 |
| **RR 進貨**| `/purchase/rr` | RrDocPage（document-demo）| 獨立頁 |
| **PR 退貨**| `/purchase/rr`（共用？）| placeholder | placeholder |
| **保固申請**| - | 0 UI | 完全 backlog |
| **TI 調貨**（cross-module）| `/sale/?section=...` | NX04 銷售工作站使用 | NX04 用 |

⚠️ **document-demo 範式真相**：純展示用 mock data、不是真實業務 wire（`DocLayout / DocListView / DocDetailView / DocItemTable` 是公版元件、可借用範式但未連 backend）。

### 2.4 採購工作台既有實作 — PurchaseDomesticWorkbenchView

對齊 `apps/nx-ui/src/features/purchase/domestic/PurchaseDomesticWorkbenchView.tsx`：

```typescript
const FLOW: { key: FlowNodeKey; label: string; Icon: LucideIcon }[] = [
  { key: 'demand',   label: '需求',    Icon: ClipboardList },
  { key: 'rfq',      label: '詢價',    Icon: FileSearch },
  { key: 'po',       label: '採購單',  Icon: ShoppingCart },
  { key: 'rr',       label: '進貨單',  Icon: Package },
  { key: 'pr',       label: '退貨單',  Icon: RotateCcw },
  { key: 'warranty', label: '保固申請', Icon: ShieldCheck },
];
```

⭐ **既有實作**：
- 流程圖標 6 節點（PurchaseDomesticWorkbenchView 頂部 horizontal stepper）
- 點 demand node → 顯示「需求節點 mock 列表」（PurchaseDomesticRfqNodeView）
- 點 rfq node → 顯示「詢價節點列表 + 表單」（PurchaseDomesticRfqFormView）
- 其餘 4 節點 = stub / placeholder

⚠️ **限制**：6 節點點擊只是「同頁切換內容」、不是跨節點串聯（用戶體驗類似 tab、不是真實工作流自動推進）。

### 2.5 主管 vs 組員權限差異

⚠️ **既有 UI 0 visible 權限差異**：
- backend RolesGuard 已 wire（採購專員 / 採購組長分權）
- frontend useSessionMe planCode 區分 LITE/PLUS/PRO 但**未區分職務 role**
- HubLinkCard 全角色看到相同入口

### 2.6 國內 vs 國外 UI 處理

- ✅ **分開頁面**：`/dashboard/purchase/domestic` vs `/dashboard/nx02/import`（placeholder）
- ❌ 0 tab 內切換
- 業務員需主動選擇進入哪條業務線

### §I.6.3 §2 揭露不完整

- 未 verify document-demo（PoDocPage / RfqDocPage / RrDocPage）實際被 production 使用 vs 純 demo
- 未 verify backend nx02 採購 endpoint 真實連線狀態（vs UI 純 mock）
- 未 verify PurchaseDomesticWorkbenchView 6 節點是否未來會打通跨節點串聯

---

## §3 NX04 銷售完整業務流程 + 保固

### 3.1 6 主流程（A041 精確 = docs/nx04/workflow/primary/）

```
s-w01-domestic-sales.md          國內銷售
s-w02-international-sales.md     國外銷售（出口）
s-w03-sales-return.md            銷退處理
s-w04-customer-acquisition.md    客戶開發
s-w05-customer-grading.md        客戶分級
s-w06-customer-feedback.md       客戶回饋
```

### 3.2 S-W01 國內銷售 5 階段 + 3 路線（業務情境）

```
階段 1：詢價與報價（QT）
  ├─ S01 業務查庫存 + 建議售價（Alt+Q 查料）
  ├─ S02 建立 QT、帶入客戶等級與毛利區間
  ├─ S03 填明細（低於最低售價需填原因）
  ├─ S04 寄出報價單（Excel/PDF）
  └─ S04^ 客戶確認
  全公司無庫存 → S05 向同行詢價 RF → S06 加毛利回客戶
      ↓
階段 2：建立銷貨單（SO）
  ├─ S07 從 QT 帶入料號/數量/單價
  ├─ S08 選出貨方式（D 配送 / P 自取 / C 寄貨）
  ├─ S09 選出貨倉庫
  └─ SYS-S01~ 系統立即預留 reserved_qty
  系統自動分流明細狀態：
    ├─ 路線 A：本倉/他倉有貨 → 「待撿貨」+ 自動產生 PK
    ├─ 路線 B：本倉不足、他倉有 → 「待調撥」+ NX02 建待申請項目
    └─ 路線 C：全公司無貨 → 「待調貨」+ 業務按 Alt+T 發起調貨
      ↓
階段 3：備貨（3 路線）
  ├─ 路線 A：撿貨（I03）
  ├─ 路線 B：調撥（I02）→ 入庫 → 回路線 A
  └─ 路線 C：調貨（L02 外務取貨）→ 入庫 → 回路線 A
      ↓
階段 4：出貨（依方式 3 路線）
  ├─ 配送（D）：包貨 → DN → 物流組長派外務 → 客戶簽收
  ├─ 自取（P）：簡易包貨 → BOX 編號 → 通知業務 → 客戶來取
  └─ 寄貨（C）：包貨 → 第三方物流取件 → 填追蹤單號
      ↓
階段 5：帳務（AR）
  根據出貨方式 + 付款條件自動產生 AR
```

⭐ **跳關情境**：
- 「客戶詢價直接建 SO 跳過 Quote」= ❌ docs 揭露**沒此情境**、流程強制 QT → SO
- 「業務主動推薦」（S02 觸發 = 業務查到客戶可能要的料、主動建 QT）
- 客戶授信檢查時機：**SO create 時**（NX04-IMPL-01 Phase 3 commit 3a Q-C4=A 4 機制：黑名單→額度→逾期→付款條件）

### 3.3 S-W03 銷退處理（簡化版）

對齊既有 `s-w03-sales-return.md`：
- 客戶反映 → 業務建 SR（銷退單）→ 倉管驗收 → 入庫 → NX05 折讓單 / AR 沖銷
- ⚠️ **保固獨立走 P-W08**（NX02 跨部門流程、不在 SR 內）

### 3.4 保固業務真相（Crown 揭露的 3 角色協作）

對齊 `docs/nx02/workflow/primary/p-w08-warranty-claim.md`（§1.5 已詳述）：

```
客戶 → 業務（W04-W05 索取證明文件）→ 業務在系統建保固申請單（W06-W08）
                                       ↓
                                  倉管組長（W01-W03 初判）
                                       ↓
                                  採購（W09-W11 接洽廠商）→ 廠商
                                       ↓
                                  廠商回覆 → 採購記錄（W12）
                                       ↓
                                  業務通知客戶結果（W13-W14）
```

⭐ **既有 NX04 SR UI 是否處理保固**：
- backend：保固走獨立流程（NX02 範圍 P-W08）、與 NX04 SR 完全分離
- frontend：**0 保固 UI 既有實作**（sale hub 有「保固申請」HubLinkCard 但 href 空 / placeholder）

⚠️ **業務真相**：保固在當前 NEXORA 是「業務員口頭轉」、系統未串、Crown 揭露的「客戶→業務→產品部→廠商」3 角色協作對應「業務→倉管組長→採購→廠商」4 角色 backend workflow 已 spec、UI 0。

### §I.6.3 §3 揭露不完整

- 未 verify S-W02 國外銷售（出口）含 forwarder / 報關 / FOB / CIF 流程
- 未 verify s-w04 customer-acquisition / s-w05 grading / s-w06 feedback 詳細流程
- 未 verify Crown 揭露的「客戶→業務→產品部→廠商」中「產品部」對應現有哪個角色（推測 = 倉管組長 + 採購、跨 2 部門）

---

## §4 NX04 既有 UI 操作真相

### 4.1 業務員從打開 NEXORA → 建一筆銷貨步驟

```
1. 登入                                                （1 點）
2. TopBar 點「銷售管理」                                （1 點）
3. /dashboard/sale 銷售中心 Hub
   ├─ 桌面版：HubLinkCard 7 卡（查詢/詢價/報價/調貨/銷貨/銷退/保固）
   └─ 手機版：4 分區（狀態追蹤/工作站/單據管理/客戶維護）
      ↓
4. 點「工作站」分區 → 點「國內銷售」（9 步驟 SOP 流程）
   → /dashboard/sale/sop-demo （MobileSaleSopPage）
      ↓
5. Step 1 選客戶 → Step 2 查料 → Step 3 報價列表 → Step 4 報價方式 →
   Step 5 客戶決定 → Step 6 配送方式 → Step 7 簽收方式 →
   Step 8 訂單完成 → Step 9 摘要

≈ 4 點 + 9 step 流程（每步含表單 / 對話 / 條件分支）
```

⭐ **業界改革**：**從打開 NEXORA → 建一筆 SO 走 SOP 工作站只需 4 點 + 9 step**、業務員不需理解 QT/SO/PK/DN 4 表單切換、SOP 工作站幫他連起來。

### 4.2 既有 3 業務單據 UI 串聯範式

| 單據 | 桌面 UI | 手機 UI |
|---|---|---|
| **Quote (QT)**| `/sale/qt`（placeholder）or `/sale/docs/quote` placeholder + `/sale/docs/quote/[qtId]`（MobileQTDetailPage）| MobileQTDetailPage（真實 Mobile UI）|
| **SO (銷貨單)**| `/sale/so` placeholder | 走 sop-demo 9 步驟工作站直接產生（不從 list 進、從工作流產生）|
| **SR (銷退單)**| `/sale/return` placeholder | placeholder |
| **TI (調貨單)**| `/sale/inquiry`（MobileInquiryListPage 真實）+ `/sale/inquiry/[rfqId]`（MobileInquiryDetailPage）| ✅ 真實 mobile UI |

⭐ **串聯範式**：
- **新 SO 走工作站**（sop-demo 自動串 QT → SO 進度條 + 對話框）
- **既有 SO 維護走 list**（/sale/docs 系列、目前 placeholder）
- **調貨單獨立 mobile 體驗**（/sale/inquiry RFQ 同行詢價、4 page 已實作 Mobile UI、Hank PWA audit 已揭露）

### 4.3 「調貨管理」既有 UI 真相

對齊 grep + 既有實作：

```
TI 調貨單 UI = 「同行詢價」性質（業務向同行廠商詢價 → 同行報價 → 採用 → 取貨）
路徑：/dashboard/sale/inquiry（MobileInquiryListPage）
歸屬：銷售部 NX04（不是 NX02 採購）
原因：發起者是業務員、為了解決 SO 全公司無庫存問題、調貨單由業務員建
```

⭐ **跨群歸屬**：調貨在 NEXORA = 銷售業務員工作（不是採購）、UI 完全在 sale module 下。

### 4.4 客戶資料維護 UI

```
桌面：/dashboard/base/partners（BasePartnerMasterView、modal 範式）⭐ 真實
桌面：/dashboard/nx04/customer（placeholder）
桌面：/dashboard/sale/customer/info（placeholder）
桌面：/dashboard/sale/customer/grading（placeholder）
桌面：/dashboard/sale/customer/analysis（placeholder）

手機：sale hub 4 分區「客戶維護」section（CustomerSection）
```

⭐ **真實實作 = base/partners**（同時管廠商 + 客戶、partnerType='C' 是客戶）+ Mobile CustomerSection（hub 分區）+ 多個 placeholder（sale/customer/* + nx04/customer）。**有重複 UI 入口**、待整併。

### 4.5 sale hub 手機版 4 分區（業界改革 ⭐⭐⭐）

對齊 `SalesHubMobile.tsx`：

```typescript
const SECTION_TABS = [
  { id: 'status',       label: '狀態追蹤', Icon: LayoutDashboard },  // ⭐ 預設首頁
  { id: 'workstation',  label: '工作站',  Icon: Wrench },             // ⭐⭐⭐ 業界改革
  { id: 'documents',    label: '單據管理', Icon: FileText },
  { id: 'customer',     label: '客戶維護', Icon: Users },
];
```

⭐ **業界改革**：
- **狀態追蹤**（StatusSection）：PRO 限定 KPI 3 卡（業績/毛利率/退貨率）+ 待辦清單（SO/IT/TI/保固未完成）
- **工作站**（WorkstationSection）：4 個業務情境入口（國內銷售/國外/銷退/保固）
- **單據管理**（DocumentsSection）：傳統表格 CRUD
- **客戶維護**（CustomerSection）：客戶資料 + 分級

⭐⭐⭐ **Crown「工作站」哲學 = sale 手機版 4 分區已完整實作**。

### §I.6.3 §4 揭露不完整

- 未 verify sale hub 桌面版（HubLinkCard 7 卡）vs 手機版（4 分區）的 UX 差異原因
- 未 verify CustomerSection 是否已連 base/partners backend
- 未 verify StatusSection 待辦清單對應的 SalesStore 真實 state 完整度

---

## §5 跨部門協作流程真相

### 5.1 採購需求單（DR）來源 = 業務客訂（S01）的 UI 流程

對齊 P-W01 階段 1 觸發來源 S01：

```
docs 揭露：
業務在 NX04 建 SO（含「待調貨」明細）
  ↓
SYS-S01~ 系統預留 reserved_qty
  ↓
業務按 Alt+T 發起 TI 調貨單（同行調貨、屬 NX04 內部）
OR
系統推給 NX02 採購需求池（如 SO 全公司無庫存時走採購而非調貨）
  ↓
採購專員到 /dashboard/purchase/domestic「需求」節點看新需求
  ↓
採購專員建 DR、進入 P-W01 階段 2 詢價
```

⚠️ **既有 UI 實作真相**：
- **TI 調貨**（同行）= 已實作 mobile UI（/sale/inquiry 完整 4 page）✅
- **DR 採購需求觸發**（業務 SO → NX02 DR）= **完全沒有 UI wire**、無從 SO 觸發 DR 的 button、PurchaseDomesticWorkbenchView 需求節點是 mock 列表
- **業務員到 demand 頁主動建 DR** = 無此 UI 入口
- **客戶到貨後通知 SO 觸發** = 完全沒有 wire

→ **業界改革候選**：NX04 SO → NX02 DR 自動推送 + NX02 demand 工作站接收 = 跨部門協作 UI 缺口 ⭐⭐⭐

### 5.2 動態交接（NX06）跨業務員 UI

對齊 [NX06-PWA-AUDIT-01](./nx06-pwa-audit-01.md)：

| 端 | 真實 UI | 範式 |
|---|---|---|
| 倉管組長派工（桌面）| `/dashboard/nx06/handover` placeholder | ❌ 純 placeholder |
| 外務員接收（手機 PWA）| `/dashboard/nx06/driver/handover` placeholder | ❌ 純 placeholder |
| backend wire（NX10 +25 Exp 獎勵）| `createRewardFromHandover` 已實作 ⭐⭐⭐ | ✅ backend 100% |

⭐ **業界改革 backend 完整、frontend 0**（4 driver/* page 全 placeholder）。

### 5.3 NX04 業績 → NX07 薪資加給 wire 業務員看得到嗎

對齊 [NX09-AUDIT-02](../nx09/nx09-audit-02.md)：

| 流程 | backend | frontend |
|---|---|---|
| SO SHIPPED → NX10 +Exp（tier-based）| ✅ updateRankingFromPerformance helper | ❌ 0 UI 視覺化 |
| 月底 KPI bonus 計算 | ✅ Nx07SalaryAccrualService | ❌ /dashboard/nx07/salary placeholder |
| 醫章 tier 加碼薪資 | ✅ applyMedalBonusToSalary | ❌ 0 UI |

⚠️ **業務員看不到自己業績如何轉成薪資 + Exp**（NX07 salary placeholder + NX10 leaderboard placeholder + ProNx10LeftPanel 雖在首頁但全 mock）→ 業界改革對員工激勵的 UI 視覺化 0 落地。

### 5.4 跨部門看板 / dashboard 既有實作

對齊 [NX-UI-AUDIT-01](./ui-audit-01.md) §1.4：

```
NX08 經營分析 = 23 placeholder
分 7 角色 group：
  - 業務員 dashboard × 3（個人銷售 / 客戶 / 商品）
  - 倉管 dashboard × 3（周轉 / 滯銷 / 缺貨）
  - 倉管組長 dashboard × 3（配送成本 / 路線 / 動態轉派）
  - 採購 dashboard × 4（廠商評等 / 比價 / PO stats / AR 命中率）
  - 財務 dashboard × 3（AR / AP / cash flow）
  - 主管 dashboard × 3（部門業績 / 業務員排行 / KPI gap）
  - Crown 戰略 × 3（跨部門 / BCG matrix / 戰略 KPI）
```

⚠️ **23 placeholder 全無 chart 庫**（0 Recharts / 0 Tremor）= 跨部門看板 backend 已有 endpoint、UI 0 落地。

### §I.6.3 §5 揭露不完整

- 未 verify SO 觸發 DR 是否在 docs spec 明確（手動 vs 自動）
- 未 verify NX10 ProNx10LeftPanel 是否有「我的 SO 業績累積 Exp」即時揭露
- 未 verify 業務員手機版 sale hub StatusSection 是否含「我的本月業績」KPI

---

## §6 「工作站範式」既有 NEXORA 痕跡揭露

### 6.1 ⭐⭐⭐ 5 個既有工作站範式（best practice 候選）

#### 範式 A：**MobileSaleSopPage**（國內銷售 9 步驟 SOP 工作站）⭐⭐⭐⭐⭐ 標桿

對齊 `apps/nx-ui/src/features/sale/ui/sop-workspace/MobileSaleSopPage.tsx`：

```
ProgressHeader（頂部進度條 9 步驟）
+ StepWrapper（每步底部操作列）
+ 9 step components：
    Step1SelectCustomer / Step2SearchParts / Step3QuoteList /
    Step4QuoteMethod / Step5CustomerDecide / Step6DeliveryMethod /
    Step7SignMethod / Step8OrderComplete / Step9Summary
+ 7 dialog components（AddMore / Consider / OutOfStock / PartialAccept /
                       PriceAdjust / RejectReason）+ SignaturePadModal
+ FloatingToast（自製 toast）
+ ImageLightbox / MarginAlert / HistoryQuoteAlert
+ useReducer 驅動全 9 步流程狀態（SalesStore）
```

⭐ **戰略價值**：
- 業務員「打開 → 建 SO」流程從 N 個獨立頁 → **單一工作站**
- 業界 ERP 沒人這樣做（中小汽配 ERP 業界改革 ⭐⭐⭐）
- Crown「部門 × 業務情境 = 工作站」哲學的完美落地範例
- 行動端優先（mobile 範式 + bottom-aligned action bar）

#### 範式 B：**PurchaseDomesticWorkbenchView**（國內採購 6 流程節點）⭐⭐⭐

對齊 `apps/nx-ui/src/features/purchase/domestic/PurchaseDomesticWorkbenchView.tsx`：

```
頂部：6 節點 horizontal stepper（demand / rfq / po / rr / pr / warranty）
中段：依當前 node 顯示對應內容（list + form）
底部：操作 button
```

⭐ **特徵**：流程圖式工作台、節點點擊切換內容區、跟 MobileSaleSop 9 步驟不同（這是「flow nav」、SOP 是「forced sequence」）

#### 範式 C：**SalesWorkflowPage**（庫存銷售 main+browse 雙 tab）⚠️ 寫了未掛

對齊 `apps/nx-ui/src/features/nx03/workflow/ui/SalesWorkflowPage.tsx`：

```
頂部：mainTab（operation vs documents）
operation phase：quote → salesOrder（2 階段）
+ SalesOrderWorkspace + SalesOperationWorkspace + SalesDocumentsBrowse
+ WorkflowStepBar + WorkflowStepPanel + WorkflowQuickActions
```

⭐ **特徵**：「主要作業」+「文件瀏覽」雙模式切換、適合主管角色

⚠️ **狀態**：features 寫完整、**app/dashboard/page 未引用**、placeholder 還掛著

#### 範式 D：**SalesHubMobile 4 分區**（業界改革 ⭐⭐⭐）

對齊 `apps/nx-ui/src/features/sale/ui/hub/SalesHubMobile.tsx`：

```
URL ?section= 4 切換：
  status（狀態追蹤 + KPI + 待辦）
  workstation（4 業務情境入口）
  documents（單據管理）
  customer（客戶維護）
```

⭐ **特徵**：hub-as-tabs 範式、URL state、4 個業務情境聚合

#### 範式 E：**ProNx10LeftPanel**（八角遊戲化 dashboard panel）

對齊 `apps/nx-ui/src/features/sys-dashboard/ui/ProNx10LeftPanel.tsx`：

```
首頁左側 panel（PRO only）：
  CheckinCard / CheckinRewardModal /
  DailyGoalCard / DailyReportBtn /
  MonthlyGoalCard / ExpBar / MedalModal
```

⭐ **特徵**：dashboard side panel 範式（不是 main content、輔助 widget）

### 6.2 既有工作站 vs CRUD 表格分布揭露

| 模組 | 工作站範式（業務情境聚合）| 表格 CRUD 範式 | 真實化率 |
|---|---|---|---|
| **NX04 銷售**| ✅ MobileSaleSopPage / SalesHubMobile 4 分區 / sale/inquiry mobile | ⚠️ sale/docs/* 多 placeholder | ⭐⭐⭐ 50%+ |
| **NX02 採購**| ⚠️ PurchaseDomesticWorkbenchView（部分實作）| ✅ document-demo PoDocPage / RfqDocPage / RrDocPage | ⭐⭐ 30% |
| **NX01 主檔**| - | ✅ BaseMasterModalFrame × 16（modal CRUD 範式）| ⭐⭐⭐ 100% |
| **NX03 庫存**| ⚠️ SalesWorkflowPage（features 寫了未掛）| ✅ nx02 balance / ledger / shortage 等 | ⭐⭐ 50% |
| **NX05 財務**| ❌ 0 | ❌ 全 placeholder | ❌ 0% |
| **NX06 物流**| ❌ 4 driver placeholder | ❌ 全 placeholder | ❌ 0% |
| **NX07 人資**| ❌ 全 placeholder | - | ❌ 0% |
| **NX08 報表**| ❌ 23 placeholder（缺 chart）| - | ❌ 0% |
| **NX09 EIP**| ❌ 全 placeholder | - | ❌ 0% |
| **NX10 八角**| ⭐ ProNx10LeftPanel 首頁 panel | ❌ 全 placeholder | ⭐ 10% |

### 6.3 Alex 規劃 NEXORA 工作站範式可參考的既有 best practice

#### ⭐ 借鏡 1：sop-workspace 9 步驟模板（給每個業務情境用）

```
適用：銷售（已落地）/ 採購（缺）/ 保固（缺）/ 銷退（缺）/ 國外銷售（缺）/ 國外採購（缺）
模板：
  - useReducer driven state
  - ProgressHeader（步驟條）
  - StepWrapper（底部操作列）
  - StepN component（每步獨立邏輯）
  - Dialog 處理分支選擇
  - FloatingToast 結果回饋
  - useStore（zustand）持久化
```

#### ⭐ 借鏡 2：sale hub 4 分區（給每個部門首頁用）

```
適用：銷售（已落地）/ 採購（缺）/ 倉管（缺）/ 財務（缺）/ HR（缺）
模板：
  - status section（KPI + 待辦）
  - workstation section（業務情境入口）
  - documents section（單據管理）
  - customer/master section（主檔維護）
```

#### ⭐ 借鏡 3：PurchaseDomesticWorkbenchView 流程圖式工作台

```
適用：流程清晰多階段業務（採購 / 進貨 / 出貨 / 配送）
模板：
  - 頂部 horizontal stepper（節點圖示 + label + badge 進度）
  - 中段內容區（依 node 切換）
  - 跨節點導航（業務員可順序 / 跳關走）
```

#### ⭐ 借鏡 4：BaseMasterModalFrame（給所有主檔）

對齊 [NX-UI-AUDIT-02](./ui-audit-02-crud-pattern.md)：21 主檔已用、繼續延伸至 NX02 vendor / NX04 customer / NX07 employee 等。

#### ⭐ 借鏡 5：ProNx10LeftPanel（NX10 八角範式）

```
適用：首頁右側 / 工作站側邊（員工激勵 / 進度提醒）
模板：CheckinCard + ExpBar + DailyGoalCard + MonthlyGoalCard
```

### 6.4 Crown「部門 × 業務情境 = 工作站」對齊既有實作

| 部門 | 業務情境 | 工作站 | 既有實作 |
|---|---|---|---|
| **銷售部**| 國內銷售 SOP | MobileSaleSopPage 9 步驟 | ✅ 落地 ⭐⭐⭐ |
| 銷售部 | 國外銷售 | placeholder | ❌ backlog |
| 銷售部 | 銷退處理 | placeholder | ❌ backlog |
| 銷售部 | 客戶開發 / 分級 | CustomerSection（hub 分區）| ⭐ 部分 |
| **採購部**| 國內採購 6 節點 | PurchaseDomesticWorkbenchView | ⭐⭐ 部分 |
| 採購部 | 國外採購 | placeholder | ❌ backlog |
| 採購部 | 特殊採購（掃貨 / 機會）| placeholder | ❌ backlog |
| 採購部 | 廠商管理 | placeholder | ❌ backlog |
| **倉管部**| 入庫 / 出庫 / 盤點 | placeholder | ❌ backlog |
| 倉管部 | 調撥 | nx02/transfer（有 list/new/[id]）| ⭐⭐ 業務單據 |
| 倉管部 | 撿貨 / 包貨 / 簽收 | placeholder | ❌ backlog |
| **物流部**（倉管組長）| 派工 + 動態交接 | placeholder | ❌ backlog |
| 物流部（外務）| PWA 任務 + 簽收 | 4 placeholder | ❌ backlog |
| **財務部**| AR / AP / 折讓 / 關帳 | placeholder | ❌ backlog |
| **HR 部**| 員工 / 出勤 / 薪資 / KPI | placeholder | ❌ backlog |
| **主管 / Crown**| 跨部門 dashboard | placeholder（23 個 NX08）| ❌ backlog |
| **業務員自我激勵**| 八角遊戲化 | ProNx10LeftPanel + 10 placeholder | ⭐⭐ 部分 |

⭐ **總計**：
- ✅ 完整落地：1（MobileSaleSopPage）
- ⭐ 部分落地：5
- ❌ 純 placeholder：11+

→ **NEXORA 工作站範式真實化率 ≈ 30%**（5/16 部門×情境）。

### §I.6.3 §6 揭露不完整

- 未 verify 是否有「部門權限切換」機制（業務員看銷售工作站、採購看採購工作站）
- 未 verify 跨部門「我要支援其他部門」場景（如業務員需要看採購需求）
- 未 verify Crown 對「每部門幾個工作站」拍板數量（vs 一個部門可能有 5-10 個業務情境）

---

## §7 §I.6.3 揭露不完整總清單

本 audit 已盡力 verify、剩餘需 Crown / Alex / 業務員補揭露：

1. **§0** Alex 163 page 估算粒度（endpoint vs entity）
2. **§1** P-W03/05/06/07/09 詳細業務流程
3. **§2** document-demo 真實使用程度
4. **§2** nx02 backend endpoint 真實連線狀態
5. **§3** S-W02 國外銷售 + s-w04/05/06 客戶流程
6. **§3** Crown「產品部」對應現行哪個角色
7. **§4** sale hub 桌面 vs 手機 UX 差異原因
8. **§4** sale/customer/* placeholder 整併計畫
9. **§5** SO → DR 觸發是手動 vs 自動 spec
10. **§5** 業務員手機版「我的本月業績」KPI 真實度
11. **§6** 部門權限切換機制
12. **§6** Crown 對「每部門工作站數量」拍板

---

## §8 戰略總覽（給 Alex 重新規劃 NEXORA 工作站範式）

### 8.1 ⭐⭐⭐ Alex 163 page 校正建議

| 維度 | 原估 | 校正後 |
|---|---|---|
| 主檔層（NX01）| 46 | **24 page**（BaseMasterModalFrame × 24）|
| 業務單據獨立頁（NX02/04/06 PO/PR/RFQ/RR/SO/SR/DN 等）| ~50 | **~30 page**（含 list / new / detail 3-page、約 10 entity）|
| **工作站**（部門 × 業務情境）| ❌ 沒列 | **~25 工作站**（銷售 4 + 採購 5 + 倉管 5 + 物流 3 + 財務 4 + HR 4）|
| Dashboard / 報表（NX08）| ~30 | **~20 dashboard**（per-role aggregated）|
| Hub / 首頁 | ~5 | **~5**（各部門 hub-as-tabs）|
| 主檔 sub-relation 額外頁 | ? | **~5**（user-role / role-view / user-warehouse 等）|

→ **NEXORA 全棧合理 page = ~110 page**（縮 163 → 110 約 33%）

### 8.2 v0 模板核心（4 個就夠、覆蓋 90% 場景）

| # | 模板 | 用於 | 既有標桿 |
|---|---|---|---|
| **1** | **工作站範式**（SOP 9 步驟）| 每個部門核心業務情境 | ⭐⭐⭐ MobileSaleSopPage |
| **2** | **流程節點工作台**（6 節點 stepper）| 部門總覽流程切換 | ⭐⭐ PurchaseDomesticWorkbenchView |
| **3** | **主檔 List+Modal**| 21 主檔 + 後續擴充 | ⭐⭐⭐ BaseMasterModalFrame |
| **4** | **業務單據 List/New/Detail 3-page**| 含明細的單據 | ⭐⭐ nx01/po + nx02/init/transfer/stock-take |

### 8.3 ⭐⭐⭐ 額外揭露 — v0 應該先做的 3 個工作站

1. **採購部 × 國內採購 SOP 工作站**（PurchaseDomesticWorkbench 升級為 SOP 範式）→ NEXORA 採購業務員體驗質變 ⭐⭐⭐
2. **物流部 × 外務員 PWA 工作站**（NX06 driver/* 4 placeholder 升級）→ 對齊 NX06-PWA-AUDIT-01 ⭐⭐⭐
3. **倉管部 × 撿貨/包貨/簽收 工作站**（mobile 行動端、對齊 sale SOP 範式）→ 倉管行動化 ⭐⭐⭐

### 8.4 跨部門協作 UI 缺口（業界改革 ⭐⭐⭐ 後續軌候選）

1. **NX04 SO → NX02 DR 自動觸發 + UI 通知**（業務客訂自動推採購）
2. **NX02 P-W08 保固跨 4 部門協作 UI**（業務→倉管→採購→廠商 單一工作站）
3. **NX04 業績 → NX07 薪資 + NX10 Exp 視覺化**（業務員首頁看到當月業績影響薪資 + Exp）
4. **NX06 動態交接 PWA UI**（外務員接收 + +25 Exp 動畫）

---

> 文件版本：v1.0（NX02-04-FLOW-AUDIT-01 純諮詢、8 段揭露 + 9 表 + 5 工作站範式 best practice + 16 部門×情境 對應表）
> 待 Alex 依此重新規劃 NEXORA 工作站範式（163 page → ~110 page、v0 模板 4 個）
