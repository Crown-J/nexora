-- 為既有 nx00 / nx01 / nx99 資料表與欄位補齊 PostgreSQL COMMENT（與 Prisma schema 業務意義對齊）

-- nx00_user
COMMENT ON TABLE "nx00_user" IS 'NX00 使用者主檔';
COMMENT ON COLUMN "nx00_user"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_user"."username" IS '登入帳號（唯一）';
COMMENT ON COLUMN "nx00_user"."password_hash" IS '密碼雜湊';
COMMENT ON COLUMN "nx00_user"."display_name" IS '顯示名稱';
COMMENT ON COLUMN "nx00_user"."email" IS '電子郵件';
COMMENT ON COLUMN "nx00_user"."phone" IS '電話';
COMMENT ON COLUMN "nx00_user"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_user"."last_login_at" IS '最後登入時間';
COMMENT ON COLUMN "nx00_user"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_user"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_user"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_user"."updated_by" IS '最後更新者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_user"."tenant_id" IS '租戶（→ nx99_tenant.id，可空）';

-- nx00_role
COMMENT ON TABLE "nx00_role" IS 'NX00 角色主檔';
COMMENT ON COLUMN "nx00_role"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_role"."code" IS '角色代碼（唯一）';
COMMENT ON COLUMN "nx00_role"."name" IS '角色名稱';
COMMENT ON COLUMN "nx00_role"."description" IS '說明';
COMMENT ON COLUMN "nx00_role"."is_system" IS '是否為系統內建角色';
COMMENT ON COLUMN "nx00_role"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_role"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx00_role"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_role"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_role"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_role"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_user_role
COMMENT ON TABLE "nx00_user_role" IS 'NX00 使用者與角色關聯';
COMMENT ON COLUMN "nx00_user_role"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_user_role"."user_id" IS '使用者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_user_role"."role_id" IS '角色（→ nx00_role.id）';
COMMENT ON COLUMN "nx00_user_role"."is_primary" IS '是否為主要職位';
COMMENT ON COLUMN "nx00_user_role"."assigned_at" IS '指派時間';
COMMENT ON COLUMN "nx00_user_role"."assigned_by" IS '指派者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_user_role"."revoked_at" IS '撤銷時間';
COMMENT ON COLUMN "nx00_user_role"."is_active" IS '是否啟用';

-- nx00_view
COMMENT ON TABLE "nx00_view" IS 'NX00 畫面／功能選單定義';
COMMENT ON COLUMN "nx00_view"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_view"."code" IS '畫面代碼（唯一）';
COMMENT ON COLUMN "nx00_view"."name" IS '畫面名稱';
COMMENT ON COLUMN "nx00_view"."module_code" IS '所屬模組代碼';
COMMENT ON COLUMN "nx00_view"."path" IS '前端路由路徑';
COMMENT ON COLUMN "nx00_view"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx00_view"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_view"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_view"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_view"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_view"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_role_view
COMMENT ON TABLE "nx00_role_view" IS 'NX00 角色對畫面權限';
COMMENT ON COLUMN "nx00_role_view"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_role_view"."role_id" IS '角色（→ nx00_role.id）';
COMMENT ON COLUMN "nx00_role_view"."view_id" IS '畫面（→ nx00_view.id）';
COMMENT ON COLUMN "nx00_role_view"."can_read" IS '可讀';
COMMENT ON COLUMN "nx00_role_view"."can_create" IS '可新增';
COMMENT ON COLUMN "nx00_role_view"."can_update" IS '可修改';
COMMENT ON COLUMN "nx00_role_view"."can_delete" IS '可刪除';
COMMENT ON COLUMN "nx00_role_view"."can_export" IS '可匯出';
COMMENT ON COLUMN "nx00_role_view"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_role_view"."granted_at" IS '授權時間';
COMMENT ON COLUMN "nx00_role_view"."granted_by" IS '授權者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_role_view"."revoked_at" IS '撤銷時間';
COMMENT ON COLUMN "nx00_role_view"."revoked_by" IS '撤銷者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_role_view"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_role_view"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_role_view"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_role_view"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_part
COMMENT ON TABLE "nx00_part" IS 'NX00 零件／料號主檔';
COMMENT ON COLUMN "nx00_part"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_part"."code" IS '料號（唯一）';
COMMENT ON COLUMN "nx00_part"."name" IS '品名';
COMMENT ON COLUMN "nx00_part"."brand_id" IS '廠牌（→ nx00_brand.id）';
COMMENT ON COLUMN "nx00_part"."spec" IS '規格';
COMMENT ON COLUMN "nx00_part"."uom" IS '單位';
COMMENT ON COLUMN "nx00_part"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_part"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_part"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_part"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_part"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_brand
COMMENT ON TABLE "nx00_brand" IS 'NX00 廠牌主檔';
COMMENT ON COLUMN "nx00_brand"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_brand"."code" IS '廠牌代碼（唯一）';
COMMENT ON COLUMN "nx00_brand"."name" IS '廠牌名稱';
COMMENT ON COLUMN "nx00_brand"."origin_country" IS '原產國';
COMMENT ON COLUMN "nx00_brand"."remark" IS '備註';
COMMENT ON COLUMN "nx00_brand"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_brand"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx00_brand"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_brand"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_brand"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_brand"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_warehouse
COMMENT ON TABLE "nx00_warehouse" IS 'NX00 倉庫主檔';
COMMENT ON COLUMN "nx00_warehouse"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_warehouse"."code" IS '倉庫代碼（唯一）';
COMMENT ON COLUMN "nx00_warehouse"."name" IS '倉庫名稱';
COMMENT ON COLUMN "nx00_warehouse"."remark" IS '備註';
COMMENT ON COLUMN "nx00_warehouse"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx00_warehouse"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_warehouse"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_warehouse"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_warehouse"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_warehouse"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_location
COMMENT ON TABLE "nx00_location" IS 'NX00 庫位主檔';
COMMENT ON COLUMN "nx00_location"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_location"."warehouse_id" IS '倉庫（→ nx00_warehouse.id）';
COMMENT ON COLUMN "nx00_location"."code" IS '庫位代碼';
COMMENT ON COLUMN "nx00_location"."name" IS '庫位名稱';
COMMENT ON COLUMN "nx00_location"."zone" IS '區';
COMMENT ON COLUMN "nx00_location"."rack" IS '架';
COMMENT ON COLUMN "nx00_location"."level_no" IS '層';
COMMENT ON COLUMN "nx00_location"."bin_no" IS '格';
COMMENT ON COLUMN "nx00_location"."remark" IS '備註';
COMMENT ON COLUMN "nx00_location"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx00_location"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_location"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_location"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_location"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_location"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_partner
COMMENT ON TABLE "nx00_partner" IS 'NX00 往來客戶／供應商主檔';
COMMENT ON COLUMN "nx00_partner"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_partner"."code" IS '往來代碼（唯一）';
COMMENT ON COLUMN "nx00_partner"."name" IS '名稱';
COMMENT ON COLUMN "nx00_partner"."partner_type" IS '類型（客戶／供應商／兩者）';
COMMENT ON COLUMN "nx00_partner"."contact_name" IS '聯絡人';
COMMENT ON COLUMN "nx00_partner"."phone" IS '電話';
COMMENT ON COLUMN "nx00_partner"."mobile" IS '手機';
COMMENT ON COLUMN "nx00_partner"."email" IS '電子郵件';
COMMENT ON COLUMN "nx00_partner"."address" IS '地址';
COMMENT ON COLUMN "nx00_partner"."remark" IS '備註';
COMMENT ON COLUMN "nx00_partner"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx00_partner"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx00_partner"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_partner"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx00_partner"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx00_audit_log
COMMENT ON TABLE "nx00_audit_log" IS 'NX00 稽核紀錄';
COMMENT ON COLUMN "nx00_audit_log"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx00_audit_log"."occurred_at" IS '發生時間';
COMMENT ON COLUMN "nx00_audit_log"."actor_user_id" IS '操作者（→ nx00_user.id）';
COMMENT ON COLUMN "nx00_audit_log"."module_code" IS '模組代碼';
COMMENT ON COLUMN "nx00_audit_log"."action" IS '動作';
COMMENT ON COLUMN "nx00_audit_log"."entity_table" IS '實體資料表';
COMMENT ON COLUMN "nx00_audit_log"."entity_id" IS '實體主鍵';
COMMENT ON COLUMN "nx00_audit_log"."entity_code" IS '實體業務代碼';
COMMENT ON COLUMN "nx00_audit_log"."summary" IS '摘要';
COMMENT ON COLUMN "nx00_audit_log"."before_data" IS '異動前資料（JSON）';
COMMENT ON COLUMN "nx00_audit_log"."after_data" IS '異動後資料（JSON）';
COMMENT ON COLUMN "nx00_audit_log"."ip_addr" IS '來源 IP';
COMMENT ON COLUMN "nx00_audit_log"."user_agent" IS 'User-Agent';

-- nx99_tenant
COMMENT ON TABLE "nx99_tenant" IS 'NX99 租戶主檔';
COMMENT ON COLUMN "nx99_tenant"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx99_tenant"."code" IS '租戶代碼（唯一）';
COMMENT ON COLUMN "nx99_tenant"."name" IS '租戶名稱';
COMMENT ON COLUMN "nx99_tenant"."status" IS '狀態（單碼）';
COMMENT ON COLUMN "nx99_tenant"."remark" IS '備註';
COMMENT ON COLUMN "nx99_tenant"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx99_tenant"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx99_tenant"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx99_tenant"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx99_tenant"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx99_tenant"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx01_rfq
COMMENT ON TABLE "nx01_rfq" IS 'NX01 詢價單表頭';
COMMENT ON COLUMN "nx01_rfq"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx01_rfq"."tenant_id" IS '租戶（→ nx99_tenant.id）';
COMMENT ON COLUMN "nx01_rfq"."doc_no" IS '詢價單號（唯一）';
COMMENT ON COLUMN "nx01_rfq"."rfq_date" IS '詢價日期';
COMMENT ON COLUMN "nx01_rfq"."supplier_id" IS '供應商（→ nx00_partner.id）';
COMMENT ON COLUMN "nx01_rfq"."contact_name" IS '聯絡人';
COMMENT ON COLUMN "nx01_rfq"."contact_phone" IS '聯絡電話';
COMMENT ON COLUMN "nx01_rfq"."currency" IS '幣別';
COMMENT ON COLUMN "nx01_rfq"."status" IS '單據狀態';
COMMENT ON COLUMN "nx01_rfq"."remark" IS '備註';
COMMENT ON COLUMN "nx01_rfq"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_rfq"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx01_rfq"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_rfq"."updated_by" IS '最後更新者（→ nx00_user.id）';
COMMENT ON COLUMN "nx01_rfq"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx01_rfq"."voided_by" IS '作廢者（→ nx00_user.id）';

-- nx01_rfq_item
COMMENT ON TABLE "nx01_rfq_item" IS 'NX01 詢價單明細';
COMMENT ON COLUMN "nx01_rfq_item"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx01_rfq_item"."tenant_id" IS '租戶（→ nx99_tenant.id）';
COMMENT ON COLUMN "nx01_rfq_item"."rfq_id" IS '詢價單表頭（→ nx01_rfq.id）';
COMMENT ON COLUMN "nx01_rfq_item"."line_no" IS '行號';
COMMENT ON COLUMN "nx01_rfq_item"."part_id" IS '料號（→ nx00_part.id）';
COMMENT ON COLUMN "nx01_rfq_item"."part_no" IS '料號快照';
COMMENT ON COLUMN "nx01_rfq_item"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx01_rfq_item"."qty" IS '數量';
COMMENT ON COLUMN "nx01_rfq_item"."unit_price" IS '單價（供應商回覆）';
COMMENT ON COLUMN "nx01_rfq_item"."currency" IS '幣別';
COMMENT ON COLUMN "nx01_rfq_item"."lead_time_days" IS '交期（天）';
COMMENT ON COLUMN "nx01_rfq_item"."status" IS '明細狀態';
COMMENT ON COLUMN "nx01_rfq_item"."remark" IS '備註';
COMMENT ON COLUMN "nx01_rfq_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_rfq_item"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx01_rfq_item"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_rfq_item"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx01_po
COMMENT ON TABLE "nx01_po" IS 'NX01 進貨單表頭';
COMMENT ON COLUMN "nx01_po"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx01_po"."tenant_id" IS '租戶（→ nx99_tenant.id）';
COMMENT ON COLUMN "nx01_po"."doc_no" IS '進貨單號（唯一）';
COMMENT ON COLUMN "nx01_po"."po_date" IS '進貨日期';
COMMENT ON COLUMN "nx01_po"."supplier_id" IS '供應商（→ nx00_partner.id）';
COMMENT ON COLUMN "nx01_po"."rfq_id" IS '來源詢價單（→ nx01_rfq.id，可空）';
COMMENT ON COLUMN "nx01_po"."currency" IS '幣別';
COMMENT ON COLUMN "nx01_po"."subtotal" IS '未稅小計';
COMMENT ON COLUMN "nx01_po"."tax_amount" IS '稅額';
COMMENT ON COLUMN "nx01_po"."total_amount" IS '含稅總額';
COMMENT ON COLUMN "nx01_po"."status" IS '單據狀態';
COMMENT ON COLUMN "nx01_po"."posted_at" IS '過帳時間';
COMMENT ON COLUMN "nx01_po"."posted_by" IS '過帳者（→ nx00_user.id）';
COMMENT ON COLUMN "nx01_po"."remark" IS '備註';
COMMENT ON COLUMN "nx01_po"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_po"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx01_po"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_po"."updated_by" IS '最後更新者（→ nx00_user.id）';
COMMENT ON COLUMN "nx01_po"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx01_po"."voided_by" IS '作廢者（→ nx00_user.id）';

-- nx01_po_item
COMMENT ON TABLE "nx01_po_item" IS 'NX01 進貨單明細';
COMMENT ON COLUMN "nx01_po_item"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx01_po_item"."tenant_id" IS '租戶（→ nx99_tenant.id）';
COMMENT ON COLUMN "nx01_po_item"."po_id" IS '進貨單表頭（→ nx01_po.id）';
COMMENT ON COLUMN "nx01_po_item"."line_no" IS '行號';
COMMENT ON COLUMN "nx01_po_item"."part_id" IS '料號（→ nx00_part.id）';
COMMENT ON COLUMN "nx01_po_item"."part_no" IS '料號快照';
COMMENT ON COLUMN "nx01_po_item"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx01_po_item"."warehouse_id" IS '倉庫（→ nx00_warehouse.id）';
COMMENT ON COLUMN "nx01_po_item"."location_id" IS '庫位（→ nx00_location.id，可空）';
COMMENT ON COLUMN "nx01_po_item"."qty" IS '數量';
COMMENT ON COLUMN "nx01_po_item"."unit_cost" IS '單位成本';
COMMENT ON COLUMN "nx01_po_item"."line_amount" IS '行金額';
COMMENT ON COLUMN "nx01_po_item"."remark" IS '備註';
COMMENT ON COLUMN "nx01_po_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_po_item"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx01_po_item"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_po_item"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx99_plan
COMMENT ON TABLE "nx99_plan" IS 'NX99 方案主檔';
COMMENT ON COLUMN "nx99_plan"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx99_plan"."code" IS '方案代碼（唯一）';
COMMENT ON COLUMN "nx99_plan"."name" IS '方案名稱';
COMMENT ON COLUMN "nx99_plan"."level_no" IS '方案層級';
COMMENT ON COLUMN "nx99_plan"."base_fee_month" IS '月費基礎費';
COMMENT ON COLUMN "nx99_plan"."seat_fee_month" IS '每人每月加價';
COMMENT ON COLUMN "nx99_plan"."min_seats" IS '最低人數';
COMMENT ON COLUMN "nx99_plan"."max_seats" IS '最高人數';
COMMENT ON COLUMN "nx99_plan"."billing_default" IS '預設計費週期';
COMMENT ON COLUMN "nx99_plan"."year_discount_type" IS '年費折數類型';
COMMENT ON COLUMN "nx99_plan"."year_discount_value" IS '年費折數值';
COMMENT ON COLUMN "nx99_plan"."year_price_override" IS '年費覆寫價';
COMMENT ON COLUMN "nx99_plan"."remark" IS '備註';
COMMENT ON COLUMN "nx99_plan"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx99_plan"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx99_plan"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx99_plan"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx99_plan"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx99_plan"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx99_subscription
COMMENT ON TABLE "nx99_subscription" IS 'NX99 租戶訂閱';
COMMENT ON COLUMN "nx99_subscription"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx99_subscription"."tenant_id" IS '租戶（→ nx99_tenant.id）';
COMMENT ON COLUMN "nx99_subscription"."plan_id" IS '方案（→ nx99_plan.id）';
COMMENT ON COLUMN "nx99_subscription"."status" IS '訂閱狀態';
COMMENT ON COLUMN "nx99_subscription"."billing_cycle" IS '計費週期';
COMMENT ON COLUMN "nx99_subscription"."seats" IS '授權席次';
COMMENT ON COLUMN "nx99_subscription"."start_at" IS '開始時間';
COMMENT ON COLUMN "nx99_subscription"."end_at" IS '結束時間';
COMMENT ON COLUMN "nx99_subscription"."auto_renew" IS '自動續約';
COMMENT ON COLUMN "nx99_subscription"."base_fee_snapshot" IS '基礎費快照';
COMMENT ON COLUMN "nx99_subscription"."seat_fee_snapshot" IS '每人加價快照';
COMMENT ON COLUMN "nx99_subscription"."discount_type_snapshot" IS '折扣類型快照';
COMMENT ON COLUMN "nx99_subscription"."discount_value_snapshot" IS '折扣值快照';
COMMENT ON COLUMN "nx99_subscription"."subtotal_snapshot" IS '小計快照';
COMMENT ON COLUMN "nx99_subscription"."discount_amount_snapshot" IS '折扣金額快照';
COMMENT ON COLUMN "nx99_subscription"."total_snapshot" IS '總額快照';
COMMENT ON COLUMN "nx99_subscription"."currency" IS '幣別';
COMMENT ON COLUMN "nx99_subscription"."remark" IS '備註';
COMMENT ON COLUMN "nx99_subscription"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx99_subscription"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx99_subscription"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx99_subscription"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx99_subscription_item
COMMENT ON TABLE "nx99_subscription_item" IS 'NX99 訂閱明細（模組／加購）';
COMMENT ON COLUMN "nx99_subscription_item"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx99_subscription_item"."subscription_id" IS '訂閱（→ nx99_subscription.id）';
COMMENT ON COLUMN "nx99_subscription_item"."item_type" IS '類型（例：PRODUCT_MODULE）';
COMMENT ON COLUMN "nx99_subscription_item"."ref_id" IS '參照 ID（例：nx99_product_module.id）';
COMMENT ON COLUMN "nx99_subscription_item"."status" IS '行狀態';
COMMENT ON COLUMN "nx99_subscription_item"."is_included" IS '是否為標配';
COMMENT ON COLUMN "nx99_subscription_item"."billing_cycle" IS '計費週期';
COMMENT ON COLUMN "nx99_subscription_item"."price_snapshot" IS '價格快照';
COMMENT ON COLUMN "nx99_subscription_item"."discount_type_snapshot" IS '折扣類型快照';
COMMENT ON COLUMN "nx99_subscription_item"."discount_value_snapshot" IS '折扣值快照';
COMMENT ON COLUMN "nx99_subscription_item"."total_snapshot" IS '總額快照';
COMMENT ON COLUMN "nx99_subscription_item"."start_at" IS '開始時間';
COMMENT ON COLUMN "nx99_subscription_item"."end_at" IS '結束時間';
COMMENT ON COLUMN "nx99_subscription_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx99_subscription_item"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx99_subscription_item"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx99_subscription_item"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx99_product_module
COMMENT ON TABLE "nx99_product_module" IS 'NX99 產品模組 SKU';
COMMENT ON COLUMN "nx99_product_module"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx99_product_module"."code" IS '模組代碼（唯一）';
COMMENT ON COLUMN "nx99_product_module"."name" IS '模組名稱';
COMMENT ON COLUMN "nx99_product_module"."module_level" IS '模組層級（Core/Add-on 等）';
COMMENT ON COLUMN "nx99_product_module"."applicable_plan_code" IS '適用方案代碼';
COMMENT ON COLUMN "nx99_product_module"."billing_type" IS '計費類型';
COMMENT ON COLUMN "nx99_product_module"."monthly_fee" IS '月費';
COMMENT ON COLUMN "nx99_product_module"."is_bundle_default" IS '是否為方案標配';
COMMENT ON COLUMN "nx99_product_module"."description" IS '說明';
COMMENT ON COLUMN "nx99_product_module"."sort_no" IS '排序號';
COMMENT ON COLUMN "nx99_product_module"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx99_product_module"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx99_product_module"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx99_product_module"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx99_product_module"."updated_by" IS '最後更新者（→ nx00_user.id）';

-- nx99_product_module_map
COMMENT ON TABLE "nx99_product_module_map" IS 'NX99 產品模組與程式模組對照';
COMMENT ON COLUMN "nx99_product_module_map"."id" IS '主鍵（系統產生）';
COMMENT ON COLUMN "nx99_product_module_map"."product_module_id" IS '產品模組（→ nx99_product_module.id）';
COMMENT ON COLUMN "nx99_product_module_map"."app_module_code" IS '程式模組代碼（NX00～NX06）';
COMMENT ON COLUMN "nx99_product_module_map"."is_required" IS '是否必填／必須對應';
COMMENT ON COLUMN "nx99_product_module_map"."remark" IS '備註';
COMMENT ON COLUMN "nx99_product_module_map"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx99_product_module_map"."created_by" IS '建立者（→ nx00_user.id）';
COMMENT ON COLUMN "nx99_product_module_map"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx99_product_module_map"."updated_by" IS '最後更新者（→ nx00_user.id）';
