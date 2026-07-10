<!-- docs/_team/session-handoff-2026-07-11.md -->
<!-- 位置：docs/_team/session-handoff-2026-07-11.md -->
<!-- 版本：v1（2026-07-11 收尾） -->
<!-- 說明：本輪對話總交接。新對話起手讀本檔 + git log + CLAUDE.md。 -->

# 本輪交接（2026-07-10 ~ 07-11）— 單據外殼全軌完結 + 兩機分工啟動

> 新對話請先讀本檔，再 `git log --oneline -15`。本輪全部已 merge main、已 push、工作區乾淨。
> main 最新：`81fa3fa3`（tag `v2.7.0-nx02-ti-doc-shell`）。

## ⚠️ 開工前確認
1. **nx-api 是否已重啟**（本輪最後動了 TI 模組 + RR 過帳回寫、執行長已驗收過＝已重啟；若又有後端改動要再重啟）。
2. dev server 跑中：驗收用 lint + `tsc --noEmit`、⛔ 不要 pnpm build；migrate dev 壞、schema 改動走 `prisma db execute`。
3. 兩機分工（2026-07-10 起）：本機=公司機主線（**唯一可動 schema/DB**）；家用機跑 F2 改版線。
   紀律：feature push=日常、**main merge/push=執行長拍板**；開工先 `git pull` main 再開分支。

## 0. 三十秒摘要（本輪 8 個 merge、全部執行長實機驗收通過）
| Tag | 內容 |
|---|---|
| v2.4.0 | 前輪單據外殼四張單 closure（收尾合併）+ 流程圖分解文件 |
| v2.5.0 | **泛型 DocWorkbench 抽象** + 第五張進貨 RR |
| v2.5.1 | 第六張採購 PO（九階審核流；修轉進貨缺庫位 bug） |
| v2.5.2 | 第七張詢價 RFQ（QT 比價採用；修回覆死路徑） |
| v2.5.3 | 第八張進貨退回 PR（三種帳務分流；修來源下拉空白 bug） |
| v2.6.0 | **列印/匯出 PDF 通用方案**（DocPrintView、八張全接） |
| v2.7.0 | **第九張同行調貨 TI 管理面首發** + 三單自動回寫鏈 |
| （其他） | 新開發機建置手冊+輕量DB快照腳本、F2 設計交接文件（家用機線據此開工中） |

## 1. 泛型範式（第十張單起照抄）
- 列表殼：`features/shared/doc-shell/DocWorkbench.tsx`（config 注入：欄位/查詢/刪除守衛/CSV/三面板）。
- 列印：`features/shared/doc-shell/DocPrintView.tsx`（A4、租戶抬頭、簽核欄）+ 每單一個 XxPrintSheet 薄皮。
- 後端 enrich 範式：SEL 加關聯 select → flattenXxRefs 攤平 → list 補 createdByName+_count itemCount → 回傳鍵 items → search 加關聯欄位。
- 新單成本：後端 enrich + ~160 行 Workbench config + DetailView 面板 + PrintSheet。

## 2. TI 同行調貨（本輪新業務邏輯、review 重點）
- 狀態流 D→S→R→P→C / V（短碼↔全名 `nx02-state-machine.ts`）；⛔ 不能憑空建單（TiItem.sourceSoItemId 必填）。
- **帳跟貨走**（執行長拍板）：TI 不立應付；`nx05-create-ap-from-ti.ts` 刻意不接（防與 RR 重複立帳）。
- **三單回寫鏈**：RR(tiId) 過帳 → TI→C + SO 缺貨行→補貨完成（rr.service update POSTED 路徑內、同交易）；
  作廢 TI / 移除行 → SO 行退回待補（ti.service）。
- 入口：SO 詳情「同行調貨」鈕（CreateTiFromSoModal、同行 picker）/ RFQ 比價採用。
- ⚠️ 邊角未做：RR(tiId) 作廢不會把 TI 從 P 退回（極少見、遇到再補）。
- ⚠️ 權限 purchase.ti.* 已加 seed 目錄但**未重跑 seed**（OWNER 有保險絲；開放一般角色前要跑）。

## 3. 待辦池（下輪候選）
1. ⭐ **推薦下輪：異常回報→異常處置統一鏈**（流程圖 W5 環節）——
   驗收異常/盤點異常/銷退收回異常 進同一本登記簿；分流：品質→採購處置四分支（下游全存在：PR/保固/報廢）、
   數量→庫存調整就地結案+留痕（執行長 2026-07-10 拍板分流原則、見 `docs/專案/規格書/流程圖分解(採購x銷售x庫存).md` §W5）。
2. 上架作業獨立步驟（要先決策儲位管理深度、適合等 Alex 規格）。
3. 列表層列印（八張單列表的列印鈕仍佔位；單據列印已全通）。
4. 全庫 eslint 51 既存 error（user-photo/onboarding 等舊檔、與單據軌無關）。
5. 建置手冊 v1.1 家用機已自行修訂過（dev-machine-manual-v1.1 分支已進 main）。

## 4. 兩機並行現況
- 家用機 F2 線：`f2-redesign` / `f2-drilldown` 已多批進 main（PartMainWindow 大改+下鑽端點）、
  另開 `feature/master-detail-layout` 進行中。零衝突。
- 交接源：F2 設計=`docs/_team/f2-redesign-handoff.md`；建置=`docs/_team/new-dev-machine-setup.md`。

## 5. 關聯文件
- 流程圖：`docs/專案/規格書/流程圖(採購x銷售x庫存).svg` + 分解 `.md`（拍板都在裡面）
- 記憶：project_nx02_ti_closure / project_nx02_rr_doc_shell_closure / project_two_machine_workflow
