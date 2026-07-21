<!-- packages/db-core/scripts/weimeng-v2-backfill-quote-record.RUNBOOK.md -->
<!-- 位置：packages/db-core/scripts/（一次性正式庫資料回填手冊） -->
<!-- 版本：v1.0（2026-07-21、Hank） -->
<!-- 說明：把偉盟「單行報價單」回填成即時報價紀錄（nx04_quote_record）的 Railway 執行 SOP。
     搭配 weimeng-v2-backfill-quote-record.sql。⚠️ 密碼用佔位符、勿寫進 repo。 -->

# 偉盟單行報價 → 即時報價紀錄 回填 SOP（Railway 正式庫）

## 拍板前提（Crown 2026-07-21）
- 範圍：只回填「明細只有 1 行」的偉盟報價單（一單一報價）。
- 來源標記：`source='QUOTE'`、`source_doc_id` 回指原報價單。
- 目標：Railway 正式庫（租戶 TW-100001）。

## 本機驗證結果（先在測試庫證明邏輯）
- 單行報價單 = 278,799 筆 → dry-run 剛好 INSERT 278,799，欄位對照無誤，二次執行 INSERT 0（冪等）。
- ⚠️ 此為本機數字；Railway 實際筆數以「步驟 2 雲端盤點」為準。

## 執行步驟（psql 對 Railway，每條帶 NX_AUTH_OK 過 hook）
```bash
BIN='.../pg18/pgsql/bin'                 # PG18 工具（pg_dump 備份需 PG18；psql 執行 SQL 亦可）
RWPASS='<RAILWAY_DB_PASSWORD>'           # ⚠️ 實值在 Railway 後台 / Crown 手上
RW='-h shortline.proxy.rlwy.net -p 52955 -U postgres -d railway'
export PGSSLMODE=require PGCLIENTENCODING=UTF8

# NX_AUTH_OK  ── 1) 覆蓋前安全網：只備份會受影響的表 ──
PGPASSWORD="$RWPASS" "$BIN/pg_dump.exe" $RW -Fc --no-owner --no-privileges \
  -t nx04_quote_record -f railway-quote_record-before-backfill-20260721.dump

# NX_AUTH_OK  ── 2) 雲端盤點（唯讀、須與 Crown 核對數字後才進步驟 3）──
PGPASSWORD="$RWPASS" "$BIN/psql.exe" $RW -At -F"|" -c "
WITH t AS (SELECT id FROM nx99_tenant WHERE code='TW-100001'),
imp AS (SELECT q.id,(SELECT count(*) FROM nx04_quote_item i WHERE i.quote_id=q.id) ln
        FROM nx04_quote q,t WHERE q.tenant_id=t.id AND q.legacy_doc_no IS NOT NULL AND q.remark LIKE '偉盟匯入%')
SELECT 'single_line', count(*) FROM imp WHERE ln=1
UNION ALL SELECT 'existing_QUOTE_rec',(SELECT count(*) FROM nx04_quote_record WHERE source='QUOTE');"

# NX_AUTH_OK  ── 3) 正式回填（Crown 放行後）──
PGPASSWORD="$RWPASS" "$BIN/psql.exe" $RW -v ON_ERROR_STOP=1 \
  -f packages/db-core/scripts/weimeng-v2-backfill-quote-record.sql

# NX_AUTH_OK  ── 4) 驗證：source=QUOTE 筆數應 = 步驟 2 的 single_line ──
PGPASSWORD="$RWPASS" "$BIN/psql.exe" $RW -At -c \
  "SELECT count(*) FROM nx04_quote_record WHERE source='QUOTE';"
```

## 回滾
- 回填是純加法（只新增 source=QUOTE 且 remark='偉盟回填(單行報價)' 的紀錄）。如需撤回：
```sql
DELETE FROM nx04_quote_record WHERE source='QUOTE' AND remark='偉盟回填(單行報價)';
```
- 或還原步驟 1 的 dump。

## 注意
- 冪等：可重複跑，NOT EXISTS 守衛避免重覆。
- redeploy 不需要（純資料、無 schema / 程式碼變更）。
