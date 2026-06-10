<!-- docs/_team/system-routes-final.md -->
<!-- 檔案版本：v1.0 -->
<!-- 檔案說明：全線路重整完成後的最終線路圖（段 0~5 收尾）。
     與階段 A 測繪報告 system-routes-survey.md 對照、紀錄改動結果。
     對內留 NX 編號（利於分類）、對外一律業務名（不露代碼）。 -->

# 系統線路圖（收尾版 · 2026-06-10）

> 接續：階段 A 測繪報告 `system-routes-survey.md`、施工方案 `route-realignment-plan.html`
> 分支：`refactor/route-realignment`（段 0~5）
> 撰寫：Hank（段 5 收尾）

---

## 一、一句話現況

線路打架已收乾淨：**前端 `features/` 編號全對齊後端 nx-api**、**客戶端網址全部業務中文名 URL（nx10 除外）**、**4 個死 hub 已清**。對內 NX 編號用於分類、對外不露代碼。

---

## 二、前後端 ↔ 客戶 URL 三層對照表（收尾版）

| 內部 NX 編號 | 業務領域 | 前端 features 路徑 | 後端 nx-api/src 模組 | 對外網址 |
|---|---|---|---|---|
| **nx01** | 主檔 | `base` + `master-shell` + `master-zones` + `*-zoned` + 5 散主檔 | `nx01`（51 子模組） | `/dashboard/base/*` |
| **nx02** | 採購 | `nx02` + `purchase` | `nx02`（13 子模組） | `/dashboard/purchase/*` |
| **nx03** | 庫存 | `nx03` + `inventory` | `nx03`（18 子模組） | `/dashboard/inventory/*` |
| **nx04** | 銷貨 | `sale`（含原 nx03 workflow 併入） | `nx04`（10 子模組） | `/dashboard/sale/*` |
| **nx05** | 財務 | `nx05` | `nx05`（11 子模組） | `/dashboard/finance/*` |
| **nx06** | 配送 | （無、用 hooks/components + API client） | `nx06`（13 子模組） | `/dashboard/delivery/*` |
| **nx07** | 人資 | （無、用 API client） | `nx07`（9 子模組） | `/dashboard/hr/*` |
| **nx08** | 報表 | `nx08` | `nx08`（6 子模組） | `/dashboard/report/*` |
| **nx09** | 知識管理 | （無、用 API client） | `nx09`（8 子模組） | `/dashboard/knowledge/*` |
| **nx10** | 遊戲化 ⏸ | （無） | `nx10`（10 子模組） | `/dashboard/nx10/*` ⏸ 暫擱 |
| **nx98** | 跨模組共用 | `nx98` | `nx98`（1 task-pool） | `/dashboard/task-pool` |
| **nx99** | 平台層 | `platform` + 部份 `sys-admin` | `nx99`（3 子模組） | `/platform/*` |

**對照重點**：每個 NX 編號的「業務領域」前後端一致；對外網址不露 nx 代碼（nx10 暫擱不算）。

---

## 三、段 0~5 改動結果對照（vs 階段 A 測繪）

### 3.1 前端 features 編號校準（段 3）

| 校準前 | 改動 | 校準後 |
|---|---|---|
| `features/nx01`（採購 + 散主檔混雜） | → 拆 | `features/nx02`（採購）+ 5 散主檔搬 `features/base/` |
| `features/nx02`（庫存） | → 改編號 | `features/nx03`（庫存）+ 整併 `features/inventory` |
| `features/nx03`（銷貨 workflow + stock-balance 混） | → 拆 | 銷貨 workflow 併 `features/sale/`、stock-balance 併 `features/inventory/`、原 `nx03` 騰空 |
| `features/nx05` `features/nx08` | 不動 | 同 |

### 3.2 客戶端網址業務名化（段 1 / 2 / 4）

| 改前 | 改後 | 引用 | 段 |
|---|---|---:|---|
| `/dashboard/nx07/*` | `/dashboard/hr/*` | 20 | 1a |
| `/dashboard/nx09/*` | `/dashboard/knowledge/*` | 23 | 1b |
| `/dashboard/nx06/*` | `/dashboard/delivery/*` | 36 | 1c |
| `/dashboard/nx05/*` | `/dashboard/finance/*` | 29 | 2a |
| `/dashboard/nx08/*` | `/dashboard/report/*` | 60 | 2b |
| `/dashboard/nx04/*` | `/dashboard/sale/*` | 43 | 4a |
| `/dashboard/nx03/*` | `/dashboard/inventory/*` + `/dashboard/sale/*` 拆 | 37 | 4b |
| `/dashboard/nx02/*` | `/dashboard/purchase/*` + `/dashboard/inventory/*` 拆 | 95 | 4c |
| `/dashboard/nx01/*` | 併入 `/dashboard/purchase/*`（root redirect） | 6 | 4c |
| `/dashboard/nx10/*` | ⏸ 暫擱不動 | 23 | — |

**合計**：372 處硬寫引用 / 102 條露代碼頁面已收斂業務名（nx10 23 處除外）。

### 3.3 死碼清除（段 0）

| 死碼路徑 | 結果 |
|---|---|
| `features/finance/ui/FinanceCenterHub.tsx` | 已刪 |
| `features/report/ui/ReportCenterHub.tsx` | 已刪 |
| `features/sales/ui/SalesCenterHub.tsx` | 已刪 |
| `features/nx06/push-subscription.ts` | 已刪 |

### 3.4 段 5 命名與導覽收尾

| 改動 | 處數 |
|---|---:|
| `dock.tsx isDockActive`：拆 nx0X 過渡判斷 | 4 處 |
| `TopModuleTabs.tsx getActiveModule`：拆 nx0X 過渡判斷 + sed BUG | 8 處 |
| `side-menu.ts resolveSideMenuGroups`：拆 nx0X 過渡判斷 + 死碼 import | 4 處 + 6 import |
| **合計** | 16 處過渡判斷 + 6 import 死碼 |

---

## 四、段 5 收尾後 grep 真相

```
grep /dashboard/nx0X   → 29 hits / 28 檔（全屬檔自身路徑註解 + 歷史描述）
grep @/features/nx0X   → 全屬校準後新制（nx02 / nx03 / nx05 / nx08）、無舊制殘留
```

**段 0~5 commit 索引**：12 + 5 = 17 commit（含段 5 三批：5a 交接、5b 導覽、5c 複查 + 後續 5d 線路圖、5e README）

---

## 五、目前 features/ 真實清單（25 個、收尾後）

```
auth                base                home-dashboard      inventory
layout              master-shell        master-zones        nx02              ← 採購
nx03                nx05                nx08                nx98              ← 庫存/財務/報表/共用
page-guide          part-zoned          partner-zoned       platform
purchase            sale                satellite           settings
shared              sys-admin           sys-dashboard       user-zoned
warehouse-zoned     wizard
```

對照階段 A 測繪 31 個：
- **已刪**：finance、report、sales、nx06、nx01、nx04 共 6 個（4 個死 hub + 2 個編號重整空殼）
  - 注意：nx01/nx04 是「資料夾名」消失，內容已搬到 nx02 / sale
- **新增**：—

---

## 六、留給後續批次（明確不做）

| 項目 | 性質 | 處理時機 |
|---|---|---|
| ⏸ 庫存調撥 transfer 桌機/手機整合（A 自適應方向已拍） | UI 整合 | 執行長回電腦前、可能拉 Hana 一起 |
| ⏸ nx10 遊戲化收斂（露代碼） | 橫向機制改造 | 遊戲化專案單獨規劃 |
| ⏸ menu.nx01/02/03/04/05/08.ts 6 個 orphan 配置檔 | 死碼清理 | 下批 housekeeping commit |
| ⏸ 後端 controllers ↔ 前端 API client 端到端線路 | 深度測繪 | survey §6 已列為「後續」 |
| ⏸ features/shared 99 檔細分類、DB 197 models 業務分群 | 結構化 | survey §6 已列為「後續」 |

---

— 本文件由 Hank 在段 5 收尾末段產出、實際 grep 完整真相、不憑印象。後續改動以本表為基準。—
