<!-- docs/_team/docs-cleanup-2026-05-30.md -->

# docs 全面清檔報告 — 2026-05-30

> 撰寫者：Hank（Claude Code）
> 觸發：LITE 完整版藍圖規格書 v1.2 生效、需清掉被取代的舊範式文件
> 對應 commit：本檔 commit（含 84 檔刪除 + 1 檔編輯）
> 主軸：`docs/_team/nexora-lite-blueprint-v1.2.md` ⭐ 為唯一真相、其他文件按是否被取代決定保留

---

## §A. 統計總覽

| 類別 | 第一輪 | 第二輪（Alex 拍板）| 累計 |
|------|--------|-------------------|------|
| 🔴 刪除 | 84 檔 | **47 檔** | **131 檔** |
| ✏️ 編輯 | 1 檔（HANDOFF-LITE-PROGRESS.md §G）| 1 檔（本報告 §D 加拍板結果）| 2 檔 |

---

## §B. 🔴 刪除清單（84 檔、含理由）

### B.1 docs/_team/ — 中繼 / merge-verify / 過期文件（27 檔）

| # | 檔案 | 刪除理由 |
|---|------|---------|
| 1 | nx04-m3-handoff.md | NX04 M3 中途 handoff、closure 後失效、Alex 明確列出 |
| 2 | NEXORA_PROJECT_AUDIT_2026-05-26.md | Crown / Alex 自製 audit、被 `nx02-nx03-nx04-audit.md` + v1.2 取代 |
| 3 | crown-local-login-fix-merge-verify.md | Auth 修正 merge verify（§0.4 已廢 merge-verify 獨立文件）|
| 4 | crown-local-login-fix-v2-deep-verify.md | 同上 |
| 5 | crown-regression-verify-20260519.md | 過期 regression 驗證 |
| 6 | login-page-feature-audit.md | Login 改造 closure 後過期 |
| 7 | master-shell-handoff-2026-05-21.md | master-shell 範式 closure 後過期 |
| 8 | nx-theme-audit.md | UI theme audit 過期 |
| 9 | nx02-04-flow-audit-01.md | 跨模組 flow audit、被新 `nx02-nx03-nx04-audit.md` 取代 |
| 10 | nx06-pwa-audit-01.md | NX06 PWA closure 後 audit 過期 |
| 11 | pr-body-nx01-partner-six-classes.md | PR body 文字、partner 改制 closure 後無用 |
| 12 | task-auth-error-code-merge-verify.md | merge-verify 已廢 |
| 13 | task-auth-ui-iterate-01-merge-verify.md | 同上 |
| 14 | task-auth-ui-iterate-01-v2-merge-verify.md | 同上 |
| 15 | task-master-data-center-audit.md | master 中心 closure 後過期 |
| 16 | task-master-hub-improve-merge-verify.md | merge-verify 已廢 |
| 17 | task-master-hub-polish-feasibility.md | feasibility 文件、任務已完成 |
| 18 | task-master-hub-polish-merge-verify.md | merge-verify 已廢 |
| 19 | task-master-table-polish-merge-verify.md | merge-verify 已廢 |
| 20 | task-user-master-iterate-feasibility.md | feasibility 文件、user 主檔 closure 完成 |
| 21 | task-user-master-iterate-track-a-merge-verify.md | merge-verify 已廢 |
| 22 | task-user-master-iterate-track-b-merge-verify.md | 同上 |
| 23 | task-user-master-iterate-track-c-merge-verify.md | 同上 |
| 24 | ui-audit-01.md | UI audit closure 後過期 |
| 25 | ui-audit-02-crud-pattern.md | 同上 |
| 26 | upload-cleanup-list.md | 過期 upload 清單 |
| 27 | worklog.md | PROJECT_RULES §0.4 worklog 已停更、改 commit 訊息 |

### B.2 各模組 worklog（10 檔、PROJECT_RULES §0.4 已廢）


### B.3 各模組 audit / impl 過程文件（41 檔）

各模組 closure 後留下的 audit / impl-plan / impl-merge-verify / impl-phase-verify 過程文件。closure 完成 + 最終 manual 留下後、過程記錄屬冗餘。

| 模組 | 刪除檔案 |
|------|---------|
| NX02 | nx02-audit-01.md、nx02-audit-02.md、spec/impl/nx02-impl-01-phase5-verify.md、nx02-impl-01-plan.md、nx02-merge-verify.md |
| NX03 | nx03-audit-01.md ~ 04（4 檔）、nx03-impl-01-phase4-verify.md、nx03-impl-01-phase5-mini-verify.md、spec/impl/nx03-impl-01-phase7-verify.md、nx03-impl-01-plan.md |
| NX04 | nx04-audit-01.md、nx04-sales-lite-gap-audit.md（Alex 明確列出）、spec/impl/nx04-impl-01-phase5-verify.md、nx04-impl-01-plan.md、nx04-merge-verify.md |
| NX05 | nx05-audit-01.md、spec/impl/nx05-impl-01-plan.md、nx05-merge-verify.md |
| NX06 | nx06-audit-01.md、nx06-audit-02.md、spec/impl/nx06-impl-01-plan.md、nx06-merge-verify.md、nx06-impl-02-plan.md、nx06-impl-02-merge-verify.md |
| NX07 | nx07-audit-01.md、spec/impl/nx07-impl-01-plan.md、nx07-impl-01-merge-verify.md |
| NX08 | nx08-audit-01.md、spec/impl/nx08-impl-01-plan.md、nx08-impl-01-merge-verify.md |
| NX09 | nx09-audit-01.md、nx09-audit-02.md、spec/impl/nx09-impl-01-plan.md、nx09-impl-01-merge-verify.md、nx09-impl-02-plan.md、nx09-impl-02-merge-verify.md |

### B.4 auto-replenish 過程文件（3 檔）

| 檔案 | 理由 |
|------|------|
| docs/auto-replenish/ar-audit-01.md | AR closure 後 audit 過期 |
| docs/auto-replenish/spec/impl/ar-impl-01-plan.md | impl plan 過程文件 |
| docs/auto-replenish/spec/impl/ar-impl-01-phase5-verify.md | phase verify 過期 |

### B.5 編輯（非刪除）

| 檔案 | 改動 |
|------|------|
| docs/_team/HANDOFF-LITE-PROGRESS.md | Part 0 §G 銷貨業務細節（G.0~G.9）刪除、改放指引指向 v1.2 |

---

## §C. 🟢 保留清單（含理由）

### C.1 root（3 檔）— 全保留

- `docs/README.md` — docs 入口導覽
- `docs/PROJECT_CONTEXT.md` — 業務介紹（Yaro / 恆迎 / 三人團隊）
- `docs/PROJECT_RULES.md` — 規範合一手冊（§0.4 公司範式 / Part I 共通 / Part III Hank 段）

### C.2 docs/_team/ 保留（10 檔）

| 檔案 | 保留理由 |
|------|---------|
| ⭐ nexora-lite-blueprint-v1.2.md | **唯一真相、本清檔軸心** |
| HANDOFF.md | 舊 Hank 封存交棒、含各模組 closure 狀態 + 架構債清單、Alex 明確要保留 |
| HANDOFF-LITE-PROGRESS.md | 階段進度、Alex 要保留（§G 已 trim、其他保留）|
| git-state.md | 持續更新的 git 進度檔 |
| system-architecture.md | 架構債 canonical 註冊處（A001~A077）、長期 reference |
| nexora-error-code-spec.md | 錯誤碼 spec canonical |
| nx01-master-operation-manual.md | NX01 25 主檔操作手冊 closure 交付 |
| nx02-purchase-operation-manual.md | NX02 進貨 LITE 操作手冊 closure 交付 |
| nx03-stock-operation-manual.md | NX03 庫存 LITE 操作手冊 closure 交付 |
| nx04-sales-operation-manual.md | NX04 銷貨 LITE 操作手冊 closure 交付 |
| nx02-nx03-nx04-audit.md | 2026-05-29 盤點報告、Alex 明確要保留 |

### C.3 docs/_archive/ 全保留（8 檔）

`_archive` 本身是歷史封存資料夾、所有檔案保留：
- 2026-04-24_workstation-pivot-plan.md / workstation-pivot.md / 2026-04-28_file-placement-decisions.md
- 2026-04/business-restructure-01.md / d3-so-data-model-v1.md / demo-emergency-r7*.md / project-context-old.md / sys-dash-prep.md

### C.4 docs/_reference/ 全保留（4 檔）

- doc-number-rules.csv
- nx-table.csv
- route-table-v2.md
- version-feature-matrix.csv

### C.5 docs/_system/ 全保留（7 檔）

系統層級（onboarding / plan-upgrade / plan-downgrade / guide-setup 等）跟業務模組無關、與 v1.2 不衝突：
- plan-sys-dashboard.md / sys-dashboard.md / sys-layout.md
- workflow/sys-w01-onboarding.md / sys-w02-plan-upgrade.md / sys-w03-plan-downgrade.md / sys-w04-guide-setup.md

### C.6 docs/_template/ 全保留（1 檔）

`spec-template.md` — 寫新 spec 時的模板、保留

### C.7 各模組 summary（10 檔）


### C.8 docs/nx01/spec/intent + reference 全保留（22 檔）

NX01 主檔層（25 主檔 closure）相對穩定、不會被 LITE v1.2 取代（v1.2 是業務模組 LITE 版、不動主檔層）。
- nx01-overview.md
- nx01-01-user.md ~ nx01-17-part-version-relation.md（17 個主檔 spec）
- reference/master-field-matrix.md

---

## §D. ✅ 第二輪 Alex 拍板結果（已執行、共刪 47 檔）

2026-05-30 第二輪、Alex 對 4 大類分別拍板「B 變體」（D.1/D.2/D.3）+「A 全砍」（D.4）、Hank 一輪 git rm 收尾完成。

| 類別 | 拍板 | 刪除數 |
|------|------|-------|
| D.1 模組 overview | B 變體（NX02/03/04/06v01/AR 砍、NX05/06v02/07-10 留）| 5 檔 |
| D.4 spec/impl 細節 | A 全砍 | 10 檔 |
| **合計** | | **47 檔** |

⬇️ 以下為當初待決四大類的原始清單 + 拍板結果。

### ✅ D.1 各模組 spec/intent overview — 拍板 B 變體（刪 5 留 6）

按 by-module 範式時期寫的「模組總覽」、v1.2 用 LITE 切片重新組織。

🔴 已刪：
- `docs/nx02/spec/intent/nx02-overview.md`（v1.2 接管採購）
- `docs/nx03/spec/intent/nx03-overview.md`（v1.2 接管庫存）
- `docs/nx04/spec/intent/nx04-overview.md`（v1.2 接管銷貨）
- `docs/auto-replenish/spec/intent/ar-overview.md`（AR 屬 NX02 採購延伸）
- `docs/nx06/spec/intent/nx06-overview.md`（v01 舊版、v02 留下取代）

🟢 留：
- `docs/nx05/spec/intent/nx05-overview.md`（NX05 財務未在 v1.2 範圍）
- `docs/nx06/spec/intent/nx06-overview-v02.md`（v02 為現行版本）
- `docs/nx07/spec/intent/nx07-overview.md`
- `docs/nx08/spec/intent/nx08-overview.md`
- `docs/nx09/spec/intent/nx09-overview.md`


🔴 已刪（NX02/03/04 共 24 檔）：
- NX02：`docs/nx02/workflow/primary/p-w01~p-w09.md`（9 檔）+ `sub/p01-purchase-return.md`
- NX03：`docs/nx03/workflow/primary/i-w01~i-w04.md`（4 檔）+ `sub/i01~i04.md`（4 檔）
- NX04：`docs/nx04/workflow/primary/s-w01~s-w06.md`（6 檔）

🟢 留：
- NX05：`docs/nx05/workflow/*` 全部（7 primary + 5 sub）
- NX06：`docs/nx06/workflow/sub/*`（4 檔）
- NX07：`docs/nx07/workflow/primary/*`（6 檔）
- NX08：`docs/nx08/workflow/primary/*`（8 檔）
- NX09：3 檔

### ✅ D.3 各模組 UI specs — 拍板 B 變體（刪 8 留 6）

🔴 已刪（NX02/03/04 共 8 檔）：
- `docs/nx02/ui/po-workspace.md` / `import-workspace.md` / `product-workspace.md`
- `docs/nx03/ui/warehouse-workspace.md` / `mobile-warehouse.md`
- `docs/nx04/ui/so-workspace.md` / `customer-workspace.md` / `export-workspace.md`

🟢 留：
- `docs/nx05/ui/finance-workspace.md`
- `docs/nx06/ui/logistics-workspace.md`
- `docs/nx07/ui/hr-workspace.md`
- `docs/nx08/ui/report-workspace.md`
- `docs/nx09/ui/km-workspace.md`

### ✅ D.4 各模組 spec/impl 細節 — 拍板 A 全砍（刪 10 檔）

🔴 已刪：
- docs/nx02/spec/intent/rfq-qt-api-intent.md
- docs/nx02/spec/impl/b5-impl_rfq-qt-api.md
- docs/nx03/spec/intent/stock-reverse-lookup-api-intent.md
- docs/nx03/spec/impl/b2-impl_stock-reverse-lookup-api.md
- docs/nx04/spec/intent/so-data-model-intent.md
- docs/nx04/spec/intent/translator-intent.md
- docs/nx04/spec/intent/navigation-context-policy.md
- docs/nx04/spec/impl/d3-impl_so-schema.md
- docs/nx04/spec/impl/d3-trigger.md
- docs/nx04/spec/impl/d4-impl_translator.md

---

## §E. 清檔後 docs 結構快照（第二輪後）

```
docs/
├── README.md
├── PROJECT_CONTEXT.md
├── PROJECT_RULES.md
├── _archive/                           # 全保留（8 檔）
├── _reference/                         # 全保留（4 檔）
├── _system/                            # 全保留（7 檔）
├── _template/                          # 全保留（1 檔）
├── _team/                              # 12 檔（含本報告）
│   ├── ⭐ nexora-lite-blueprint-v1.2.md
│   ├── HANDOFF.md
│   ├── HANDOFF-LITE-PROGRESS.md       # §G trim 過
│   ├── git-state.md
│   ├── system-architecture.md
│   ├── nexora-error-code-spec.md
│   ├── nx01-master-operation-manual.md
│   ├── nx02-purchase-operation-manual.md
│   ├── nx03-stock-operation-manual.md
│   ├── nx04-sales-operation-manual.md
│   ├── nx02-nx03-nx04-audit.md
│   └── docs-cleanup-2026-05-30.md      # 本檔
├── nx01/                               # 22 檔（NX01 主檔層全保、spec/intent 17 檔 + summary + reference）
├── nx02/                               # 1 summary + reference/（spec / workflow / ui 已全清）
├── nx03/                               # 同上
├── nx04/                               # 同上
├── nx05/                               # summary + overview + workflow(12) + ui(1) + reference 保留
├── nx06/                               # summary + overview-v02 + workflow/sub(4) + ui(1) + reference 保留
├── nx07/                               # summary + overview + workflow(6) + ui(1) + reference 保留
├── nx08/                               # summary + overview + workflow(8) + ui(1) + reference 保留
├── nx09/                               # summary + overview + workflow(3) + ui(1) + reference 保留
├── nx98/                               # reference 全保留
├── nx99/                               # reference + spec 全保留（系統 / 租戶層）
└── auto-replenish/                     # 1 summary 保留
```

---

## §F. 收尾 — 本檔已是 final（無未拍板事項）

2026-05-30 完成兩輪清檔：
- 第一輪：刪 84 檔 + edit 1 檔
- 第二輪：拍板 4 大類、刪 47 檔

累計 **131 檔刪除**、docs 結構收斂到 LITE v1.2 + 各 closure 模組操作手冊。

---

> 清檔完成（final）。docs 主軸已收斂到 v1.2 + 各模組 closure 手冊。
> 第二輪 Alex 拍板已執行完、無剩餘待決事項。
