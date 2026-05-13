-- packages/db-core/prisma/migrations/20260513140000_nx01_car_brand_add_name_en_logo_url/migration.sql
-- ============================================================================
-- Migration: nx01_car_brand_add_name_en_logo_url
-- 建立日期：2026-05-13
-- 任務：TASK-NX01-12-IMPL-v2 軌中 commit 3.A（NX01-12 schema 補欄位）
-- 對應 spec：docs/nx01/spec/intent/nx01-12-car-brand.md v1.0 §4.1
--
-- 範圍：擴充原則 #23 類型 1「加新東西」（nullable、向後相容）
--   既有 nx01_car_brand 表有資料（apply-car-brand.ts 5 個 VAG 子品牌）、
--   nullable 加法不破壞既有 row
--
-- 變更：
--   1. ADD COLUMN name_en VARCHAR(100) NULL（品牌英文名、規格 §4.1）
--   2. ADD COLUMN logo_url VARCHAR(500) NULL（規格 Q1=B schema 預留、v1.0 UI 不渲染）
-- ============================================================================

ALTER TABLE "nx01_car_brand"
  ADD COLUMN "name_en" VARCHAR(100),
  ADD COLUMN "logo_url" VARCHAR(500);

-- ============================================================================
-- 完成：NX01-12 schema 對齊規格 v1.0 §4.1（nameEn + logoUrl）
-- ============================================================================
