<!-- docs/_team/route-realignment-handoff.md -->
<!-- 檔案版本：v1.0 -->
<!-- 檔案說明：全線路重整（refactor/route-realignment）跨對話交接文件。
     記錄段 0~5 進度、未完項與後續銜接，讓進度不靠記憶、留在 repo。
     更新原則：每段完成後在「進度狀態」表打勾並補 commit hash。 -->

# 全線路重整 — 進度交接文件

> 分支：`refactor/route-realignment`
> 依據：`docs/_team/route-realignment-plan.html`（CTO Alex v1.0）
> 階段 A 測繪：`docs/_team/system-routes-survey.md`
> 撰寫：Hank（2026-06-10）

---

## 一、一句話現況

把「線路打架」一次理乾淨——前端 features 編號對齊後端、客戶端網址全部業務名化、死碼清掉。**段 0~4 已落地、段 5 收尾中、庫存調撥整合留待執行長**。

原則：**對內留 NX 編號（利於分類）、對外一律業務名（不露代碼）**。

---

## 二、段別進度狀態

| 段 | 內容 | 狀態 | commit |
|---|---|---|---|
| 段 0 | 清死碼（4 確定死檔）+ nx10 查證 | ✅ 完成 | `b79277c6` |
| 段 1a | nx07 → hr 業務名化（20 處引用） | ✅ 完成 | `0bd66512` |
| 段 1b | nx09 → knowledge 業務名化（23 處） | ✅ 完成 | `bbee84bf` |
| 段 1c | nx06 → delivery 業務名化（36 處） | ✅ 完成 | `abd109ea` |
| 段 2a | nx05 → finance 業務名化（hub 銜接、29 處） | ✅ 完成 | `4c0934ba` |
| 段 2b | nx08 → report 業務名化（60 處最大批） | ✅ 完成 | `a8f63478` |
| 段 3a | 拆 features/nx03（騰空 nx03 編號） | ✅ 完成 | `3a36ef0d` |
| 段 3b | features/nx02 → nx03（庫存對齊後端） | ✅ 完成 | `b9e7189f` |
| 段 3c | features/nx01 → nx02（採購對齊）+ 5 散主檔歸位 base | ✅ 完成 | `e22d671f` |
| 段 4a | nx04 → sale 業務名化（已對齊版） | ✅ 完成 | `347062f1` |
| 段 4b | nx03 → inventory 業務名化 | ✅ 完成 | `392c35c6` |
| 段 4c | nx02 → purchase/inventory 業務名化（最大批、95 處） | ✅ 完成 | `31207668` |
| 段 5 | 收尾（命名導覽 / 全 repo 複查 / 線路圖 / README） | 🟡 進行中 | — |

**已完成 commit 數**：12 支（段 0~4c）。

---

## 三、段 5 收尾項目

### 3.1 命名與導覽收尾 🟡 進行中

更新 menu / side-menu / dock / TopModuleTabs 裡剩餘的過渡 `startsWith('/dashboard/nx0X')` 判斷、改成業務名判斷：

| 檔 | 過渡判斷處 |
|---|---:|
| `components/home/dock.tsx` | 4 處（nx01 / nx04 / nx05 / nx08） |
| `features/layout/ui/TopModuleTabs.tsx` | 7 處（nx01 / nx04 / nx05 / nx06 / nx07 / nx08 / nx09） |
| `features/layout/config/side-menu.ts` | 5 處（nx04 / nx06 / nx07 / nx08 / nx09） |
| **合計** | **16 處** |

另：麵包屑（breadcrumb）顯示確認走業務名（候選位置：`app/dashboard/layout.tsx`）。

### 3.2 全 repo 最終複查 🟡 待做

- `grep /dashboard/nx0X` → 確認只剩「檔自身路徑註解」與「歷史描述註解」，無任何業務功能 hardcode
- `grep @/features/nx0X` → 確認編號都是校準後的新制、無舊制殘留
- 確認段 4 留註 `features/sale/workflow/` placeholder 假路徑不影響功能

### 3.3 線路圖與文件 🟡 待做

- 依最終結構更新線路圖（前後端編號對齊、對外業務名）
- README 翻修：全中文、依掃乾淨後真實結構、前端區塊強化方便 Hana 看懂、啟動指令用 `post-cleanup-state.md` 真實版本

---

## 四、留給執行長回電腦前處理（明確不做）

⏸ **庫存調撥 transfer 桌機 / 手機整合**
- CEO 已拍「A 自適應」方向、但此塊偏 UI、需看畫面決策
- 段 5 收尾**不含**此項
- 等執行長回到電腦前、可能拉 Hana 一起做

---

## 五、本次校準後對照表（速查）

### 5.1 前端 feature 編號對齊（校準後）

| features 路徑 | 業務 | 對應後端 |
|---|---|---|
| `features/base` + `features/master-*` + `features/*-zoned` | 主檔 | `nx01` |
| `features/nx02`（原 nx01 採購） | 採購 | `nx02` |
| `features/nx03`（原 nx02 庫存） | 庫存 | `nx03` |
| `features/sale`（原 nx03 銷貨 workflow 併入） | 銷貨 | `nx04` |
| `features/nx05` | 財務 | `nx05` |
| `features/nx08` | 報表 | `nx08` |

### 5.2 客戶端網址業務名（收斂後）

| 業務名 URL | 業務 | 對應前端 feature |
|---|---|---|
| `/dashboard/base/*` | 主檔 | base + master-shell + *-zoned |
| `/dashboard/purchase/*` | 採購 | nx02 + purchase |
| `/dashboard/inventory/*` | 庫存 | nx03 + inventory |
| `/dashboard/sale/*` | 銷貨 | sale |
| `/dashboard/finance/*` | 財務 | nx05 |
| `/dashboard/report/*` | 報表 | nx08 |
| `/dashboard/delivery/*` | 配送 | （無 feature/nx06、用 API client） |
| `/dashboard/hr/*` | 人資 | （無 feature/nx07、用 API client） |
| `/dashboard/knowledge/*` | 知識管理 | （無 feature/nx09、用 API client） |
| `/dashboard/nx10/*` | 遊戲化 | ⏸ 暫擱（橫向機制、非獨立頁面） |

---

## 六、硬規則（全程適用）

- 不 push 遠端（執行長拍板才推）
- 對內編號、對外業務名已定案、勿回退
- 每塊獨立 commit、訊息透明（做了 / 沒做 / breaking / ⚠️）
- 段 5 各項分塊 commit（命名導覽 / 全 repo 複查 / 線路圖 / README 拆獨立 commit）

---

— 本文件由 Hank 在段 5 收尾起點產出、實際查過 git log 與 grep 真實狀態、不憑印象。每段完成後更新「進度狀態」表。—
