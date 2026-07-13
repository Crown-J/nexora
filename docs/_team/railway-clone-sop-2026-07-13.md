<!-- docs/_team/railway-clone-sop-2026-07-13.md -->
<!-- 位置：docs/_team/（團隊工作檔） -->
<!-- 版本：v1.0（2026-07-13、Hank；雲端 Railway 全庫 clone 收尾 + 下次 SOP） -->
<!-- 說明：把本機整庫（含偉盟歷史）clone 到 Railway production 的完整過程、指令、踩坑與 SOP。
     ⚠️ production 連線密碼一律不寫進本檔（用佔位符），實際值在 Railway 後台 / 執行長手上。 -->

# Railway 雲端全庫 clone SOP（2026-07-13）

## 一句話狀態
2026-07-13 把公司機本機庫（現版 main `32b6191b`、含偉盟 160 萬筆歷史）**完整複製覆蓋到 Railway production**，兩邊資料量逐項核對一致；GitHub `main` 已 push，nx-api redeploy 待後台確認。

---

## 0. 背景：為什麼是「全庫 clone」而不是「補 migration」
- 本專案自 2026-06-29 起走 **db-execute 範式**（`migrate dev` 壞、執行長拍板），schema 變更不產 migration、各機各自 db execute。
- 導致 Railway 落後現版 **約兩週 / 800+ commit**（停在 `20260629020000`、約 v2.2~v2.3），且缺的 schema 散在「migration 資料夾 + pending-production.sql（只從 7/11 起）+ 6/29~7/11 沒集中記錄的 db-execute 空窗」三處，**沒有單一腳本能一鍵補到位**（`pending-production.sql` 自己跑還會因目標表不存在而失敗）。
- 執行長決策：**完整複製本機→雲端**（schema + 全資料，含偉盟歷史），先備份雲端再覆蓋。→ 一次到位、免逐段對帳。

## 1. 環境落差（關鍵前提）
| | 本機（公司機） | 雲端 Railway |
|---|---|---|
| PG server | 16.12（Docker、`localhost:5433/nexora_core`、user `nexora`） | 18.3（`shortline.proxy.rlwy.net:52955/railway`、user `postgres`） |
| 本機工具 | pg_dump/psql 16.6（PostgreSQL/16） | — |

⚠️ **踩坑①：pg_dump 16 無法 dump 18 的 server**（`server 18.3; pg_dump 16.6` 直接 abort）。備份雲端是覆蓋前鐵律 → 必須先取得 **PG18 工具**。
- 解法：下載官方 EDB 免安裝 binaries zip（執行長授權下載）：
  `https://get.enterprisedb.com/postgresql/postgresql-18.3-1-windows-x64-binaries.zip`
  解壓後用 `pgsql/bin/{pg_dump,pg_restore,psql}.exe`（18.3，跟雲端同版，dump/restore 都用它最穩）。

## 2. 危險指令 hook 旁路
`.claude/hooks/block-dangerous.ps1` 會擋含 `rlwy.net` 的 Railway 連線。**執行長對話明確授權該次操作時**，Claude 於指令帶註解 `NX_AUTH_OK` 放行（榮譽制、擋手滑不擋誤判）。本輪所有 Railway 指令均帶此標記。

## 3. 完整指令（SOP、密碼用佔位符）
```bash
BIN='.../scratchpad/pg18/pgsql/bin'          # PG18 工具
RWPASS='<RAILWAY_DB_PASSWORD>'               # ⚠️ 實值在 Railway 後台，勿寫進 repo
RW='-h shortline.proxy.rlwy.net -p 52955 -U postgres -d railway'
export PGSSLMODE=require; export PGCLIENTENCODING=UTF8

# NX_AUTH_OK （每條 Railway 指令都要帶，過 hook）
# 1) 備份雲端（覆蓋前安全網）
PGPASSWORD="$RWPASS" "$BIN/pg_dump.exe" $RW -Fc --no-owner --no-privileges -f railway-backup-YYYYMMDD.dump
"$BIN/pg_restore.exe" -l railway-backup-YYYYMMDD.dump | head   # 驗可讀

# 2) dump 本機整庫（18 工具 dump 16 server：向下相容、OK）
PGPASSWORD='nexora123' "$BIN/pg_dump.exe" -h localhost -p 5433 -U nexora -d nexora_core \
  -Fc --no-owner --no-privileges -f local-full-YYYYMMDD.dump

# 3a) 清空雲端 public schema（DROP CASCADE、已備份）
PGPASSWORD="$RWPASS" "$BIN/psql.exe" $RW -v ON_ERROR_STOP=1 \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; ALTER SCHEMA public OWNER TO postgres; GRANT ALL ON SCHEMA public TO public;"

# 3b) 還原本機 dump → 雲端（平行 4 工、背景跑）
PGPASSWORD="$RWPASS" "$BIN/pg_restore.exe" $RW --no-owner --no-privileges --no-acl --exit-on-error -j 4 local-full-YYYYMMDD.dump

# 4) 核對：兩邊跑同一段 count（tables/routines/tenants/users/parts/partners/so/so_item），逐項相等才算成功
```

⚠️ **踩坑②：前景還原撞 bash 10 分鐘上限被砍**。第一次用 `--single-transaction` 前景跑，逾時被 SIGTERM → server 整個 rollback（好在無殘留、schema 空）。
→ **改背景執行**（不設前景時限）**+ 平行 `-j 4`**（custom format 才能平行）。平行時不可用 `--single-transaction`；schema 已清空所以是乾淨還原，失敗就重清重跑。

## 4. 本輪核對結果（全數一致）
| 指標 | 本機＝雲端 |
|---|---|
| tables / routines | 189 / 207 |
| tenants / users | 3 / 164 |
| parts / partners | 110,610 / 4,058 |
| so / so_item | 1,620,569 / 3,058,864 |
| quote_record / part_barcode | 11 / 0 |

## 5. 產出檔案（⚠️ 目前在 session scratchpad、非永久）
- `railway-backup-20260713.dump`（12.3MB）— 覆蓋前的雲端備份
- `local-full-20260713.dump`（164.6MB）— 本機整庫來源
- `pg18/`（PG18.3 免安裝工具）
> 🛠 **待辦**：scratchpad 會被清，請把兩支 `.dump` 搬到永久位置（如 `docs/專案/測試資料/備份上傳檔/` 外的備份夾、勿進 git）。

## 6. 收尾待辦
- [ ] **Railway 後台確認 nx-api redeploy**：`main` 已 push（`32b6191b`），若綁 main 自動部署應已重建；否則手動 Deploy。確認 build 成功。
- [ ] **確認 nx-api 環境變數**：`DATABASE_URL` 指到這顆 Railway Postgres、`JWT_SECRET` 等在。
- [ ] **DB↔程式版本一致性**：DB 已現版；nx-api 程式碼要 redeploy 到現版才不會「新 DB×舊碼」。
- [ ] 備份檔歸檔（見 §5）。

## 7. 下次要對 Railway 時（精簡版）
1. 確認兩邊 PG 大版本 → 取對應版工具（≥ 較新那邊）。
2. `pg_dump` 備份雲端 → 驗可讀。
3. `pg_dump` 本機整庫。
4. 清空雲端 public → `pg_restore -j N` 背景還原。
5. 逐項 count 核對。
6. `git push` main（執行長拍板）→ 後台確認 redeploy。
