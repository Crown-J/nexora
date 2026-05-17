-- packages/db-core/prisma/migrations/20260518100000_nx04_impl_01_m1_partner_default_warehouse_id/migration.sql
-- ============================================================================
-- Migration: nx04_impl_01_m1_partner_default_warehouse_id
-- 建立日期：2026-05-18
-- 任務：TASK-NX04-IMPL-01 Phase 1 M1（NX01 升版：客戶預設據點配套）
-- 對應 plan：docs/nx04/spec/impl/nx04-impl-01-plan.md §3 M1
-- 對應 overview：docs/nx04/spec/intent/nx04-overview.md §7 客戶預設據點 + 自動調撥
-- 對應拍板：
--   - Crown Q-M1=A 2 軌 migration 認可
--   - Crown Q-S1=A FK ON DELETE SET NULL
--   - Crown Q-NX04-A=B 新建 defaultWarehouseId 欄
--   - 業務需求：客戶通常有「習慣取貨據點」、SO 建單自動帶入、無庫存自動調撥
--
-- 範圍（A041 = 1 ALTER TABLE ADD COLUMN + 1 ADD CONSTRAINT FK、純加欄、SET NULL）：
--   1. nx01_partner ADD COLUMN default_warehouse_id VARCHAR(15) NULL
--   2. ADD CONSTRAINT nx01_partner_default_warehouse_id_fkey FOREIGN KEY → nx01_warehouse(id) ON DELETE SET NULL ON UPDATE CASCADE
--
-- 業務語意：
--   - 客戶習慣取貨據點（北部客戶慣用台北倉等）
--   - SO 建單時 application 自動帶入 customer.defaultWarehouseId
--   - 該據點無庫存 → application 自動建 NX03 ST 調撥單（overview §7.3 自動調撥邏輯）
--   - 屬 NX01 升版題（schema 動 Nx01Partner、主軌 NX04 觸發）
--   - 用途上等同 customerGradeId / salesUserId 的 nullable FK 範式（既有 partner 主檔已多此類欄）
--
-- 漸進範式：
--   - 既有 row 全 null、不影響既有 partner CRUD / SO 建單路徑
--   - 業務人員可在 partner 主檔 UI 手動設定（後續 UI 軌、本軌 partner.service dto 擴）
--   - SO service 升級時：null fallback 走系統選最近倉邏輯（後續 Phase 3 commit）
--   - ON DELETE SET NULL：warehouse 主檔本不刪、刪除時客戶 fallback 系統選倉（對齊既有 Nx01Partner.customerGradeId / salesUserId / defaultCurrencyId 多個 nullable FK 範式）
--
-- 風險：低（純加欄、nullable、SET NULL、不阻擋 warehouse 主檔操作）
-- ============================================================================

ALTER TABLE "nx01_partner" ADD COLUMN "default_warehouse_id" VARCHAR(15);

ALTER TABLE "nx01_partner"
  ADD CONSTRAINT "nx01_partner_default_warehouse_id_fkey"
  FOREIGN KEY ("default_warehouse_id") REFERENCES "nx01_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 完成：Nx01Partner +1 defaultWarehouseId FK（客戶預設據點配套）
-- 後續：M2 nx99_tenant +creditOverdueDaysThreshold（系統參數）
-- ============================================================================
