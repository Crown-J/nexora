-- packages/db-core/prisma/migrations/20260519100000_nx06_impl_02_m1_dn_route_optimization_columns/migration.sql
-- NX06-IMPL-02 Phase 1 M1：Nx06Dn 加路線優化欄
-- 對齊：overview v0.2.0 §4.1 #1 + #2（路線優化單車 + 多車 VRP）+ plan §3 M1
-- 性質：ALTER ADD COLUMN nullable × 3、0 backfill 衝突

ALTER TABLE "nx06_dn" ADD COLUMN "route_order_in_sequence" INTEGER;
ALTER TABLE "nx06_dn" ADD COLUMN "estimated_duration_sec"  INTEGER;
ALTER TABLE "nx06_dn" ADD COLUMN "route_batch_id"          VARCHAR(15);

COMMENT ON COLUMN "nx06_dn"."route_order_in_sequence" IS '多車場景：在某外務員 batch 內的順序（1, 2, 3, ...）。NX06-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx06_dn"."estimated_duration_sec"  IS 'Google Maps Distance Matrix 預估配送時長（秒）。NX06-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx06_dn"."route_batch_id"          IS '路線優化 batch ID（multi-DN 一次優化批次）。NX06-IMPL-02 M1 新增。';
