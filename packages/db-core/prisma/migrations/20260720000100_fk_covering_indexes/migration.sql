-- packages/db-core/prisma/migrations/20260720000100_fk_covering_indexes/migration.sql
-- 外鍵欄覆蓋索引補齊（2026-07-20，偉盟窗口重灌時發現）
-- 背景：Postgres 不會自動為 FK 欄建索引（只建 PK/unique）。刪除父表列時，
--   每刪一列須逐一檢查所有「指向它」的子表有無孤兒；子表 FK 欄若無索引 → 每列觸發全表掃描。
--   實證：刪窗口內 88k 張 SO 的 17.6 萬明細，因 6 張反向參照表（nx04_sr_item.so_item_id、
--   nx02_ti_item / nx02_rfq / nx04_co.source_so_item_id、nx03_pk_item.ref_so_item_id 等）
--   缺索引，單一 DELETE 跑 20 分鐘未完；補索引後整批秒級完成。
-- 效益：不只加速本次匯入清理，任何父表 UPDATE/DELETE、以及 JOIN 子表查詢都受惠（正式環境同樣需要）。
-- 安全：全部 CREATE INDEX CONCURRENTLY IF NOT EXISTS，不鎖表、可重跑。
-- ⚠️ 本機以 prisma db execute 逐句手動套用（CONCURRENTLY 不能在交易塊內；migrate 追蹤表亦壞）。

-- 父連結欄（加速子表 deleteMany({where:{parent}}) 與 join）
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx04_so_item_so_id_idx ON nx04_so_item(so_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx04_sr_item_sr_id_idx ON nx04_sr_item(sr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx02_rr_item_rr_id_idx ON nx02_rr_item(rr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx02_pr_item_pr_id_idx ON nx02_pr_item(pr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx03_st_item_st_id_idx ON nx03_st_item(st_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx03_stock_take_item_stock_take_id_idx ON nx03_stock_take_item(stock_take_id);

-- 反向參照欄（加速父表刪除時的 FK 完整性檢查）——本次卡死的真正主因
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx05_ar_ledger_pr_id_fkidx ON nx05_ar_ledger(pr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx02_pr_rr_id_fkidx ON nx02_pr(rr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx02_rr_import_rr_id_fkidx ON nx02_rr_import(rr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx03_st_ref_rr_id_fkidx ON nx03_st(ref_rr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx05_ap_ledger_rr_id_fkidx ON nx05_ap_ledger(rr_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx02_pr_item_rr_item_id_fkidx ON nx02_pr_item(rr_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx03_pk_item_ref_st_id_fkidx ON nx03_pk_item(ref_st_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx04_so_item_st_id_fkidx ON nx04_so_item(st_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx02_rr_ref_so_id_fkidx ON nx02_rr(ref_so_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx03_pk_item_ref_so_id_fkidx ON nx03_pk_item(ref_so_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx03_st_ref_so_id_fkidx ON nx03_st(ref_so_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx04_sr_so_id_fkidx ON nx04_sr(so_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx05_ar_ledger_so_id_fkidx ON nx05_ar_ledger(so_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx06_dn_source_so_id_fkidx ON nx06_dn(source_so_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx02_rfq_source_so_item_id_fkidx ON nx02_rfq(source_so_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx03_pk_item_ref_so_item_id_fkidx ON nx03_pk_item(ref_so_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx04_co_source_so_item_id_fkidx ON nx04_co(source_so_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx04_sr_item_so_item_id_fkidx ON nx04_sr_item(so_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS nx06_dn_source_sr_id_fkidx ON nx06_dn(source_sr_id);
