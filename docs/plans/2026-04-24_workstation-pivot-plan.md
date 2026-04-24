<!-- docs/plans/2026-04-24_workstation-pivot-plan.md -->
# Workstation Pivot — Master Plan

> 計畫日期：2026-04-24
> 計畫負責：Crown Lin（拍板）+ Alex（草擬）
> 對應決策：[2026-04-24_workstation-pivot.md](../decisions/2026-04-24_workstation-pivot.md)
> 文件類型：Master Plan（roadmap，不是 spec、不是 task list）
> 狀態：草案 → 待 Crown 拍板 → 進入 Phase 0

---

## 一頁摘要

**這份文件存在的理由**：把決策紀要的抽象決定變成可執行的時序。

決策紀要回答「**為什麼這樣決定**」，spec 回答「**系統長怎樣**」，這份 plan 回答「**在什麼順序、依賴什麼前置條件、產出什麼可驗證的東西**」。三份文件性質不同，缺一不可。

**4 個 Phase**：

```
Phase 0：地基（L）
   ↓
Phase 1：Pilot 工作台（L）
   ↓
Phase 2：剩餘 4 工作台（XL，可部分平行）
   ↓
Phase 3：收尾（M）
```

**Pilot 工作台揭曉**：**即時查詢報價工作台**（理由見第四章）。

**規模一覽**：

| Phase | 規模 | 備註 |
|---|---|---|
| Phase 0 | L | 4 個 Schema + Backend API + SYS-C 翻譯器，全部地基 |
| Phase 1 | L | Pilot 工作台 + Phase 0 在真實 UI 的驗證 |
| Phase 2 | XL | 4 個工作台，可平行降到 L+L |
| Phase 3 | M | 教學模式邊界 + PROJECT_CONTEXT 同步 + bug 收尾 |

**關鍵里程碑**：
- M1：Phase 0 完成 → 可用 API 跑完整 SO lifecycle，無前端
- M2：Pilot 工作台 demo → 業務可在手機真機完整操作即時查詢報價
- M3：5 工作台齊全 → 工作台間連動測試通過
- M4：收尾完成 → repo 內無 inconsistency、新人讀文件不混亂

**Crown 不需要決定時間**，但需要決定**順序進場節奏**——Phase 0 完成後是先做 Pilot 還是先做剩餘工作台的 spec？這份計畫預設 sequential（Pilot 先），但 Crown 可選擇平行。

---

## 一、工作項目盤點（Inventory）

從決策紀要抽出所有要做的事，每項標規模（S/M/L/XL）。

### 1.1 Schema 類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| S1 | SO.lineItem 加 `transferSource` enum | M | enum 含 `'self' / 'transfer:Z00' / 'transfer:Z02' / 'inquiry:D-xxxx' / 'co'` 等。需設計多倉動態值的存法（見風險 5.1） |
| S2 | committed_stock 雙帳設計 | L | 物理庫存（warehouse_stock）+ 會計庫存（committed_stock）分開維護。涉及 view 或 trigger 設計 |
| S3 | BX/DN 改 1:N | M | BX 加 `relatedSoNumber` + `relatedLineItemIds[]`，DN 同理。SO 不再直接持有單一 BX/DN 號 |
| S4 | IT/TI/CO 必填 `relatedSoNumber + relatedLineItemId` | S | 既有欄位但目前可空，加 NOT NULL 約束 |

### 1.2 Backend API 類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| B1 | SO 建立 API 重寫（含備註翻譯） | L | 新增 `POST /so` 接受 lineItems 含 transferSource，自動建 IT/TI/CO |
| B2 | committed_stock 反查 API | M | `GET /part/:id/committed-stock` 回傳所有未出 SO.lineItem 清單 |
| B3 | BX/DN 多筆生成 API | M | 倉管「完成包貨」可選擇生 1 張或 N 張 BX |
| B4 | 既有 API breaking change 評估 | S | 現有 SO API 哪些 caller 會中斷 |

### 1.3 SYS-C 重寫

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| Y1 | SYS-C 從「判斷器」到「翻譯器」 | L | 不再回傳 scenario A/B/C/D，改為解析每個 lineItem 的 transferSource 產出對應 IT/TI/CO 動作 |
| Y2 | planSoAdvance 重寫 | M | 不再看 SO 整體狀態，改看「所有 lineItem 是否都進入待配送階段」 |

### 1.4 Frontend 工作台類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| W1 | 即時查詢報價工作台 | M | 4 子區（查庫存/看庫位/看歷史/立即報價），快捷鍵切換 |
| W2 | 國內銷貨工作台 | XL | 結構化備註欄是核心，明細表編輯 + 超賣偵測 + 自動帶出下拉 |
| W3 | 銷售退回工作台 | M | 純退 vs 走保固分流 |
| W4 | 同行詢價工作台 | S | 重用既有 `features/sale/ui/inquiry/` 模組，做接合即可 |
| W5 | 同行調貨工作台 | M | 從同行詢價的 QT 接力，待設計流程 |

### 1.5 共用元件類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| C1 | 料號搜尋元件 | M | 5 工作台共用，含車型/品牌/料號代碼搜尋 |
| C2 | 客戶選擇元件 | S | 已有雛形（Step1SelectCustomer），抽出來通用化 |
| C3 | 明細表編輯元件 | L | 含結構化備註欄下拉、超賣偵測、即時毛利試算 |
| C4 | committed_stock 視覺化元件 | M | 含「物理 124 / 已承諾 -18 / 待補貨 18」三段顯示 + 反查展開 |

### 1.6 Migration 類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| M1 | 既有 SO data 補 transferSource 值 | M | mock data 全部標 `'self'`，DEMO 資料保留原行為 |
| M2 | 既有 BX/DN 1:1 結構保留 | S | 不破壞舊資料，只是允許新資料 1:N |

### 1.7 文件更新類

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| D1 | PROJECT_CONTEXT.md 哲學第 2、3、7 條改寫 | S | 對應決策紀要 2.3 節 |
| D2 | 5 個工作台分別寫 spec | L 總和 | 每個工作台 1 份 spec，類似 S-W01 結構 |
| D3 | SO data model 重寫 spec | M | 含雙帳概念、transferSource enum 列表 |
| D4 | SYS-C 重寫 spec | M | 翻譯器版的設計文件 |

### 1.8 教學模式邊界處理

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| T1 | /sop-demo 入口加 banner | S | 「這是教學模式，正式作業請用工作站」 |
| T2 | SOP 的 SYS-C 要不要對齊新工作台 | ❓ | 暫不決，等新工作台穩定後再評估 |
| T3 | 11 ⚠️ 中 SOP 內的 bug 順手清還是不動 | S | 屬於教學模式內部品質，可選擇延後 |

### 1.9 Housekeeping

| # | 項目 | 規模 | 說明 |
|---|---|---|---|
| H1 | feature/spec-reverse-sw01 分支處置 | S | merge 到 main / 留 reference / 廢棄三選一 |
| H2 | 架構債 A015 處理 | S | PROJECT_CONTEXT 提及 develop 分支但實際無，同步修正 |
| H3 | 11 ⚠️ 真 bug 開修 task | S | TIER_TARGET_MARGIN、OrderPreview、TodoGroup、DN 跳過 pending 等 |

**項目總數**：32 項。

---

## 二、依賴關係圖

```
                              ┌─────────────────────┐
                              │  D1: 哲學文件改寫    │  可平行
                              │  H1/H2/H3: 雜事     │  可平行
                              └─────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   Phase 0：地基                            │
│                                                           │
│  S1   S2   S3   S4   ← Schema 全部先動                    │
│   │   │    │    │                                         │
│   ▼   ▼    ▼    ▼                                         │
│  M1   M2          ← Migration 補既有資料                  │
│   │   │                                                   │
│   ▼   ▼                                                   │
│  B1   B2   B3   B4   ← Backend API 重寫                   │
│   │                                                       │
│   ▼                                                       │
│  Y1   Y2          ← SYS-C 改寫                            │
│   │                                                       │
│   ▼                                                       │
│  D3   D4          ← Schema/SYS-C spec 補完                │
└──────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│                 Phase 1：Pilot 工作台                      │
│                                                           │
│  C1   C2          ← 共用元件先做（料號搜尋 + 客戶選擇）    │
│   │                                                       │
│   ▼                                                       │
│  W1：即時查詢報價工作台 ← Pilot                            │
│   │                                                       │
│   ▼                                                       │
│  D2-W1：W1 的 spec 同步寫進 repo                          │
└──────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│              Phase 2：剩餘 4 工作台                        │
│                                                           │
│  C3   C4          ← 重型共用元件（明細表 + committed 視覺）│
│   │                                                       │
│   ▼                                                       │
│  W2：國內銷貨工作台（XL，依賴 C3 最重）                    │
│   │                                                       │
│   ├──── W4：同行詢價工作台（S，重用既有）─────┐           │
│   │                                            │           │
│   ▼                                            ▼           │
│  W5：同行調貨工作台 ←───── 依賴 W2 + W4 ────┘           │
│   │                                                       │
│   ▼                                                       │
│  W3：銷售退回工作台（可獨立、最後做）                      │
│                                                           │
│  D2-W2~W5：各工作台 spec 同步                             │
└──────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│                  Phase 3：收尾                            │
│                                                           │
│  T1：/sop-demo banner                                     │
│  T2：SOP SYS-C 對齊決策（看 Phase 2 學到什麼再決定）       │
│  T3：11 ⚠️ SOP bug 處理或不處理拍板                       │
│  舊 fulfillment store mutation 廢棄                       │
│  PROJECT_CONTEXT 哲學第 2/3/7 條正式落地                  │
└──────────────────────────────────────────────────────────┘
```

**關鍵依賴規則**：
- Schema (S1~S4) 是所有東西的根，先動
- Migration (M1~M2) 必須緊跟 Schema，否則既有資料炸鍋
- Backend API (B1~B4) 依賴 Schema 完成
- SYS-C (Y1~Y2) 依賴 Schema + Backend
- 所有 Frontend 工作台都依賴 Phase 0 完整完成
- 共用元件（C1~C4）拆兩波：輕量 C1/C2 先做、重型 C3/C4 在 Phase 2 開頭做
- D1 哲學改寫 / Housekeeping 全可平行進行

---

## 三、階段拆分（Phases）

### Phase 0：地基

**包含項目**：S1, S2, S3, S4, M1, M2, B1, B2, B3, B4, Y1, Y2, D3, D4

**規模**：L

**完成定義**：可以用 API call 跑完一輪完整 SO lifecycle，無前端參與。

具體：
1. 建立 SO，5 個 lineItems，其中 3 個本倉夠（self）、1 個從 Z02 調撥、1 個同行調貨
2. 系統自動建立 1 張 IT（針對 Z02 那項）+ 1 張 TI（針對同行那項）
3. committed_stock 立刻更新，反查 API 能列出造成負數的 SO.lineItem 清單
4. IT 完成 → SO.lineItem 進入「待撿貨」階段
5. TI 完成 → SO.lineItem 進入「待撿貨」階段
6. 所有 lineItem 都到位後 → 自動建 PK
7. PK 完成 → 進入包貨階段（不自動建 BX，等業務操作）
8. 業務手動完成 1 張 BX 包 3 個 lineItems、1 張 BX 包 2 個 → 兩張 BX 各自完成
9. 兩張 BX 完成後 → 自動建 2 張 DN
10. 兩張 DN 都簽收 → SO.status = completed

**可驗證 demo**：Postman / curl 序列腳本，全程在後端跑，產出 trace log。

**為什麼是地基**：上面這個 lifecycle 跑通，所有 5 個工作台都不用擔心後端會壞。如果地基沒先穩，5 個工作台會反覆踩到 schema 改動的雷。

**注意**：
- 此 Phase **不含任何 UI 工作**
- 文件 D3/D4 是隨 Phase 0 同步寫的 spec，不是事後補
- 既有 R7 fulfillment store 與這條新後端鏈**並存**，不互相干擾（前端 mock 維持原狀，新 API 是另一條路）

---

### Phase 1：Pilot 工作台

**包含項目**：C1, C2, W1, D2-W1

**規模**：L

**完成定義**：業務可以在手機真機完整操作 W1 工作台（即時查詢報價）。

具體：
1. 業務開 `/dashboard/sale/instant-quote` 進入工作台
2. 預設停在「查庫存」子區，輸入料號 `056 115 561G *` → 顯示物理庫存 124 / 可承諾 -18 / 各倉分布
3. Alt+7 切「看庫位」→ 顯示 5 倉的庫位細節
4. Alt+2 切「看歷史」→ 顯示 24 筆歷史銷售/報價，可篩客戶
5. Alt+F 篩特定客戶 O0213（承烜）→ 只看這個客戶的歷史
6. F8 切「立即報價」→ 帶入客戶 + 單價 + 車型彈窗，業務調整後送出
7. 送出後產出 QT 單，回到「查歷史」可看到剛送出的這筆

**可驗證 demo**：手機真機跑一遍完整 keystroke 鏈。

**為什麼選 W1 當 Pilot**：見第四章詳細說明。

**注意**：
- C3/C4 重型共用元件**不在 Phase 1 內**——W1 用不到結構化備註欄、不用 committed 反查的進階 UI（W1 只用「顯示」committed 數字，不用「操作」）
- W1 完成後 Phase 0 在真實 UI 的可用性會被驗證一次，可能會發現 schema/API 設計需要調整 → 進入 Phase 2 前統一處理

---

### Phase 2：剩餘 4 工作台

**包含項目**：C3, C4, W2, W3, W4, W5, D2-W2/W3/W4/W5

**規模**：XL（可平行降到 L+L）

**完成定義**：5 工作台都可獨立操作 + 工作台間連動測過。

**進場順序建議**：

```
Step 2.1：C3 + C4 重型共用元件（必須先完成）
Step 2.2：W2 國內銷貨（XL，最重，建議優先）
Step 2.3：W4 同行詢價（S，重用既有，可與 W2 平行）
Step 2.4：W5 同行調貨（依賴 W2 + W4）
Step 2.5：W3 銷售退回（M，最獨立，最後做）
```

**完成定義細節**：
- W2：業務開銷貨工作台、選客戶、加料號、超賣 1 項時系統強制下拉選來源、結構化備註填好、SO 建立、自動建 IT/TI/CO、跨中心連動到倉管 PK 工作台
- W3：業務開銷退工作台、選原 SO、選要退的 lineItem、選「純退」或「走保固」、產出對應後續單據
- W4：業務從 W2 觸發「同行調貨」備註後，自動跳入 W4，建 RFQ、收同行報價、選用、產出 QT
- W5：QT 確認後接力建 TI 調貨單（跟 W4 連動測通）

**可平行降規模的條件**：
- C3/C4 完成後，W2 和 W4 可同時開兩條 feature 分支（Hank 一條、未來增援工程師一條）
- 但 W5 必須等 W2 + W4 都基本可用才能開
- W3 可隨時插隊（最獨立），實務上會放最後

---

### Phase 3：收尾

**包含項目**：T1, T2, T3, D1, H1, H2, H3 + 舊 fulfillment store 廢棄

**規模**：M

**完成定義**：repo 內無 inconsistency，新人讀文件不會混亂。

具體：
1. /sop-demo 入口有 banner 標示「教學模式」
2. PROJECT_CONTEXT.md 哲學第 2、3、7 條改寫到位（這是「正式落地」，不是 Phase 0 的草案）
3. 11 ⚠️ 真 bug 全部修完或明確標為「保留現狀」
4. R7 既有 fulfillment store 的 mutation 函式：
   - 如果新工作台已不再呼叫 → 標 deprecated 註解
   - 如果只剩 /sop-demo 在用 → 維持但鎖定不再擴充
5. feature/spec-reverse-sw01 分支處置完成（merge 或廢棄）
6. 架構債 A015、A016 都標為「已處理」
7. 所有新增 spec 的交叉引用補齊

**為什麼留到最後**：很多收尾項目要等 Phase 2 完成後才知道「該怎麼收」。例如 T2（SOP SYS-C 對齊）必須先看新工作台跑一陣子才能評估。

---

## 四、Pilot 工作台推薦

### 4.1 推薦：W1 即時查詢報價工作台

### 4.2 推薦理由

從 5 個維度比較 5 個工作台的「適合當 Pilot 程度」：

| 維度 | W1 即時查詢報價 | W2 國內銷貨 | W3 銷售退回 | W4 同行詢價 | W5 同行調貨 |
|---|---|---|---|---|---|
| **規模** | M | XL | M | S | M |
| **依賴 Phase 0 深度** | 中（需 committed_stock 顯示，但唯讀） | 深（需要全套 Schema/SYS-C/雙帳） | 中 | 淺（已有 inquiry 模組） | 中 |
| **共用元件需求** | 輕（C1+C2 即可） | 重（含 C3 結構化備註） | 中 | 輕 | 中 |
| **業務驗證價值** | 高（業務每天都用） | 最高（核心交易動作） | 低（頻率低） | 中 | 中 |
| **失敗時的影響** | 小（只是查詢） | 大（會影響真實接單） | 小 | 小 | 中 |

**為什麼是 W1**：

1. **規模適中**——不像 W2 那麼重，可以在合理時間內完成；又不像 W4 那麼薄，能真正驗證 Phase 0 在 UI 層的可行性

2. **唯讀為主，失敗風險低**——W1 主要是查詢、看歷史，立即報價是唯一寫入動作（產出 QT），即使設計有調整空間也不會破壞既有資料

3. **驗證 Phase 0 的核心顯示能力**——committed_stock 雙帳能不能正確顯示給業務看，是 Phase 0 最重要的 UI 驗收。W1 把這件事做好，後面 W2~W5 都受惠

4. **共用元件 C1+C2 自然成熟**——料號搜尋與客戶選擇是 5 工作台共用的元件，先在 Pilot 練熟、設計穩定，避免 W2 開始才發現要重做

5. **偉盟驗證過的業界 muscle memory**——直接對照偉盟 F2/Alt+7/Alt+2/F8 keystroke 鏈，業務一上手就熟悉，不用花時間教

6. **Pilot 完成後可立刻給內部試用**——Crown 自己或周哥可以開來查料、查歷史，不用等其他工作台完成。回饋會很快

### 4.3 為什麼不選其他 4 個

**W2 國內銷貨（不選原因）**：
- 規模 XL，當 Pilot 太重，Phase 0 還沒在 UI 驗證過就直接上重頭戲，風險太大
- 如果 Pilot 失敗或需要大改，已經寫了 XL 的 code 會浪費
- 應該等 W1 把 Phase 0 在 UI 驗證後再做

**W3 銷售退回（不選原因）**：
- 業務頻率低，做出來「很少人用」，難以驗證設計
- 跟其他工作台連動少，不能驗證跨工作台的 navigation

**W4 同行詢價（不選原因）**：
- 規模太小（S），重用既有 inquiry 模組，做完了沒學到太多
- 對 Phase 0 新 Schema/SYS-C 的驗證度低
- 適合放在 Phase 2 中段、跟 W2 平行做

**W5 同行調貨（不選原因）**：
- 依賴 W2 + W4 才能完整跑通，根本沒辦法當第一個

### 4.4 Pilot 完成後的「學到什麼」清單

預期 W1 跑完會釐清以下事項：

- committed_stock 在前端要顯示成什麼樣子業務最看得懂（純數字？柱狀圖？badge？）
- 反查 API 的回傳結構合不合理（Phase 0 設計時是猜的）
- 4 子區的快捷鍵在手機觸控環境怎麼設計（傳統 keystroke 在 mobile 不適用，要找替代）
- 共用元件 C1/C2 的 props 設計穩不穩定
- Phase 0 的 SYS-C 翻譯器在 W1 用得到的部分有沒有 bug
- 哪些 mock data 在 W1 場景特別需要（影響 DEMO 資料設計）

這些學到的東西**必須回寫到 spec**，再進入 Phase 2。

---

## 五、風險清單

預期會踩到的雷 + 緩解方案。

### 5.1 committed_stock 在 Prisma 怎麼表達

**風險**：committed_stock 是「物理 - 已承諾未出」，理論上是 derived value，不該存。但每次查詢都重算可能效能差。

**緩解方案**：
- 方案 a：DB view（PostgreSQL 計算欄，每次查重算，效能足夠時用）
- 方案 b：實體欄位 + trigger 同步（寫入時自動算，效能好但複雜）
- 方案 c：應用層 cache + 每次寫 SO/PK 時 invalidate（最複雜，等真的有效能問題再做）

Phase 0 先用方案 a，效能不夠再升方案 b。

### 5.2 多倉超賣的 race condition

**風險**：兩個業務 A、B 同時搶最後 5 個料號，A 開 7 個（超 2）、B 開 5 個（剛好），如果都先建單，committed_stock 會變更負，但物理庫存其實能滿足 B。

**緩解方案**：
- DB 層用 `SELECT FOR UPDATE` 或 transaction isolation `SERIALIZABLE`
- 應用層在 SO 建立時加分散鎖（料號層級）
- 業務層接受偶發 race（業界 ERP 通常就接受了）

Phase 0 用 transaction isolation，後續視真實情況決定要不要升級。

### 5.3 「同行調貨」備註的格式

**風險**：D-O104 是業務手打還是下拉選同行表？

**緩解方案**：
- 強制下拉選，從 nx00_partner（partner_type='S' 零件供應商）取
- 不允許手打 free text（這是方案 C 的核心精神：結構化）
- 同行新增 → 請業務先去主檔建立

Phase 0 設計 transferSource enum 時就要定下來。

### 5.4 既有 mock data 的 transferSource 補值

**風險**：M1 要把既有 SO data 補 transferSource，但有些單可能補不出合理值。

**緩解方案**：
- 既有 SO 全部標 `'self'`（保守選項）
- DEMO 用的 4 筆情境 C/D mock 手工標對應值
- 真實上線後產生的新單一律必填 transferSource

### 5.5 R7 SOP code 的 SYS-C 跟 Phase 0 新 SYS-C 並存

**風險**：兩套 SYS-C 同時存在會不會互相干擾？

**緩解方案**：
- 兩套 SYS-C 物理隔離：
  - 舊：`features/sale/ui/sop-workspace/` 內部用，獨立 reducer
  - 新：`features/sale/lib/sysC-translator/`（新位置），給新工作台用
- /sop-demo 路由不調用新 SYS-C
- 新工作台不調用舊 reducer
- 完全互不干擾，Phase 3 收尾時再決定要不要合併

### 5.6 工作台間的 navigation context 傳遞

**風險**：業務從 W1 即時查詢報價 → 跳到 W2 國內銷貨建單，要帶哪些資訊（料號？客戶？報價？）？

**緩解方案**：
- 不靠 URL query（容易爆字串）
- 用 Zustand 的 `navigationContext` slice，跨工作台共享但短暫（換頁清除）
- 設計時統一規範：`pushContext({ from, to, payload })` + `popContext()`

Phase 1 W1 完成後就會碰到（從報價跳到銷貨工作台），規格寫進 spec。

### 5.7 共用元件的設計權威

**風險**：C1~C4 是 5 工作台共用，每個工作台都想客製，會變成各自 fork。

**緩解方案**：
- 共用元件的設計變更**必須走決策**（不能 Hank 自己擴充）
- 提案規格：每個工作台需要什麼變化 → Crown/Alex 統一決定 → Hank 改
- spec 內明確標：「此元件由 W1, W2, W3 共用，變更需 PM 同意」

---

## 六、規模一覽表

對應第 1 區的所有項目，集中呈現規模分布：

```
Schema       S1(M) S2(L) S3(M) S4(S)
Backend API  B1(L) B2(M) B3(M) B4(S)
SYS-C        Y1(L) Y2(M)
Frontend     W1(M) W2(XL) W3(M) W4(S) W5(M)
共用元件     C1(M) C2(S) C3(L) C4(M)
Migration    M1(M) M2(S)
文件         D1(S) D2(L 總和) D3(M) D4(M)
教學模式     T1(S) T2(❓) T3(S)
Housekeeping H1(S) H2(S) H3(S)
```

**規模分布統計**：
- S 類：11 項（多為 housekeeping、補小欄位）
- M 類：13 項（主力工作）
- L 類：6 項（重點難題）
- XL 類：1 項（W2 國內銷貨）
- ❓ 類：1 項（T2 待決）

**Phase 規模呼應**：

| Phase | 內含 | 規模合計 |
|---|---|---|
| Phase 0 | S1+S2+S3+S4+M1+M2+B1+B2+B3+B4+Y1+Y2+D3+D4 | L |
| Phase 1 | C1+C2+W1+D2-W1 | L |
| Phase 2 | C3+C4+W2+W3+W4+W5+D2-W2/W3/W4/W5 | XL |
| Phase 3 | T1+T3+D1+H1+H2+H3 + 舊 store 廢棄 | M |

---

## 七、不在這份計畫範圍的事

明確排除，避免 scope creep。

| # | 排除項目 | 原因 |
|---|---|---|
| 7.1 | 後端 API 接到實際 PostgreSQL | 目前都還是前端 mock，本計畫 Phase 0 設計 schema 但不接 DB；後續 R9 階段獨立處理 |
| 7.2 | 多語系（i18n） | 整個專案都還沒做 |
| 7.3 | NX10 遊戲化跟新工作台的整合 | 等新工作台穩定後另案 |
| 7.4 | 國外銷售工作台（S-W02 範疇） | 本計畫只處理 S-W01 國內銷售 |
| 7.5 | NX05 財務、NX07 人資的相關連動 | 跨模組整合另案 |
| 7.6 | 真實客戶上線前的壓測 | 已是獨立 task TASK-STRESS-TEST-01 |
| 7.7 | 行動裝置以外的桌面版 | 本計畫只看手機版（PROJECT_CONTEXT 既有方針） |
| 7.8 | 教學模式的進階優化 | 包含「教學模式內 SYS-C 對齊新工作台」這類進階題，等新工作台穩定後再評估 |

---

## 八、附錄

### 8.1 與決策紀要的對應表

| 工作項目 | 對應決策章節 |
|---|---|
| S1 transferSource enum | 4.2 Q5 規則 2、5.1 |
| S2 committed_stock 雙帳 | 4.2 Q5 規則 4、5.1 |
| S3 BX/DN 1:N | 4.3 Q6、5.1 |
| S4 IT/TI/CO 必填關聯 | 4.2 Q5 規則 3、5.1 |
| Y1/Y2 SYS-C 重寫 | 4.2 Q5 全篇、5.2 |
| W1~W5 5 工作台 | 2.2 全篇、5.3 |
| T1~T3 教學模式 | 4.5 Q8 |
| D1 PROJECT_CONTEXT 改寫 | 2.3 全篇 |
| 風險 5.6 navigation | 6.3（暫不決定第 3 點） |

### 8.2 與既有 PROJECT_CONTEXT 哲學的對應

| 哲學條目 | 影響 | 落地時機 |
|---|---|---|
| 第 1 條 中心 = 角色工作台 | 強化 | 全程適用，不需修文 |
| 第 2 條 庫存 >= 0 | 修正為「物理 vs 會計分離」 | Phase 0 設計時草稿、Phase 3 正式落地 |
| 第 3 條 工作站 = SOP | 修正為「工作站 = 動作；SOP 留教學」 | Phase 1 開始時草稿、Phase 3 正式落地 |
| 第 4 條 追蹤清單 | 不變 | N/A |
| 第 5 條 5 選項客戶回應 | 不變（仍適用 W2） | N/A |
| 第 6 條 追加品項 | 不變 | N/A |
| 第 7 條 SYS-C 4 情境 | 修正為「翻譯器」 | Phase 0 落地、Phase 3 正式更新 |
| 第 8 條 共用流水號 | 不變 | N/A |
| 第 9 條 歷史報價毛利警覺 | 強化（W1 核心功能） | Phase 1 落地 |
| 第 10 條 組長排序 | 不變 | N/A |

### 8.3 階段命名約定

```
Phase 0：feature/wp-phase0-schema
         feature/wp-phase0-api
         feature/wp-phase0-sysc
         （依工作項目細分，不要一條巨型 branch）

Phase 1：feature/wp-phase1-pilot-w1

Phase 2：feature/wp-phase2-w2
         feature/wp-phase2-w3
         feature/wp-phase2-w4
         feature/wp-phase2-w5

Phase 3：feature/wp-phase3-cleanup
         feature/wp-phase3-philosophy-sync
```

`wp` = workstation pivot 縮寫，避免 branch name 過長。

每條 branch 完成後 review → merge 回 main，不開 develop。

### 8.4 commit 訊息規範

```
[WP-PHASE-0] schema: add transferSource enum to so_line_item
[WP-PHASE-0] api: rewrite POST /so with translator
[WP-PHASE-1] pilot: implement instant-quote workstation
[WP-PHASE-2] w2: domestic-sale with structured note dropdown
[WP-PHASE-3] cleanup: deprecate old fulfillment store mutations
```

`WP` = workstation pivot 對應整個本計畫。

---

## 九、版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-24 | 1.0 | 初版，Alex 草擬，待 Crown 拍板 |

---

*文件結束*
