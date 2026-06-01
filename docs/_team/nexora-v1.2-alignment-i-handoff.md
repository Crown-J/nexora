<!-- docs/_team/nexora-v1.2-alignment-i-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 I closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-06-01
> 對應分支：`feature/v1.2-alignment-i`
> 對應 tag：`v2.1.0-lite-complete`（標記 **LITE 完整版完成**）
> 前棒：`docs/_team/nexora-v1.2-alignment-g-handoff.md`（階段 G 手機版）
> 規格：v1.2 §5 + audit §314（補連線收尾四項）

⭐ **這是 LITE 最後一棒、closure = LITE 完整版完成、總經理可開始完整實測。**

---

## §1. 本軌範圍 — P0~P6 全做

| 子任務 | 範圍 | 狀態 |
|--------|------|------|
| P0 | 盤點 + 意圖書 v1.0 落檔（Alex 官方版） + Q1~Q4 拍板 | ✅ |
| P1 | schema 變動 SQL + STOP-1 給總經理（2 個 additive 變動） | ✅（OK 跑） |
| P2 | 退貨→保固連線：service hook + 走保固按鈕 + dispositionFlag UI | ✅ |
| P3 | 採購需求 3 來源：銷貨缺貨自動 + SO cancel→I + 手動新增 UI | ✅ |
| P4 | 國外進貨 UI：6 階段 timeline + 提貨資訊（接既有後端） | ✅ |
| P5 | hub 修補：11 placeholder → redirect 到對應頁 | ✅ |
| P6 | closure（本檔 + tag + merge + memory + seed + 完整實測動線文件） | ✅ |

## §2. commits 整軌

| Commit | 範圍 |
|--------|------|
| `2bc260a` | P0 意圖書（Alex 官方版） |
| `e70fba9` | P1 schema SQL（STOP-1 等點頭） |
| （apply） | localhost migrate deploy 成功、92 條 migration 全綠 |
| `7149e5d` | P2 退貨→保固 service hook + 走保固 UI |
| `afdeda2` | P3 採購需求 3 來源（銷貨缺貨 hook + manual POST + UI） |
| `3cb259c` | P4 國外進貨 UI（6 階段 timeline） |
| （P5+P6） | hub 11 redirect + closure |

---

## §3. 4 項補連線（總經理拍板 + Alex Q1~Q4）

### 3.1 退貨 → 保固（總經理拍板 A 自動產生）

```
業務場景：進貨退貨選「走保固」→ 自動建保固申請單
- PR.dispositionFlag (G 一般 / B 壞品 / W 走保固) 新欄
- W 過帳時 service 對每個 PR item 建一張 warranty claim
  · claimType='SELF'（採購端發起、不連 SO）
  · status='D' DRAFT、預填 issueDescription
  · sourcePrId + sourcePrItemId 追溯
  · 冪等：依 sourcePrItemId 去重
- dispositionFlag='W' 跳過 createArFromPostedPr（不直接認列 AR、等保固 result）
- F/P 沖庫存邏輯不變（W 仍沖、貨已退）

對齊 NEXORA 解決傳統 ERP「重複開單」痛點。
```

### 3.2 採購需求 3 來源（Alex Q2=a 銷貨缺貨 + 手動）

```
3 來源全通：
1. demandType='S' 補貨自動 — 既有 ar-suggestion-writer（不動）
2. demandType='O' 銷貨缺貨自動 — 本軌新加 SO hook
   · SO DRAFT create() 末尾：對每個 SoItem 查目標倉 available
   · 不足 → 建 demand(O, qty=shortage, customerId=so.customerId)
   · 冪等：remark prefix [SO:.../IT:itemId] 去重
   · SO update CANCELLED → 批次 status='I' 已忽略
3. demandType='S/O' 手動新增 — 本軌新加 POST /nx02/demand
   · UI dialog 類型切換、客訂時 customerId 必填
   · 業務員「忽略」action（O/P → I）
```

### 3.3 國外進貨 UI（接既有 6 階段後端）

```
新獨立路徑 /dashboard/purchase/foreign
- 後端齊：PATCH /nx02/po/:id/stage（既有）
- 6 階段 timeline：備貨/要付款/待出貨/出貨上船/到港/驗收
- 線性推進 + 任意回退（Crown Q-C3=A + Q-C3-detail=b）
- 提貨資訊（stage ≥ 4）：船號/櫃號/ETA/實際到港
- 純追蹤頁、編輯走既有 PO 編輯頁
```

### 3.4 hub 修補（11 placeholder → redirect）

```
全在 /sale/* 舊版路徑（NX04 sales lite 之前）
全部改成 next/navigation redirect()、不破壞既有書籤：
- /sale/docs/quote      → /dashboard/nx04/quote
- /sale/docs/sales      → /dashboard/nx04/sales-order
- /sale/docs/return     → /dashboard/nx04/sales-return
- /sale/docs/orders     → /dashboard/nx04/sales-order
- /sale/docs/inquiry    → /dashboard/nx04/quote
- /sale/docs/transfer   → /dashboard/inventory/transfer
- /sale/docs/warranty   → /dashboard/purchase
- /sale/warranty        → /dashboard/purchase
- /sale/export          → /dashboard/nx04/export
- /sale/customer/grading → /dashboard/base/customer-grade
- /sale/customer/analysis → /dashboard/report/sales
```

---

## §4. Schema 變動（P1、已 apply localhost、Railway 未動）

```
nx02_pr 加：
  disposition_flag VARCHAR(1) NOT NULL DEFAULT 'G'
  (G 一般 / B 壞品 / W 走保固、PG 11+ metadata-only 不掃表)

nx02_warranty_claim 加：
  source_pr_id      VARCHAR(15)  nullable
  source_pr_item_id VARCHAR(15)  nullable
  + partial index (tenant_id, source_pr_id) WHERE NOT NULL
```

**Railway 落後 91 → 92**（含本軌兩個 additive 變動）。

---

## §5. 範式產出（後續軌可沿用）

### 5.1 shared/nx02/nx02-create-warranty-from-pr.ts
- 範式鏡像 nx05-create-ar-from-pr.ts
- 冪等 helper、tx 內呼叫、回傳 createdIds + skippedIds

### 5.2 shared/nx02/nx02-demand-from-so.ts
- `createDemandsFromSoShortage` + `ignoreDemandsForCancelledSo`
- **追溯機制用 remark prefix 而非新欄位**（避免再 STOP schema）
- 對齊既有 ar-suggestion-writer remark batchId 範式

### 5.3 nx02/demand/ 完整 CRUD module
- POST /nx02/demand 手動新增
- POST /nx02/demand/:id/ignore 業務員忽略
- list 含 part/warehouse/customer JOIN

### 5.4 features/purchase/foreign/ 國外進貨 UI 範式
- 6 階段 timeline 範式（icon + label + desc + 時間戳 + 推進/回退按鈕）
- 可用於其他 multi-stage 流程

### 5.5 Next.js redirect() 範式
- server component + `import { redirect } from 'next/navigation'`
- 不破壞既有書籤、瀏覽器 history 行為正常

---

## §6. 0 schema 變動（P2~P6）

P1 之後（P2~P6）**0 schema 變動 / 0 migration**。

---

## §7. LITE 完整實測動線文件

⭐ 已產出 `docs/_team/nexora-lite-complete-walkthrough.md`：

11 大段測試動線（總經理當新客戶測 LITE 完整版）：
1. 開戶 → 登入 → 改密
2. 建主檔（手動或匯入）
3. 進貨流程（採購業務）
4. 銷貨流程（銷售員）
5. 庫存日常
6. 財務作業
7. 看報表
8. 手機端工作站
9. 設定精靈
10. 驗收 checklist（10 項）
11. 後續軌清單（9 項可選軌）

---

## §8. 後續軌清單（LITE 之後）

| 軌 | 範疇 | 規模 |
|----|------|------|
| **TASK-RAILWAY-ENV-SPLIT** | dev/prod env 分離 + 92 支 migration 上 Railway | 大、第一客戶簽約前 2-4 週必做 |
| **付費模組 - 地圖配送** | Google Map 路線規劃 + Lalamove webhook | 中、加值收費 |
| **付費模組 - 推播通知** | web-push 客戶端 + 司機追蹤 | 中、加值收費 |
| **NX06 物流深化** | IntlShipping CRUD + Parcel 拆包 | 中 |
| **NX07 工務模組** | 派工單 / 工時 / 維保 / SLA | 大 |
| **NX09~10** | HR / 排行榜深化 | 大 |
| **主檔分區編輯重做** | v1.2 §11 §6.4「同份客戶各模組看自己欄位」 | 大 |
| **RBAC 自訂角色** | v1.2 §12.2「負責人從零建角色 + 自由命名」 | XL |
| **報表 v2** | 個人月報移動平均 COGS + Excel 圖表嵌入 | 小 |

---

## §9. 三大提醒（給下一棒 Hank）

1. **`.env` 維持 localhost、Railway 落後 92**：第一個真實客戶簽約前必須做 TASK-RAILWAY-ENV-SPLIT
2. **dispositionFlag='W' 不認列 AR**：等保固 result 才決定（NEW 換新 / REF 退錢 / RPR 維修還 / REJ 駁回）
3. **demand 追溯用 remark prefix**：`[SO:docNo/IT:itemId]`、若後續要可靠 JOIN/聚合、再加 sourceSoId/sourceSoItemId 欄

---

## §10. 階段 I closure 驗收

- ✅ 7 commits 全 push（P0~P6）
- ✅ build pass（nx-api + nx-ui）
- ✅ schema 2 變動已 apply localhost、三租戶 seed 全綠
- ✅ Railway 未碰（落後 92 支）
- ✅ 4 補連線項目全交付（退貨→保固 / 採購需求 3 來源 / 國外進貨 UI / hub 修補）
- ✅ LITE 完整實測動線文件已落
- ✅ 後續軌清單已列

⭐ **LITE 完整版完成、可開始接第一個真實客戶。**
