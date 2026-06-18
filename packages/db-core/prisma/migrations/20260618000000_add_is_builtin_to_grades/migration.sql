-- 執行長 2026-06-18 拍板 B 行為:Nx01CustomerGrade + Nx01SupplierGrade 加 is_builtin
-- 用途:系統內建分級（A/B/C/D）標 isBuiltin=true、UI 可改名但不允許停用/刪、避免誤刪導致報價系統壞

ALTER TABLE "nx01_customer_grade" ADD COLUMN "is_builtin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "nx01_supplier_grade" ADD COLUMN "is_builtin" BOOLEAN NOT NULL DEFAULT false;
