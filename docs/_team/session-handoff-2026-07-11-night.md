<!-- docs/_team/session-handoff-2026-07-11-night.md -->
<!-- 位置：docs/_team/（團隊工作檔） -->
<!-- 版本：v1.0（2026-07-11 晚、Hank 對話收尾交接） -->
<!-- 說明：給下一個對話的 Hank（跨對話無記憶）。本日 20 案全上 main、此檔只記
     「接下來要做什麼 + 陷阱」，過程細節看 dailylog/20260711.md（0711-A~U）。 -->

# 對話交接 2026-07-11（夜）— 家用機線收官、下一步清單

## 現況一句話

main = `fd8f07b8`（同日 20 案全上、全推 GitHub）。系統六組流程情境驗收全綠
（97 項 assert）、修掉 3 個 production 級問題、驗收腳本已轉正為回歸套件。

## 下一個對話可能接的事（依優先序）

1. **等 CTO（Alex）回覆兩份文件、回來就動工**：
   - `docs/_team/to-cto-directship-spec-request-2026-07-11.md` → 同行直送實作（最大案）
   - `docs/_team/to-cto-acceptance-findings-2026-07-11.md` → 六題定案（Q1 沖銷明細/
     Q2 配送地址擋/Q4 折讓口徑 是可能的實作案）
2. **執行長攻略本回報**：`docs/_team/walkthrough-keyboard-test-v1.html` 實走中、
   會回報「關卡-步驟＋不順手鍵位」清單 → 開鍵位調整輪
3. **首頁 V2**（角色個人化配置）：等執行長用出手感再排、V1 已上（nx08/dashboard/home/summary）
4. **回公司機清單**（7/13 進公司）：
   - 公司機 `git status` 檢查未 commit 殘留——**家機已全面接手、公司機舊狀態直接丟棄、
     千萬別把舊狀態 push**
   - F10 攔鍵實測、標籤實體列印、掃描槍、盤點工作站實走、主檔排版視覺複核

## 本日新增的重要資產（下次會用到）

- **回歸套件**：`pnpm --filter nx-api test:scenarios`（8 腳本 69 assert、
  改過帳邏輯/狀態機/補位鏈後必跑；只能對本機 dev DB、詳 test/e2e-scenarios/README.md）
- **pending-production.sql**：`packages/db-core/prisma/sql/`——db execute 範式下
  待上 production 的 DDL 累積檔、**production 部署前必整檔跑**（現含 W5 加欄/條碼表/AP 歸戶欄）
- 情境表（勾選狀態即驗收真相）：`docs/_team/acceptance-test-scenarios-2026-07-11.md`

## 陷阱備忘（本對話踩過、記憶檔也有）

- HMR 舊 bundle：UI 改動後使用者回報異常 → 先請硬重整再查
- 本機 Browser pane 打不進 TopMenuBar：用 `el.dispatchEvent(new KeyboardEvent/MouseEvent(...,{bubbles:true}))` 直發可完整驅動；截圖會卡死、用文字層驗
- A046 再犯過一次：含中文檔（含 scratchpad 腳本）一律 Edit/Write tool、禁 PowerShell round-trip
- 過帳鏈 helper 不可依賴「同交易稍後才寫入」的狀態欄（保固死路 bug 的教訓、已提報 CTO 入慣例）
- dev server 由本對話的 Browser pane 啟動、對話結束可能跟著停 → 下次用 `.claude/launch.json`
  （nx-api/nx-ui）重起；Docker Desktop 開機後容器會自動起

## 工作模式備忘（執行長本日確立）

- 「由你來決定、我只做最後的總驗收」＝授權 Hank 技術決策、事後總驗收；
  merge/push 在此授權下執行、但破壞性命令照鐵律仍先問
- 回報用白話、不用內部代號；發現的口徑/設計題整理成自足文件轉 CTO（Alex 無 repo）
