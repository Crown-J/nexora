-- packages/db-core/sql/table-comments.sql
-- 自動產生：node packages/db-core/scripts/gen-table-comments.mjs（勿手改，改 schema.prisma 的 /// 後重跑）
-- 內容：schema.prisma 的 /// 註解 → COMMENT ON TABLE/COLUMN；冪等、可重跑、本機/Railway 同套。

-- Nx01AuditLog  →  nx01_audit_log
COMMENT ON TABLE "nx01_audit_log" IS '稽核軌跡日誌——記錄系統操作異動（誰於何時改了什麼）。';
COMMENT ON COLUMN "nx01_audit_log"."id" IS '[NX01]+[AULO]+[7碼流水號]，EX : NX01AULO0000001';
COMMENT ON COLUMN "nx01_audit_log"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_audit_log"."occurred_at" IS '發生時間';
COMMENT ON COLUMN "nx01_audit_log"."actor_user_id" IS '操作者（使用者 ID）';
COMMENT ON COLUMN "nx01_audit_log"."module_code" IS '模組代碼：nx00/nx01/nx02...';
COMMENT ON COLUMN "nx01_audit_log"."action" IS '動作類型：CREATE/UPDATE/DELETE/LOGIN/LOGOUT/EXPORT/POST/VOID…';
COMMENT ON COLUMN "nx01_audit_log"."entity_table" IS '目標表格名稱，例：nx01_po、nx01_part';
COMMENT ON COLUMN "nx01_audit_log"."entity_id" IS '目標資料 ID（多數是 VARCHAR(15)，允許更長避免未來擴充）';
COMMENT ON COLUMN "nx01_audit_log"."entity_code" IS '目標資料識別碼（例：單號、料號、畫面代碼），方便人查';
COMMENT ON COLUMN "nx01_audit_log"."summary" IS '簡述（例：建立進貨單、修改銷貨單金額）';
COMMENT ON COLUMN "nx01_audit_log"."before_data" IS '變更前資料快照（可空；只在 UPDATE/DELETE 時有）';
COMMENT ON COLUMN "nx01_audit_log"."after_data" IS '變更後資料快照（可空；只在 CREATE/UPDATE 時有）';
COMMENT ON COLUMN "nx01_audit_log"."ip_addr" IS 'IP 位址（IPv4/IPv6；可空）';
COMMENT ON COLUMN "nx01_audit_log"."user_agent" IS '瀏覽器/裝置資訊（可空）';

-- Nx01Bulletin  →  nx01_bulletin
COMMENT ON TABLE "nx01_bulletin" IS '公告主檔——公司內部公告。';
COMMENT ON COLUMN "nx01_bulletin"."id" IS '[NX01]+[BULL]+[7碼流水號]，EX : NX01BULL0000001';
COMMENT ON COLUMN "nx01_bulletin"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_bulletin"."title" IS '公告標題';
COMMENT ON COLUMN "nx01_bulletin"."content" IS '公告內容（rich text、HTML 5000 字內）';
COMMENT ON COLUMN "nx01_bulletin"."type" IS '公告類型（v0 遺留：S=SYSTEM / C=COMPANY / R=REMIND）。v1.0 改用 category_id；本欄位保留 backward compat、後續 task 廢棄。';
COMMENT ON COLUMN "nx01_bulletin"."category_id" IS '分類 FK（連 nx01_bulletin_category、v1.0 對齊 audience_logic 對象範圍）';
COMMENT ON COLUMN "nx01_bulletin"."importance" IS '重要等級：normal=一般 / important=重要（第一次登入跳 modal） / urgent=緊急（每次登入跳）';
COMMENT ON COLUMN "nx01_bulletin"."publish_at" IS '發布時間（預設 now、PRO 可排程未來）';
COMMENT ON COLUMN "nx01_bulletin"."status" IS '狀態：draft=草稿 / scheduled=排程中 / published=已發布 / withdrawn=撤回 / expired=過期';
COMMENT ON COLUMN "nx01_bulletin"."is_pinned" IS '是否置頂（v0 遺留欄位、保留 backward compat、v1.0 spec 未提）';
COMMENT ON COLUMN "nx01_bulletin"."expired_at" IS '到期時間（NULL = 永久顯示）';
COMMENT ON COLUMN "nx01_bulletin"."read_count" IS '已讀人數（trigger 自動更新、來自 nx01_bulletin_read_log count）';
COMMENT ON COLUMN "nx01_bulletin"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_bulletin"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_bulletin"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_bulletin"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_bulletin"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01BulletinCategory  →  nx01_bulletin_category
COMMENT ON TABLE "nx01_bulletin_category" IS '公告分類表（v1.0 子表、Tier 差異走 tier_required 不寫死 enum）';
COMMENT ON COLUMN "nx01_bulletin_category"."id" IS '[NX01]+[BCAT]+[7碼流水號]，EX : NX01BCAT0000001';
COMMENT ON COLUMN "nx01_bulletin_category"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_bulletin_category"."code" IS '分類代碼（all / system / mgmt / product / sales / warehouse / finance / 自訂）';
COMMENT ON COLUMN "nx01_bulletin_category"."name" IS '分類名稱（顯示用）';
COMMENT ON COLUMN "nx01_bulletin_category"."audience_logic" IS '對象範圍邏輯 enum（tenant_all / system_all / leaders_all / by_team_id）';
COMMENT ON COLUMN "nx01_bulletin_category"."team_id" IS '對應 team FK（audience_logic = by_team_id 時必填）';
COMMENT ON COLUMN "nx01_bulletin_category"."tier_required" IS '此分類所需最低 Tier（LITE / PLUS / PRO）';
COMMENT ON COLUMN "nx01_bulletin_category"."is_system" IS '是否系統預設（true = 不可刪、false = user 自訂）';
COMMENT ON COLUMN "nx01_bulletin_category"."sort_order" IS '排序';
COMMENT ON COLUMN "nx01_bulletin_category"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_bulletin_category"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_bulletin_category"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_bulletin_category"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_bulletin_category"."updated_by" IS '更新人';

-- Nx01BulletinAttachment  →  nx01_bulletin_attachment
COMMENT ON TABLE "nx01_bulletin_attachment" IS '公告附件子表（v1.0 範式 C、接軌 1 file-upload service、storage_key 跨 backend 通用）';
COMMENT ON COLUMN "nx01_bulletin_attachment"."id" IS '[NX01]+[BATT]+[7碼流水號]，EX : NX01BATT0000001';
COMMENT ON COLUMN "nx01_bulletin_attachment"."tenant_id" IS '租戶 ID（外鍵、軌 1 FileUploadService.upload() tenantId prefix 強制驗證對齊）';
COMMENT ON COLUMN "nx01_bulletin_attachment"."bulletin_id" IS '公告 FK';
COMMENT ON COLUMN "nx01_bulletin_attachment"."storage_key" IS '檔案在 storage 的 key（範式：{tenantId}/{module}/{yyyy}/{mm}/{uuid}{ext}、階段 1 本地路徑、階段 2 R2 object key）';
COMMENT ON COLUMN "nx01_bulletin_attachment"."mime_type" IS 'MIME 類型（application/pdf / image/png 等）';
COMMENT ON COLUMN "nx01_bulletin_attachment"."file_size" IS '檔案大小（bytes）';
COMMENT ON COLUMN "nx01_bulletin_attachment"."orig_filename" IS '上傳時原始檔名';
COMMENT ON COLUMN "nx01_bulletin_attachment"."uploader_user_id" IS '上傳者 FK';
COMMENT ON COLUMN "nx01_bulletin_attachment"."created_at" IS '上傳時間';

-- Nx01BulletinReadLog  →  nx01_bulletin_read_log
COMMENT ON TABLE "nx01_bulletin_read_log" IS '公告已讀紀錄（v1.0 § 4.4、PK = (bulletin_id, user_id) 同 user 對同公告只記一筆）';
COMMENT ON COLUMN "nx01_bulletin_read_log"."id" IS '[NX01]+[BRLG]+[7碼流水號]，EX : NX01BRLG0000001';
COMMENT ON COLUMN "nx01_bulletin_read_log"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_bulletin_read_log"."bulletin_id" IS '公告 FK';
COMMENT ON COLUMN "nx01_bulletin_read_log"."user_id" IS '已讀者 FK';
COMMENT ON COLUMN "nx01_bulletin_read_log"."read_at" IS '已讀時間';
COMMENT ON COLUMN "nx01_bulletin_read_log"."read_duration_ms" IS '閱讀時間（modal 開啟 → 點「我已閱讀」毫秒數）';

-- Nx01CalendarEvent  →  nx01_calendar_event
COMMENT ON TABLE "nx01_calendar_event" IS '行事曆事件——公司／個人排程。';
COMMENT ON COLUMN "nx01_calendar_event"."id" IS '[NX01]+[CAEV]+[7碼流水號]，EX : NX01CAEV0000001';
COMMENT ON COLUMN "nx01_calendar_event"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_calendar_event"."title" IS '事件標題';
COMMENT ON COLUMN "nx01_calendar_event"."type" IS '事件類型：S=SYSTEM / C=COMPANY / R=REMIND';
COMMENT ON COLUMN "nx01_calendar_event"."date_start" IS '開始時間';
COMMENT ON COLUMN "nx01_calendar_event"."date_end" IS '結束時間';
COMMENT ON COLUMN "nx01_calendar_event"."is_all_day" IS '是否整天';
COMMENT ON COLUMN "nx01_calendar_event"."order_type" IS '相關單據類型：RF=詢價單 / PO=採購單 / RR=進貨單 / RM=退貨單 / QT=報價單 / SO=銷貨單 / SR=銷退單';
COMMENT ON COLUMN "nx01_calendar_event"."order_doc_no" IS '單據單號 (依 order_type 動態對應)';
COMMENT ON COLUMN "nx01_calendar_event"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_calendar_event"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_calendar_event"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_calendar_event"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_calendar_event"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01Brand  →  nx01_brand
COMMENT ON TABLE "nx01_brand" IS '合 Nx01CarBrand + Nx01PartBrand → 單一 Nx01Brand： - isCar / isPart 雙開關區分用途（同 code 可同時是車牌跟零件廠牌、e.g. VAG） - is_oem 拿掉、改由零件主檔 part.isOem 決定（業界 muscle memory：BOSCH 等品牌同時出原廠件與副廠件、原廠與否是零件層級屬性） - 零件「品牌」picker 過濾 isPart=true；車型字典 5 表 picker 過濾 isCar=true 8 個 FK 重綁：Engine / Transmission / Model / VinLookup / Part / PartOemCode / StItem / BrandCodeRule 1 個 snapshot 改名：PartVersion.partBrandIdSnapshot → brandIdSnapshot（後續軌處理） 舊 Nx01CarBrand + Nx01PartBrand：保留 schema 暫不 drop、application 層停用、後續軌物理 drop';
COMMENT ON COLUMN "nx01_brand"."id" IS '[NX01]+[BRND]+[7碼流水號]，EX : NX01BRND0000001';
COMMENT ON COLUMN "nx01_brand"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_brand"."code" IS '品牌代碼（業界縮寫、tenant 內 unique、例：VAG / POR / BMW / BEN / BOSCH）';
COMMENT ON COLUMN "nx01_brand"."name" IS '品牌中文名';
COMMENT ON COLUMN "nx01_brand"."name_en" IS '品牌英文名（國際對照、由 CarBrand 結構合入；零件品牌可空）';
COMMENT ON COLUMN "nx01_brand"."country_id" IS '品牌國家';
COMMENT ON COLUMN "nx01_brand"."logo_url" IS '品牌 Logo URL（由 CarBrand 結構合入；v2.0+ UI 渲染）';
COMMENT ON COLUMN "nx01_brand"."is_car" IS '是否汽車品牌（影響車型字典 / 引擎 / 變速箱 / 車型 / VIN 查詢 picker 過濾）';
COMMENT ON COLUMN "nx01_brand"."is_part" IS '是否零件品牌（影響零件主檔 / 編碼規則 / 進貨 / StItem picker 過濾）';
COMMENT ON COLUMN "nx01_brand"."remark" IS '備註';
COMMENT ON COLUMN "nx01_brand"."is_active" IS '是否啟用（軟刪除旗標：false=已停用，系統不做實體刪除）';
COMMENT ON COLUMN "nx01_brand"."sort_no" IS '排序序號';
COMMENT ON COLUMN "nx01_brand"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_brand"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_brand"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_brand"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01Country  →  nx01_country
COMMENT ON TABLE "nx01_country" IS '國家主檔（字典表）。';
COMMENT ON COLUMN "nx01_country"."id" IS '[NX01]+[COUN]+[7碼流水號]，EX : NX01COUN0000001';
COMMENT ON COLUMN "nx01_country"."code" IS '國家代碼，例：TWN、DEU、JPN';
COMMENT ON COLUMN "nx01_country"."name" IS '國家名稱，例：台灣、德國';
COMMENT ON COLUMN "nx01_country"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_country"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_country"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_country"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_country"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_country"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01Currency  →  nx01_currency
COMMENT ON TABLE "nx01_currency" IS '幣別主檔（字典表）。';
COMMENT ON COLUMN "nx01_currency"."id" IS '[NX01]+[CURR]+[7碼流水號]，EX : NX01CURR0000001';
COMMENT ON COLUMN "nx01_currency"."code" IS '幣別代碼，例：TWD、EUR、JPY';
COMMENT ON COLUMN "nx01_currency"."name" IS '幣別名稱，例：新台幣、歐元';
COMMENT ON COLUMN "nx01_currency"."symbol" IS '符號，例：$、€、?';
COMMENT ON COLUMN "nx01_currency"."decimal_places" IS '小數位數（TWD=0, USD=2）';
COMMENT ON COLUMN "nx01_currency"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_currency"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_currency"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_currency"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_currency"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_currency"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01CustomerGrade  →  nx01_customer_grade
COMMENT ON TABLE "nx01_customer_grade" IS '客戶等級主檔——分級連動毛利率／售價級距。';
COMMENT ON COLUMN "nx01_customer_grade"."id" IS '[NX01]+[CUGR]+[7碼流水號]，EX : NX01CUGR0000001';
COMMENT ON COLUMN "nx01_customer_grade"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_customer_grade"."code" IS '等級代碼（租戶內唯一），預設：A/B/C/D，可自行新增。';
COMMENT ON COLUMN "nx01_customer_grade"."name" IS '等級名稱（顯示用），例：黃金客戶、一般客戶。';
COMMENT ON COLUMN "nx01_customer_grade"."margin_pct" IS '最低毛利率（%），售價不得低於 成本×(1+margin_pct/100)。例：15.00 表示最低售價為成本×115%。';
COMMENT ON COLUMN "nx01_customer_grade"."sort_no" IS '排序用（數字越小等級越優惠）。';
COMMENT ON COLUMN "nx01_customer_grade"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx01_customer_grade"."is_builtin" IS '系統內建旗標（執行長 2026-06-18 拍板 B:true=系統內建、UI 可改名但不允許停用/刪、避免誤刪導致報價系統壞）。';
COMMENT ON COLUMN "nx01_customer_grade"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_customer_grade"."created_by" IS '建立人（必填；系統操作帶入使用者 ID;DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_customer_grade"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_customer_grade"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID;DB 匯入填系統管理員 ID）';

-- Nx01Department  →  nx01_department
COMMENT ON TABLE "nx01_department" IS '部門主檔（字典表）。';
COMMENT ON COLUMN "nx01_department"."id" IS '[NX01]+[DEPT]+[7碼流水號]，EX : NX01DEPT0000001';
COMMENT ON COLUMN "nx01_department"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx01_department"."code" IS '部門代碼（租戶內唯一），例：PRODUCT/SALES/WAREHOUSE。';
COMMENT ON COLUMN "nx01_department"."name" IS '部門名稱，例：產品部/業務部/倉管部。';
COMMENT ON COLUMN "nx01_department"."sort_no" IS '排序用。';
COMMENT ON COLUMN "nx01_department"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx01_department"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_department"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_department"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_department"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01DiscountCode  →  nx01_discount_code
COMMENT ON TABLE "nx01_discount_code" IS '折扣代碼主檔。';
COMMENT ON COLUMN "nx01_discount_code"."id" IS '[NX01]+[DISC]+[7碼流水號]，EX : NX01DISC0000001';
COMMENT ON COLUMN "nx01_discount_code"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_discount_code"."code" IS '折扣代碼（租戶內唯一），例：DEFECT/USED/VIP/BULK。';
COMMENT ON COLUMN "nx01_discount_code"."name" IS '折扣名稱（顯示用），例：瑕疵品折扣、中古件折扣。';
COMMENT ON COLUMN "nx01_discount_code"."discount_type" IS '折扣方式（P=折扣率%/A=折扣金額）。';
COMMENT ON COLUMN "nx01_discount_code"."discount_value" IS '折扣值（discount_type=P時為百分比如20.00表示打八折；A時為固定金額）。';
COMMENT ON COLUMN "nx01_discount_code"."managed_by" IS '管理角色（P=採購組長/S=銷售組長）。折扣代碼由採購組長管理。';
COMMENT ON COLUMN "nx01_discount_code"."remark" IS '備註說明。';
COMMENT ON COLUMN "nx01_discount_code"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx01_discount_code"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_discount_code"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_discount_code"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_discount_code"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01KpiRecord  →  nx01_kpi_record
COMMENT ON TABLE "nx01_kpi_record" IS 'KPI 實績紀錄——各期實際數值。';
COMMENT ON COLUMN "nx01_kpi_record"."id" IS '[NX01]+[KPIR]+[7碼流水號]，EX : NX01KPIR0000001';
COMMENT ON COLUMN "nx01_kpi_record"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx01_kpi_record"."kpi_template_id" IS 'KPI 指標範本ID（FK nx01_kpi_template）。';
COMMENT ON COLUMN "nx01_kpi_record"."kpi_target_id" IS '對應目標ID（FK nx01_kpi_target）。';
COMMENT ON COLUMN "nx01_kpi_record"."user_id" IS '使用者ID（FK nx01_user）。';
COMMENT ON COLUMN "nx01_kpi_record"."period_year" IS '記錄年度。';
COMMENT ON COLUMN "nx01_kpi_record"."period_value" IS '記錄期間值（月份/季/週）。';
COMMENT ON COLUMN "nx01_kpi_record"."actual_value" IS '實際達成值（系統自動計算）。';
COMMENT ON COLUMN "nx01_kpi_record"."target_value" IS '當期目標值快照。';
COMMENT ON COLUMN "nx01_kpi_record"."achievement_rate" IS '達成率（actual_value/target_value×100）。';
COMMENT ON COLUMN "nx01_kpi_record"."calc_at" IS '系統計算時間。';
COMMENT ON COLUMN "nx01_kpi_record"."created_at" IS '建立時間。';

-- Nx01KpiTarget  →  nx01_kpi_target
COMMENT ON TABLE "nx01_kpi_target" IS 'KPI 目標值——各期目標設定。';
COMMENT ON COLUMN "nx01_kpi_target"."id" IS '[NX01]+[KPIG]+[7碼流水號]，EX : NX01KPIG0000001';
COMMENT ON COLUMN "nx01_kpi_target"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx01_kpi_target"."kpi_template_id" IS 'KPI 指標範本ID（FK nx01_kpi_template）。';
COMMENT ON COLUMN "nx01_kpi_target"."target_type" IS '目標層級（R=角色/U=個人）。個人目標優先於角色目標。';
COMMENT ON COLUMN "nx01_kpi_target"."role_id" IS '角色ID（target_type=R時填入，FK nx01_role）。';
COMMENT ON COLUMN "nx01_kpi_target"."user_id" IS '使用者ID（target_type=U時填入，覆蓋角色目標，FK nx01_user）。';
COMMENT ON COLUMN "nx01_kpi_target"."period_year" IS '目標年度，例：2026。';
COMMENT ON COLUMN "nx01_kpi_target"."period_value" IS '目標期間值（月份1-12/季1-4/週1-53，日與年可空）。';
COMMENT ON COLUMN "nx01_kpi_target"."target_value" IS '目標值。';
COMMENT ON COLUMN "nx01_kpi_target"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_kpi_target"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_kpi_target"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_kpi_target"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01KpiTemplate  →  nx01_kpi_template
COMMENT ON TABLE "nx01_kpi_template" IS 'KPI 指標範本——指標定義。';
COMMENT ON COLUMN "nx01_kpi_template"."id" IS '[NX01]+[KPIT]+[7碼流水號]，EX : NX01KPIT0000001';
COMMENT ON COLUMN "nx01_kpi_template"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx01_kpi_template"."code" IS 'KPI 指標代碼（系統預設不可修改），例：SALES_AMOUNT/PICK_AVG_TIME。';
COMMENT ON COLUMN "nx01_kpi_template"."name" IS 'KPI 指標名稱，例：月銷售金額/撿貨平均時間。';
COMMENT ON COLUMN "nx01_kpi_template"."applicable_role_code" IS '適用角色代碼（SALES/WAREHOUSE/DRIVER等）。';
COMMENT ON COLUMN "nx01_kpi_template"."source_module" IS '資料來源模組（NX01/NX02/NX03/NX04/NX07）。';
COMMENT ON COLUMN "nx01_kpi_template"."source_table" IS '資料來源表格，例：nx03_so/nx02_pk。';
COMMENT ON COLUMN "nx01_kpi_template"."source_field" IS '計算欄位，例：total_amount/duration_seconds。';
COMMENT ON COLUMN "nx01_kpi_template"."calc_method" IS '計算方式（SUM=加總/AVG=平均/COUNT=計數/MAX=最大/MIN=最小/RATE=比率）。';
COMMENT ON COLUMN "nx01_kpi_template"."period_type" IS '週期類型（D=日/W=週/M=月/Q=季/Y=年）。';
COMMENT ON COLUMN "nx01_kpi_template"."target_direction" IS '目標方向（GTE=大於等於目標/LTE=小於等於目標）。';
COMMENT ON COLUMN "nx01_kpi_template"."unit" IS '單位，例：元/筆/分鐘/%。';
COMMENT ON COLUMN "nx01_kpi_template"."is_system" IS '是否系統預設指標（TRUE=系統預設不可刪除）。';
COMMENT ON COLUMN "nx01_kpi_template"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx01_kpi_template"."sort_no" IS '排序用。';
COMMENT ON COLUMN "nx01_kpi_template"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_kpi_template"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_kpi_template"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_kpi_template"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01Location  →  nx01_location
COMMENT ON TABLE "nx01_location" IS '儲位主檔——倉庫內細分儲位。';
COMMENT ON COLUMN "nx01_location"."id" IS '[NX01]+[LOCA]+[7碼流水號]，EX : NX01LOCA0000001';
COMMENT ON COLUMN "nx01_location"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_location"."warehouse_id" IS '所屬倉庫 ID';
COMMENT ON COLUMN "nx01_location"."site_id" IS '所屬據點 ID（FK nx01_site；庫位歸屬之據點，預設同所屬倉庫之據點）';
COMMENT ON COLUMN "nx01_location"."zone_id" IS '所屬倉庫分區 ID（FK nx01_warehouse_zone、執行長 2026-06-22 拍板新增四層架構） migration 階段每倉預建一個 "Z00 主區"、現有 location 全部關連到該預設 zone';
COMMENT ON COLUMN "nx01_location"."rack_id" IS '所屬貨架 ID（FK nx01_warehouse_rack、2026-06-28 五層架構第四層 區域→貨架→庫位） migration 階段每區域預建一個 "R00 主架"、現有 location 全部關連到該預設 rack';
COMMENT ON COLUMN "nx01_location"."code" IS '庫位代碼（倉內唯一），例：A-01-01、B2-03';
COMMENT ON COLUMN "nx01_location"."name" IS '庫位名稱（選填），例：靠門口、二樓左側';
COMMENT ON COLUMN "nx01_location"."zone" IS '區域字串（DEPRECATED：2026-06-22 改用 zoneId FK；保留欄位讓既有讀取相容、新寫入請填 zoneId）';
COMMENT ON COLUMN "nx01_location"."rack" IS '架號（選填），例：R01';
COMMENT ON COLUMN "nx01_location"."level_no" IS '層（選填），例：1、2、3';
COMMENT ON COLUMN "nx01_location"."bin_no" IS '格（選填），例：01、02';
COMMENT ON COLUMN "nx01_location"."remark" IS '備註（選填）';
COMMENT ON COLUMN "nx01_location"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_location"."is_active" IS '是否啟用（停用不刪資料）';
COMMENT ON COLUMN "nx01_location"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_location"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_location"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_location"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01Site  →  nx01_site
COMMENT ON TABLE "nx01_site" IS '站點／門市主檔——營運據點。';
COMMENT ON COLUMN "nx01_site"."id" IS '[NX01]+[SITE]+[7碼流水號]，EX : NX01SITE0000001';
COMMENT ON COLUMN "nx01_site"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_site"."code" IS '據點代碼（租戶內唯一），例：HQ、TPE、TXG';
COMMENT ON COLUMN "nx01_site"."name" IS '據點名稱，例：總公司、台北據點、台中據點';
COMMENT ON COLUMN "nx01_site"."address" IS '地址（legacy 自由文字、#23 並存：結構化地址 picker 接上前沿用）';
COMMENT ON COLUMN "nx01_site"."city_id" IS '縣市 ID（FK nx01_city、結構化地址、對齊倉庫範式；scalar 並存、待 NX01-04 地址端點接 picker）';
COMMENT ON COLUMN "nx01_site"."district_id" IS '鄉鎮市區 ID（FK nx01_district、同上）';
COMMENT ON COLUMN "nx01_site"."street_id" IS '路街 ID（FK nx01_street、同上）';
COMMENT ON COLUMN "nx01_site"."phone" IS '聯絡電話（選填）';
COMMENT ON COLUMN "nx01_site"."is_main" IS '是否主據點（同 tenant 只 1 筆 is_main=true、partial unique 強制、對齊倉庫 isMain 範式）';
COMMENT ON COLUMN "nx01_site"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_site"."is_active" IS '是否啟用（停用不刪資料）';
COMMENT ON COLUMN "nx01_site"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_site"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_site"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_site"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01Part  →  nx01_part
COMMENT ON TABLE "nx01_part" IS '零件主檔——料號核心（內碼／基準／廠牌三種料號、分類三維）。';
COMMENT ON COLUMN "nx01_part"."id" IS '[NX01]+[PART]+[7碼流水號]，EX : NX01PART0000001';
COMMENT ON COLUMN "nx01_part"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_part"."code" IS '基準料號（客戶自訂、純手動輸入、必填、開放修改；2026-06-26 分段編碼規則已廢）';
COMMENT ON COLUMN "nx01_part"."name" IS '零件名稱/品名（例：機油濾芯）';
COMMENT ON COLUMN "nx01_part"."name_en" IS '英文品名（恆迎舊系統 col5 英文品名；2026-06-29 新增、選填）';
COMMENT ON COLUMN "nx01_part"."is_oem" IS '是否為正廠件';
COMMENT ON COLUMN "nx01_part"."sec_code" IS '廠牌料號（記「該廠牌對這料件的料號」、可能原廠可能副廠；2026-06-26 改必填 NOT NULL：基準料號+廠牌料號皆必填）。';
COMMENT ON COLUMN "nx01_part"."cost" IS '成本（業務員填、價格重算基準、下半場 B）';
COMMENT ON COLUMN "nx01_part"."country_id" IS '產地 (外鍵)';
COMMENT ON COLUMN "nx01_part"."brand_id" IS '品牌 ID（FK nx01_brand、可空 = 部分料號尚未補齊） W6 [3-8] Phase 5 2026-06-06 品牌合併：取代舊 partBrandId';
COMMENT ON COLUMN "nx01_part"."type" IS '零件類型 (1=專用型 / 2=通用型 / 3=組合型 / 4=拆解型、軸 1 升 SmallInt、對齊 NX01-14/15 範式)';
COMMENT ON COLUMN "nx01_part"."part_group_id" IS '零件種類 id (外鍵、分類三＝客戶自定義群組)';
COMMENT ON COLUMN "nx01_part"."purchase_category" IS '分類一・採購角度（選填、寫死 SmallInt：1=保養件 / 2=維修件 / 3=事故件 / 4=改裝件 / 5=油品耗材；2026-06-26 新增）';
COMMENT ON COLUMN "nx01_part"."tech_category" IS '分類二・技術角度（選填、寫死 SmallInt：1=引擎動力 / 2=傳動 / 3=制動 / 4=轉向 / 5=懸吊底盤 / 6=電氣電子 / 7=冷卻空調 / 8=車體內外裝 / 9=安全輔助；2026-06-26 新增）';
COMMENT ON COLUMN "nx01_part"."spec" IS '規格/備註（例：MANN / 含墊片 / 06L…適用）';
COMMENT ON COLUMN "nx01_part"."import_remark" IS '匯入原始備註（恆迎舊系統 col39 備註1 原文整段保留；藏改版鏈「>」/通用「/」/雜項說明、 供之後解析表5零件通用·表6零件改版的來源；2026-06-29 新增、選填）';
COMMENT ON COLUMN "nx01_part"."uom" IS '單位（LITE 固定單位即可；未來再做多單位換算）';
COMMENT ON COLUMN "nx01_part"."is_active" IS '是否啟用（下架不刪資料）';
COMMENT ON COLUMN "nx01_part"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_part"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_part"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_part"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_part"."return_policy" IS '退貨政策（02 第三批 T3 2026-06-07 簡化三選項：N=不可退不保固 / S=未使用可退 / W=走保固流程）。 舊 5 值（F=自由退貨 / R=限制退貨）保留兼容歷史資料、UI 不再顯示。 搭配 warranty_months：W 走保固流程時、進貨驗收依此計算保固到期日。實際退貨運作邏輯留 NX04/NX05。';
COMMENT ON COLUMN "nx01_part"."warranty_months" IS '保固月數，0=不保固。進貨驗收時系統依此計算保固到期日（warranty_expired_at）並寫入進貨明細。';
COMMENT ON COLUMN "nx01_part"."price_a" IS 'A 級建議售價（最優客戶，由採購組長在產品分析設定）。';
COMMENT ON COLUMN "nx01_part"."price_b" IS 'B 級建議售價（由採購組長在產品分析設定）。';
COMMENT ON COLUMN "nx01_part"."price_c" IS 'C 級建議售價（由採購組長在產品分析設定）。';
COMMENT ON COLUMN "nx01_part"."price_d" IS 'D 級建議售價（一般客戶，由採購組長在產品分析設定）。';
COMMENT ON COLUMN "nx01_part"."price_updated_at" IS '建議售價最後更新時間。';
COMMENT ON COLUMN "nx01_part"."price_updated_by" IS '建議售價最後更新人（採購組長，使用者ID）。';
COMMENT ON COLUMN "nx01_part"."last_purchase_at" IS '最後進貨時間（驗收入庫過帳時自動寫、取單據業務日期 inboundDate；02 第四批 軌 3b 2026-06-07 新增） 業務員業績指標：看「最後一次進貨」是何時、判斷補貨節奏。 寫入點：Nx03Inbound 從 INSPECTING → POSTED 時、applyInboundPosting 內 ledger 寫完後更新（取 max 防舊單覆蓋新單）。';
COMMENT ON COLUMN "nx01_part"."last_sale_at" IS '最後銷售時間（出貨過帳時自動寫、取單據業務日期 outboundDate；02 第四批 軌 3b 2026-06-07 新增） 業務員業績指標：看「最後一次賣出」是何時、判斷滯銷風險。 寫入點：Nx03Outbound 從 PACKED → SHIPPED 時、applyOutboundShipping 內 ledger 寫完後更新（取 max 防舊單覆蓋新單）。';
COMMENT ON COLUMN "nx01_part"."shelf_life_months" IS '建議保存期限（月、選填、可覆寫族群 default、空=取族群預設）；02 第四批 軌 6 2026-06-07 新增 繼承+覆寫範式同客戶分級加成率 + Partner.customMarginPct： - 新增零件選 partGroup 時、若此欄空、UI/API 帶入族群 defaultShelfLifeMonths（前端預填） - 業務員可手改此欄（不動族群）；effective = COALESCE(part.shelfLifeMonths, partGroup.defaultShelfLifeMonths)';

-- Nx01PartOemCode  →  nx01_part_oem_code
COMMENT ON TABLE "nx01_part_oem_code" IS '一筆零件可對應多筆正廠料號（給業務員核對替代品；零件搜尋同時 match）。';
COMMENT ON COLUMN "nx01_part_oem_code"."id" IS '[NX01]+[POEM]+[7碼流水號]';
COMMENT ON COLUMN "nx01_part_oem_code"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_part_oem_code"."part_id" IS '所屬零件 ID（FK nx01_part，刪零件連帶刪）';
COMMENT ON COLUMN "nx01_part_oem_code"."brand_id" IS '對應品牌 ID（FK nx01_brand） W6 [3-8] Phase 5 2026-06-06 品牌合併：取代舊 partBrandId';
COMMENT ON COLUMN "nx01_part_oem_code"."oem_code" IS '正廠料號（文字）';
COMMENT ON COLUMN "nx01_part_oem_code"."remark" IS '備註（如「Golf 7 用」「3 系列用」）';
COMMENT ON COLUMN "nx01_part_oem_code"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_part_oem_code"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_part_oem_code"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_part_oem_code"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_part_oem_code"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01PartPhoto  →  nx01_part_photo
COMMENT ON TABLE "nx01_part_photo" IS '零件照片子表：每顆 part 最多 5 張、sortNo=0 為主圖。 storageKey 由 FileUploadService 產（{tenantId}/part-photo/{yyyy}/{mm}/{uuid}{ext}）。 dev 用 local filesystem、production 後續可換 R2 / S3 不動 caller。';
COMMENT ON COLUMN "nx01_part_photo"."id" IS '主鍵 ID（系統產生）';
COMMENT ON COLUMN "nx01_part_photo"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_part_photo"."part_id" IS '零件 ID（FK nx01_part）';
COMMENT ON COLUMN "nx01_part_photo"."storage_key" IS 'FileUploadService 產的 storage key（{tenantId}/part-photo/{yyyy}/{mm}/{uuid}{ext}）';
COMMENT ON COLUMN "nx01_part_photo"."mime_type" IS '檔案 MIME 類型';
COMMENT ON COLUMN "nx01_part_photo"."file_size" IS '檔案大小（bytes）';
COMMENT ON COLUMN "nx01_part_photo"."orig_filename" IS '原始檔名';
COMMENT ON COLUMN "nx01_part_photo"."sort_no" IS '排序：sortNo=0 為主圖、其他依數字遞增；同 part 內可重排';
COMMENT ON COLUMN "nx01_part_photo"."uploader_user_id" IS '上傳者 ID（FK nx01_user）';
COMMENT ON COLUMN "nx01_part_photo"."created_at" IS '建立時間';

-- Nx01PartBarcode  →  nx01_part_barcode
COMMENT ON TABLE "nx01_part_barcode" IS '零件條碼對照（偉盟 P2 2.6 2026-07-11、參考偉盟 BANO 一料多條碼＋預設旗標） 用途：掃碼工作站 條碼→料號 解析（同租戶條碼唯一）、標籤列印預設條碼';
COMMENT ON COLUMN "nx01_part_barcode"."id" IS '[NX01]+[PBAR]+[7碼流水號]，EX : NX01PBAR0000001';
COMMENT ON COLUMN "nx01_part_barcode"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_part_barcode"."part_id" IS '零件 ID（外鍵）';
COMMENT ON COLUMN "nx01_part_barcode"."barcode" IS '條碼內容（EAN/Code128/QR 皆存原字串、掃碼比對用；同租戶唯一）';
COMMENT ON COLUMN "nx01_part_barcode"."is_default" IS '預設條碼（標籤列印預設用；同 part 至多一條 true、application 自律）';
COMMENT ON COLUMN "nx01_part_barcode"."remark" IS '備註（例：原廠盒條碼 / 自印標籤）';
COMMENT ON COLUMN "nx01_part_barcode"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_part_barcode"."created_by" IS '建立人（必填；系統操作帶入使用者 ID）';

-- Nx01PartGroup  →  nx01_part_group
COMMENT ON TABLE "nx01_part_group" IS '零件自訂群組主檔——客戶自訂的料號分群（偉盟匯入 18912 群），非車型、非分類。';
COMMENT ON COLUMN "nx01_part_group"."id" IS '[NX01]+[PAGR]+[7碼流水號]，EX : NX01PAGR0000001';
COMMENT ON COLUMN "nx01_part_group"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_part_group"."code" IS '族群代碼（唯一）';
COMMENT ON COLUMN "nx01_part_group"."name" IS '族群名稱（使用者自訂）';
COMMENT ON COLUMN "nx01_part_group"."default_shelf_life_months" IS '預設建議保存期限（月、選填）；02 第四批 軌 6 2026-06-07 新增 新增零件選此族群時、Part.shelfLifeMonths 預設帶入此值、業務員可覆寫（範式同 CustomerGrade.marginPct + Partner.customMarginPct）。';
COMMENT ON COLUMN "nx01_part_group"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_part_group"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_part_group"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_part_group"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_part_group"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_part_group"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01PartRelation  →  nx01_part_relation
COMMENT ON TABLE "nx01_part_relation" IS '零件關聯——替代料／相關料關係。';
COMMENT ON COLUMN "nx01_part_relation"."id" IS '[NX01]+[PARE]+[7碼流水號]，EX : NX01PARE0000001';
COMMENT ON COLUMN "nx01_part_relation"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_part_relation"."part_id_from" IS '來源零件 ID (外鍵)';
COMMENT ON COLUMN "nx01_part_relation"."part_id_to" IS '目標零件 ID (外鍵)';
COMMENT ON COLUMN "nx01_part_relation"."relation_type" IS '關係類型 (1=改號 / 2=同款 / 3=改版換周邊 / 4=組合包 / 5=拆解包、軸 1 升 SmallInt、對齊 NX01-14/15 範式)';
COMMENT ON COLUMN "nx01_part_relation"."remark" IS '備註';
COMMENT ON COLUMN "nx01_part_relation"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_part_relation"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_part_relation"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_part_relation"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_part_relation"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_part_relation"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01Partner  →  nx01_partner
COMMENT ON TABLE "nx01_partner" IS '往來對象主檔——客戶／同行／供應商／外包物流／銀行／一般廠商六分類。';
COMMENT ON COLUMN "nx01_partner"."id" IS '[NX01]+[PTNR]+[7碼流水號]，EX : NX01PTNR0000001';
COMMENT ON COLUMN "nx01_partner"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_partner"."code" IS '交易對象代碼（唯一），例：C0001、S0003、BP0008';
COMMENT ON COLUMN "nx01_partner"."name" IS '交易對象名稱（公司名/店名/個人名）';
COMMENT ON COLUMN "nx01_partner"."partner_type" IS '角色類型六分類：C=保養廠（純買方、ABCD 定價、應收）/ O=同行（雙向買+調貨、ABCD 定價、應收+應付軋帳、預設 canTransferStock=true）/ S=供應商（純賣方正規來源、採購比價/補貨對象、應付）/ T=外包物流 / B=銀行 / V=一般廠商。Application 層 enum、不在 DB 強制（Crown Q-PP-2=a）';
COMMENT ON COLUMN "nx01_partner"."can_transfer_stock" IS '可調貨旗標。partner_type=O 同行業務上預設 true（service 層 create 時帶入）；partner_type=C 保養廠預設 false、少數保養廠偶爾調貨時可手動開啟。調貨對象篩選 = WHERE partner_type=''O'' OR canTransferStock=true。對齊 can_* 範式';
COMMENT ON COLUMN "nx01_partner"."is_cash_customer" IS '現金客戶標記（帳戶閘門規格 v1.2、2026-07-21 拍板）：無統編的具名客戶標記後可銷售、不開收款帳戶不掛應收、交易走現金。閘門放行三擇一：R 帳戶／散客 L／本旗標';
COMMENT ON COLUMN "nx01_partner"."contact_name" IS '聯絡人（可空、主要單一聯絡人；多窗口走 nx01_partner_contact 子表）';
COMMENT ON COLUMN "nx01_partner"."owner_name" IS '對方公司負責人姓名（與本公司業務歸屬 sales_user_id 不同）；02 第三批 T2 2026-06-07 新增、';
COMMENT ON COLUMN "nx01_partner"."phone" IS '電話（可空）';
COMMENT ON COLUMN "nx01_partner"."mobile" IS '手機（可空）';
COMMENT ON COLUMN "nx01_partner"."email" IS 'Email（可空）';
COMMENT ON COLUMN "nx01_partner"."country_id" IS '國別 FK（null 視為 TW 預設）；02 對齊第二批 A 軌 CP2 2026-06-06 新增';
COMMENT ON COLUMN "nx01_partner"."remark" IS '備註（例：習慣月結、送貨時間、黑名單原因等）';
COMMENT ON COLUMN "nx01_partner"."is_active" IS '是否啟用（停用後不可再開單）';
COMMENT ON COLUMN "nx01_partner"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_partner"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_partner"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_partner"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_partner"."legacy_code" IS '舊系統往來對象代號（純對照、不綁 FK、對齊零件 oldCode 範式）；W3 [3-2] 2026-06-06 新增';
COMMENT ON COLUMN "nx01_partner"."default_invoice_copies" IS '預設發票聯式（0=不開發票 / 2=二聯 / 3=三聯）。SO 建單自動帶入、可逐筆改。散客 L 強制 2、不可改。；W4 [3-6] 2026-06-06 新增 2026-07-10 註解訂正：0=不開發票 早已實作（DTO+UI）、偉盟 BCTXP 印證過半客戶免開票（偉盟設計檢視 P1-3）';
COMMENT ON COLUMN "nx01_partner"."region_id" IS '地區 ID（FK nx01_region、顯示用、不入 partner code 編號）；02 對齊第二批 C 軌 CP1 2026-06-06 新增';
COMMENT ON COLUMN "nx01_partner"."parent_partner_id" IS '總公司 ID（self-FK、連鎖母子關係、null=自己就是總公司或無總公司）；02 對齊第二批 C 軌 CP1 2026-06-06 新增';
COMMENT ON COLUMN "nx01_partner"."custom_margin_pct" IS '個別客戶毛利率覆寫（覆寫 customer_grade.margin_pct、業務口語「個別折數」）；02 對齊第二批 C 軌 CP1 2026-06-06 新增';
COMMENT ON COLUMN "nx01_partner"."tax_id" IS '統一編號（開立發票用，客戶與廠商均可填寫，選填）。';
COMMENT ON COLUMN "nx01_partner"."invoice_title" IS '發票抬頭（可異於客戶名稱、開發票用；空=用 name）。偉盟 BCINT 印證常態需求（92% 有值、常異於客戶名）。 2026-07-10 執行長拍板（偉盟設計檢視 P1-2）';
COMMENT ON COLUMN "nx01_partner"."statement_day" IS '每月結帳日（1~31、31=月底慣例；null=未設定）。台灣月結請款文化（偉盟 BCEDT 印證）；對帳單/請款循環用。 2026-07-10 執行長拍板（偉盟設計檢視 P1-4）';
COMMENT ON COLUMN "nx01_partner"."payment_term_domestic" IS '國內付款條件（PREPAY=先付款/NET30=月結30天/NET60=月結60天/NET90=月結90天）。影響國內採購AP/AR到期日計算。建立採購單時自動帶入，可手動覆蓋。';
COMMENT ON COLUMN "nx01_partner"."customer_grade_id" IS '客戶等級ID（FK nx01_customer_grade），供報價單定價邏輯使用。partner_type IN (''C'', ''O'') 通用（保養廠+同行都走 ABCD 定價、業界 muscle memory：同行看交情/量、保養廠看消費力）。';
COMMENT ON COLUMN "nx01_partner"."supplier_grade_id" IS '供應商等級ID（FK nx01_supplier_grade），採購視角、partner_type=''S'' 純供應商用。LITE 階段 1 手動指派為主（初期數據累積後再補自動算：付款條件→信用紀錄→不良率）。';
COMMENT ON COLUMN "nx01_partner"."credit_limit" IS '信用額度（客戶用），0=不限制。已用額度超過80%警示，超過100%通知負責人。負責人可設定口頭警告/僅收現金/凍結三種處置方式。';
COMMENT ON COLUMN "nx01_partner"."credit_status" IS '信用狀態（N=正常/W=僅收現金/F=凍結）。凍結時業務無法建立新SO，系統直接擋單。由負責人設定。';
COMMENT ON COLUMN "nx01_partner"."payment_term_import" IS '進口付款條件預設值（TT=電匯T/T/LC=信用狀L/C/DP=付款交單D/P/DA=承兌交單D/A）。建立進口採購單時自動帶入，可手動覆蓋。';
COMMENT ON COLUMN "nx01_partner"."incoterm" IS '貿易條件預設值（FOB/CIF/EXW/DDP等），建立進口採購單時自動帶入作為預設，可於採購單層級手動覆蓋。影響進口費用攤分的必填欄位判斷。';
COMMENT ON COLUMN "nx01_partner"."short_name" IS '公司簡稱（精簡顯示用、注音索引欄位之一）';
COMMENT ON COLUMN "nx01_partner"."name_en" IS '公司英文名（國際 / 進口場景顯示）';
COMMENT ON COLUMN "nx01_partner"."fax" IS '傳真號（業界仍有使用、補對齊既有 mobile）';
COMMENT ON COLUMN "nx01_partner"."website" IS '公司官網 URL';
COMMENT ON COLUMN "nx01_partner"."service_location" IS '負責據點（業務分區 / 區域代碼）';
COMMENT ON COLUMN "nx01_partner"."sales_user_id" IS '業務歸屬使用者 ID（FK nx01_user、業務離職時 SET NULL、5 種 partner_type 通用）';
COMMENT ON COLUMN "nx01_partner"."default_currency_id" IS '預設交易幣別 ID（FK nx01_currency、ON DELETE RESTRICT 幣別不可刪）';
COMMENT ON COLUMN "nx01_partner"."default_warehouse_id" IS '客戶預設取貨據點（FK nx01_warehouse、ON DELETE SET NULL、業界 muscle memory：客戶習慣取貨倉、SO 建單自動帶入、無庫存自動 NX03 ST 調撥）。NX04-IMPL-01 Phase 1 M1 新增。';
COMMENT ON COLUMN "nx01_partner"."default_delivery_type" IS '預設取貨方式（值域同 nx04_so.delivery_type：D=配送/P=自取/C=寄貨；null=未設定）。F2 報價工作台客戶基本資料顯示用。2026-07-12 執行長定案（F2-TUNING 定案 1）新增。';

-- Nx01Role  →  nx01_role
COMMENT ON TABLE "nx01_role" IS '角色主檔（RBAC）。';
COMMENT ON COLUMN "nx01_role"."id" IS '[NX01]+[ROLE]+[7碼流水號]，EX : NX01ROLE0000001';
COMMENT ON COLUMN "nx01_role"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_role"."code" IS '角色代碼（唯一），例：ADMIN、SALES、WH、OWNER';
COMMENT ON COLUMN "nx01_role"."name" IS '角色名稱（顯示用），例：管理者、業務、倉管';
COMMENT ON COLUMN "nx01_role"."description" IS '角色說明（可選）';
COMMENT ON COLUMN "nx01_role"."level" IS '職務層級（如 G1-G5、總經理/經理/組長/員工、業務命名彈性、純文字）；02 第三批 T1 2026-06-07 新增、';
COMMENT ON COLUMN "nx01_role"."department_id" IS '隸屬部門 ID（FK nx01_department、職務歸屬部門）；02 第三批 T1 2026-06-07 新增、 2026-06-24 執行長拍板「職務硬綁組別」後保留作冗餘衍生欄、由 service 從 teamId 自動帶入';
COMMENT ON COLUMN "nx01_role"."team_id" IS '隸屬組別 ID（FK nx01_team、組織架構四層 部門→組別→職務→成員 的第三層） 2026-06-24 執行長拍板：業務職務必填、isSystem=true 系統角色（SYSADMIN/OWNER 等跨部門）豁免可空 各組別個別建職務（如：台北組業務員、新莊組業務員為不同筆）';
COMMENT ON COLUMN "nx01_role"."is_system" IS '是否系統內建角色（內建可限制刪除/改代碼）';
COMMENT ON COLUMN "nx01_role"."is_active" IS '是否啟用（停用後不可再指派）';
COMMENT ON COLUMN "nx01_role"."sort_no" IS '排序用（清單顯示順序）';
COMMENT ON COLUMN "nx01_role"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_role"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_role"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_role"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01PermissionLevel  →  nx01_permission_level
COMMENT ON TABLE "nx01_permission_level" IS '權限等級（RBAC 載體）；2026-06-28 職務↔權限拆分軌 Step1（加性、不動現有 role） role 留作純職務、權限改掛此表；一人一等級（nx01_user.permission_level_id）';
COMMENT ON COLUMN "nx01_permission_level"."id" IS '[NX01]+[PMLV]+[7碼流水號]，EX : NX01PMLV0000001';
COMMENT ON COLUMN "nx01_permission_level"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_permission_level"."code" IS '權限等級代碼（唯一），例：S（全權限內建）、A、B…';
COMMENT ON COLUMN "nx01_permission_level"."name" IS '權限等級名稱（顯示用）';
COMMENT ON COLUMN "nx01_permission_level"."description" IS '說明（可選）';
COMMENT ON COLUMN "nx01_permission_level"."is_system" IS '是否系統內建（S 全權限內建、鎖定不可刪改代碼）';
COMMENT ON COLUMN "nx01_permission_level"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_permission_level"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_permission_level"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_permission_level"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_permission_level"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_permission_level"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01PermissionLevelPermission  →  nx01_permission_level_permission
COMMENT ON TABLE "nx01_permission_level_permission" IS '權限等級 × 細權限目錄（m-n）；2026-06-28 拆分軌 Step2（加性、對應 role_permission）';
COMMENT ON COLUMN "nx01_permission_level_permission"."id" IS '[NX01]+[PLPM]+[7碼流水號]';
COMMENT ON COLUMN "nx01_permission_level_permission"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_permission_level_permission"."permission_level_id" IS '權限等級 ID（FK nx01_permission_level）';
COMMENT ON COLUMN "nx01_permission_level_permission"."permission_id" IS '權限 ID（FK nx01_permission）';
COMMENT ON COLUMN "nx01_permission_level_permission"."granted_at" IS '授予時間';
COMMENT ON COLUMN "nx01_permission_level_permission"."granted_by" IS '授予人員（FK nx01_user）';

-- Nx01PermissionLevelView  →  nx01_permission_level_view
COMMENT ON TABLE "nx01_permission_level_view" IS '權限等級 × 畫面（m-n + 6 動作旗標）；2026-06-28 拆分軌 Step2（加性、對應 role_view）';
COMMENT ON COLUMN "nx01_permission_level_view"."id" IS '[NX01]+[PLVW]+[7碼流水號]';
COMMENT ON COLUMN "nx01_permission_level_view"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_permission_level_view"."permission_level_id" IS '權限等級 ID（FK nx01_permission_level）';
COMMENT ON COLUMN "nx01_permission_level_view"."view_id" IS '功能頁 ID（FK nx01_view）';
COMMENT ON COLUMN "nx01_permission_level_view"."can_read" IS '權限：可檢視';
COMMENT ON COLUMN "nx01_permission_level_view"."can_create" IS '權限：可新增';
COMMENT ON COLUMN "nx01_permission_level_view"."can_update" IS '權限：可修改';
COMMENT ON COLUMN "nx01_permission_level_view"."can_delete" IS '權限：可刪除（停用）';
COMMENT ON COLUMN "nx01_permission_level_view"."can_export" IS '權限：可匯出';
COMMENT ON COLUMN "nx01_permission_level_view"."can_approve" IS '權限：可審核';
COMMENT ON COLUMN "nx01_permission_level_view"."is_active" IS '是否啟用（軟刪除旗標：false=已停用，系統不做實體刪除）';
COMMENT ON COLUMN "nx01_permission_level_view"."granted_at" IS '授予時間';
COMMENT ON COLUMN "nx01_permission_level_view"."granted_by" IS '授予人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_permission_level_view"."revoked_at" IS '撤銷時間';
COMMENT ON COLUMN "nx01_permission_level_view"."revoked_by" IS '撤銷人員（FK nx01_user）';

-- Nx01RoleView  →  nx01_role_view
COMMENT ON TABLE "nx01_role_view" IS '角色—功能頁授權對應。';
COMMENT ON COLUMN "nx01_role_view"."id" IS '[NX01]+[ROVI]+[7碼流水號]，EX : NX01ROVI0000001';
COMMENT ON COLUMN "nx01_role_view"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_role_view"."role_id" IS '使用者 ID（外鍵）。';
COMMENT ON COLUMN "nx01_role_view"."view_id" IS '角色 ID（外鍵）。';
COMMENT ON COLUMN "nx01_role_view"."can_read" IS '是否可讀取/進入此畫面';
COMMENT ON COLUMN "nx01_role_view"."can_create" IS '是否可新增';
COMMENT ON COLUMN "nx01_role_view"."can_update" IS '是否可編輯';
COMMENT ON COLUMN "nx01_role_view"."can_delete" IS '是否可刪除';
COMMENT ON COLUMN "nx01_role_view"."can_export" IS '是否可匯出（CSV/Excel/PDF 等）';
COMMENT ON COLUMN "nx01_role_view"."is_active" IS '是否啟用（停用不刪資料）';
COMMENT ON COLUMN "nx01_role_view"."granted_at" IS '授權時間';
COMMENT ON COLUMN "nx01_role_view"."granted_by" IS '授權人（對應使用者 ID）';
COMMENT ON COLUMN "nx01_role_view"."revoked_at" IS '撤銷時間（撤銷才填）';
COMMENT ON COLUMN "nx01_role_view"."revoked_by" IS '撤銷人（對應使用者 ID）';
COMMENT ON COLUMN "nx01_role_view"."can_approve" IS '是否有審核權限（核准/退件）。組長角色通常為TRUE。';

-- Nx01Permission  →  nx01_permission
COMMENT ON TABLE "nx01_permission" IS 'v1.2 對齊軌 A+B：系統權限目錄（無 tenant scope、所有租戶共用）';
COMMENT ON COLUMN "nx01_permission"."id" IS '[NX01]+[PERM]+[7碼流水號]，EX : NX01PERM0000001';
COMMENT ON COLUMN "nx01_permission"."code" IS '權限代碼（系統唯一），例：sale.quote.list';
COMMENT ON COLUMN "nx01_permission"."module_code" IS '模組分類，例：sale / purchase / inventory / finance / report / master / settings';
COMMENT ON COLUMN "nx01_permission"."category" IS '子分類，例：quote / so / sr / rfq / po';
COMMENT ON COLUMN "nx01_permission"."action" IS '動作，例：list / view / create / edit / delete / approve / post / export';
COMMENT ON COLUMN "nx01_permission"."name" IS '顯示名稱，例：報價單.檢視';
COMMENT ON COLUMN "nx01_permission"."description" IS '說明（可選）';
COMMENT ON COLUMN "nx01_permission"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_permission"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_permission"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_permission"."updated_at" IS '最後更新時間';

-- Nx01RolePermission  →  nx01_role_permission
COMMENT ON TABLE "nx01_role_permission" IS 'v1.2 對齊軌 A+B：角色 × 權限 m-n（per tenant）';
COMMENT ON COLUMN "nx01_role_permission"."id" IS '[NX01]+[ROPE]+[7碼流水號]，EX : NX01ROPE0000001';
COMMENT ON COLUMN "nx01_role_permission"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_role_permission"."role_id" IS '角色 ID（外鍵）';
COMMENT ON COLUMN "nx01_role_permission"."permission_id" IS '權限 ID（外鍵）';
COMMENT ON COLUMN "nx01_role_permission"."granted_at" IS '授權時間';
COMMENT ON COLUMN "nx01_role_permission"."granted_by" IS '授權人（使用者 ID）';

-- Nx01Team  →  nx01_team
COMMENT ON TABLE "nx01_team" IS '團隊／群組主檔。';
COMMENT ON COLUMN "nx01_team"."id" IS '[NX01]+[TEAM]+[7碼流水號]，EX : NX01TEAM0000001';
COMMENT ON COLUMN "nx01_team"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx01_team"."department_id" IS '所屬部門ID（FK nx01_department）。';
COMMENT ON COLUMN "nx01_team"."parent_team_id" IS '父層組別ID（自我關聯，NULL表示第一層組別）。支援無限層級，預設兩層。';
COMMENT ON COLUMN "nx01_team"."code" IS '組別代碼（租戶內唯一），例：TAIPEI/XINZHUANG。';
COMMENT ON COLUMN "nx01_team"."name" IS '組別名稱，例：台北組/新莊組。';
COMMENT ON COLUMN "nx01_team"."warehouse_id" IS '關聯倉庫ID（倉管組別填入，FK nx01_warehouse）。';
COMMENT ON COLUMN "nx01_team"."sort_no" IS '排序用。';
COMMENT ON COLUMN "nx01_team"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx01_team"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_team"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_team"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_team"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01User  →  nx01_user
COMMENT ON TABLE "nx01_user" IS '使用者主檔——員工帳號。';
COMMENT ON COLUMN "nx01_user"."id" IS '[NX01]+[USER]+[7碼流水號]，EX : NX01USER0000001';
COMMENT ON COLUMN "nx01_user"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_user"."employee_id" IS '員工主檔 ID（外鍵）';
COMMENT ON COLUMN "nx01_user"."user_account" IS '使用者登入帳號（唯一），建議只允許英數與部分符號（如 . _ -）';
COMMENT ON COLUMN "nx01_user"."password_hash" IS '密碼雜湊值（不可存明碼）。';
COMMENT ON COLUMN "nx01_user"."user_name" IS '顯示名稱（姓名/暱稱）';
COMMENT ON COLUMN "nx01_user"."user_name_en" IS '英文姓名（選填、Hana demo 對齊、外籍員工或顯示用）；2026-06-18 補欄';
COMMENT ON COLUMN "nx01_user"."email" IS 'Email（可選填；未來可用於通知/重設密碼）';
COMMENT ON COLUMN "nx01_user"."phone" IS '電話（可選填）';
COMMENT ON COLUMN "nx01_user"."gender" IS '性別（M=男 / F=女 / O=其他、可空、basic zone）；W3 [3-3] 2026-06-06 新增（NX-MANUAL-02 v2.0 §4.1）';
COMMENT ON COLUMN "nx01_user"."birthday" IS '生日；W3 [3-3] 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."national_id" IS '身分證字號；W3 [3-3] 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."country_id" IS '國別 FK（null 視為 TW 預設）；02 對齊第二批 A 軌 CP2 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."household_city_id" IS '戶籍地址：縣市；02 對齊第二批 A 軌 CP2 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."household_district_id" IS '戶籍地址：鄉鎮；02 對齊第二批 A 軌 CP2 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."household_postal_code" IS '戶籍地址：3 碼郵遞區號（TW 從 district 帶、國外手填）；02 對齊第二批 A 軌 CP2 新增';
COMMENT ON COLUMN "nx01_user"."household_detail" IS '戶籍地址：路巷弄號樓室自由填（國外時整段地址也放這）；02 對齊第二批 A 軌 CP2 新增';
COMMENT ON COLUMN "nx01_user"."mailing_city_id" IS '通訊地址：縣市；02 對齊第二批 A 軌 CP2 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."mailing_district_id" IS '通訊地址：鄉鎮；02 對齊第二批 A 軌 CP2 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."mailing_postal_code" IS '通訊地址：3 碼郵遞區號；02 對齊第二批 A 軌 CP2 新增';
COMMENT ON COLUMN "nx01_user"."mailing_detail" IS '通訊地址：路巷弄號樓室自由填；02 對齊第二批 A 軌 CP2 新增';
COMMENT ON COLUMN "nx01_user"."hire_date" IS '到職日期；W3 [3-3] 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."emergency_contact" IS '緊急聯絡人；W3 [3-3] 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."emergency_phone" IS '緊急聯絡電話；W3 [3-3] 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."emergency_relation" IS '緊急聯絡人關係（父/母/配偶/兄弟姊妹/朋友 等、純文字）；2026-06-18 補 Hana demo 欄位';
COMMENT ON COLUMN "nx01_user"."highest_education" IS '最高學歷（高中/專科/大學/碩士/博士 等、basic zone）；02 對齊第二批 B 軌 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."graduate_school" IS '畢業學校；02 對齊第二批 B 軌 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."military_service" IS '服兵役（已服/未服/免役/替代役/服役中 等、basic zone）；02 對齊第二批 B 軌 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."health_check_date" IS '體檢日期；02 對齊第二批 B 軌 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."health_check_result" IS '體檢結果（合格/不合格/複檢/未體檢 等、純文字保留延伸彈性）；02 對齊第二批 B 軌 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."legacy_code" IS '舊系統員工編號（純對照、不綁 FK、對齊零件 oldCode 範式）；W3 [3-2] 2026-06-06 新增';
COMMENT ON COLUMN "nx01_user"."job_title" IS '職務（純文字、顯示用、不掛權限；恆迎範式：負責人 / 股東 / 業務員 / 會計 / 倉管員 / 外務員 / 採購助理）；CYTIC 開戶 2026-06-21 新增';
COMMENT ON COLUMN "nx01_user"."role_id" IS '人資主檔同步：主要職務角色（選填，與 nx01_user_role 並存）';
COMMENT ON COLUMN "nx01_user"."permission_level_id" IS '權限等級 ID（FK nx01_permission_level、一人一等級；2026-06-28 職務↔權限拆分軌）';
COMMENT ON COLUMN "nx01_user"."department_id" IS '員工隸屬部門（選填）；02 第三批 T1 2026-06-07 從 PRO 解綁 → LITE（總經理拍板：組織欄位各版本都能用、不綁版本）';
COMMENT ON COLUMN "nx01_user"."primary_site_id" IS '主要據點 ID（FK nx01_site、選填、forward 視角一人一個；02 第四批 軌 1 2026-06-07 新增、與 nx01_user_warehouse 多倉衛星並存）';
COMMENT ON COLUMN "nx01_user"."left_at" IS '離職日期（選填、留空=在職、有值=已離職、不刪資料）；02 第四批 軌 1 2026-06-07 新增';
COMMENT ON COLUMN "nx01_user"."photo_storage_key" IS '大頭貼 storage key（FileUploadService 產的 {tenantId}/user-photo/{yyyy}/{mm}/{uuid}{ext}；單張、無則 null）；02 第四批 軌 1 2026-06-07 新增';
COMMENT ON COLUMN "nx01_user"."photo_mime_type" IS '大頭貼 MIME type（image/png / image/jpeg / image/gif / image/webp）';
COMMENT ON COLUMN "nx01_user"."photo_file_size" IS '大頭貼檔案大小（bytes）';
COMMENT ON COLUMN "nx01_user"."photo_orig_filename" IS '大頭貼原始檔名';
COMMENT ON COLUMN "nx01_user"."is_active" IS '是否啟用（停用後不可登入）';
COMMENT ON COLUMN "nx01_user"."last_login_at" IS '最後登入時間';
COMMENT ON COLUMN "nx01_user"."failed_login_count" IS '連續失敗登入次數（達閾值鎖帳號、對齊 NX01-01 §3.6）';
COMMENT ON COLUMN "nx01_user"."locked_until" IS '帳號鎖定到何時（nullable、unlock 後設 null、對齊 NX01-01 §3.6）';
COMMENT ON COLUMN "nx01_user"."must_change_password" IS '首次登入強制改密碼（v1.2 §3.1）';
COMMENT ON COLUMN "nx01_user"."two_fa_enabled" IS '兩階段驗證開關（Hana demo 對齊、true=登入要過 OTP、實作待 security zone 開發時補）；2026-06-18 補欄';
COMMENT ON COLUMN "nx01_user"."is_tenant_owner" IS '是否租戶負責人（v1.2 §2.1 開戶時建立、自動 OWNER 角色 + 全權限）';
COMMENT ON COLUMN "nx01_user"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_user"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_user"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_user"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01SeqCounter  →  nx01_seq_counter
COMMENT ON TABLE "nx01_seq_counter" IS '用途： - 員工編號 Y0001 ~ Y9999（scope=''EMPLOYEE''）— Crown 拍板 employeeNo = userAccount - 往來對象編號類型碼 + 4 碼（scope=''PARTNER_C'' / PARTNER_O / PARTNER_S / PARTNER_V / PARTNER_T / PARTNER_B / PARTNER_L） 取號方式：service 層原子取號（UPDATE ... SET next_no = next_no + 1） 手動覆寫：caller 傳 code 時直接寫入；若手動值 ≥ next_no 自動跳號（防衝突） 對齊 NX-MANUAL-02 v2.0 §3.1 員工編號 + §3.5/§3.6 往來對象六分類 + 散客 L。';
COMMENT ON COLUMN "nx01_seq_counter"."id" IS '[NX01]+[SQCT]+[7碼流水號]，EX : NX01SQCT0000001';
COMMENT ON COLUMN "nx01_seq_counter"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_seq_counter"."scope" IS '流水範圍 enum：EMPLOYEE / PARTNER_C / PARTNER_O / PARTNER_S / PARTNER_V / PARTNER_T / PARTNER_B / PARTNER_L';
COMMENT ON COLUMN "nx01_seq_counter"."next_no" IS '下一個自動編號流水值（每次取號後 +1）';
COMMENT ON COLUMN "nx01_seq_counter"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_seq_counter"."updated_at" IS '最後更新時間';

-- Nx01UserRole  →  nx01_user_role
COMMENT ON TABLE "nx01_user_role" IS '使用者—角色對應（多對多）。';
COMMENT ON COLUMN "nx01_user_role"."id" IS '[NX01]+[USRO]+[7碼流水號]，EX : NX01USRO0000001';
COMMENT ON COLUMN "nx01_user_role"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_user_role"."user_id" IS '使用者 ID（外鍵）。';
COMMENT ON COLUMN "nx01_user_role"."role_id" IS '角色 ID（外鍵）。';
COMMENT ON COLUMN "nx01_user_role"."is_primary" IS '是否主要角色（用於預設權限/預設首頁顯示等）';
COMMENT ON COLUMN "nx01_user_role"."assigned_at" IS '指派時間';
COMMENT ON COLUMN "nx01_user_role"."assigned_by" IS '指派者（使用者 ID）';
COMMENT ON COLUMN "nx01_user_role"."revoked_at" IS '取消指派時間（保留歷史用；若你想硬刪也可不需要）';
COMMENT ON COLUMN "nx01_user_role"."is_active" IS '是否有效（TRUE=目前生效；FALSE=已取消但保留紀錄）';

-- Nx01UserPageGuide  →  nx01_user_page_guide
COMMENT ON TABLE "nx01_user_page_guide" IS 'v1.2 對齊軌 C：每位員工 × 每頁面的設定精靈記憶（§3.3）';
COMMENT ON COLUMN "nx01_user_page_guide"."id" IS '[NX01]+[UPGD]+[7碼流水號]';
COMMENT ON COLUMN "nx01_user_page_guide"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_user_page_guide"."user_id" IS '使用者 ID（FK nx01_user）';
COMMENT ON COLUMN "nx01_user_page_guide"."page_key" IS '頁面 key（例：sale.quote、purchase.po、inventory.stocktake）';
COMMENT ON COLUMN "nx01_user_page_guide"."seen_at" IS '檢視／已讀時間';

-- Nx01ImportBatch  →  nx01_import_batch
COMMENT ON TABLE "nx01_import_batch" IS 'v1.2 對齊軌 C：匯入精靈批次紀錄（§3.2）';
COMMENT ON COLUMN "nx01_import_batch"."id" IS '[NX01]+[IMBA]+[7碼流水號]';
COMMENT ON COLUMN "nx01_import_batch"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_import_batch"."uploaded_by" IS '上傳人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_import_batch"."import_type" IS '匯入類型：employee / partner / warehouse / product / purchase-history / sale-history / voucher';
COMMENT ON COLUMN "nx01_import_batch"."file_name" IS '匯入檔名';
COMMENT ON COLUMN "nx01_import_batch"."total_rows" IS '總筆數';
COMMENT ON COLUMN "nx01_import_batch"."success_rows" IS '成功筆數';
COMMENT ON COLUMN "nx01_import_batch"."failed_rows" IS '失敗筆數';
COMMENT ON COLUMN "nx01_import_batch"."failure_detail" IS '失敗 row 詳細 JSON：[{ rowNo: 12, reason: ''Email 格式錯誤'' }, ...]';
COMMENT ON COLUMN "nx01_import_batch"."status" IS 'previewing / imported / cancelled';
COMMENT ON COLUMN "nx01_import_batch"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_import_batch"."imported_at" IS '匯入時間';

-- Nx01UserTeam  →  nx01_user_team
COMMENT ON TABLE "nx01_user_team" IS '使用者—團隊對應（多對多）。';
COMMENT ON COLUMN "nx01_user_team"."id" IS '[NX01]+[USTM]+[7碼流水號]，EX : NX01USTM0000001';
COMMENT ON COLUMN "nx01_user_team"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx01_user_team"."user_id" IS '使用者ID（FK nx01_user）。';
COMMENT ON COLUMN "nx01_user_team"."team_id" IS '組別ID（FK nx01_team）。';
COMMENT ON COLUMN "nx01_user_team"."is_leader" IS '是否為該組組長。';
COMMENT ON COLUMN "nx01_user_team"."is_primary" IS '是否為員工的主組（決定 user.hrDepartmentId）；05 批 T3 2026-06-07 新增、範式同 nx01_user_role.is_primary 每位員工至多 1 筆 isPrimary=true（service 層守、切換時把其他筆改 false）。';
COMMENT ON COLUMN "nx01_user_team"."is_active" IS '是否生效（軟刪除、TRUE=當前生效、FALSE=已撤銷但保留紀錄）；05 批 T3 2026-06-07 新增、範式同 nx01_user_role.is_active';
COMMENT ON COLUMN "nx01_user_team"."assigned_at" IS '指派時間；05 批 T3 2026-06-07 新增';
COMMENT ON COLUMN "nx01_user_team"."assigned_by" IS '指派者（使用者 ID）；05 批 T3 2026-06-07 新增';
COMMENT ON COLUMN "nx01_user_team"."revoked_at" IS '取消指派時間（保留歷史用）；05 批 T3 2026-06-07 新增';
COMMENT ON COLUMN "nx01_user_team"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_user_team"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01UserWarehouse  →  nx01_user_warehouse
COMMENT ON TABLE "nx01_user_warehouse" IS '使用者—倉庫對應——員工可操作倉別。';
COMMENT ON COLUMN "nx01_user_warehouse"."id" IS '[NX01]+[USWA]+[7碼流水號]，EX : NX01USWA0000001';
COMMENT ON COLUMN "nx01_user_warehouse"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_user_warehouse"."user_id" IS '使用者 ID（外鍵）。';
COMMENT ON COLUMN "nx01_user_warehouse"."warehouse_id" IS '倉庫 ID（外鍵）。';
COMMENT ON COLUMN "nx01_user_warehouse"."assigned_at" IS '指派時間';
COMMENT ON COLUMN "nx01_user_warehouse"."assigned_by" IS '指派者（使用者 ID）';
COMMENT ON COLUMN "nx01_user_warehouse"."revoked_at" IS '取消指派時間（保留歷史用；若你想硬刪也可不需要）';
COMMENT ON COLUMN "nx01_user_warehouse"."is_active" IS '是否有效（TRUE=目前生效；FALSE=已取消但保留紀錄）';
COMMENT ON COLUMN "nx01_user_warehouse"."is_primary" IS '是否為員工主要倉庫（範式同 nx01_user_role.is_primary） 每位員工至多 1 筆 isPrimary=true（service 層守、切換時把其他筆改 false）。 2026-06-22 執行長拍板：員工可多歸倉、但要能指定一個主要倉';

-- Nx01View  →  nx01_view
COMMENT ON TABLE "nx01_view" IS '功能頁主檔——系統頁面／權限點目錄。';
COMMENT ON COLUMN "nx01_view"."id" IS '[NX01]+[VIEW]+[7碼流水號]，EX : NX01VIEW0000001';
COMMENT ON COLUMN "nx01_view"."code" IS '畫面代碼（給程式用、不可重複），建議：NX01_PART_VIEW';
COMMENT ON COLUMN "nx01_view"."name" IS '畫面名稱（給人看），例：零件主檔';
COMMENT ON COLUMN "nx01_view"."module_code" IS '所屬模組代碼：nx00/nx01/nx02...（方便分類與未來菜單）';
COMMENT ON COLUMN "nx01_view"."path" IS '前端路由/網址路徑，例：/nx00/parts';
COMMENT ON COLUMN "nx01_view"."sort_no" IS '排序用（菜單/列表呈現順序）';
COMMENT ON COLUMN "nx01_view"."is_active" IS '是否啟用（下架畫面用，不刪資料）';
COMMENT ON COLUMN "nx01_view"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_view"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_view"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_view"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01Warehouse  →  nx01_warehouse
COMMENT ON TABLE "nx01_warehouse" IS '倉庫主檔。';
COMMENT ON COLUMN "nx01_warehouse"."id" IS '[NX01]+[WARE]+[7碼流水號]，EX : NX01WARE0000001';
COMMENT ON COLUMN "nx01_warehouse"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_warehouse"."code" IS '倉庫代碼（唯一），例：Z01、Z02';
COMMENT ON COLUMN "nx01_warehouse"."name" IS '倉庫名稱（顯示用），例：台北倉、二倉';
COMMENT ON COLUMN "nx01_warehouse"."remark" IS '備註（例：只放新品、只放中古件）';
COMMENT ON COLUMN "nx01_warehouse"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_warehouse"."is_active" IS '是否啟用（停用不刪資料）';
COMMENT ON COLUMN "nx01_warehouse"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_warehouse"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_warehouse"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_warehouse"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_warehouse"."warehouse_type_id" IS '倉庫類型ID（FK nx01_warehouse_type，PLUS版），控制自動調撥邏輯。H=總部/M=主倉/W=分倉/S=衛星倉。';
COMMENT ON COLUMN "nx01_warehouse"."site_id" IS '所屬據點 ID（FK nx01_site；一個倉庫屬於一個據點、一個據點可有多個倉庫；收尾補強：NN + 真 FK onDelete Restrict）';
COMMENT ON COLUMN "nx01_warehouse"."is_main" IS '是否主倉（同 tenant 只 1 筆 is_main=true、partial unique index 強制、LITE 強制 true、對齊 NX01-06 §3.6）';
COMMENT ON COLUMN "nx01_warehouse"."manager_user_id" IS '倉管主管 user ID（FK to nx01_user、ON DELETE SET NULL、業務離職時清空、對齊 NX01-06 §3）';
COMMENT ON COLUMN "nx01_warehouse"."city_id" IS '縣市 ID（FK to nx01_city、規格書 §3.2 必填、schema nullable 階段 1 並存、application 層強制）';
COMMENT ON COLUMN "nx01_warehouse"."district_id" IS '鄉鎮市區 ID（FK to nx01_district、同上）';
COMMENT ON COLUMN "nx01_warehouse"."street_id" IS '路街 ID（FK to nx01_street、自帶 3+3 郵遞區號）';
COMMENT ON COLUMN "nx01_warehouse"."lane" IS '巷（純數字、可空）';
COMMENT ON COLUMN "nx01_warehouse"."alley" IS '弄（純數字、可空）';
COMMENT ON COLUMN "nx01_warehouse"."building_no" IS '號（規格書 §3.2 必填、schema nullable 階段 1 並存、application 層強制）';
COMMENT ON COLUMN "nx01_warehouse"."building_sub_no" IS '號的子號（之 N、純數字、可空）';
COMMENT ON COLUMN "nx01_warehouse"."floor" IS '樓層（容納 B1 / 3F 等變體）';
COMMENT ON COLUMN "nx01_warehouse"."room_no" IS '室號（容納 12 / A 等變體）';

-- Nx01WarehouseType  →  nx01_warehouse_type
COMMENT ON TABLE "nx01_warehouse_type" IS '倉庫類型字典表。';
COMMENT ON COLUMN "nx01_warehouse_type"."id" IS '[NX01]+[WHTP]+[7碼流水號]，EX : NX01WHTP0000001';
COMMENT ON COLUMN "nx01_warehouse_type"."code" IS '倉庫類型代碼（H=總部集中倉/M=主倉/W=分倉/S=衛星倉），系統預設，不可自行新增。';
COMMENT ON COLUMN "nx01_warehouse_type"."name" IS '倉庫類型名稱（顯示用）。';
COMMENT ON COLUMN "nx01_warehouse_type"."flow_mode" IS '配貨流程模式（C=集中管理/D=分倉管理）。控制進貨後自動調撥的觸發邏輯。';
COMMENT ON COLUMN "nx01_warehouse_type"."description" IS '類型說明。';
COMMENT ON COLUMN "nx01_warehouse_type"."sort_no" IS '排序用。';
COMMENT ON COLUMN "nx01_warehouse_type"."is_active" IS '是否啟用。';

-- Nx02Demand  →  nx02_demand
COMMENT ON TABLE "nx02_demand" IS '採購需求池——補貨需求來源（缺貨／請購／手動）。';
COMMENT ON COLUMN "nx02_demand"."id" IS '[NX02]+[DMND]+[7碼流水號]，EX : NX02DMND0000001';
COMMENT ON COLUMN "nx02_demand"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx02_demand"."doc_no" IS '採購需求單號（唯一），[DR]+[年月]+[5碼流水號]，EX：DR-202604-00001';
COMMENT ON COLUMN "nx02_demand"."demand_type" IS '需求類型（S=庫存不足系統自動產生/O=客訂由銷售專員登記）。';
COMMENT ON COLUMN "nx02_demand"."part_id" IS '需求料號（FK nx02_part）。';
COMMENT ON COLUMN "nx02_demand"."warehouse_id" IS '需求倉庫（FK nx02_warehouse）。';
COMMENT ON COLUMN "nx02_demand"."qty" IS '需求數量。';
COMMENT ON COLUMN "nx02_demand"."customer_id" IS '客戶ID（demand_type=O時必填，FK nx02_partner）。';
COMMENT ON COLUMN "nx02_demand"."expected_date" IS '客戶期望到貨日（選填）。';
COMMENT ON COLUMN "nx02_demand"."status" IS '狀態（O=待處理/P=處理中/C=已完成/I=已忽略）。';
COMMENT ON COLUMN "nx02_demand"."ignore_reason" IS '忽略原因（status=I時必填）。';
COMMENT ON COLUMN "nx02_demand"."ref_rfq_id" IS '關聯詢價單ID（處理後填入）。';
COMMENT ON COLUMN "nx02_demand"."remark" IS '備註。';
COMMENT ON COLUMN "nx02_demand"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_demand"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_demand"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_demand"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx02PartnerPart  →  nx02_partner_part
COMMENT ON TABLE "nx02_partner_part" IS 'audit-02 後記 path C 混合範式（Crown Q-PP-1=C） source 雙來源（Crown Q-S1 範式仿 AR BrandAllocationRule）：S=system 自動 / M=manual 手動 採購建議單列表先查主檔 → fallback Nx02PoItem 歷史推算（PurchaseSuggestionService） 支援歷史版本：unique [tenantId, partnerId, partId, validFrom]、validTo 可空（現役留空）';
COMMENT ON COLUMN "nx02_partner_part"."id" IS '[NX02]+[PNPT]+[7碼流水號]，EX : NX02PNPT0000001';
COMMENT ON COLUMN "nx02_partner_part"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx02_partner_part"."partner_id" IS '廠商 ID（FK nx01_partner、application 層 guard partner_type=''S'' 純供應商、Crown Q-PP-2=a 不在 DB 強制）';
COMMENT ON COLUMN "nx02_partner_part"."part_id" IS '料件 ID（FK nx01_part）';
COMMENT ON COLUMN "nx02_partner_part"."is_primary" IS '主要供應商標記（採購建議單列表排序、true=主要、false=次要備援）';
COMMENT ON COLUMN "nx02_partner_part"."supplier_part_no" IS '廠商料號（Crown Q-PP-3=b 選填、業界 muscle memory 雙料號對應、如 Bosch 自有編號 vs 我方 partNo）';
COMMENT ON COLUMN "nx02_partner_part"."default_unit_cost" IS '預設單價（採購建議單預設值、無歷史時 fallback）';
COMMENT ON COLUMN "nx02_partner_part"."default_lead_days" IS '預設交期（天數）';
COMMENT ON COLUMN "nx02_partner_part"."moq" IS '最小訂購量 MOQ';
COMMENT ON COLUMN "nx02_partner_part"."source" IS '來源（S=system 自動同步 / M=manual 手動維護、仿 AR BrandAllocationRule Q-S1=A 雙來源並存）';
COMMENT ON COLUMN "nx02_partner_part"."valid_from" IS '生效起期（可空、null=從建立時即生效）';
COMMENT ON COLUMN "nx02_partner_part"."valid_to" IS '生效迄期（null=現役、application 層校驗 validFrom ≤ validTo）';
COMMENT ON COLUMN "nx02_partner_part"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx02_partner_part"."remark" IS '備註';
COMMENT ON COLUMN "nx02_partner_part"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx02_partner_part"."created_by" IS '建立人';
COMMENT ON COLUMN "nx02_partner_part"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx02_partner_part"."updated_by" IS '更新人';

-- Nx02Po  →  nx02_po
COMMENT ON TABLE "nx02_po" IS '採購單單頭。';
COMMENT ON COLUMN "nx02_po"."id" IS '[NX02]+[POHT]+[7碼流水號]，EX : NX02POHT0000001';
COMMENT ON COLUMN "nx02_po"."tenant_id" IS '租戶ID';
COMMENT ON COLUMN "nx02_po"."doc_no" IS '採購單號（唯一），[PO]+[年月]+[倉別]+[5碼流水號]，EX：PO-202602-Z01-00001';
COMMENT ON COLUMN "nx02_po"."po_date" IS '採購日期';
COMMENT ON COLUMN "nx02_po"."supplier_id" IS '廠商 ID (外鍵)';
COMMENT ON COLUMN "nx02_po"."rfq_id" IS '來源單據 id (外鍵)';
COMMENT ON COLUMN "nx02_po"."currency_id" IS '幣別 ID (外鍵)';
COMMENT ON COLUMN "nx02_po"."status" IS '單據狀態（DRAFT / CONFIRMED / PARTIAL_RECEIVED / RECEIVED / CLOSED / CANCELLED）';
COMMENT ON COLUMN "nx02_po"."subtotal" IS '小計（明細加總，未稅）';
COMMENT ON COLUMN "nx02_po"."tax_rate" IS '稅率（預設 5.00）';
COMMENT ON COLUMN "nx02_po"."tax_amount" IS '稅額（可手動覆寫）';
COMMENT ON COLUMN "nx02_po"."total_amount" IS '總額（subtotal + tax_amount）';
COMMENT ON COLUMN "nx02_po"."expected_date" IS '預計到貨日';
COMMENT ON COLUMN "nx02_po"."remark" IS '備註';
COMMENT ON COLUMN "nx02_po"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_po"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_po"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_po"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_po"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx02_po"."voided_by" IS '作廢人（使用者 ID）';
COMMENT ON COLUMN "nx02_po"."submitted_for_review_at" IS '採購員送審時間（T1-fix 2026-06-07：DRAFT → PENDING_APPROVAL 觸發、與 approvedAt 對稱）';
COMMENT ON COLUMN "nx02_po"."submitted_for_review_by" IS '採購員送審人（使用者 ID、T1-fix 2026-06-07）';
COMMENT ON COLUMN "nx02_po"."approved_at" IS '採購組長核准時間。';
COMMENT ON COLUMN "nx02_po"."approved_by" IS '採購組長核准人（使用者ID）。';
COMMENT ON COLUMN "nx02_po"."sent_at" IS '寄出給廠商的時間。';
COMMENT ON COLUMN "nx02_po"."supplier_confirmed_at" IS '廠商確認接單時間，確認後系統自動產生AP應付帳款。';
COMMENT ON COLUMN "nx02_po"."reject_reason" IS '退件原因（採購組長退件時填寫）。';
COMMENT ON COLUMN "nx02_po"."purchase_type" IS '採購類型（D=國內一般採購/I=國際進口採購/B=掃貨Bulk）。B=掃貨時跳過RF詢價階段，付款條件預設現金/即時匯款，驗收允許多/少貨特殊處理，成本依數量平均攤分。';
COMMENT ON COLUMN "nx02_po"."vessel_no" IS '船號（進口採購時，廠商出貨後提供）。';
COMMENT ON COLUMN "nx02_po"."container_no" IS '貨櫃號（進口採購時，廠商出貨後提供）。';
COMMENT ON COLUMN "nx02_po"."eta" IS '預計到港日 ETA（Estimated Time of Arrival），進口採購時填入。';
COMMENT ON COLUMN "nx02_po"."payment_term_import" IS '本張採購單的進口付款條件（TT/LC/DP/DA），從廠商主檔預設帶入，可手動覆蓋。僅進口採購（purchase_type=I）時使用。';
COMMENT ON COLUMN "nx02_po"."payment_term_domestic" IS '本張採購單的國內付款條件（PREPAY/NET30/NET60/NET90/INSTALLMENT），從廠商主檔 nx01_partner.payment_term_domestic 預設帶入，可手動覆蓋。國內採購（purchase_type=D/B）時使用。NX02-IMPL-01 Phase 1 M1 補齊（既有僅 import 對應、業界需求補國內）。';
COMMENT ON COLUMN "nx02_po"."incoterm" IS '本張採購單的貿易條件（FOB/CIF/EXW/DDP等），從廠商主檔預設帶入，可手動覆蓋。影響 nx02_rr_import 中進口費用欄位的必填判斷：FOB/EXW需填運費；CIF運費由賣方含；DDP所有費用由賣方含。';
COMMENT ON COLUMN "nx02_po"."purchase_stage" IS '國外採購 6 階段追蹤（purchase_type=I 專屬、null=非國外採購、SmallInt 對齊 NX01-17 enum 範式）：1=備貨中 / 2=要求付款 / 3=待出貨（已付款）/ 4=出貨上船 / 5=已到港 / 6=驗收完成。application 層 guard strict 順序流轉（Crown Q-C3=A）。NX02-IMPL-01 Phase 1 M2 新增。';
COMMENT ON COLUMN "nx02_po"."requested_payment_at" IS '廠商要求付款時間（stage=2 觸發、廠商 email 通知）';
COMMENT ON COLUMN "nx02_po"."paid_at" IS '實際付款時間（stage=3 觸發、付款完成）';
COMMENT ON COLUMN "nx02_po"."shipped_at" IS '上船時間（stage=4 觸發、配既有 vessel_no / container_no）';
COMMENT ON COLUMN "nx02_po"."arrived_at" IS '實際到港時間（stage=5 觸發、報關行 email 通知、相對既有 eta 預計時間）';
COMMENT ON COLUMN "nx02_po"."domestic_tracking_no" IS 'T6 進貨對齊批次 2026-06-08：國內物流追蹤編號（黑貓 / 嘉里 / 大榮 / 新竹 等）。 purchase_type=D/B 時用；UI 在採購單詳細頁顯示供採購員追蹤包裹。';
COMMENT ON COLUMN "nx02_po"."payment_milestone" IS 'T6 進貨對齊批次 2026-06-08：付款里程碑（國內外通用）。 null=未啟動 / N=廠商通知付款 / D=已付。國外既有 paidAt 是 stage=3 觸發、語意不同不複用。';
COMMENT ON COLUMN "nx02_po"."ap_month" IS 'T6 進貨對齊批次 2026-06-08：帳款年月（YYYY-MM、月結用、寫入 AP 帳期歸戶）。 預設由建單日 + 付款條件推算（如 NET30 = 建單月+1）、可手動覆寫。';
COMMENT ON COLUMN "nx02_po"."customs_agent_partner_id" IS 'T6 進貨對齊批次 2026-06-08：報關行廠商（國外採購用、FK nx01_partner、partnerType=''T'' 外包物流、application 層 guard）。';
COMMENT ON COLUMN "nx02_po"."invoice_to_partner_id" IS 'T7 進貨對齊批次 2026-06-08：付款對象（FK partner、null = 跟 supplier 同）。 業務語意：母公司付款 / 集團代付。發票對此 partner 開、AP 帳目對此 partner 歸戶。';
COMMENT ON COLUMN "nx02_po"."ship_to_partner_id" IS 'T7 進貨對齊批次 2026-06-08：指送對象（FK partner、null = 跟 supplier 同 / 我方收貨）。 業務語意：分店收貨（指定我方分店 partner）/ 直送客戶現場（指定 customer partner、不進倉）。';
COMMENT ON COLUMN "nx02_po"."ship_to_address_id" IS 'T7 進貨對齊批次 2026-06-08：收貨地址（FK nx01_partner_address、應屬 shipToPartnerId 或 supplier）。 null = 用 partner 預設地址。application 層守 partnerId 一致。';
COMMENT ON COLUMN "nx02_po"."delivery_address" IS 'T7 進貨對齊批次 2026-06-08：交貨地點（自由文字、直送客戶現場用、覆寫 shipToAddressId）。 業務語意：臨時工地、會場、客戶口頭指定的地址、不必入主檔。';

-- Nx02PoItem  →  nx02_po_item
COMMENT ON TABLE "nx02_po_item" IS '採購單明細行。';
COMMENT ON COLUMN "nx02_po_item"."id" IS '[NX02]+[POIT]+[7碼流水號]，EX : NX02POIT0000001';
COMMENT ON COLUMN "nx02_po_item"."po_id" IS '對應採購單表頭 ID';
COMMENT ON COLUMN "nx02_po_item"."rfq_item_id" IS '詢價明細 ID (外鍵) (可空)';
COMMENT ON COLUMN "nx02_po_item"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx02_po_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx02_po_item"."part_no" IS '零件料號快照（避免主檔變更影響歷史）';
COMMENT ON COLUMN "nx02_po_item"."part_name" IS '零件名稱快照';
COMMENT ON COLUMN "nx02_po_item"."qty" IS '採購數量';
COMMENT ON COLUMN "nx02_po_item"."received_qty" IS '已收數量（預設 0，RR 過帳時累加）';
COMMENT ON COLUMN "nx02_po_item"."cancelled_qty" IS '03 收尾 A 2026-06-08：取消量（部分進貨後採購員可取消剩餘量、把單收掉）。剩餘可收 = qty - receivedQty - cancelledQty；當所有 line 剩餘=0、可結案 PO。';
COMMENT ON COLUMN "nx02_po_item"."unit_cost" IS '採購單價';
COMMENT ON COLUMN "nx02_po_item"."line_amount" IS '明細金額（qty * unit_cost）';
COMMENT ON COLUMN "nx02_po_item"."expected_date" IS '預計到貨日';
COMMENT ON COLUMN "nx02_po_item"."remark" IS '備註';
COMMENT ON COLUMN "nx02_po_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_po_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_po_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_po_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx02Pr  →  nx02_pr
COMMENT ON TABLE "nx02_pr" IS '請購單單頭。';
COMMENT ON COLUMN "nx02_pr"."id" IS '[NX02]+[PRHT]+[7碼流水號]，EX : NX02PRHT0000001';
COMMENT ON COLUMN "nx02_pr"."tenant_id" IS '租戶ID';
COMMENT ON COLUMN "nx02_pr"."warehouse_id" IS '退貨倉庫 ID';
COMMENT ON COLUMN "nx02_pr"."doc_no" IS '退貨單號（唯一），[PR]+[年月]+[倉別]+[5碼流水號]，EX：PR-202602-Z01-00001';
COMMENT ON COLUMN "nx02_pr"."legacy_doc_no" IS '舊系統原單號（偉盟 RSIM.ROREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G1 偉盟匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx02_pr"."pr_date" IS '退貨日期';
COMMENT ON COLUMN "nx02_pr"."supplier_id" IS '廠商 ID (外鍵)';
COMMENT ON COLUMN "nx02_pr"."rr_id" IS '來源單據 id (外鍵)';
COMMENT ON COLUMN "nx02_pr"."currency_id" IS '幣別 ID (外鍵)';
COMMENT ON COLUMN "nx02_pr"."status" IS '單據狀態（D=草稿 / P=已過帳 / V=作廢）';
COMMENT ON COLUMN "nx02_pr"."subtotal" IS '小計（明細加總，未稅）';
COMMENT ON COLUMN "nx02_pr"."tax_rate" IS '稅率（預設 5.00）';
COMMENT ON COLUMN "nx02_pr"."tax_amount" IS '稅額（可手動覆寫）';
COMMENT ON COLUMN "nx02_pr"."total_amount" IS '總額（subtotal + tax_amount）';
COMMENT ON COLUMN "nx02_pr"."remark" IS '備註';
COMMENT ON COLUMN "nx02_pr"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_pr"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_pr"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_pr"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_pr"."posted_at" IS '過帳時間（POSTED 才有）';
COMMENT ON COLUMN "nx02_pr"."posted_by" IS '過帳人（POSTED 才有）';
COMMENT ON COLUMN "nx02_pr"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx02_pr"."voided_by" IS '作廢人（使用者 ID）';
COMMENT ON COLUMN "nx02_pr"."approved_at" IS '採購組長核准時間。';
COMMENT ON COLUMN "nx02_pr"."approved_by" IS '採購組長核准人（使用者ID）。';
COMMENT ON COLUMN "nx02_pr"."reject_reason" IS '退件原因（採購組長退件時填寫）。';
COMMENT ON COLUMN "nx02_pr"."payment_status" IS '付款狀態（U=未付款/P=已付款）。決定退貨後帳務處理方式：未付款沖銷AP；已付款產生應收廠商退款。';
COMMENT ON COLUMN "nx02_pr"."return_mode" IS '退貨類型（F=全部退/P=部分退預設/A=折讓不退）。F/P 走既有 ledger 沖庫存 source=R；A 走 Nx05Allowance（allowanceType=P 進貨折讓）不沖庫存。NX02-IMPL-01 Phase 1 M3 補齊（Crown Q19=d 多種並存、Q-S2=A default ''P'' 業界常態）。';
COMMENT ON COLUMN "nx02_pr"."disposition_flag" IS '階段 I P1 加：退貨處置標記（G=一般退 / B=壞品退 / W=走保固）。Alex Q1=a 拍板。W 觸發 service 層自動建 Nx02WarrantyClaim 進保固理賠流程；G/B 走既有 ledger。default ''G'' = 既有 row backfill 為一般退、不破壞歷史語意。';
COMMENT ON COLUMN "nx02_pr"."source_issue_report_id" IS 'W5 異常鏈 Step 3 2026-07-11 加：來源異常回報單 ID（軟連結 nx03_issue_report、不建 FK、對齊 nx98 跨模組範式）。IR dispose 一鍵開單 / 手動連結時 service 回填；PR 過帳時回寫 IR 自動結案。';

-- Nx02PrItem  →  nx02_pr_item
COMMENT ON TABLE "nx02_pr_item" IS '請購單明細行。';
COMMENT ON COLUMN "nx02_pr_item"."id" IS '[NX02]+[PRIT]+[7碼流水號]，EX : NX02PRIT0000001';
COMMENT ON COLUMN "nx02_pr_item"."pr_id" IS '對應退貨單表頭 ID';
COMMENT ON COLUMN "nx02_pr_item"."rr_item_id" IS '來源進貨明細 (外鍵)。2026-07-20 改可空（Crown 拍板 G6、完全比照 Nx04SrItem.soItemId 2026-07-07 前例）：DB 層可空僅供偉盟歷史進退匯入（無原進貨單參照）；系統內建立進退仍必填（DTO/service 驗證、不受此變更影響）';
COMMENT ON COLUMN "nx02_pr_item"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx02_pr_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx02_pr_item"."part_no" IS '零件料號快照（避免主檔變更影響歷史）';
COMMENT ON COLUMN "nx02_pr_item"."part_name" IS '零件名稱快照';
COMMENT ON COLUMN "nx02_pr_item"."location_id" IS '退貨庫位 ID';
COMMENT ON COLUMN "nx02_pr_item"."qty" IS '退貨數量';
COMMENT ON COLUMN "nx02_pr_item"."unit_cost" IS '退貨成本（從 RR 帶入）';
COMMENT ON COLUMN "nx02_pr_item"."line_amount" IS '明細金額';
COMMENT ON COLUMN "nx02_pr_item"."remark" IS '備註';
COMMENT ON COLUMN "nx02_pr_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_pr_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_pr_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_pr_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_pr_item"."return_reason" IS '退貨原因（E=數量多餘/D=外觀損壞/F=功能異常/W=規格不符/O=其他）。';

-- Nx02Qt  →  nx02_qt
COMMENT ON TABLE "nx02_qt" IS '供應商報價——採購側詢價回報。';
COMMENT ON COLUMN "nx02_qt"."id" IS '[NX02]+[QTHD]+[7碼流水號]，EX : NX02QTHD0000001';
COMMENT ON COLUMN "nx02_qt"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx02_qt"."rfq_id" IS '對應詢價單 ID（FK nx02_rfq）';
COMMENT ON COLUMN "nx02_qt"."inquiry_partner_id" IS '同行供應商 ID（FK nx01_partner，partner_type=''O'' 同行、partner 改制六分類後 O 為獨立代號）';
COMMENT ON COLUMN "nx02_qt"."quoted_price" IS '同行報的單價（採購跟同行口頭問來、輸入系統）';
COMMENT ON COLUMN "nx02_qt"."quoted_quantity" IS '同行可供應的數量（可能 < RFQ 要求的數量）';
COMMENT ON COLUMN "nx02_qt"."lead_days" IS '交期天數（同行口頭跟採購說的）';
COMMENT ON COLUMN "nx02_qt"."status" IS '狀態（P=PENDING 待採購決定 / A=AGREED 採購已採用 / R=REJECTED 採購已拒絕）';
COMMENT ON COLUMN "nx02_qt"."notes" IS '採購自由備註（例：「這家最近 cash flow 緊」）';
COMMENT ON COLUMN "nx02_qt"."reject_reason" IS '拒絕原因（status=R 時必填，application 層校驗）';
COMMENT ON COLUMN "nx02_qt"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx02_qt"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_qt"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx02_qt"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx02Rfq  →  nx02_rfq
COMMENT ON TABLE "nx02_rfq" IS '詢價單單頭——對供應商詢價。';
COMMENT ON COLUMN "nx02_rfq"."id" IS '[NX02]+[RFHT]+[7碼流水號]，EX : NX02RFHT0000001';
COMMENT ON COLUMN "nx02_rfq"."tenant_id" IS '租戶ID';
COMMENT ON COLUMN "nx02_rfq"."doc_no" IS '詢價單號（唯一），[RF]+[年月]+[倉別]+[5碼流水號]，EX：RF-202602-Z01-00001';
COMMENT ON COLUMN "nx02_rfq"."rfq_date" IS '詢價日期';
COMMENT ON COLUMN "nx02_rfq"."supplier_id" IS '主供應商（交易對象 ID、可空：LITE 階段 1 簡化詢價範式 = 系統不預先綁供應商名單、業務複製詢價文字到外部問、回價時記錄到 Nx02Qt；本欄位保留作「優先意向供應商」可選欄、application 層 guard partner_type=''S'' 純供應商）';
COMMENT ON COLUMN "nx02_rfq"."contact_name" IS '聯絡人（可空，臨時覆寫 partner 主檔）';
COMMENT ON COLUMN "nx02_rfq"."contact_phone" IS '聯絡電話（可空）';
COMMENT ON COLUMN "nx02_rfq"."currency" IS '幣別（LITE 預設 TWD）';
COMMENT ON COLUMN "nx02_rfq"."status" IS '狀態。(D=DRAFT, S=SENT, R=REPLIED, C=CLOSED, V=VOID)';
COMMENT ON COLUMN "nx02_rfq"."remark" IS '備註';
COMMENT ON COLUMN "nx02_rfq"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_rfq"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rfq"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_rfq"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rfq"."voided_at" IS '作廢時間。';
COMMENT ON COLUMN "nx02_rfq"."voided_by" IS '作廢人（使用者 ID）';
COMMENT ON COLUMN "nx02_rfq"."rfq_type" IS '詢價類型（G=一般詢價：採購多家供應商比價工具/P=同行調貨詢價：銷售業務調貨用）。LITE 階段 1 範式：G 型 = 業務從料件+數量發起→產生詢價文字→自己拿去 LINE/電話問→回價填入 Nx02Qt（partner_type=S 純供應商）並排比價→選一家開 PO；P 型既有同行調貨範式不變（Qt.partner_type=O 同行）後續只能建立調貨單 TI 不能建立 PO。';
COMMENT ON COLUMN "nx02_rfq"."rfq_reason" IS '詢價原因（可複選，逗號分隔）：S=庫存不足/O=客訂/N=新品/P=特價/T=同行調貨。同行調貨詢價固定為T不可修改。';
COMMENT ON COLUMN "nx02_rfq"."warehouse_id" IS '入庫倉庫ID（影響單號產生，FK nx02_warehouse）。';
COMMENT ON COLUMN "nx02_rfq"."valid_until" IS '詢價有效期限。同廠商同料號有新詢價單時舊的自動失效。過期後不得用來建立採購單。';
COMMENT ON COLUMN "nx02_rfq"."demand_id" IS '來源採購需求單ID（可空，從採購需求單發起時填入）。';
COMMENT ON COLUMN "nx02_rfq"."source_so_item_id" IS '來源 SO line item ID（D4 translator 建同行調貨 RFQ stub 時填入，B5 採用 QT 後反查 SO line item 用）。一般詢價（rfqType=''G''）為空。';

-- Nx02RfqItem  →  nx02_rfq_item
COMMENT ON TABLE "nx02_rfq_item" IS '詢價單明細行。';
COMMENT ON COLUMN "nx02_rfq_item"."id" IS '[NX02]+[RFIT]+[7碼流水號]，EX : NX02RFIT0000001';
COMMENT ON COLUMN "nx02_rfq_item"."rfq_id" IS '對應詢價單表頭';
COMMENT ON COLUMN "nx02_rfq_item"."line_no" IS '明細排序號（1,2,3...）';
COMMENT ON COLUMN "nx02_rfq_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx02_rfq_item"."part_no" IS '零件料號快照（避免主檔變動影響歷史）';
COMMENT ON COLUMN "nx02_rfq_item"."part_name" IS '零件名稱快照';
COMMENT ON COLUMN "nx02_rfq_item"."qty" IS '詢價數量';
COMMENT ON COLUMN "nx02_rfq_item"."unit_price" IS '供應商回覆單價（未回覆可空）';
COMMENT ON COLUMN "nx02_rfq_item"."currency_id" IS '幣別';
COMMENT ON COLUMN "nx02_rfq_item"."lead_time_days" IS '交期（天數，可空）';
COMMENT ON COLUMN "nx02_rfq_item"."status" IS '狀態。( P=PENDING, R=REPLIED, S=SELECTED, C=REJECTED )';
COMMENT ON COLUMN "nx02_rfq_item"."remark" IS '備註';
COMMENT ON COLUMN "nx02_rfq_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_rfq_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rfq_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_rfq_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rfq_item"."demand_item_id" IS '來源採購需求明細ID（可空）。';
COMMENT ON COLUMN "nx02_rfq_item"."is_adopted" IS '是否採用（FALSE=不採用）。不採用時需填寫reject_reason。';
COMMENT ON COLUMN "nx02_rfq_item"."reject_reason" IS '不採用原因（is_adopted=FALSE時必填）。例：停產、價格過高、交期太長。';

-- Nx02Rr  →  nx02_rr
COMMENT ON TABLE "nx02_rr" IS '進貨驗收單單頭——收貨入庫。';
COMMENT ON COLUMN "nx02_rr"."id" IS '[NX02]+[RRHT]+[7碼流水號]，EX : NX02RRHT0000001';
COMMENT ON COLUMN "nx02_rr"."tenant_id" IS '租戶ID';
COMMENT ON COLUMN "nx02_rr"."warehouse_id" IS '入庫倉庫 ID';
COMMENT ON COLUMN "nx02_rr"."doc_no" IS '進貨單號（唯一），[RR]+[年月]+[倉別]+[5碼流水號]，EX：RR-202602-Z01-00001';
COMMENT ON COLUMN "nx02_rr"."legacy_doc_no" IS '舊系統原單號（偉盟 RSIM.ROREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G1 偉盟匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx02_rr"."rr_date" IS '進貨日期';
COMMENT ON COLUMN "nx02_rr"."supplier_id" IS '廠商 ID (外鍵)';
COMMENT ON COLUMN "nx02_rr"."billing_partner_id" IS '帳款對象（FK nx01_partner；可≠supplierId、null=同廠商）。偉盟進貨「其他」tab 帳款對象實務；G3 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx02_rr"."ref_so_id" IS '關聯銷貨單（代購/直送：為特定銷貨現金採購；偉盟 RSIM.RORER 印證、循 Nx03St.refSoId 範式）；G5 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx02_rr"."supplier_invoice_no" IS '廠商發票號（偉盟 RSIM.ROINV；進項對帳用）；G4 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx02_rr"."supplier_invoice_date" IS '廠商發票日期（偉盟 RSIM.RODAV）；G4 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx02_rr"."rfq_id" IS '來源詢價單據 id (外鍵)';
COMMENT ON COLUMN "nx02_rr"."po_id" IS '來源採購單據 id (外鍵)';
COMMENT ON COLUMN "nx02_rr"."currency_id" IS '幣別 ID (外鍵)';
COMMENT ON COLUMN "nx02_rr"."status" IS '單據狀態（DRAFT / INSPECTING / POSTED / REJECTED / CANCELLED）';
COMMENT ON COLUMN "nx02_rr"."subtotal" IS '小計（明細加總，未稅）';
COMMENT ON COLUMN "nx02_rr"."tax_rate" IS '稅率（預設 5.00）';
COMMENT ON COLUMN "nx02_rr"."tax_amount" IS '稅額';
COMMENT ON COLUMN "nx02_rr"."total_amount" IS '總額（subtotal + tax_amount）';
COMMENT ON COLUMN "nx02_rr"."remark" IS '備註';
COMMENT ON COLUMN "nx02_rr"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_rr"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rr"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_rr"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rr"."posted_at" IS '過帳時間（POSTED 才有）';
COMMENT ON COLUMN "nx02_rr"."posted_by" IS '過帳人（POSTED 才有）';
COMMENT ON COLUMN "nx02_rr"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx02_rr"."voided_by" IS '作廢人（使用者 ID）';
COMMENT ON COLUMN "nx02_rr"."ti_id" IS '來源調貨單ID（可空，從調貨單發起時填入）。';
COMMENT ON COLUMN "nx02_rr"."verified_at" IS '倉管專員驗收完成時間（計時器結束時間）。';
COMMENT ON COLUMN "nx02_rr"."verified_by" IS '驗收人（倉管專員，使用者ID）。';
COMMENT ON COLUMN "nx02_rr"."approved_at" IS '倉管組長入帳核准時間。';
COMMENT ON COLUMN "nx02_rr"."approved_by" IS '入帳核准人（倉管組長，使用者ID）。';
COMMENT ON COLUMN "nx02_rr"."delivery_order_no" IS 'T6 進貨對齊批次 2026-06-08：提貨單號（國外進口報關行核發、僅 import RR 用、國內 RR 留空）。';

-- Nx02RrImport  →  nx02_rr_import
COMMENT ON TABLE "nx02_rr_import" IS '進貨驗收匯入暫存。';
COMMENT ON COLUMN "nx02_rr_import"."id" IS '[NX02]+[RRIM]+[7碼流水號]，EX : NX02RRIM0000001';
COMMENT ON COLUMN "nx02_rr_import"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx02_rr_import"."rr_id" IS '對應進貨單ID（FK nx02_rr），進口費用以每批到貨為單位。';
COMMENT ON COLUMN "nx02_rr_import"."po_id" IS '對應採購單ID（FK nx02_po）。';
COMMENT ON COLUMN "nx02_rr_import"."vessel_no" IS '船號（從採購單帶入）。';
COMMENT ON COLUMN "nx02_rr_import"."container_no" IS '貨櫃號（從採購單帶入）。';
COMMENT ON COLUMN "nx02_rr_import"."eta" IS '預計到港日。';
COMMENT ON COLUMN "nx02_rr_import"."parcel_length" IS '包裹長度（cm）。';
COMMENT ON COLUMN "nx02_rr_import"."parcel_width" IS '包裹寬度（cm）。';
COMMENT ON COLUMN "nx02_rr_import"."parcel_height" IS '包裹高度（cm）。';
COMMENT ON COLUMN "nx02_rr_import"."parcel_weight" IS '包裹重量（kg）。';
COMMENT ON COLUMN "nx02_rr_import"."freight_cost" IS '海運費。';
COMMENT ON COLUMN "nx02_rr_import"."customs_duty" IS '關稅。';
COMMENT ON COLUMN "nx02_rr_import"."customs_fee" IS '報關服務費。';
COMMENT ON COLUMN "nx02_rr_import"."storage_fee" IS '倉儲費。';
COMMENT ON COLUMN "nx02_rr_import"."other_fee" IS '其他雜費。';
COMMENT ON COLUMN "nx02_rr_import"."other_fee_desc" IS '其他雜費說明。';
COMMENT ON COLUMN "nx02_rr_import"."total_import_cost" IS '進口費用合計（freight_cost+customs_duty+customs_fee+storage_fee+other_fee）。';
COMMENT ON COLUMN "nx02_rr_import"."total_qty" IS '該批到貨總數量（用於攤分計算）。';
COMMENT ON COLUMN "nx02_rr_import"."cost_per_unit" IS '@deprecated 既有「按數量平均」公式（total_import_cost ÷ total_qty），LITE 階段 1 起改「按金額比例」攤分到 Nx02RrItem.allocatedImportFee，本欄位保留向後相容、service 不再寫入。';
COMMENT ON COLUMN "nx02_rr_import"."exchange_rate" IS '買入時匯率（鎖定）。批次成本永久以此匯率計算 TWD、不隨匯率波動重算。例：USD→TWD 31.500000。Decimal(15,6) 支援小幣別精度。LITE 階段 1 新加';
COMMENT ON COLUMN "nx02_rr_import"."currency_id" IS '幣別ID（FK nx01_currency）。';
COMMENT ON COLUMN "nx02_rr_import"."remark" IS '備註。';
COMMENT ON COLUMN "nx02_rr_import"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_rr_import"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rr_import"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_rr_import"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rr_import"."incoterm" IS '本批進貨適用的貿易條件（從採購單帶入），決定哪些費用欄位為必填：FOB/EXW→運費必填；CIF→運費非必填（賣方含）；DDP→所有費用非必填（賣方含）。';

-- Nx02RrItem  →  nx02_rr_item
COMMENT ON TABLE "nx02_rr_item" IS '進貨驗收單明細行。';
COMMENT ON COLUMN "nx02_rr_item"."id" IS '[NX02]+[RRIT]+[7碼流水號]，EX : NX02RRIT0000001';
COMMENT ON COLUMN "nx02_rr_item"."rr_id" IS '對應進貨單表頭 ID';
COMMENT ON COLUMN "nx02_rr_item"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx02_rr_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx02_rr_item"."part_no" IS '零件料號快照（避免主檔變更影響歷史）';
COMMENT ON COLUMN "nx02_rr_item"."part_name" IS '零件名稱快照';
COMMENT ON COLUMN "nx02_rr_item"."location_id" IS '入庫庫位 ID（LITE 先要求必填）';
COMMENT ON COLUMN "nx02_rr_item"."qty" IS '進貨數量';
COMMENT ON COLUMN "nx02_rr_item"."unit_cost" IS '單位成本（原始單價：國內 = TWD 直接成本、國外 = 外幣單價未換匯）。LITE 階段 1 語意收斂：跟 actualUnitCost 分離、TWD 換匯+進口費攤分後寫入 actualUnitCost';
COMMENT ON COLUMN "nx02_rr_item"."original_unit_cost" IS '原始外幣單價（國內 = TWD 跟 unitCost 同值、國外 = 換匯前外幣值）。審計留底用、跟 unitCost 並存。LITE 階段 1 新加';
COMMENT ON COLUMN "nx02_rr_item"."allocated_import_fee" IS '攤分到此 item 的進口費用（按金額比例：額外費用總額 × (該零件貨款 ÷ 批內總貨款)、國內 = 0）。LITE 階段 1 新加';
COMMENT ON COLUMN "nx02_rr_item"."actual_unit_cost" IS '實際入庫成本（TWD、含換匯+進口費攤分）= (originalUnitCost × exchangeRate × qty + allocatedImportFee) ÷ qty。過帳 applyQtyInWithLedger 用此值算移動平均。LITE 階段 1 新加';
COMMENT ON COLUMN "nx02_rr_item"."line_amount" IS '明細金額（qty * unit_cost）';
COMMENT ON COLUMN "nx02_rr_item"."remark" IS '備註';
COMMENT ON COLUMN "nx02_rr_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_rr_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rr_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_rr_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_rr_item"."expected_qty" IS '預計到貨數量（建立進貨單時填入）。';
COMMENT ON COLUMN "nx02_rr_item"."actual_qty" IS '實際到貨數量（驗收後填入）。';
COMMENT ON COLUMN "nx02_rr_item"."defect_qty" IS '瑕疵品數量（驗收發現時填入，預設0）。';
COMMENT ON COLUMN "nx02_rr_item"."defect_type" IS '瑕疵類型（D=外觀損壞/F=功能異常/W=規格不符/O=其他）。defect_qty>0時必填。';
COMMENT ON COLUMN "nx02_rr_item"."defect_desc" IS '瑕疵描述（defect_qty>0時必填）。';
COMMENT ON COLUMN "nx02_rr_item"."batch_no" IS '批號（進貨年月+流水，如202604001），供保固追蹤與退貨驗證使用。';
COMMENT ON COLUMN "nx02_rr_item"."warranty_expired_at" IS '保固到期日（依nx02_part.warranty_months計算：rr_date + warranty_months）。warranty_months=0時為空。';

-- Nx02Ti  →  nx02_ti
COMMENT ON TABLE "nx02_ti" IS '同行調貨單單頭——跟同業調貨補客戶單。';
COMMENT ON COLUMN "nx02_ti"."id" IS '[NX02]+[TIHT]+[7碼流水號]，EX : NX02TIHT0000001';
COMMENT ON COLUMN "nx02_ti"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx02_ti"."warehouse_id" IS '入庫倉庫ID（FK nx02_warehouse）。';
COMMENT ON COLUMN "nx02_ti"."doc_no" IS '調貨單號（唯一），[TI]+[年月]+[倉別]+[5碼流水號]，EX：TI-202604-Z01-00001';
COMMENT ON COLUMN "nx02_ti"."ti_date" IS '調貨日期。';
COMMENT ON COLUMN "nx02_ti"."partner_id" IS '同行供應商ID（FK nx01_partner，partner_type=''O'' 同行、partner 改制六分類後同行為獨立代號 O）。';
COMMENT ON COLUMN "nx02_ti"."rfq_id" IS '來源詢價單ID（FK nx02_rfq，rfq_type=P）。';
COMMENT ON COLUMN "nx02_ti"."currency_id" IS '幣別ID（FK nx01_currency）。';
COMMENT ON COLUMN "nx02_ti"."status" IS '狀態（D=草稿/S=已發出/R=已回覆/P=待驗收/C=已完成/V=作廢）。';
COMMENT ON COLUMN "nx02_ti"."subtotal" IS '小計（明細加總，未稅）。';
COMMENT ON COLUMN "nx02_ti"."tax_rate" IS '稅率（預設5.00）。';
COMMENT ON COLUMN "nx02_ti"."tax_amount" IS '稅額。';
COMMENT ON COLUMN "nx02_ti"."total_amount" IS '總額（subtotal + tax_amount）。';
COMMENT ON COLUMN "nx02_ti"."remark" IS '備註。';
COMMENT ON COLUMN "nx02_ti"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_ti"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_ti"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_ti"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_ti"."voided_at" IS '作廢時間。';
COMMENT ON COLUMN "nx02_ti"."voided_by" IS '作廢人（使用者ID）。';

-- Nx02TiItem  →  nx02_ti_item
COMMENT ON TABLE "nx02_ti_item" IS '同行調貨單明細行。';
COMMENT ON COLUMN "nx02_ti_item"."id" IS '[NX02]+[TIIT]+[7碼流水號]，EX : NX02TIIT0000001';
COMMENT ON COLUMN "nx02_ti_item"."ti_id" IS '對應調貨單表頭ID（FK nx02_ti）。';
COMMENT ON COLUMN "nx02_ti_item"."rfq_item_id" IS '來源詢價明細ID（可空）。';
COMMENT ON COLUMN "nx02_ti_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx02_ti_item"."part_id" IS '零件ID（FK nx02_part）。';
COMMENT ON COLUMN "nx02_ti_item"."part_no" IS '零件料號快照。';
COMMENT ON COLUMN "nx02_ti_item"."part_name" IS '零件名稱快照。';
COMMENT ON COLUMN "nx02_ti_item"."location_id" IS '入庫庫位ID（FK nx02_location）。';
COMMENT ON COLUMN "nx02_ti_item"."qty" IS '調貨數量。';
COMMENT ON COLUMN "nx02_ti_item"."unit_cost" IS '調貨單價（同行報價）。';
COMMENT ON COLUMN "nx02_ti_item"."line_amount" IS '明細金額（qty × unit_cost）。';
COMMENT ON COLUMN "nx02_ti_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx02_ti_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_ti_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_ti_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_ti_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx02_ti_item"."source_so_item_id" IS '來源銷貨明細 ID（必填，反向追蹤這個 TI 明細是為了哪張 SO 的哪個 line 而存在）。Phase 0 D3 新增。';
COMMENT ON COLUMN "nx02_ti_item"."source_inquiry_record_id" IS '來源詢價紀錄 ID（可空，建 TI 時同行報價取自此筆詢價紀錄；id 快照、不設 FK）。NX04 紀錄表 B3 2026-07-06。';

-- Nx03AutoReplenish  →  nx03_auto_replenish
COMMENT ON TABLE "nx03_auto_replenish" IS '@deprecated 自 NX03 LITE closure（v1.3.0）起、由 nx98_task_pool 共享待辦池統一補貨入口取代。 保留 schema 不刪除（PLUS/PRO 後續若需 scheduler 自動跑可重新啟用）；LITE 階段業務不寫入此表、 補貨需求一律改寫 nx98_task_pool（category=STOCK_REPLENISH、sourceModule=nx03、sourceDocType=auto-replenish）。';
COMMENT ON COLUMN "nx03_auto_replenish"."id" IS '[NX03]+[AURE]+[7碼流水號]，EX : NX03AURE0000001';
COMMENT ON COLUMN "nx03_auto_replenish"."tenant_id" IS '租戶 ID（外鍵）(@@unique([tenantId, fromWarehouseId, toWarehouseId]))';
COMMENT ON COLUMN "nx03_auto_replenish"."from_warehouse_id" IS '補貨來源倉庫（外鍵）';
COMMENT ON COLUMN "nx03_auto_replenish"."to_warehouse_id" IS '補貨目標倉庫（外鍵）';
COMMENT ON COLUMN "nx03_auto_replenish"."priority" IS '優先順序（同一目標倉有多個來源時，數字小優先）';
COMMENT ON COLUMN "nx03_auto_replenish"."is_active" IS '是否啟用（通常 TRUE；若某庫位停用可控制）';
COMMENT ON COLUMN "nx03_auto_replenish"."remark" IS '備註';
COMMENT ON COLUMN "nx03_auto_replenish"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_auto_replenish"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_auto_replenish"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_auto_replenish"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03Init  →  nx03_init
COMMENT ON TABLE "nx03_init" IS '期初庫存單單頭——建檔期初存量。';
COMMENT ON COLUMN "nx03_init"."id" IS '[NX03]+[INHD]+[7碼流水號]，EX : NX03INHD0000001';
COMMENT ON COLUMN "nx03_init"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_init"."doc_no" IS '開帳單號（唯一），[IN]+[年月]+[倉別]+[5碼流水號]，EX：IN-202602-Z01-00001';
COMMENT ON COLUMN "nx03_init"."init_date" IS '開帳日期';
COMMENT ON COLUMN "nx03_init"."warehouse_id" IS '倉庫 ID (外鍵)';
COMMENT ON COLUMN "nx03_init"."status" IS 'D=草稿 / P=已過帳 / V=作廢';
COMMENT ON COLUMN "nx03_init"."remark" IS '備註';
COMMENT ON COLUMN "nx03_init"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_init"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_init"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_init"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_init"."posted_at" IS '過帳時間（POSTED 才有）';
COMMENT ON COLUMN "nx03_init"."posted_by" IS '過帳人（POSTED 才有）';
COMMENT ON COLUMN "nx03_init"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx03_init"."voided_by" IS '作廢人（使用者 ID）';

-- Nx03InitItem  →  nx03_init_item
COMMENT ON TABLE "nx03_init_item" IS '期初庫存單明細行。';
COMMENT ON COLUMN "nx03_init_item"."id" IS '[NX03]+[INIT]+[7碼流水號]，EX : NX03INIT0000001';
COMMENT ON COLUMN "nx03_init_item"."init_id" IS '對應開帳單表頭 ID';
COMMENT ON COLUMN "nx03_init_item"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx03_init_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx03_init_item"."part_no" IS '料號快照（歷史查價/避免主檔改動）';
COMMENT ON COLUMN "nx03_init_item"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx03_init_item"."part_version_id" IS '過帳當下 part 版本快照 FK（NX01-17 範式、AUDIT-04 B2 配套、Q-S1=B 既有歷史 row 留 null、新 row 帶入）';
COMMENT ON COLUMN "nx03_init_item"."location_id" IS '開帳庫位';
COMMENT ON COLUMN "nx03_init_item"."qty" IS '開帳數量（>0）';
COMMENT ON COLUMN "nx03_init_item"."unit_cost" IS '開帳均價（>0）';
COMMENT ON COLUMN "nx03_init_item"."total_cost" IS '開帳總價（qty × unit_cost）';
COMMENT ON COLUMN "nx03_init_item"."remark" IS '備註';
COMMENT ON COLUMN "nx03_init_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_init_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_init_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_init_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03Parcel  →  nx03_parcel
COMMENT ON TABLE "nx03_parcel" IS '包裹——包貨產生的箱／件。';
COMMENT ON COLUMN "nx03_parcel"."id" IS '[NX03]+[PARC]+[7碼流水號]，EX : NX03PARC0000001';
COMMENT ON COLUMN "nx03_parcel"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx03_parcel"."pl_id" IS '對應包貨單ID（FK nx03_pl）。';
COMMENT ON COLUMN "nx03_parcel"."parcel_no" IS '包裹編號（唯一），統一格式：BX-[年月]-[出庫倉庫]-[5碼流水號]，EX：BX-202604-Z01-00001。所有出貨類型（配送/自取/寄貨/調撥）統一使用此格式。';
COMMENT ON COLUMN "nx03_parcel"."parcel_type" IS '包裹類型（D=配送/P=自取/C=寄貨/T=調撥）。自取為簡易包裝，客戶現場核對後封箱。';
COMMENT ON COLUMN "nx03_parcel"."from_warehouse_id" IS '來源倉庫ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx03_parcel"."to_warehouse_id" IS '目標倉庫ID（調撥時填入，FK nx01_warehouse）。';
COMMENT ON COLUMN "nx03_parcel"."to_partner_id" IS '收貨客戶ID（寄貨時填入，FK nx01_partner）。';
COMMENT ON COLUMN "nx03_parcel"."logistics_tracking_no" IS '對應第三方物流單號（寄貨時填入，與nx03_pl.logistics_tracking_no對應）。';
COMMENT ON COLUMN "nx03_parcel"."weight_kg" IS '包裹重量（公斤，選填）。';
COMMENT ON COLUMN "nx03_parcel"."remark" IS '備註（如：大型物件、易碎品）。';
COMMENT ON COLUMN "nx03_parcel"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_parcel"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_parcel"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_parcel"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03PartStockSetting  →  nx03_part_stock_setting
COMMENT ON TABLE "nx03_part_stock_setting" IS '零件庫存設定——安全存量／補貨點。';
COMMENT ON COLUMN "nx03_part_stock_setting"."id" IS '[NX03]+[PSST]+[7碼流水號]，EX : NX03PSST0000001';
COMMENT ON COLUMN "nx03_part_stock_setting"."tenant_id" IS '租戶 ID（外鍵）(@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_part_stock_setting"."part_id" IS '零件 ID (@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_part_stock_setting"."warehouse_id" IS '倉庫 ID (@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_part_stock_setting"."min_qty" IS '安全量（低於此值觸發缺貨警示）';
COMMENT ON COLUMN "nx03_part_stock_setting"."max_qty" IS '最高量（建議補貨目標上限，0=不限制）';
COMMENT ON COLUMN "nx03_part_stock_setting"."reorder_qty" IS '建議補貨量（max_qty - on_hand_qty，0=不限制）';
COMMENT ON COLUMN "nx03_part_stock_setting"."is_active" IS '是否啟用（通常 TRUE；若某庫位停用可控制）';
COMMENT ON COLUMN "nx03_part_stock_setting"."remark" IS '備註';
COMMENT ON COLUMN "nx03_part_stock_setting"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_part_stock_setting"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_part_stock_setting"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_part_stock_setting"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_part_stock_setting"."calculation_frequency" IS 'AR 自動補貨計算頻率（天數、null=每天）。Crown Q-AR2 倉層級彈性頻率、AR-IMPL-01 M1 落地';
COMMENT ON COLUMN "nx03_part_stock_setting"."last_calculated_at" IS 'AR 自動補貨最後計算時間（scheduler 用、判斷下次該不該跑）';
COMMENT ON COLUMN "nx03_part_stock_setting"."calculation_window_days" IS 'AR 平均出貨計算窗口（天數、null=預設 90 天）。Crown Q-B2 升級倉層級彈性窗口';
COMMENT ON COLUMN "nx03_part_stock_setting"."default_location_id" IS '預設庫位 ID（NX03-STOCK-LITE M1：進貨上架建議用；null=未設定、UI 提示倉管選一個）';

-- Nx03Pk  →  nx03_pk
COMMENT ON TABLE "nx03_pk" IS '撿貨單單頭。';
COMMENT ON COLUMN "nx03_pk"."id" IS '[NX03]+[PKHD]+[7碼流水號]，EX : NX03PKHD0000001';
COMMENT ON COLUMN "nx03_pk"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx03_pk"."warehouse_id" IS '撿貨倉庫ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx03_pk"."doc_no" IS '撿貨單號（唯一），[PK]+[年月]+[倉別]+[5碼流水號]，EX：PK-202604-Z01-00001';
COMMENT ON COLUMN "nx03_pk"."pk_date" IS '撿貨日期。';
COMMENT ON COLUMN "nx03_pk"."trigger_source" IS '觸發來源（S=銷貨單SO/T=調撥單ST）。';
COMMENT ON COLUMN "nx03_pk"."delivery_type" IS '出貨方式（D=配送/P=自取/C=寄貨/T=調撥）。所有類型撿貨完成後統一進入包貨環節（I04），再依此欄位決定後續分流。';
COMMENT ON COLUMN "nx03_pk"."status" IS '狀態（P=待撿貨/C=撿貨中/F=已完成/V=作廢）。';
COMMENT ON COLUMN "nx03_pk"."pickup_code" IS '自取 BX 編號（delivery_type=P時產生），格式：BX-[年月]-[倉庫]-[流水]，EX：BX-202604-Z01-00001。客戶到場報 BX 編號後倉管取出，客戶核對料號後才封箱。';
COMMENT ON COLUMN "nx03_pk"."started_at" IS '撿貨開始時間（計時器啟動）。';
COMMENT ON COLUMN "nx03_pk"."completed_at" IS '撿貨完成時間（計時器結束）。';
COMMENT ON COLUMN "nx03_pk"."completed_by" IS '撿貨完成人（倉管專員，使用者ID）。';
COMMENT ON COLUMN "nx03_pk"."remark" IS '備註。';
COMMENT ON COLUMN "nx03_pk"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_pk"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_pk"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_pk"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03PkItem  →  nx03_pk_item
COMMENT ON TABLE "nx03_pk_item" IS '撿貨單明細行。';
COMMENT ON COLUMN "nx03_pk_item"."id" IS '[NX03]+[PKIT]+[7碼流水號]，EX : NX03PKIT0000001';
COMMENT ON COLUMN "nx03_pk_item"."pk_id" IS '對應撿貨單表頭ID（FK nx03_pk）。';
COMMENT ON COLUMN "nx03_pk_item"."ref_so_id" IS '關聯銷貨單ID（trigger_source=S時填入）。';
COMMENT ON COLUMN "nx03_pk_item"."ref_so_item_id" IS '關聯銷貨單明細ID。';
COMMENT ON COLUMN "nx03_pk_item"."ref_st_id" IS '關聯調撥單ID（trigger_source=T時填入）。';
COMMENT ON COLUMN "nx03_pk_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx03_pk_item"."part_id" IS '零件ID（FK nx01_part）。';
COMMENT ON COLUMN "nx03_pk_item"."part_no" IS '零件料號快照。';
COMMENT ON COLUMN "nx03_pk_item"."part_name" IS '零件名稱快照。';
COMMENT ON COLUMN "nx03_pk_item"."location_id" IS '撿貨庫位ID（FK nx01_location）。';
COMMENT ON COLUMN "nx03_pk_item"."qty" IS '應撿數量。';
COMMENT ON COLUMN "nx03_pk_item"."status" IS '明細狀態（P=待撿/C=已完成/M=找不到貨）。';
COMMENT ON COLUMN "nx03_pk_item"."not_found_reason" IS '找不到貨原因（status=M時必填）。';
COMMENT ON COLUMN "nx03_pk_item"."label_checked" IS '貼紙確認是否完成（依return_policy確認對應貼紙）。';
COMMENT ON COLUMN "nx03_pk_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_pk_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_pk_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03Pl  →  nx03_pl
COMMENT ON TABLE "nx03_pl" IS '包貨單單頭（裝箱）。';
COMMENT ON COLUMN "nx03_pl"."id" IS '[NX03]+[PLHD]+[7碼流水號]，EX : NX03PLHD0000001';
COMMENT ON COLUMN "nx03_pl"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx03_pl"."warehouse_id" IS '出貨倉庫ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx03_pl"."doc_no" IS '包貨單號（唯一），[PL]+[年月]+[倉別]+[5碼流水號]，EX：PL-202604-Z01-00001';
COMMENT ON COLUMN "nx03_pl"."pl_date" IS '包貨日期。';
COMMENT ON COLUMN "nx03_pl"."pk_id" IS '來源撿貨單ID（FK nx03_pk）。';
COMMENT ON COLUMN "nx03_pl"."pl_type" IS '包貨類型（D=配送/P=自取/C=寄貨/T=調撥）。所有出貨類型均需經過包貨環節。';
COMMENT ON COLUMN "nx03_pl"."status" IS '狀態（P=待包貨/C=包貨中/F=已完成/S=已寄出/V=作廢）。';
COMMENT ON COLUMN "nx03_pl"."logistics_provider" IS '第三方物流業者名稱（pl_type=C時填入）。';
COMMENT ON COLUMN "nx03_pl"."logistics_tracking_no" IS '第三方物流單號（寄出後倉管組長填入）。';
COMMENT ON COLUMN "nx03_pl"."shipped_at" IS '寄出時間（倉管組長確認交付物流後填入）。';
COMMENT ON COLUMN "nx03_pl"."shipped_by" IS '寄出確認人（倉管組長，使用者ID）。';
COMMENT ON COLUMN "nx03_pl"."started_at" IS '包貨開始時間（計時器啟動）。';
COMMENT ON COLUMN "nx03_pl"."completed_at" IS '包貨完成時間（計時器結束）。';
COMMENT ON COLUMN "nx03_pl"."completed_by" IS '包貨完成人（倉管專員，使用者ID）。';
COMMENT ON COLUMN "nx03_pl"."remark" IS '備註。';
COMMENT ON COLUMN "nx03_pl"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_pl"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_pl"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_pl"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03PlItem  →  nx03_pl_item
COMMENT ON TABLE "nx03_pl_item" IS '包貨單明細行。';
COMMENT ON COLUMN "nx03_pl_item"."id" IS '[NX03]+[PLIT]+[7碼流水號]，EX : NX03PLIT0000001';
COMMENT ON COLUMN "nx03_pl_item"."pl_id" IS '對應包貨單表頭ID（FK nx03_pl）。';
COMMENT ON COLUMN "nx03_pl_item"."parcel_id" IS '對應包裹ID（FK nx03_parcel）。';
COMMENT ON COLUMN "nx03_pl_item"."pk_item_id" IS '對應撿貨明細ID（FK nx03_pk_item）。';
COMMENT ON COLUMN "nx03_pl_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx03_pl_item"."part_id" IS '零件ID（FK nx01_part）。';
COMMENT ON COLUMN "nx03_pl_item"."part_no" IS '零件料號快照。';
COMMENT ON COLUMN "nx03_pl_item"."part_name" IS '零件名稱快照。';
COMMENT ON COLUMN "nx03_pl_item"."qty" IS '包裝數量。';
COMMENT ON COLUMN "nx03_pl_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx03_pl_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_pl_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_pl_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03Shortage  →  nx03_shortage
COMMENT ON TABLE "nx03_shortage" IS '缺貨紀錄——銷貨缺貨待補。';
COMMENT ON COLUMN "nx03_shortage"."id" IS '[NX03]+[SHOR]+[7碼流水號]，EX : NX03SHOR0000001';
COMMENT ON COLUMN "nx03_shortage"."tenant_id" IS '租戶 ID（外鍵）(@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_shortage"."part_id" IS '零件 ID (@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_shortage"."warehouse_id" IS '缺貨倉庫 ID (@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_shortage"."on_hand_qty" IS '發現時的現存量快照';
COMMENT ON COLUMN "nx03_shortage"."min_qty" IS '安全量快照';
COMMENT ON COLUMN "nx03_shortage"."shortage_qty" IS '缺貨量（min_qty - on_hand_qty）';
COMMENT ON COLUMN "nx03_shortage"."suggest_order_qty" IS '建議訂購量（max_qty - on_hand_qty）';
COMMENT ON COLUMN "nx03_shortage"."status" IS '狀態。( O=OPEN / R=RFQ已建立 / C=CLOSED / I=IGNORED )';
COMMENT ON COLUMN "nx03_shortage"."ref_rfq_id" IS '關聯 RFQ（轉 RFQ 後填入）';
COMMENT ON COLUMN "nx03_shortage"."detected_at" IS '偵測時間（系統自動產生）';
COMMENT ON COLUMN "nx03_shortage"."resolved_at" IS '解決時間（CLOSED 時填入）';
COMMENT ON COLUMN "nx03_shortage"."remark" IS '備註';
COMMENT ON COLUMN "nx03_shortage"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_shortage"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_shortage"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_shortage"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03St  →  nx03_st
COMMENT ON TABLE "nx03_st" IS '調撥單單頭——倉對倉移轉。';
COMMENT ON COLUMN "nx03_st"."id" IS '[NX03]+[STHD]+[7碼流水號]，EX : NX03STHD0000001';
COMMENT ON COLUMN "nx03_st"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_st"."doc_no" IS '調撥單號（唯一），[ST]+[年月]+[倉別]+[5碼流水號]，EX：ST-202602-Z01-00001';
COMMENT ON COLUMN "nx03_st"."legacy_doc_no" IS '舊系統原單號（偉盟 RSIM.ROREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G1 偉盟匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx03_st"."st_date" IS '調撥日期';
COMMENT ON COLUMN "nx03_st"."from_warehouse_id" IS '來源倉庫 (外鍵)';
COMMENT ON COLUMN "nx03_st"."to_warehouse_id" IS '目標倉庫 (外鍵)';
COMMENT ON COLUMN "nx03_st"."status" IS 'DRAFT / TRANSIT / RECEIVED / CANCELLED';
COMMENT ON COLUMN "nx03_st"."remark" IS '備註';
COMMENT ON COLUMN "nx03_st"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_st"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_st"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_st"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_st"."posted_at" IS '過帳時間（POSTED 才有）';
COMMENT ON COLUMN "nx03_st"."posted_by" IS '過帳人（POSTED 才有）';
COMMENT ON COLUMN "nx03_st"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx03_st"."voided_by" IS '作廢人（使用者 ID）';
COMMENT ON COLUMN "nx03_st"."st_type" IS '調撥類型（A=自動配貨系統產生/M=手動申請）。';
COMMENT ON COLUMN "nx03_st"."trigger_source" IS '觸發來源（R=進貨後自動配貨/S=SO銷貨需求缺貨/M=手動）。';
COMMENT ON COLUMN "nx03_st"."ref_so_id" IS '關聯銷貨單ID（trigger_source=S時填入）。';
COMMENT ON COLUMN "nx03_st"."ref_rr_id" IS '關聯進貨單ID（trigger_source=R時填入）。';
COMMENT ON COLUMN "nx03_st"."approved_at" IS '他倉倉管組長審核核准時間。';
COMMENT ON COLUMN "nx03_st"."approved_by" IS '核准人（他倉倉管組長，使用者ID）。';
COMMENT ON COLUMN "nx03_st"."received_at" IS '目標倉確認收貨時間（計時器結束時間）。';
COMMENT ON COLUMN "nx03_st"."received_by" IS '收貨確認人（目標倉倉管專員，使用者ID）。';

-- Nx03StItem  →  nx03_st_item
COMMENT ON TABLE "nx03_st_item" IS '調撥單明細行。';
COMMENT ON COLUMN "nx03_st_item"."id" IS '[NX03]+[STIT]+[7碼流水號]，EX : NX03STIT0000001';
COMMENT ON COLUMN "nx03_st_item"."st_id" IS '對應調撥單表頭 ID';
COMMENT ON COLUMN "nx03_st_item"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx03_st_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx03_st_item"."part_no" IS '料號快照（歷史查價/避免主檔改動）';
COMMENT ON COLUMN "nx03_st_item"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx03_st_item"."brand_id" IS '品牌快照（FK nx01_brand、可空） W6 [3-8] Phase 5 2026-06-06 品牌合併：取代舊 partBrandId';
COMMENT ON COLUMN "nx03_st_item"."from_location_id" IS '出貨庫位';
COMMENT ON COLUMN "nx03_st_item"."to_location_id" IS '目標庫位';
COMMENT ON COLUMN "nx03_st_item"."qty" IS '銷貨數量';
COMMENT ON COLUMN "nx03_st_item"."unit_cost" IS '出庫成本（過帳時寫入；預設抓 stock_balance.avg_cost）';
COMMENT ON COLUMN "nx03_st_item"."remark" IS '備註';
COMMENT ON COLUMN "nx03_st_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_st_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_st_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_st_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_st_item"."received_qty" IS '實際收到數量（目標倉確認收貨後填入）。若與qty不符需通知倉管組長處理。';
COMMENT ON COLUMN "nx03_st_item"."source_so_item_id" IS '來源銷貨明細 ID（可空：手動調撥無對應 SO；SO 觸發必填）。反向追蹤這個 ST 明細是為了哪張 SO 的哪個 line 而存在。Phase 0 D3 新增、2026-04-25 改 nullable（trans-table CHECK 不可行，application-layer 自律）。';
COMMENT ON COLUMN "nx03_st_item"."part_version_id" IS '過帳當下 part 版本快照 FK（NX01-17 範式、AUDIT-04 B2 配套、Q-S1=B 既有歷史 row 留 null、新 row 帶入）';

-- Nx03StockBalance  →  nx03_stock_balance
COMMENT ON TABLE "nx03_stock_balance" IS '庫存餘額——各倉各料即時存量（存貨子帳餘額）。';
COMMENT ON COLUMN "nx03_stock_balance"."id" IS '[NX03]+[STBL]+[7碼流水號]，EX : NX03STBL0000001';
COMMENT ON COLUMN "nx03_stock_balance"."tenant_id" IS '租戶 ID（外鍵）(@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_stock_balance"."part_id" IS '零件 ID (@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_stock_balance"."warehouse_id" IS '倉庫 ID (@@unique([tenantId, partId, warehouseId]))';
COMMENT ON COLUMN "nx03_stock_balance"."on_hand_qty" IS '現存量（實際在架數量，可為負值）';
COMMENT ON COLUMN "nx03_stock_balance"."reserved_qty" IS '已佔用量（已開銷貨單但未出庫，LITE）';
COMMENT ON COLUMN "nx03_stock_balance"."available_qty" IS '可用量 = on_hand_qty - reserved_qty（存 DB，同步更新）';
COMMENT ON COLUMN "nx03_stock_balance"."in_transit_qty" IS '調撥中數量（已出來源倉但未到目標倉，PLUS）';
COMMENT ON COLUMN "nx03_stock_balance"."avg_cost" IS '移動平均成本';
COMMENT ON COLUMN "nx03_stock_balance"."stock_value" IS '庫存總值（on_hand_qty * avg_cost）';
COMMENT ON COLUMN "nx03_stock_balance"."last_in_at" IS '最近一次入庫時間（PO/調整入）';
COMMENT ON COLUMN "nx03_stock_balance"."last_out_at" IS '最近一次出庫時間（SO/調整出）';
COMMENT ON COLUMN "nx03_stock_balance"."last_move_at" IS '最近一次異動時間（任一 IN/OUT/ADJUST）';
COMMENT ON COLUMN "nx03_stock_balance"."is_active" IS '是否啟用（通常 TRUE；若某庫位停用可控制）';
COMMENT ON COLUMN "nx03_stock_balance"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_stock_balance"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_stock_balance"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_stock_balance"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx03StockLedger  →  nx03_stock_ledger
COMMENT ON TABLE "nx03_stock_ledger" IS '庫存異動帳——每筆進出流水（存貨子帳明細）。';
COMMENT ON COLUMN "nx03_stock_ledger"."id" IS '[NX03]+[STLE]+[7碼流水號]，EX : NX03STLE0000001';
COMMENT ON COLUMN "nx03_stock_ledger"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_stock_ledger"."movement_date" IS '異動時間';
COMMENT ON COLUMN "nx03_stock_ledger"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx03_stock_ledger"."warehouse_id" IS '倉庫 ID';
COMMENT ON COLUMN "nx03_stock_ledger"."location_id" IS '庫位 ID';
COMMENT ON COLUMN "nx03_stock_ledger"."movement_type" IS '異動類型。( I=IN, O=OUT, A=ADJUST )';
COMMENT ON COLUMN "nx03_stock_ledger"."qty_in" IS '入庫數量';
COMMENT ON COLUMN "nx03_stock_ledger"."qty_out" IS '出庫數量';
COMMENT ON COLUMN "nx03_stock_ledger"."unit_cost" IS '異動單位成本';
COMMENT ON COLUMN "nx03_stock_ledger"."total_cost" IS '異動總成本（qty差 * unit_cost）';
COMMENT ON COLUMN "nx03_stock_ledger"."balance_qty" IS '異動後庫存數量（可選擇存或即時計算）';
COMMENT ON COLUMN "nx03_stock_ledger"."balance_cost" IS '異動後平均成本（移動平均）';
COMMENT ON COLUMN "nx03_stock_ledger"."source_module" IS '來源模組：NX02（採購）/ NX03（庫存）/ NX04（銷售）';
COMMENT ON COLUMN "nx03_stock_ledger"."source_doc_type" IS '來源單據類型（P=進貨RR / S=銷貨SO / T=盤點 / I=開帳存 / X=調撥 / R=退貨）';
COMMENT ON COLUMN "nx03_stock_ledger"."source_doc_id" IS '來源單據 ID';
COMMENT ON COLUMN "nx03_stock_ledger"."source_item_id" IS '來源明細 ID';
COMMENT ON COLUMN "nx03_stock_ledger"."part_version_id" IS '過帳當下 part 版本快照 FK（NX01-17 範式、AUDIT-04 B2+B6 配套、Q-S1=B 既有歷史 row 留 null、新 row helper 帶入）';
COMMENT ON COLUMN "nx03_stock_ledger"."created_at" IS '建立時間';

-- Nx03StockTake  →  nx03_stock_take
COMMENT ON TABLE "nx03_stock_take" IS '盤點單單頭。';
COMMENT ON COLUMN "nx03_stock_take"."id" IS '[NX03]+[STTK]+[7碼流水號]，EX : NX03STTK0000001';
COMMENT ON COLUMN "nx03_stock_take"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_stock_take"."doc_no" IS '盤點單號（唯一），[SL]+[年月]+[倉別]+[5碼流水號]，EX：SL-202602-Z01-00001';
COMMENT ON COLUMN "nx03_stock_take"."legacy_doc_no" IS '舊系統原單號（偉盟 RSIM.ROREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G1 偉盟匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx03_stock_take"."stock_take_date" IS '盤點日期';
COMMENT ON COLUMN "nx03_stock_take"."warehouse_id" IS '盤點倉庫（LITE 先以單倉/單次盤點為主）';
COMMENT ON COLUMN "nx03_stock_take"."scope_type" IS '盤點範圍。( F=FULL（全倉）, P=PARTIAL（指定料號/庫位）)';
COMMENT ON COLUMN "nx03_stock_take"."status" IS '狀態（DRAFT / COUNTING / ADJUSTING / POSTED / CANCELLED）';
COMMENT ON COLUMN "nx03_stock_take"."remark" IS '備註';
COMMENT ON COLUMN "nx03_stock_take"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_stock_take"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_stock_take"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_stock_take"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_stock_take"."posted_at" IS '過帳時間（POSTED 才有）';
COMMENT ON COLUMN "nx03_stock_take"."posted_by" IS '過帳人（POSTED 才有）';
COMMENT ON COLUMN "nx03_stock_take"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx03_stock_take"."voided_by" IS '作廢人（使用者 ID）';
COMMENT ON COLUMN "nx03_stock_take"."scope_detail" IS '盤點範圍明細（scope_type=P時填入），例如：指定料號清單、庫位代碼、零件族群代碼。';
COMMENT ON COLUMN "nx03_stock_take"."started_at" IS '盤點開始時間（點擊開始盤點時記錄，計時器啟動）。';
COMMENT ON COLUMN "nx03_stock_take"."approved_at" IS '負責人審核差異報告核准時間。';
COMMENT ON COLUMN "nx03_stock_take"."approved_by" IS '負責人核准人（使用者ID）。';
COMMENT ON COLUMN "nx03_stock_take"."snapshot_started_at" IS '動態盤點 snapshot 起點時間（M2、Q-B3=A 不凍結業務、application 層即時聚合 stock_ledger 計算 deltaQty 的時間範圍 lower bound）';
COMMENT ON COLUMN "nx03_stock_take"."snapshot_ended_at" IS '動態盤點 snapshot 終點時間（M2、deltaQty 計算時間範圍 upper bound、null 表盤點未結束）';
COMMENT ON COLUMN "nx03_stock_take"."small_tolerance_qty" IS '差異核可小門檻（NX03-STOCK-LITE M1：|realDiffQty × unitCost| ≤ 此值倉管自過、超過走負責人 G 簽核；單張盤點可自訂、預設 0）';
COMMENT ON COLUMN "nx03_stock_take"."approval_status" IS '核可流程狀態（NX03-STOCK-LITE M1：N=not_required 小門檻自過 / P=pending 等簽核 / A=approved 已核可 / R=rejected 退回；POSTED 前必走完）';

-- Nx03StockTakeItem  →  nx03_stock_take_item
COMMENT ON TABLE "nx03_stock_take_item" IS '盤點單明細行。';
COMMENT ON COLUMN "nx03_stock_take_item"."id" IS '[NX03]+[STTI]+[7碼流水號]，EX : NX03STTI0000001';
COMMENT ON COLUMN "nx03_stock_take_item"."stock_take_id" IS '對應盤點單表頭 ID';
COMMENT ON COLUMN "nx03_stock_take_item"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx03_stock_take_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx03_stock_take_item"."part_no" IS '零件料號快照';
COMMENT ON COLUMN "nx03_stock_take_item"."part_name" IS '零件名稱快照';
COMMENT ON COLUMN "nx03_stock_take_item"."warehouse_id" IS '盤點倉庫 ID（通常等於表頭倉庫）';
COMMENT ON COLUMN "nx03_stock_take_item"."location_id" IS '盤點庫位 ID';
COMMENT ON COLUMN "nx03_stock_take_item"."system_qty" IS '系統數量（盤點當下抓 balance.on_hand_qty 快照）';
COMMENT ON COLUMN "nx03_stock_take_item"."counted_qty" IS '盤點數量（使用者輸入）';
COMMENT ON COLUMN "nx03_stock_take_item"."diff_qty" IS '差異數量（counted_qty - system_qty）';
COMMENT ON COLUMN "nx03_stock_take_item"."unit_cost" IS '調整成本（預設抓 balance.avg_cost 快照）';
COMMENT ON COLUMN "nx03_stock_take_item"."diff_cost" IS '差異金額（abs(diff_qty) * unit_cost，或 diff_qty * unit_cost 由你決定）';
COMMENT ON COLUMN "nx03_stock_take_item"."adjust_type" IS '調整類型。( I=IN, O=OUT, N=NONE ) ※ diff_qty=0 時 NONE）';
COMMENT ON COLUMN "nx03_stock_take_item"."status" IS '狀態。( O=OPEN, P=POSTED, S=SKIPPED )';
COMMENT ON COLUMN "nx03_stock_take_item"."remark" IS '備註';
COMMENT ON COLUMN "nx03_stock_take_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx03_stock_take_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_stock_take_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx03_stock_take_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx03_stock_take_item"."counted_at" IS '每筆實際填入時間點（即時差異計算的關鍵欄位）。系統在此時間點計算該料號的真實差異，避免盤點期間進出貨造成的誤差。';
COMMENT ON COLUMN "nx03_stock_take_item"."dispose_type" IS '差異處置方式（W=報廢/R=零件重組/D=瑕疵品/U=中古件）。diff_qty≠0時必填。';
COMMENT ON COLUMN "nx03_stock_take_item"."dispose_remark" IS '處置說明（diff_qty≠0時必填）。例：外觀損壞無法銷售、拆解後可利用零件。';
COMMENT ON COLUMN "nx03_stock_take_item"."part_version_id" IS '過帳當下 part 版本快照 FK（NX01-17 範式、AUDIT-04 B2 配套、Q-S1=B 既有歷史 row 留 null、新 row 過帳時帶入）';
COMMENT ON COLUMN "nx03_stock_take_item"."snapshot_qty" IS '動態盤點 snapshot 鎖定基準量（M2、盤點啟動瞬間 balance.onHandQty 快照、Q-S2=A 既有 systemQty 並存漸進）';
COMMENT ON COLUMN "nx03_stock_take_item"."delta_qty" IS '動態盤點期間異動加總（M2、Q-B3=A application 層即時聚合 stock_ledger BETWEEN snapshotStartedAt AND snapshotEndedAt）';
COMMENT ON COLUMN "nx03_stock_take_item"."formula_expected_qty" IS '動態盤點公式應有量（M2、= snapshotQty + deltaQty、即時算）';
COMMENT ON COLUMN "nx03_stock_take_item"."real_diff_qty" IS '動態盤點真實誤差（M2、= countedQty - formulaExpectedQty、寫帳基準、≠0 才寫 ledger source=T）';
COMMENT ON COLUMN "nx03_stock_take_item"."variance_reason_code" IS '差異原因代碼（NX03-STOCK-LITE M1：S=Stolen 被偷 / M=Miscount 算錯 / B=Broken 破損 / U=Unknown 不明；realDiffQty≠0 時必填、application 自律）';

-- Nx03Inbound  →  nx03_inbound
COMMENT ON TABLE "nx03_inbound" IS '入庫單單頭——通用入庫。';
COMMENT ON COLUMN "nx03_inbound"."id" IS '[NX03]+[IBHT]+[7碼流水號]，EX : NX03IBHT0000001';
COMMENT ON COLUMN "nx03_inbound"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx03_inbound"."doc_no" IS '入庫單號';
COMMENT ON COLUMN "nx03_inbound"."warehouse_id" IS '入庫倉庫 ID（FK nx01_warehouse）';
COMMENT ON COLUMN "nx03_inbound"."inbound_date" IS '入庫日期';
COMMENT ON COLUMN "nx03_inbound"."status" IS '單據狀態';
COMMENT ON COLUMN "nx03_inbound"."remark" IS '備註';
COMMENT ON COLUMN "nx03_inbound"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx03_inbound"."voided_by" IS '作廢人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_inbound"."posted_at" IS '過帳時間';
COMMENT ON COLUMN "nx03_inbound"."posted_by" IS '過帳人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_inbound"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_inbound"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_inbound"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx03_inbound"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx03InboundItem  →  nx03_inbound_item
COMMENT ON TABLE "nx03_inbound_item" IS '入庫單明細行。';
COMMENT ON COLUMN "nx03_inbound_item"."id" IS '[NX03]+[IBIT]+[7碼流水號]，EX : NX03IBIT0000001';
COMMENT ON COLUMN "nx03_inbound_item"."inbound_id" IS '入庫單 ID（FK nx03_inbound）';
COMMENT ON COLUMN "nx03_inbound_item"."line_no" IS '行號';
COMMENT ON COLUMN "nx03_inbound_item"."part_id" IS '零件 ID（FK nx01_part）';
COMMENT ON COLUMN "nx03_inbound_item"."part_no" IS '料號（快照）';
COMMENT ON COLUMN "nx03_inbound_item"."part_name" IS '品名（快照）';
COMMENT ON COLUMN "nx03_inbound_item"."location_id" IS '儲位 ID（FK nx01_location）';
COMMENT ON COLUMN "nx03_inbound_item"."qty" IS '入庫數量';
COMMENT ON COLUMN "nx03_inbound_item"."unit_cost" IS '單位成本';
COMMENT ON COLUMN "nx03_inbound_item"."line_amount" IS '行金額';
COMMENT ON COLUMN "nx03_inbound_item"."remark" IS '備註';
COMMENT ON COLUMN "nx03_inbound_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_inbound_item"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_inbound_item"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx03_inbound_item"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx03Outbound  →  nx03_outbound
COMMENT ON TABLE "nx03_outbound" IS '出庫單單頭——通用出庫。';
COMMENT ON COLUMN "nx03_outbound"."id" IS '[NX03]+[OBHT]+[7碼流水號]，EX : NX03OBHT0000001';
COMMENT ON COLUMN "nx03_outbound"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx03_outbound"."doc_no" IS '出庫單號';
COMMENT ON COLUMN "nx03_outbound"."warehouse_id" IS '出庫倉庫 ID（FK nx01_warehouse）';
COMMENT ON COLUMN "nx03_outbound"."outbound_date" IS '出庫日期';
COMMENT ON COLUMN "nx03_outbound"."status" IS '單據狀態';
COMMENT ON COLUMN "nx03_outbound"."remark" IS '備註';
COMMENT ON COLUMN "nx03_outbound"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx03_outbound"."voided_by" IS '作廢人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_outbound"."shipped_at" IS '出貨時間';
COMMENT ON COLUMN "nx03_outbound"."shipped_by" IS '出貨人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_outbound"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_outbound"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_outbound"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx03_outbound"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx03OutboundItem  →  nx03_outbound_item
COMMENT ON TABLE "nx03_outbound_item" IS '出庫單明細行。';
COMMENT ON COLUMN "nx03_outbound_item"."id" IS '[NX03]+[OBIT]+[7碼流水號]，EX : NX03OBIT0000001';
COMMENT ON COLUMN "nx03_outbound_item"."outbound_id" IS '出庫單 ID（FK nx03_outbound）';
COMMENT ON COLUMN "nx03_outbound_item"."line_no" IS '行號';
COMMENT ON COLUMN "nx03_outbound_item"."part_id" IS '零件 ID（FK nx01_part）';
COMMENT ON COLUMN "nx03_outbound_item"."part_no" IS '料號（快照）';
COMMENT ON COLUMN "nx03_outbound_item"."part_name" IS '品名（快照）';
COMMENT ON COLUMN "nx03_outbound_item"."location_id" IS '儲位 ID（FK nx01_location）';
COMMENT ON COLUMN "nx03_outbound_item"."qty" IS '出庫數量';
COMMENT ON COLUMN "nx03_outbound_item"."unit_cost" IS '單位成本';
COMMENT ON COLUMN "nx03_outbound_item"."line_amount" IS '行金額';
COMMENT ON COLUMN "nx03_outbound_item"."remark" IS '備註';
COMMENT ON COLUMN "nx03_outbound_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_outbound_item"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx03_outbound_item"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx03_outbound_item"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx03Disposal  →  nx03_disposal
COMMENT ON TABLE "nx03_disposal" IS '報廢單表頭（NX03-IMPL-01 M3、Crown Q-B1=A 不簽核、倉管直接過帳） 對應 overview §3.3 #8 報廢出庫、source=W';
COMMENT ON COLUMN "nx03_disposal"."id" IS '[NX03]+[DSHD]+[7碼流水號]，EX : NX03DSHD0000001';
COMMENT ON COLUMN "nx03_disposal"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_disposal"."doc_no" IS '報廢單號（唯一），[DS]+[年月]+[倉別]+[5碼流水號]，EX：DS-202605-Z01-00001';
COMMENT ON COLUMN "nx03_disposal"."legacy_doc_no" IS '舊系統原單號（偉盟 RSIM.ROREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G1 偉盟匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx03_disposal"."warehouse_id" IS '報廢倉庫';
COMMENT ON COLUMN "nx03_disposal"."disposal_date" IS '報廢日期';
COMMENT ON COLUMN "nx03_disposal"."status" IS '狀態（DRAFT / POSTED / VOIDED）';
COMMENT ON COLUMN "nx03_disposal"."remark" IS '備註';
COMMENT ON COLUMN "nx03_disposal"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_disposal"."created_by" IS '建立人';
COMMENT ON COLUMN "nx03_disposal"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx03_disposal"."updated_by" IS '更新人';
COMMENT ON COLUMN "nx03_disposal"."posted_at" IS '過帳時間（POSTED 才有）';
COMMENT ON COLUMN "nx03_disposal"."posted_by" IS '過帳人（POSTED 才有）';
COMMENT ON COLUMN "nx03_disposal"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx03_disposal"."voided_by" IS '作廢人';
COMMENT ON COLUMN "nx03_disposal"."source_issue_report_id" IS 'W5 異常鏈 Step 3 2026-07-11 加：來源異常回報單 ID（軟連結 nx03_issue_report、不建 FK）。IR dispose 一鍵開單 / 手動連結時 service 回填；報廢過帳時回寫 IR 自動結案；來源 IR 帳已調（盤點/銷退）時過帳免扣帳（防重複扣）。';

-- Nx03DisposalItem  →  nx03_disposal_item
COMMENT ON TABLE "nx03_disposal_item" IS '報廢單明細（disposalReason A=損壞 / B=過期 / C=瑕疵 / D=其他、Hank 自決 enum、待 Crown review 可調）';
COMMENT ON COLUMN "nx03_disposal_item"."id" IS '[NX03]+[DSIT]+[7碼流水號]，EX : NX03DSIT0000001';
COMMENT ON COLUMN "nx03_disposal_item"."disposal_id" IS '對應報廢單表頭 ID';
COMMENT ON COLUMN "nx03_disposal_item"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx03_disposal_item"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx03_disposal_item"."part_no" IS '料號快照';
COMMENT ON COLUMN "nx03_disposal_item"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx03_disposal_item"."part_version_id" IS '過帳當下 part 版本快照 FK（M1 配套、Q-S1=B 既有 null、新 row 帶入）';
COMMENT ON COLUMN "nx03_disposal_item"."location_id" IS '報廢庫位';
COMMENT ON COLUMN "nx03_disposal_item"."qty" IS '報廢數量（>0）';
COMMENT ON COLUMN "nx03_disposal_item"."unit_cost" IS '報廢單位成本（過帳時抓 stock_balance.avg_cost）';
COMMENT ON COLUMN "nx03_disposal_item"."total_cost" IS '報廢總成本（qty × unit_cost）';
COMMENT ON COLUMN "nx03_disposal_item"."disposal_reason" IS '報廢原因（A=損壞/B=過期/C=瑕疵/D=其他）';
COMMENT ON COLUMN "nx03_disposal_item"."disposal_remark" IS '報廢說明（reason=D 其他時必填、application-layer 自律）';
COMMENT ON COLUMN "nx03_disposal_item"."remark" IS '備註';
COMMENT ON COLUMN "nx03_disposal_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_disposal_item"."created_by" IS '建立人';
COMMENT ON COLUMN "nx03_disposal_item"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx03_disposal_item"."updated_by" IS '更新人';

-- Nx03Conversion  →  nx03_conversion
COMMENT ON TABLE "nx03_conversion" IS '重組 / 分解轉換單表頭（NX03-IMPL-01 M4） conversionType: M=merge 重組（N inputs → 1 output）/ D=disassemble 分解（1 input → N outputs） 對應 overview §3.3 #9 重組 source=M / #10 分解 source=D 對應拍板 Q-M4-1=a 重組 output unitCost = Σ (input.unitCost × input.qty) 加權公式（service 層 impl）';
COMMENT ON COLUMN "nx03_conversion"."id" IS '[NX03]+[CVHD]+[7碼流水號]，EX : NX03CVHD0000001';
COMMENT ON COLUMN "nx03_conversion"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_conversion"."doc_no" IS '轉換單號（唯一），[CV]+[年月]+[倉別]+[5碼流水號]，EX：CV-202605-Z01-00001';
COMMENT ON COLUMN "nx03_conversion"."warehouse_id" IS '操作倉庫';
COMMENT ON COLUMN "nx03_conversion"."conversion_date" IS '轉換日期';
COMMENT ON COLUMN "nx03_conversion"."conversion_type" IS '轉換類型（M=merge 重組 / D=disassemble 分解）';
COMMENT ON COLUMN "nx03_conversion"."status" IS '狀態（DRAFT / POSTED / VOIDED）';
COMMENT ON COLUMN "nx03_conversion"."remark" IS '備註';
COMMENT ON COLUMN "nx03_conversion"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_conversion"."created_by" IS '建立人';
COMMENT ON COLUMN "nx03_conversion"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx03_conversion"."updated_by" IS '更新人';
COMMENT ON COLUMN "nx03_conversion"."posted_at" IS '過帳時間（POSTED 才有）';
COMMENT ON COLUMN "nx03_conversion"."posted_by" IS '過帳人（POSTED 才有）';
COMMENT ON COLUMN "nx03_conversion"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx03_conversion"."voided_by" IS '作廢人';
COMMENT ON COLUMN "nx03_conversion"."source_issue_report_id" IS 'W5 異常鏈 Step 3 2026-07-11 加：來源異常回報單 ID（軟連結 nx03_issue_report、不建 FK）。IR dispose 手動連結時 service 回填（重組分解 outputs 需人工定義、不支援一鍵開單）；轉換過帳時回寫 IR 自動結案。';

-- Nx03ConversionInput  →  nx03_conversion_input
COMMENT ON TABLE "nx03_conversion_input" IS '轉換輸入明細（重組：N rows / 分解：1 row、application 層校驗 invariant）';
COMMENT ON COLUMN "nx03_conversion_input"."id" IS '[NX03]+[CVIN]+[7碼流水號]，EX : NX03CVIN0000001';
COMMENT ON COLUMN "nx03_conversion_input"."conversion_id" IS '對應轉換單表頭 ID';
COMMENT ON COLUMN "nx03_conversion_input"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx03_conversion_input"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx03_conversion_input"."part_no" IS '料號快照';
COMMENT ON COLUMN "nx03_conversion_input"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx03_conversion_input"."part_version_id" IS '過帳當下 part 版本快照 FK（M1 配套、Q-S1=B 既有 null、新 row 帶入）';
COMMENT ON COLUMN "nx03_conversion_input"."location_id" IS '輸入庫位（從哪取料）';
COMMENT ON COLUMN "nx03_conversion_input"."qty" IS '輸入數量（>0、過帳時走 helper.applyQtyOutWithLedger source=M/D）';
COMMENT ON COLUMN "nx03_conversion_input"."unit_cost" IS '輸入單位成本（過帳時抓 stock_balance.avg_cost）';
COMMENT ON COLUMN "nx03_conversion_input"."total_cost" IS '輸入總成本（qty × unit_cost、重組時加總為 output unitCost 的加權基礎）';
COMMENT ON COLUMN "nx03_conversion_input"."remark" IS '備註';
COMMENT ON COLUMN "nx03_conversion_input"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_conversion_input"."created_by" IS '建立人';
COMMENT ON COLUMN "nx03_conversion_input"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx03_conversion_input"."updated_by" IS '更新人';

-- Nx03ConversionOutput  →  nx03_conversion_output
COMMENT ON TABLE "nx03_conversion_output" IS '轉換輸出明細（重組：1 row / 分解：N rows、application 層校驗 invariant） 重組 output.unitCost = Σ (input.unitCost × input.qty)（Q-M4-1=a 加權、service 層算） 分解 output.unitCost = input.totalCost × priceA_ratio（auto）或 costRatio（人工指定）';
COMMENT ON COLUMN "nx03_conversion_output"."id" IS '[NX03]+[CVOT]+[7碼流水號]，EX : NX03CVOT0000001';
COMMENT ON COLUMN "nx03_conversion_output"."conversion_id" IS '對應轉換單表頭 ID';
COMMENT ON COLUMN "nx03_conversion_output"."line_no" IS '明細行號（1,2,3…）';
COMMENT ON COLUMN "nx03_conversion_output"."part_id" IS '零件 ID';
COMMENT ON COLUMN "nx03_conversion_output"."part_no" IS '料號快照';
COMMENT ON COLUMN "nx03_conversion_output"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx03_conversion_output"."part_version_id" IS '過帳當下 part 版本快照 FK（M1 配套、Q-S1=B 既有 null、新 row 帶入）';
COMMENT ON COLUMN "nx03_conversion_output"."location_id" IS '輸出庫位（入哪儲位）';
COMMENT ON COLUMN "nx03_conversion_output"."qty" IS '輸出數量（>0、過帳時走 helper.applyQtyInWithLedger source=M/D）';
COMMENT ON COLUMN "nx03_conversion_output"."unit_cost" IS '輸出單位成本（重組 = Σ 加權 input；分解 = input.totalCost × ratio、service 算）';
COMMENT ON COLUMN "nx03_conversion_output"."total_cost" IS '輸出總成本（qty × unit_cost）';
COMMENT ON COLUMN "nx03_conversion_output"."cost_ratio" IS '成本分攤比例（分解時可選、0~1.0、null=auto 按 part.priceA 比例、非 null=人工指定）';
COMMENT ON COLUMN "nx03_conversion_output"."remark" IS '備註';
COMMENT ON COLUMN "nx03_conversion_output"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_conversion_output"."created_by" IS '建立人';
COMMENT ON COLUMN "nx03_conversion_output"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx03_conversion_output"."updated_by" IS '更新人';

-- Nx03IssueReport  →  nx03_issue_report
COMMENT ON TABLE "nx03_issue_report" IS '異常回報跨模組共用表（NX03-STOCK-LITE M1、Crown 拍板 A=方案 A 獨立新表） issueType（異常類型、5 類）： D=Damaged 損毀 / E=Expired 過期 / S=Shortage 數量短缺 / L=WrongLocation 放錯庫位 / O=Other 其他 dispositionType（處置分流、5 出口）： R=Return 退貨 → Nx02Rr / W=Warranty 保固 → Nx02WarrantyClaim / C=Conversion 重組分解 → Nx03Conversion / D=Disposal 報廢 → Nx03Disposal / N=None 未處置 處置單據用 relatedDocId 軟連結（不建 FK、跨模組對齊 nx98 範式）。 來源支援跨模組（sourceModule + sourceDocId 軟連結，例：銷貨檢貨發現異常 → 庫存統一入口）。';
COMMENT ON COLUMN "nx03_issue_report"."id" IS '[NX03]+[ISRP]+[7碼流水號]，EX : NX03ISRP0000001';
COMMENT ON COLUMN "nx03_issue_report"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_issue_report"."doc_no" IS '異常回報單號（唯一），[IR]+[年月]+[倉別]+[5碼流水號]，EX：IR-202605-Z01-00001';
COMMENT ON COLUMN "nx03_issue_report"."report_date" IS '回報日期';
COMMENT ON COLUMN "nx03_issue_report"."warehouse_id" IS '異常發生倉庫（外鍵）';
COMMENT ON COLUMN "nx03_issue_report"."location_id" IS '異常具體庫位（外鍵、issueType=L 放錯庫位時必填、其他選填）';
COMMENT ON COLUMN "nx03_issue_report"."part_id" IS '異常零件 ID（外鍵）';
COMMENT ON COLUMN "nx03_issue_report"."part_no" IS '料號快照';
COMMENT ON COLUMN "nx03_issue_report"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx03_issue_report"."part_version_id" IS 'part 版本快照 FK（對齊 NX01-17 範式、既有 null、新 row 帶入）';
COMMENT ON COLUMN "nx03_issue_report"."qty" IS '異常數量（≥0、不影響庫存帳、純記錄）';
COMMENT ON COLUMN "nx03_issue_report"."issue_type" IS '異常類型（D=損毀 / E=過期 / S=數量短缺 / L=放錯庫位 / O=其他）';
COMMENT ON COLUMN "nx03_issue_report"."disposition_type" IS '處置方式（R=退貨 / W=保固 / C=重組分解 / D=報廢 / N=未處置；預設 N）';
COMMENT ON COLUMN "nx03_issue_report"."related_doc_id" IS '關聯處置單據 ID（軟連結、不建 FK、視 dispositionType 對應 Nx02Rr/Nx02WarrantyClaim/Nx03Conversion/Nx03Disposal）';
COMMENT ON COLUMN "nx03_issue_report"."source_module" IS '來源模組（跨模組共用入口、軟連結，例：nx03 / nx04 / nx06）';
COMMENT ON COLUMN "nx03_issue_report"."source_doc_type" IS '來源單據類型（例：stock-take / so / sr / dn）';
COMMENT ON COLUMN "nx03_issue_report"."source_doc_id" IS '來源單據 ID（軟連結、不建 FK）';
COMMENT ON COLUMN "nx03_issue_report"."status" IS '狀態（DRAFT=草稿 / REPORTED=已回報 / PROCESSING=處置中 / CLOSED=已結案 / CANCELLED=作廢）';
COMMENT ON COLUMN "nx03_issue_report"."description" IS '異常說明（issueType=O 其他時建議必填）';
COMMENT ON COLUMN "nx03_issue_report"."photo_url" IS '附件 URL 或 base64（M3 UI 拍照功能、對齊保固附件範式、單檔 LITE 不嚴限制）';
COMMENT ON COLUMN "nx03_issue_report"."closed_at" IS '結案時間（status=CLOSED 才有）';
COMMENT ON COLUMN "nx03_issue_report"."closed_by" IS '結案人（status=CLOSED 才有）';
COMMENT ON COLUMN "nx03_issue_report"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_issue_report"."created_by" IS '建立人';
COMMENT ON COLUMN "nx03_issue_report"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx03_issue_report"."updated_by" IS '更新人';

-- Nx03BrandAllocationRule  →  nx03_brand_allocation_rule
COMMENT ON TABLE "nx03_brand_allocation_rule" IS 'AR 自動補貨配比規則（AR-IMPL-01 M2、Crown Q-AR-設計-1=a 新建主檔） modelId 級配比（Crown Q-B1=A）：同 model 一條配比規則、適用該 model 下所有 parts source 雙來源（Crown Q-S1=A manual 覆寫 system）：S=system 自動 / M=manual 手動 支援歷史版本：unique [tenantId, modelId, validFrom]、validTo 可空（現役留空）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."id" IS '[NX03]+[BALR]+[7碼流水號]，EX : NX03BALR0000001';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."model_id" IS '車型 FK（必填、配比規則 modelId 級 Crown Q-B1=A）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."oem_ratio" IS 'OE 正廠採購比例（0.0000~1.0000、與 aftermarketRatio 兩者 Σ 應 = 1.0、application 自律校驗）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."aftermarket_ratio" IS '副廠採購比例（0.0000~1.0000）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."source" IS '配比來源（S=system 自動算 / M=manual 手動覆寫、Q-S1=A manual 覆寫 system）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."valid_from" IS '生效起期（必填）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."valid_to" IS '生效迄期（null=現役、application 層校驗 validFrom ≤ validTo）';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."remark" IS '備註';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."created_by" IS '建立人';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx03_brand_allocation_rule"."updated_by" IS '更新人';

-- Nx04Co  →  nx04_co
COMMENT ON TABLE "nx04_co" IS '客戶訂單單頭（CO 單）。';
COMMENT ON COLUMN "nx04_co"."id" IS '[NX04]+[COHD]+[7碼流水號]，EX : NX04COHD0000001';
COMMENT ON COLUMN "nx04_co"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx04_co"."warehouse_id" IS '對應倉庫 ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx04_co"."doc_no" IS '客戶訂單號（唯一），[CO]+[年月]+[倉別]+[5碼流水號]，EX：CO-202604-Z01-00001';
COMMENT ON COLUMN "nx04_co"."co_date" IS '客戶訂單日期。';
COMMENT ON COLUMN "nx04_co"."customer_id" IS '客戶 ID（FK nx01_partner，partner_type=C）。';
COMMENT ON COLUMN "nx04_co"."part_id" IS '零件 ID（FK nx01_part）。';
COMMENT ON COLUMN "nx04_co"."qty" IS '預期數量。';
COMMENT ON COLUMN "nx04_co"."expected_fulfill_date" IS '預期完成日期（選填）。';
COMMENT ON COLUMN "nx04_co"."status" IS '狀態（P=待補/F=已補完/E=過期/V=作廢）。';
COMMENT ON COLUMN "nx04_co"."source_so_item_id" IS '來源銷貨明細 ID（必填，反向追蹤）。';
COMMENT ON COLUMN "nx04_co"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_co"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_co"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）。';
COMMENT ON COLUMN "nx04_co"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_co"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx04Order  →  nx04_order
COMMENT ON TABLE "nx04_order" IS '2026-07-20 Crown 拍板 G9：NEXORA 原生無獨立客戶訂單文件（動線報價→SO）， 為忠實容納偉盟訂單 RORA/RORB（多行、含金額）新增此專用表。與 Nx04Co（缺貨補單、綁 SO）語意不同。 純量外鍵（FK 約束於 migration 建立），不參與現有關聯圖以縮小 schema 變更面。';
COMMENT ON COLUMN "nx04_order"."id" IS '[NX04]+[ORDR]+[7碼流水號]，EX：NX04ORDR0000001';
COMMENT ON COLUMN "nx04_order"."tenant_id" IS '租戶 ID（FK nx99_tenant）';
COMMENT ON COLUMN "nx04_order"."warehouse_id" IS '對應倉庫/門市（FK nx01_warehouse）';
COMMENT ON COLUMN "nx04_order"."doc_no" IS '訂單號（唯一）';
COMMENT ON COLUMN "nx04_order"."legacy_doc_no" IS '舊系統原單號（偉盟 RORA.RAREN；匯入冪等鍵＋追溯）';
COMMENT ON COLUMN "nx04_order"."order_date" IS '訂單日期';
COMMENT ON COLUMN "nx04_order"."customer_id" IS '客戶 ID（FK nx01_partner）';
COMMENT ON COLUMN "nx04_order"."expected_date" IS '交期（偉盟 RADTO，選填）';
COMMENT ON COLUMN "nx04_order"."source_doc_no" IS '來源單號（偉盟 RACNO，可能引用報價，字串追溯用）';
COMMENT ON COLUMN "nx04_order"."payment_term" IS '付款方式（偉盟 RAPAY 快照）';
COMMENT ON COLUMN "nx04_order"."subtotal" IS '小計（未稅）';
COMMENT ON COLUMN "nx04_order"."tax_rate" IS '稅率';
COMMENT ON COLUMN "nx04_order"."tax_amount" IS '稅額';
COMMENT ON COLUMN "nx04_order"."total_amount" IS '總額（含稅）';
COMMENT ON COLUMN "nx04_order"."status" IS '狀態（歷史匯入一律 CLOSED）';
COMMENT ON COLUMN "nx04_order"."remark" IS '備註';
COMMENT ON COLUMN "nx04_order"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx04_order"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx04_order"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx04_order"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx04OrderItem  →  nx04_order_item
COMMENT ON TABLE "nx04_order_item" IS '訂單明細行。';
COMMENT ON COLUMN "nx04_order_item"."id" IS '[NX04]+[ORIT]+[7碼流水號]';
COMMENT ON COLUMN "nx04_order_item"."order_id" IS '對應訂單頭 ID（FK nx04_order）';
COMMENT ON COLUMN "nx04_order_item"."line_no" IS '明細行號';
COMMENT ON COLUMN "nx04_order_item"."part_id" IS '零件 ID（FK nx01_part）';
COMMENT ON COLUMN "nx04_order_item"."part_no" IS '料號快照';
COMMENT ON COLUMN "nx04_order_item"."part_name" IS '品名快照';
COMMENT ON COLUMN "nx04_order_item"."brand_name" IS '廠牌快照（偉盟 RBLAB）';
COMMENT ON COLUMN "nx04_order_item"."qty" IS '訂購數量';
COMMENT ON COLUMN "nx04_order_item"."unit_price" IS '單價';
COMMENT ON COLUMN "nx04_order_item"."line_amount" IS '金額';
COMMENT ON COLUMN "nx04_order_item"."remark" IS '備註（含折數/車型等併入）';
COMMENT ON COLUMN "nx04_order_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx04_order_item"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx04_order_item"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx04_order_item"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx04Quote  →  nx04_quote
COMMENT ON TABLE "nx04_quote" IS '報價單單頭。';
COMMENT ON COLUMN "nx04_quote"."id" IS '[NX04]+[QTHD]+[7碼流水號]，EX : NX04QTHD0000001';
COMMENT ON COLUMN "nx04_quote"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx04_quote"."warehouse_id" IS '報價倉庫ID，影響單號產生（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx04_quote"."doc_no" IS '報價單號（唯一），[QT]+[年月]+[倉別]+[5碼流水號]，EX：QT-202604-Z01-00001';
COMMENT ON COLUMN "nx04_quote"."legacy_doc_no" IS '舊系統原單號（偉盟 RSAA.RAREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G8 偉盟報價匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx04_quote"."quote_date" IS '報價日期。';
COMMENT ON COLUMN "nx04_quote"."customer_id" IS '客戶ID（FK nx01_partner，partner_type=C）。';
COMMENT ON COLUMN "nx04_quote"."customer_grade_id" IS '客戶等級ID快照（報價時帶入）。';
COMMENT ON COLUMN "nx04_quote"."valid_until" IS '報價有效期限，過期後不得轉銷貨單。';
COMMENT ON COLUMN "nx04_quote"."currency_id" IS '幣別ID（FK nx01_currency，預設TWD）。';
COMMENT ON COLUMN "nx04_quote"."subtotal" IS '小計（is_selected=TRUE的明細加總，未稅）。';
COMMENT ON COLUMN "nx04_quote"."tax_rate" IS '稅率（預設5.00）。';
COMMENT ON COLUMN "nx04_quote"."tax_amount" IS '稅額。';
COMMENT ON COLUMN "nx04_quote"."total_amount" IS '總額（subtotal + tax_amount）。';
COMMENT ON COLUMN "nx04_quote"."status" IS '狀態（DRAFT / SENT / ACCEPTED / REJECTED / EXPIRED / CANCELLED）。';
COMMENT ON COLUMN "nx04_quote"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_quote"."voided_at" IS '作廢時間。';
COMMENT ON COLUMN "nx04_quote"."voided_by" IS '作廢人（使用者ID）。';
COMMENT ON COLUMN "nx04_quote"."void_reason" IS '作廢原因（必填）。';
COMMENT ON COLUMN "nx04_quote"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_quote"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx04_quote"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_quote"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx04_quote"."rfq_id" IS '來源詢價單ID（可空，無庫存走同行調貨詢價流程時填入，FK nx02_rfq）。';
COMMENT ON COLUMN "nx04_quote"."sales_person_id" IS '業務員（FK nx01_user；建單預設帶當前使用者、可改；沿用 SO salesPersonId 範式）。';
COMMENT ON COLUMN "nx04_quote"."customer_ref_no" IS '參考文號（客戶採購單號等對帳用，選填）。';
COMMENT ON COLUMN "nx04_quote"."source" IS '來源（FORMAL 正式報價單=多行文件 / INSTANT 即時報價=單行紀錄）。NX04 報價架構 2026-07-02。';

-- Nx04QuoteItem  →  nx04_quote_item
COMMENT ON TABLE "nx04_quote_item" IS '報價單明細行。';
COMMENT ON COLUMN "nx04_quote_item"."id" IS '[NX04]+[QTIT]+[7碼流水號]，EX : NX04QTIT0000001';
COMMENT ON COLUMN "nx04_quote_item"."quote_id" IS '對應報價單表頭ID（FK nx04_quote）。';
COMMENT ON COLUMN "nx04_quote_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx04_quote_item"."group_no" IS '選項群組號碼，同一客戶詢問對應多個料號時使用相同group_no（如原廠+副廠選項）。NULL表示無多選項。';
COMMENT ON COLUMN "nx04_quote_item"."part_id" IS '零件ID（FK nx01_part）。';
COMMENT ON COLUMN "nx04_quote_item"."part_no" IS '零件料號快照。';
COMMENT ON COLUMN "nx04_quote_item"."part_name" IS '零件名稱快照。';
COMMENT ON COLUMN "nx04_quote_item"."qty" IS '報價數量。';
COMMENT ON COLUMN "nx04_quote_item"."unit_price" IS '報價單價（業務填入）。';
COMMENT ON COLUMN "nx04_quote_item"."min_price" IS '最低售價快照（依客戶等級計算，成本×毛利%），供前端警示用。';
COMMENT ON COLUMN "nx04_quote_item"."discount_code_id" IS '折扣代碼ID（選填，FK nx01_discount_code）。';
COMMENT ON COLUMN "nx04_quote_item"."line_amount" IS '明細金額（qty × unit_price）。is_selected=FALSE時不計入表頭小計。';
COMMENT ON COLUMN "nx04_quote_item"."is_selected" IS '客戶是否選擇此料號（同group_no多選項中，客戶確認選哪筆）。FALSE的明細不計入小計、不轉銷貨單。';
COMMENT ON COLUMN "nx04_quote_item"."below_min_reason" IS '低於最低售價原因（unit_price < min_price時必填，自動記錄並倒扣業績）。';
COMMENT ON COLUMN "nx04_quote_item"."transferred_qty" IS '已轉銷貨單數量（支援同一報價單分批轉單，不可超過qty）。';
COMMENT ON COLUMN "nx04_quote_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_quote_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_quote_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）。';
COMMENT ON COLUMN "nx04_quote_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_quote_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx04QuoteRecord  →  nx04_quote_record
COMMENT ON TABLE "nx04_quote_record" IS '報價紀錄表（客戶側原子日誌）：每次即時報價/報價單行寫一筆；餵報價單、銷貨單自動帶價 + 拉入。NX04 報價架構 2026-07-06。';
COMMENT ON COLUMN "nx04_quote_record"."id" IS '[NX04]+[QTRC]+[7碼流水號]，EX：NX04QTRC0000001';
COMMENT ON COLUMN "nx04_quote_record"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx04_quote_record"."record_date" IS '報價日期。';
COMMENT ON COLUMN "nx04_quote_record"."customer_id" IS '客戶 ID（FK nx01_partner，partner_type=C/O）。';
COMMENT ON COLUMN "nx04_quote_record"."customer_grade_id" IS '客戶等級 ID 快照（比價「同級距」用；id 快照、不設 FK）。';
COMMENT ON COLUMN "nx04_quote_record"."part_id" IS '料號 ID（FK nx01_part）。';
COMMENT ON COLUMN "nx04_quote_record"."part_no" IS '料號快照（基準料號 code）。';
COMMENT ON COLUMN "nx04_quote_record"."part_name" IS '品名快照。';
COMMENT ON COLUMN "nx04_quote_record"."warehouse_id" IS '出貨倉（選填，FK nx01_warehouse）。';
COMMENT ON COLUMN "nx04_quote_record"."qty" IS '數量（量價條件；預設 1）。';
COMMENT ON COLUMN "nx04_quote_record"."unit_price" IS '報價單價。';
COMMENT ON COLUMN "nx04_quote_record"."currency_id" IS '幣別 ID（FK nx01_currency，預設 TWD）。';
COMMENT ON COLUMN "nx04_quote_record"."source" IS '來源（INSTANT 即時報價 / QUOTE 由報價單行寫入）。';
COMMENT ON COLUMN "nx04_quote_record"."source_doc_id" IS '來源單據 ID（source=QUOTE 時回指報價單；id 快照、不設 FK）。';
COMMENT ON COLUMN "nx04_quote_record"."is_transfer" IS '調貨旗標（F2 報價④出貨倉庫選「調貨」＝報這顆時已決定走同行調貨；調貨詢價軌 2026-07-12）。';
COMMENT ON COLUMN "nx04_quote_record"."sales_person_id" IS '業務員（id 快照、不設 FK，同 createdBy 範式）。';
COMMENT ON COLUMN "nx04_quote_record"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_quote_record"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_quote_record"."created_by" IS '建立人（使用者 ID）。';
COMMENT ON COLUMN "nx04_quote_record"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_quote_record"."updated_by" IS '更新人（使用者 ID）。';

-- Nx04InquiryRecord  →  nx04_inquiry_record
COMMENT ON TABLE "nx04_inquiry_record" IS '詢價紀錄表（調貨/同行側原子日誌）：每次即時詢價寫一筆；餵調貨單拉入。NX04 報價架構 2026-07-06。';
COMMENT ON COLUMN "nx04_inquiry_record"."id" IS '[NX04]+[IQRC]+[7碼流水號]，EX：NX04IQRC0000001';
COMMENT ON COLUMN "nx04_inquiry_record"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx04_inquiry_record"."record_date" IS '詢價日期。';
COMMENT ON COLUMN "nx04_inquiry_record"."source_partner_id" IS '同行/調貨來源 ID（FK nx01_partner，partner_type=O）。';
COMMENT ON COLUMN "nx04_inquiry_record"."part_id" IS '料號 ID（FK nx01_part）。';
COMMENT ON COLUMN "nx04_inquiry_record"."part_no" IS '料號快照（基準料號 code）。';
COMMENT ON COLUMN "nx04_inquiry_record"."part_name" IS '品名快照。';
COMMENT ON COLUMN "nx04_inquiry_record"."warehouse_id" IS '調入倉（選填，FK nx01_warehouse）。';
COMMENT ON COLUMN "nx04_inquiry_record"."qty" IS '數量（量價條件；預設 1）。';
COMMENT ON COLUMN "nx04_inquiry_record"."unit_price" IS '同行報我的價（調貨成本）。';
COMMENT ON COLUMN "nx04_inquiry_record"."currency_id" IS '幣別 ID（FK nx01_currency，預設 TWD）。';
COMMENT ON COLUMN "nx04_inquiry_record"."sales_person_id" IS '業務員（id 快照、不設 FK，同 createdBy 範式）。';
COMMENT ON COLUMN "nx04_inquiry_record"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_inquiry_record"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_inquiry_record"."created_by" IS '建立人（使用者 ID）。';
COMMENT ON COLUMN "nx04_inquiry_record"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_inquiry_record"."updated_by" IS '更新人（使用者 ID）。';

-- Nx04So  →  nx04_so
COMMENT ON TABLE "nx04_so" IS '銷貨單單頭。';
COMMENT ON COLUMN "nx04_so"."id" IS '[NX04]+[SOHD]+[7碼流水號]，EX : NX04SOHD0000001';
COMMENT ON COLUMN "nx04_so"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx04_so"."warehouse_id" IS '出貨倉庫ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx04_so"."doc_no" IS '銷貨單號（唯一），[SO]+[年月]+[倉別]+[5碼流水號]，EX：SO-202604-Z01-00001';
COMMENT ON COLUMN "nx04_so"."legacy_doc_no" IS '舊系統原單號（偉盟 RSIM.ROREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G1 偉盟匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx04_so"."so_date" IS '銷貨日期。';
COMMENT ON COLUMN "nx04_so"."customer_id" IS '客戶ID（FK nx01_partner，partner_type=C）。';
COMMENT ON COLUMN "nx04_so"."billing_partner_id" IS '帳款對象（FK nx01_partner；可≠customerId、null=同客戶）。偉盟銷貨「其他」tab 帳款對象（RSIM.RORCN）實務；G3 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx04_so"."quote_id" IS '來源報價單ID（FK nx04_quote，可空=即時報價直接開單）。';
COMMENT ON COLUMN "nx04_so"."sales_person_id" IS '業務員（FK Nx01User、跟 createdBy 開單人員分開）；05 補做 C2 2026-06-09 業務語意：負責此筆生意的業務、可能跟實際開單的內勤不同人；歸帳/業績計算用。';
COMMENT ON COLUMN "nx04_so"."sales_method" IS '銷貨方式（業界口語：自叫／網路單／櫃台／業務上門…）；05 補做 C3 2026-06-09 UI 端 datalist 常用值、可手填新類型；不建主檔避免複雜化。';
COMMENT ON COLUMN "nx04_so"."account_period" IS '帳款年月（存月份第一天、例 2026-06-01 表 2026 年 6 月）；05 補做 C4 2026-06-09 業務語意：這筆生意算哪個月的帳；應收歸帳查詢用、null=預設取 soDate 月份。';
COMMENT ON COLUMN "nx04_so"."delivery_type" IS '出貨方式（D=配送/P=自取/C=寄貨）。影響後續流程分流與AR產生時機。';
COMMENT ON COLUMN "nx04_so"."source_type" IS '@deprecated 2026-04-25 (Phase 0 D3)：改由 line item 的 transfer_source_type 決定；header 此欄無語意。trigger 將防寫入。 出貨來源（S=本倉庫存/O=他倉/T=調撥/G=同行調貨/M=混合/B=客訂預約）。';
COMMENT ON COLUMN "nx04_so"."delivery_address" IS '配送地址（delivery_type=D時必填）。';
COMMENT ON COLUMN "nx04_so"."currency_id" IS '幣別ID（FK nx01_currency）。';
COMMENT ON COLUMN "nx04_so"."subtotal" IS '小計（明細加總，未稅）。';
COMMENT ON COLUMN "nx04_so"."tax_rate" IS '稅率（預設5.00）。';
COMMENT ON COLUMN "nx04_so"."tax_amount" IS '稅額。';
COMMENT ON COLUMN "nx04_so"."total_amount" IS '總額（subtotal + tax_amount）。';
COMMENT ON COLUMN "nx04_so"."status" IS '狀態（DRAFT / CONFIRMED / PICKING / SHIPPED / INVOICED / CANCELLED）。';
COMMENT ON COLUMN "nx04_so"."payment_term" IS '付款條件（快照自nx01_partner.payment_term）。影響AR產生時機。';
COMMENT ON COLUMN "nx04_so"."invoice_copies" IS '發票聯式（0=不開發票 / 2=二聯 / 3=三聯）。建單時 service 從 partner.defaultInvoiceCopies 帶入、可逐筆改；散客 L 強制 2。；W4 [3-6] 2026-06-06 新增';
COMMENT ON COLUMN "nx04_so"."expected_delivery_date" IS '預計出貨日（選填）。';
COMMENT ON COLUMN "nx04_so"."cancel_reason" IS '取消原因（status=X時必填）。';
COMMENT ON COLUMN "nx04_so"."cancelled_at" IS '取消時間。';
COMMENT ON COLUMN "nx04_so"."cancelled_by" IS '取消人（使用者ID）。';
COMMENT ON COLUMN "nx04_so"."completed_at" IS '完成時間（status=C時填入）。';
COMMENT ON COLUMN "nx04_so"."special_price_flag" IS 'F1 特價售出 2026-06-08：標記此 SO 為「異常處置 X 特價售出」產生的特價銷貨單。 業務語意：來自 Nx03IssueReport.dispositionType=''X'' 處置流程、單價由業務手動填特價。 成本走原 avgCost、財務走一般應收（不走折讓）。';
COMMENT ON COLUMN "nx04_so"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_so"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_so"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx04_so"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_so"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx04SoItem  →  nx04_so_item
COMMENT ON TABLE "nx04_so_item" IS '銷貨單明細行。';
COMMENT ON COLUMN "nx04_so_item"."id" IS '[NX04]+[SOIT]+[7碼流水號]，EX : NX04SOIT0000001';
COMMENT ON COLUMN "nx04_so_item"."so_id" IS '對應銷貨單表頭ID（FK nx04_so）。';
COMMENT ON COLUMN "nx04_so_item"."quote_item_id" IS '來源報價明細ID（可空，即時報價時無來源）。';
COMMENT ON COLUMN "nx04_so_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx04_so_item"."part_id" IS '零件ID（FK nx01_part）。';
COMMENT ON COLUMN "nx04_so_item"."part_no" IS '零件料號快照。';
COMMENT ON COLUMN "nx04_so_item"."part_name" IS '零件名稱快照。';
COMMENT ON COLUMN "nx04_so_item"."brand_id" IS '廠牌 ID 快照（建單時 snapshot 自 part.brandId、避免主檔 brand 更名後影響歷史 SO 顯示）； 05 補做 B5 2026-06-09。null=未指定（料件當時沒設廠牌）';
COMMENT ON COLUMN "nx04_so_item"."brand_name" IS '廠牌名稱快照；05 補做 B5 2026-06-09。';
COMMENT ON COLUMN "nx04_so_item"."warehouse_id" IS '出貨倉庫ID（FK nx01_warehouse，可與表頭不同支援跨倉銷售）。';
COMMENT ON COLUMN "nx04_so_item"."location_id" IS '出貨庫位ID（FK nx01_location）。';
COMMENT ON COLUMN "nx04_so_item"."qty" IS '銷貨數量。';
COMMENT ON COLUMN "nx04_so_item"."unit_price" IS '銷售單價。';
COMMENT ON COLUMN "nx04_so_item"."unit_cost" IS '銷貨成本快照（系統過帳時抓 stock_balance.avg_cost；偉盟匯入=RSIO.ROCOT 平均成本）。毛利=lineAmount−qty×unitCost；G2 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx04_so_item"."discount_code_id" IS '折扣代碼ID（選填，FK nx01_discount_code）。';
COMMENT ON COLUMN "nx04_so_item"."line_amount" IS '明細金額（qty × unit_price）。';
COMMENT ON COLUMN "nx04_so_item"."reserved_qty" IS '預留庫存數量（SO建立時立即寫入stock_balance.reserved_qty）。';
COMMENT ON COLUMN "nx04_so_item"."below_min_reason" IS '低於最低售價原因（必填）。';
COMMENT ON COLUMN "nx04_so_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_so_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_so_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）。';
COMMENT ON COLUMN "nx04_so_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_so_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx04_so_item"."item_status" IS '@deprecated 2026-04-25 (Phase 0 D3)：改用 (transfer_status, fulfill_status) 雙段。trigger 仍會雙寫保留既有讀路徑相容。 明細備貨狀態（WA=待調撥/TA=調撥中/WG=待調貨/TG=調貨中/WP=待撿貨/WD=待配送/ID=配送中/WT=待取貨/WB=待包貨/WS=待寄貨/C=已完成）。依出貨方式與備貨情況自動更新。';
COMMENT ON COLUMN "nx04_so_item"."ti_id" IS '關聯調貨單ID（業務按Alt+T發起調貨後填入，FK nx02_ti）。';
COMMENT ON COLUMN "nx04_so_item"."st_id" IS '關聯調撥單ID（系統偵測本倉庫存不足後自動建立，FK nx03_st）。';
COMMENT ON COLUMN "nx04_so_item"."transfer_source_type" IS '補貨來源類型（S=本倉/T=自倉調撥/G=同行調貨/B=客戶訂單）。Phase 0 D3 新增。';
COMMENT ON COLUMN "nx04_so_item"."transfer_status" IS '補貨進度（P=待補/I=補貨中/C=補貨完成）。雙段狀態之第一段。';
COMMENT ON COLUMN "nx04_so_item"."fulfill_status" IS '出貨進度（W=等貨/PK=撿貨中/PL=包貨中/D=配送中/F=已送達）。雙段狀態之第二段。';
COMMENT ON COLUMN "nx04_so_item"."co_id" IS '關聯客戶訂單ID（transfer_source_type=B時填入，FK nx04_co）。';
COMMENT ON COLUMN "nx04_so_item"."bundle_id" IS 'F2 組合套餐 2026-06-09：line 屬於哪個套餐（null=非套餐 line）。 引擎 assertSoLinePriceReason 偵測 bundleId 非空時 skip（避免重複折）； 報表分類用：套餐銷售追蹤 + 退貨對沖整組價。';
COMMENT ON COLUMN "nx04_so_item"."actual_part_id" IS '實際出貨料號 ID（替代出貨用；null=照下單料號 partId 出）。偉盟 RSIO 雙料號（ROPTN下單/ROPNO實出）印證。 下單料號 partId 不動、替代出貨時本欄記實際出的料 → 保固追溯/退貨核對用。 2026-07-10 執行長拍板（偉盟設計檢視 P1-5）';
COMMENT ON COLUMN "nx04_so_item"."actual_part_no" IS '實際出貨料號快照（同 partNo 範式、歷史不隨主檔變）';

-- Nx04Sr  →  nx04_sr
COMMENT ON TABLE "nx04_sr" IS '銷退單單頭——銷貨退回。';
COMMENT ON COLUMN "nx04_sr"."id" IS '[NX04]+[SRHD]+[7碼流水號]，EX : NX04SRHD0000001';
COMMENT ON COLUMN "nx04_sr"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx04_sr"."warehouse_id" IS '退回倉庫ID（退回原出貨倉，FK nx01_warehouse）。';
COMMENT ON COLUMN "nx04_sr"."doc_no" IS '銷退單號（唯一），[SR]+[年月]+[倉別]+[5碼流水號]，EX：SR-202604-Z01-00001';
COMMENT ON COLUMN "nx04_sr"."legacy_doc_no" IS '舊系統原單號（偉盟 RSIM.ROREN；歷史匯入冪等鍵＋追溯、null=系統原生單）；G1 偉盟匯入 2026-07-20 Crown 拍板';
COMMENT ON COLUMN "nx04_sr"."sr_date" IS '銷退日期。';
COMMENT ON COLUMN "nx04_sr"."customer_id" IS '客戶ID（FK nx01_partner）。';
COMMENT ON COLUMN "nx04_sr"."so_id" IS '來源銷貨單ID（FK nx04_so）。 2026-07-07 改可空（Crown 拍板）：DB 層可空僅供偉盟歷史銷退匯入（無原單參照）； 系統內建立銷退仍必填（DTO soId! + service assertSoReturnable 驗證、不受此變更影響）。';
COMMENT ON COLUMN "nx04_sr"."return_method" IS '退貨取件方式（S=客戶自行送回/C=外務順路取回/P=客戶自行寄回）。由外務組長在 NX07 決定並更新，NX04 建立時可預填供參考。';
COMMENT ON COLUMN "nx04_sr"."initiation_type" IS '退回方式（A=業務發起／計畫性、B=送貨員當場帶回／臨時）。 05 補做 C1 2026-06-09：總經理拍板兩種起單方式、操作流程不同（A 業務建單再派取、B 送貨員先帶回再判退）。';
COMMENT ON COLUMN "nx04_sr"."status" IS '狀態（DRAFT / INSPECTING / POSTED / REJECTED / CANCELLED）。';
COMMENT ON COLUMN "nx04_sr"."subtotal" IS '退款小計（明細加總，未稅）。';
COMMENT ON COLUMN "nx04_sr"."tax_rate" IS '稅率（預設5.00）。';
COMMENT ON COLUMN "nx04_sr"."tax_amount" IS '稅額。';
COMMENT ON COLUMN "nx04_sr"."total_amount" IS '退款總額（subtotal + tax_amount）。';
COMMENT ON COLUMN "nx04_sr"."approved_at" IS '銷售組長核准時間。';
COMMENT ON COLUMN "nx04_sr"."approved_by" IS '核准人（銷售組長，使用者ID）。';
COMMENT ON COLUMN "nx04_sr"."reject_reason" IS '退件原因（銷售組長退件時填寫）。';
COMMENT ON COLUMN "nx04_sr"."received_at" IS '退貨收到時間（倉管專員確認收貨）。';
COMMENT ON COLUMN "nx04_sr"."received_by" IS '收貨確認人（倉管專員，使用者ID）。';
COMMENT ON COLUMN "nx04_sr"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_sr"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_sr"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx04_sr"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_sr"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx04SrItem  →  nx04_sr_item
COMMENT ON TABLE "nx04_sr_item" IS '銷退單明細行。';
COMMENT ON COLUMN "nx04_sr_item"."id" IS '[NX04]+[SRIT]+[7碼流水號]，EX : NX04SRIT0000001';
COMMENT ON COLUMN "nx04_sr_item"."sr_id" IS '對應銷退單表頭ID（FK nx04_sr）。';
COMMENT ON COLUMN "nx04_sr_item"."so_item_id" IS '來源銷貨明細ID（FK nx04_so_item）。 2026-07-07 改可空（Crown 拍板）：DB 層可空僅供偉盟歷史銷退匯入；系統內建立仍必填（DTO soItemId! 驗證）。';
COMMENT ON COLUMN "nx04_sr_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx04_sr_item"."part_id" IS '零件ID（FK nx01_part）。';
COMMENT ON COLUMN "nx04_sr_item"."part_no" IS '零件料號快照。';
COMMENT ON COLUMN "nx04_sr_item"."part_name" IS '零件名稱快照。';
COMMENT ON COLUMN "nx04_sr_item"."return_policy" IS '退貨政策快照（F=自由/S=標準/R=限制/N=不可退/W=保固，從nx01_part帶入）。';
COMMENT ON COLUMN "nx04_sr_item"."return_type" IS '退貨類型（N=一般退貨/E=業務通融）。';
COMMENT ON COLUMN "nx04_sr_item"."return_reason" IS '退貨原因（C=客戶不需要/D=商品有瑕疵/W=送錯料號/Q=送錯數量/O=其他）。';
COMMENT ON COLUMN "nx04_sr_item"."concession_reason" IS '業務通融原因（return_type=E時必填）。';
COMMENT ON COLUMN "nx04_sr_item"."qty" IS '退貨數量（不可超過原始出貨數量）。';
COMMENT ON COLUMN "nx04_sr_item"."unit_price" IS '退貨單價（從SO帶入）。';
COMMENT ON COLUMN "nx04_sr_item"."line_amount" IS '退款金額（qty × unit_price）。';
COMMENT ON COLUMN "nx04_sr_item"."location_id" IS '退回庫位ID（倉管專員入庫時填入）。';
COMMENT ON COLUMN "nx04_sr_item"."disposition_flag" IS '好品/壞品旗標（G=好品入主倉、B=壞品進 Nx03IssueReport）。倉管收貨檢查時填、過帳前必填、預設 NULL（未檢查狀態）。對齊 Crown 2026-05-29 Q5 方案 B 拍板';
COMMENT ON COLUMN "nx04_sr_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx04_sr_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx04_sr_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）。';
COMMENT ON COLUMN "nx04_sr_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx04_sr_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx04Promotion  →  nx04_promotion
COMMENT ON TABLE "nx04_promotion" IS 'F1-D 銷貨優惠價子系統 2026-06-08（Alex Q1/Q2/Q3/Q4 拍板） 業務語意：時段 × 商品範圍 × 優惠絕對單價；含出清旗標 + 批量買 N 件條件。 「商品範圍」走 Nx04PromotionScope 子表多對多、Alex Q1 拍板 3 種類型：P=part / B=brand / G=partGroup。 「優惠價」純絕對單價（Alex Q2）、不存折扣率或折抵金額（DiscountCode 留事後折讓沖帳用、跟促銷規則分層）。 同商品多優惠（含客戶分級 priceA~D + 個別折數 customMarginPct）取最低（Alex Q4）。 優惠價低於成本→警示+必填理由（沿用 SoItem.belowMinReason）、放行。';
COMMENT ON COLUMN "nx04_promotion"."id" IS '[NX04]+[PRMO]+[7碼流水號]、EX：NX04PRMO0000001';
COMMENT ON COLUMN "nx04_promotion"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx04_promotion"."code" IS '促銷代碼（租戶內唯一、業務員自定）';
COMMENT ON COLUMN "nx04_promotion"."name" IS '促銷名稱（顯示用）';
COMMENT ON COLUMN "nx04_promotion"."price_override" IS '優惠絕對單價（Alex Q2 純絕對價、不存折扣率/折抵金額）';
COMMENT ON COLUMN "nx04_promotion"."valid_from" IS '生效起期（application 層守 validFrom ≤ validTo）';
COMMENT ON COLUMN "nx04_promotion"."valid_to" IS '生效迄期';
COMMENT ON COLUMN "nx04_promotion"."is_clearance" IS '出清旗標（業務語意：報表分類 + UI 標示「出清品」用、不影響引擎邏輯）';
COMMENT ON COLUMN "nx04_promotion"."min_buy_qty" IS '批量買 N 件條件（買滿 N 件以上才套用、null = 無限制）';
COMMENT ON COLUMN "nx04_promotion"."remark" IS '備註';
COMMENT ON COLUMN "nx04_promotion"."is_active" IS '是否啟用（停用 = 引擎查不到、不影響歷史套用紀錄）';
COMMENT ON COLUMN "nx04_promotion"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx04_promotion"."created_by" IS '建立人';
COMMENT ON COLUMN "nx04_promotion"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx04_promotion"."updated_by" IS '更新人';

-- Nx04PromotionScope  →  nx04_promotion_scope
COMMENT ON TABLE "nx04_promotion_scope" IS '促銷規則範圍多對多子表（scopeType discriminator）';
COMMENT ON COLUMN "nx04_promotion_scope"."id" IS '[NX04]+[PRSC]+[7碼流水號]、EX：NX04PRSC0000001';
COMMENT ON COLUMN "nx04_promotion_scope"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx04_promotion_scope"."promotion_id" IS '對應促銷規則表頭（FK Nx04Promotion、ON DELETE CASCADE）';
COMMENT ON COLUMN "nx04_promotion_scope"."scope_type" IS '範圍類型（Alex Q1 拍板 3 種：P=part 指定料件 / B=brand 品牌 / G=partGroup 料件族群）。 車型 modelId 歸汽車資料庫套件、不在 LITE 範圍。';
COMMENT ON COLUMN "nx04_promotion_scope"."scope_id" IS '範圍 ID（依 scopeType 對應 nx01_part / nx01_brand / nx01_part_group、application 層 guard）';
COMMENT ON COLUMN "nx04_promotion_scope"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx04_promotion_scope"."created_by" IS '建立人';

-- Nx04Bundle  →  nx04_bundle
COMMENT ON TABLE "nx04_bundle" IS 'F2 組合套餐 2026-06-09（Alex Phase 2 收尾） 業務語意：套餐名稱 / 套餐總價 / 時段 / 啟停；組成走 Nx04BundleItem 子表。 SO 套用時、各組成料件逐項出庫扣庫存、line.bundleId 標記屬此套餐、 整組總價按 priceA × qty 比例分攤到各 line。 ⚠️ 選了套餐、組內料件「不再各自跑促銷引擎」（套餐價就是整組最終價、避免重複折）。';
COMMENT ON COLUMN "nx04_bundle"."id" IS '[NX04]+[BNDL]+[7碼流水號]、EX：NX04BNDL0000001';
COMMENT ON COLUMN "nx04_bundle"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx04_bundle"."code" IS '套餐代碼（租戶內唯一、業務員自定）';
COMMENT ON COLUMN "nx04_bundle"."name" IS '套餐名稱（顯示用）';
COMMENT ON COLUMN "nx04_bundle"."bundle_price" IS '套餐整組總價（業務員設、SO 套用時按比例分攤到各 line）';
COMMENT ON COLUMN "nx04_bundle"."valid_from" IS '生效起期';
COMMENT ON COLUMN "nx04_bundle"."valid_to" IS '生效迄期';
COMMENT ON COLUMN "nx04_bundle"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx04_bundle"."remark" IS '備註';
COMMENT ON COLUMN "nx04_bundle"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx04_bundle"."created_by" IS '建立人';
COMMENT ON COLUMN "nx04_bundle"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx04_bundle"."updated_by" IS '更新人';

-- Nx04BundleItem  →  nx04_bundle_item
COMMENT ON TABLE "nx04_bundle_item" IS '套餐組成料件';
COMMENT ON COLUMN "nx04_bundle_item"."id" IS '[NX04]+[BDIT]+[7碼流水號]、EX：NX04BDIT0000001';
COMMENT ON COLUMN "nx04_bundle_item"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx04_bundle_item"."bundle_id" IS '對應套餐表頭（FK Nx04Bundle、ON DELETE CASCADE）';
COMMENT ON COLUMN "nx04_bundle_item"."part_id" IS '組成料件（FK Nx01Part）';
COMMENT ON COLUMN "nx04_bundle_item"."qty" IS '套餐內此料件數量';
COMMENT ON COLUMN "nx04_bundle_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx04_bundle_item"."created_by" IS '建立人';

-- Nx05AccountCode  →  nx05_account_code
COMMENT ON TABLE "nx05_account_code" IS '會計科目表——I/E/A/L 分類科目。';
COMMENT ON COLUMN "nx05_account_code"."id" IS '[NX05]+[ACCD]+[7碼流水號]，EX : NX05ACCD0000001';
COMMENT ON COLUMN "nx05_account_code"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx05_account_code"."code" IS '科目代碼（唯一），EX：6132=租金/6139=水電費/6150=電話費。';
COMMENT ON COLUMN "nx05_account_code"."name" IS '科目名稱。';
COMMENT ON COLUMN "nx05_account_code"."category" IS '科目類別（I=收入/E=支出/A=資產/L=負債）。';
COMMENT ON COLUMN "nx05_account_code"."is_system" IS '是否為系統預設科目（TRUE=不可刪除）。';
COMMENT ON COLUMN "nx05_account_code"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx05_account_code"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_account_code"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_account_code"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_account_code"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_account_code"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx05Allowance  →  nx05_allowance
COMMENT ON TABLE "nx05_allowance" IS '折讓單單頭。';
COMMENT ON COLUMN "nx05_allowance"."id" IS '[NX05]+[ALOW]+[7碼流水號]，EX : NX05ALOW0000001';
COMMENT ON COLUMN "nx05_allowance"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx05_allowance"."doc_no" IS '折讓單號（唯一），[AL]-[年月]-[機構碼]-[5碼流水號]，EX：AL-202604-HQ0-00001。';
COMMENT ON COLUMN "nx05_allowance"."allowance_type" IS '折讓方向（P=進貨折讓廠商給我方/S=銷貨折讓我方給客戶）。';
COMMENT ON COLUMN "nx05_allowance"."partner_id" IS '交易對象ID（廠商或客戶，FK nx01_partner）。';
COMMENT ON COLUMN "nx05_allowance"."allowance_date" IS '折讓日期。';
COMMENT ON COLUMN "nx05_allowance"."ref_ar_id" IS '關聯應收帳款ID（allowance_type=S時填入，FK nx05_ar_ledger）。';
COMMENT ON COLUMN "nx05_allowance"."ref_ap_id" IS '關聯應付帳款ID（allowance_type=P時填入，FK nx05_ap_ledger）。';
COMMENT ON COLUMN "nx05_allowance"."total_amount" IS '折讓總金額（明細加總）。';
COMMENT ON COLUMN "nx05_allowance"."status" IS '狀態（DRAFT / PENDING / APPROVED / PROCESSED / VOIDED）。';
COMMENT ON COLUMN "nx05_allowance"."approved_at" IS '核准時間（負責人核准，status=P時填入）。';
COMMENT ON COLUMN "nx05_allowance"."approved_by" IS '核准人（使用者ID）。';
COMMENT ON COLUMN "nx05_allowance"."reject_reason" IS '退件原因（負責人退件時必填）。';
COMMENT ON COLUMN "nx05_allowance"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_allowance"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_allowance"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_allowance"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_allowance"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx05AllowanceItem  →  nx05_allowance_item
COMMENT ON TABLE "nx05_allowance_item" IS '折讓單明細行。';
COMMENT ON COLUMN "nx05_allowance_item"."id" IS '[NX05]+[AWIT]+[7碼流水號]，EX : NX05AWIT0000001';
COMMENT ON COLUMN "nx05_allowance_item"."allowance_id" IS '對應折讓單表頭ID（FK nx05_allowance）。';
COMMENT ON COLUMN "nx05_allowance_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx05_allowance_item"."reason" IS '折讓原因（品質問題/數量短缺/規格不符/定價錯誤/其他）。';
COMMENT ON COLUMN "nx05_allowance_item"."amount" IS '折讓金額。';
COMMENT ON COLUMN "nx05_allowance_item"."disposal_method" IS '處置方式（O=沖銷AP/AR / D=下次折抵 / R=現金退回）。';
COMMENT ON COLUMN "nx05_allowance_item"."ref_doc_id" IS '來源單據ID（可空，關聯進貨單RR或銷貨單SO）。';
COMMENT ON COLUMN "nx05_allowance_item"."ref_doc_type" IS '來源單據類型（RR=進貨單/SO=銷貨單）。';
COMMENT ON COLUMN "nx05_allowance_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_allowance_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_allowance_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_allowance_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_allowance_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx05ApLedger  →  nx05_ap_ledger
COMMENT ON TABLE "nx05_ap_ledger" IS '應付帳款明細帳（應付子帳）。';
COMMENT ON COLUMN "nx05_ap_ledger"."id" IS '[NX05]+[APLE]+[7碼流水號]，EX : NX05APLE0000001';
COMMENT ON COLUMN "nx05_ap_ledger"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx05_ap_ledger"."doc_no" IS '應付帳款單號（唯一），[AP]-[年月]-[機構碼]-[5碼流水號]，EX：AP-202604-HQ0-00001。';
COMMENT ON COLUMN "nx05_ap_ledger"."source_type" IS '來源類型（PO=採購單/RR=進貨單/TI=調貨單）。PLUS前PO確認產生；LITE進貨入帳後產生。';
COMMENT ON COLUMN "nx05_ap_ledger"."po_id" IS '來源採購單ID（可空，PLUS限定，FK nx02_po）。';
COMMENT ON COLUMN "nx05_ap_ledger"."rr_id" IS '來源進貨單ID（可空，LITE直接由RR產生，FK nx02_rr）。';
COMMENT ON COLUMN "nx05_ap_ledger"."ti_id" IS '來源調貨單ID（可空，FK nx02_ti）。';
COMMENT ON COLUMN "nx05_ap_ledger"."supplier_id" IS '廠商ID（FK nx01_partner）。';
COMMENT ON COLUMN "nx05_ap_ledger"."bill_to_partner_id" IS '帳款歸戶對象（FK nx01_partner、可空＝同 supplierId）。直送鏈盤點 2026-07-11 補接： 承 PO.invoiceToPartnerId（母公司付款/集團代付、T7 有欄無帳收尾）；付款單 partner 取此欄優先於 supplierId。';
COMMENT ON COLUMN "nx05_ap_ledger"."ap_date" IS '應付帳款產生日期。';
COMMENT ON COLUMN "nx05_ap_ledger"."due_date" IS '到期日（依付款條件計算）。';
COMMENT ON COLUMN "nx05_ap_ledger"."currency_id" IS '幣別ID（FK nx01_currency）。';
COMMENT ON COLUMN "nx05_ap_ledger"."original_amount" IS '應付金額（含稅）。';
COMMENT ON COLUMN "nx05_ap_ledger"."paid_amount" IS '已付金額（累計）。';
COMMENT ON COLUMN "nx05_ap_ledger"."balance_amount" IS '未付餘額（original_amount - paid_amount）。';
COMMENT ON COLUMN "nx05_ap_ledger"."status" IS '狀態（OPEN / PARTIAL / PAID / OVERDUE / VOID）。';
COMMENT ON COLUMN "nx05_ap_ledger"."payment_term" IS '付款條件快照（自廠商主檔帶入）。';
COMMENT ON COLUMN "nx05_ap_ledger"."write_off_at" IS '核銷時間（status=C時填入）。';
COMMENT ON COLUMN "nx05_ap_ledger"."write_off_by" IS '核銷人（使用者ID）。';
COMMENT ON COLUMN "nx05_ap_ledger"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_ap_ledger"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_ap_ledger"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_ap_ledger"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_ap_ledger"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx05ArLedger  →  nx05_ar_ledger
COMMENT ON TABLE "nx05_ar_ledger" IS '應收帳款明細帳（應收子帳）。';
COMMENT ON COLUMN "nx05_ar_ledger"."id" IS '[NX05]+[ARLE]+[7碼流水號]，EX : NX05ARLE0000001';
COMMENT ON COLUMN "nx05_ar_ledger"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx05_ar_ledger"."doc_no" IS '應收帳款單號（唯一），[AR]-[年月]-[機構碼]-[5碼流水號]，EX：AR-202604-HQ0-00001。';
COMMENT ON COLUMN "nx05_ar_ledger"."source_type" IS '來源類型（SO=銷貨單 / PR=廠商退費衍生）。對齊 Nx05ApLedger.sourceType 範式。階段 F P1 加。';
COMMENT ON COLUMN "nx05_ar_ledger"."so_id" IS '來源銷貨單ID（FK nx04_so、sourceType=SO 時必填、PR 時為 null）。階段 F P1 改 nullable。';
COMMENT ON COLUMN "nx05_ar_ledger"."pr_id" IS '來源廠商退費單ID（FK nx02_pr、sourceType=PR 時填）。階段 F P1 加。';
COMMENT ON COLUMN "nx05_ar_ledger"."customer_id" IS '客戶ID（快照自SO，FK nx01_partner）。';
COMMENT ON COLUMN "nx05_ar_ledger"."ar_date" IS '應收帳款產生日期。';
COMMENT ON COLUMN "nx05_ar_ledger"."due_date" IS '到期日（依付款條件計算）。';
COMMENT ON COLUMN "nx05_ar_ledger"."currency_id" IS '幣別ID（FK nx01_currency）。';
COMMENT ON COLUMN "nx05_ar_ledger"."original_amount" IS '應收金額（含稅）。';
COMMENT ON COLUMN "nx05_ar_ledger"."paid_amount" IS '已收金額（累計）。';
COMMENT ON COLUMN "nx05_ar_ledger"."balance_amount" IS '未收餘額（original_amount - paid_amount）。';
COMMENT ON COLUMN "nx05_ar_ledger"."status" IS '狀態（OPEN / PARTIAL / PAID / OVERDUE / WRITTEN_OFF）。';
COMMENT ON COLUMN "nx05_ar_ledger"."payment_term" IS '付款條件快照（自SO帶入）。';
COMMENT ON COLUMN "nx05_ar_ledger"."overdue_days" IS '逾期天數（系統每日計算，due_date < today 時累計）。';
COMMENT ON COLUMN "nx05_ar_ledger"."is_partial_approved" IS '部分收款是否已獲負責人核准（partial payment 需核准）。';
COMMENT ON COLUMN "nx05_ar_ledger"."write_off_at" IS '核銷時間（status=C時填入）。';
COMMENT ON COLUMN "nx05_ar_ledger"."write_off_by" IS '核銷人（使用者ID）。';
COMMENT ON COLUMN "nx05_ar_ledger"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_ar_ledger"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_ar_ledger"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_ar_ledger"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_ar_ledger"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx05Closing  →  nx05_closing
COMMENT ON TABLE "nx05_closing" IS '月關帳紀錄。';
COMMENT ON COLUMN "nx05_closing"."id" IS '[NX05]+[CLOS]+[7碼流水號]，EX : NX05CLOS0000001';
COMMENT ON COLUMN "nx05_closing"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx05_closing"."doc_no" IS '關帳單號（唯一），[CL]-[年月]-[機構碼]-[5碼流水號]，EX：CL-202604-HQ0-00001。';
COMMENT ON COLUMN "nx05_closing"."closing_date" IS '關帳日期（每日一筆，唯一）。';
COMMENT ON COLUMN "nx05_closing"."closed_at" IS '關帳時間（人工執行或系統自動）。';
COMMENT ON COLUMN "nx05_closing"."closed_by" IS '關帳執行人（使用者ID）。';
COMMENT ON COLUMN "nx05_closing"."is_auto" IS '是否為系統自動關帳（TRUE=系統自動/FALSE=人工執行）。';
COMMENT ON COLUMN "nx05_closing"."report_printed_at" IS '401報表列印/下載時間。';
COMMENT ON COLUMN "nx05_closing"."report_printed_by" IS '報表列印人（使用者ID）。';
COMMENT ON COLUMN "nx05_closing"."status" IS '狀態（OPEN / CLOSING / CLOSED / REOPENED）。';
COMMENT ON COLUMN "nx05_closing"."reopened_at" IS '解除關帳時間（status=R時填入）。';
COMMENT ON COLUMN "nx05_closing"."reopened_by" IS '解除關帳人（負責人，使用者ID）。';
COMMENT ON COLUMN "nx05_closing"."reopen_reason" IS '解除原因（必填，永久保存作稽核依據）。';
COMMENT ON COLUMN "nx05_closing"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_closing"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_closing"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_closing"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_closing"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_closing"."report_period" IS '階段 F P1 加：所屬 401 申報期（YYYY-EE 格式、EE=01~06、01=1-2月 / 02=3-4月 / 03=5-6月 / 04=7-8月 / 05=9-10月 / 06=11-12月）。Q5=b 對齊 C 案上報旗標。';
COMMENT ON COLUMN "nx05_closing"."report_filed_at" IS '階段 F P1 加：上報 401 報表完成時間（null=未上報、可解鎖該期；非 null=已上報、該期所有月鎖死）';
COMMENT ON COLUMN "nx05_closing"."report_filed_by" IS '階段 F P1 加：上報人 user id（FK nx01_user）';

-- Nx05Note  →  nx05_note
COMMENT ON TABLE "nx05_note" IS '票據——支票／本票管理。';
COMMENT ON COLUMN "nx05_note"."id" IS '[NX05]+[NOTE]+[7碼流水號]，EX : NX05NOTE0000001';
COMMENT ON COLUMN "nx05_note"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx05_note"."doc_no" IS '票據系統單號（唯一），[NT]-[年月]-[機構碼]-[5碼流水號]，EX：NT-202604-HQ0-00001。票號本身另欄填入。';
COMMENT ON COLUMN "nx05_note"."note_type" IS '票據類型（CK=支票/PN=本票）。';
COMMENT ON COLUMN "nx05_note"."direction" IS '方向（R=應收票據/P=應付票據）。';
COMMENT ON COLUMN "nx05_note"."partner_id" IS '票據來源/受款人（FK nx01_partner）。';
COMMENT ON COLUMN "nx05_note"."note_no" IS '票號（銀行票據編號，人工填入）。';
COMMENT ON COLUMN "nx05_note"."bank_name" IS '銀行名稱。';
COMMENT ON COLUMN "nx05_note"."bank_account" IS '帳號末四碼（選填，供對帳使用）。';
COMMENT ON COLUMN "nx05_note"."amount" IS '票面金額。';
COMMENT ON COLUMN "nx05_note"."currency_id" IS '幣別ID（FK nx01_currency）。';
COMMENT ON COLUMN "nx05_note"."issue_date" IS '開票日期。';
COMMENT ON COLUMN "nx05_note"."due_date" IS '到期日。';
COMMENT ON COLUMN "nx05_note"."status" IS '狀態（DRAFT / ACTIVE / CLEARED / BOUNCED / VOIDED）。';
COMMENT ON COLUMN "nx05_note"."cleared_at" IS '兌現時間（status=C時填入）。';
COMMENT ON COLUMN "nx05_note"."bounced_at" IS '退票時間（status=B時填入）。';
COMMENT ON COLUMN "nx05_note"."bounced_reason" IS '退票原因（status=B時必填）。';
COMMENT ON COLUMN "nx05_note"."paylog_id" IS '關聯收付款紀錄ID（票據開立時關聯，FK nx05_paylog）。';
COMMENT ON COLUMN "nx05_note"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_note"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_note"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_note"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_note"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx05Paylog  →  nx05_paylog
COMMENT ON TABLE "nx05_paylog" IS '收付款紀錄——收款／付款流水。';
COMMENT ON COLUMN "nx05_paylog"."id" IS '[NX05]+[PAYL]+[7碼流水號]，EX : NX05PAYL0000001';
COMMENT ON COLUMN "nx05_paylog"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx05_paylog"."doc_no" IS '收付款單號（唯一），[PY]-[年月]-[機構碼]-[5碼流水號]，EX：PY-202604-HQ0-00001。';
COMMENT ON COLUMN "nx05_paylog"."pay_type" IS '收付款類型（CR=客戶收款/CP=廠商付款/RR=廠商退款/RC=客戶退款/EX=費用支出）。';
COMMENT ON COLUMN "nx05_paylog"."pay_date" IS '收付款日期。';
COMMENT ON COLUMN "nx05_paylog"."partner_id" IS '交易對象ID（EX費用支出可空，FK nx01_partner）。';
COMMENT ON COLUMN "nx05_paylog"."ar_id" IS '關聯應收帳款ID（pay_type=CR/RC時填入，FK nx05_ar_ledger）。';
COMMENT ON COLUMN "nx05_paylog"."ap_id" IS '關聯應付帳款ID（pay_type=CP/RR時填入，FK nx05_ap_ledger）。';
COMMENT ON COLUMN "nx05_paylog"."amount" IS '收付款金額（正數）。';
COMMENT ON COLUMN "nx05_paylog"."currency_id" IS '幣別ID（FK nx01_currency）。';
COMMENT ON COLUMN "nx05_paylog"."pay_method" IS '付款方式（CA=現金/TT=匯款/CK=支票/PN=本票）。';
COMMENT ON COLUMN "nx05_paylog"."note_id" IS '關聯票據ID（pay_method=CK/PN時填入，FK nx05_note）。';
COMMENT ON COLUMN "nx05_paylog"."account_code_id" IS '會計科目ID（pay_type=EX費用支出時必填，FK nx05_account_code）。';
COMMENT ON COLUMN "nx05_paylog"."cash_balance_after" IS '現金餘額快照（pay_method=CA時，交易後的現金庫存餘額）。';
COMMENT ON COLUMN "nx05_paylog"."status" IS '單據狀態（DRAFT / POSTED / VOIDED）。';
COMMENT ON COLUMN "nx05_paylog"."voided_at" IS '作廢時間。';
COMMENT ON COLUMN "nx05_paylog"."posted_at" IS '過帳時間（POSTED 時填入）。';
COMMENT ON COLUMN "nx05_paylog"."remark" IS '備註。';
COMMENT ON COLUMN "nx05_paylog"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx05_paylog"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx05_paylog"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx05_paylog"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx05PaylogSettlement  →  nx05_paylog_settlement
COMMENT ON TABLE "nx05_paylog_settlement" IS '階段 F P5：一票對多沖銷對應表（Alex §1=1a）';
COMMENT ON COLUMN "nx05_paylog_settlement"."id" IS '[NX05]+[PYST]+[7碼流水號]';
COMMENT ON COLUMN "nx05_paylog_settlement"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx05_paylog_settlement"."paylog_id" IS '收付款紀錄 ID（FK nx05_paylog）';
COMMENT ON COLUMN "nx05_paylog_settlement"."ar_id" IS '沖銷的應收 ID（與 apId 二擇一、DB check constraint 保證）';
COMMENT ON COLUMN "nx05_paylog_settlement"."ap_id" IS '沖銷的應付 ID（與 arId 二擇一）';
COMMENT ON COLUMN "nx05_paylog_settlement"."settled_amount" IS '該筆沖了多少（部分收款支援）';
COMMENT ON COLUMN "nx05_paylog_settlement"."remark" IS '備註';
COMMENT ON COLUMN "nx05_paylog_settlement"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx05_paylog_settlement"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx05_paylog_settlement"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx05_paylog_settlement"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx05ArReminderLog  →  nx05_ar_reminder_log
COMMENT ON TABLE "nx05_ar_reminder_log" IS '階段 F P5：應收催款歷史（Alex §2=2a、純內部記錄）';
COMMENT ON COLUMN "nx05_ar_reminder_log"."id" IS '[NX05]+[ARRM]+[7碼流水號]';
COMMENT ON COLUMN "nx05_ar_reminder_log"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx05_ar_reminder_log"."ar_id" IS '應收帳款 ID（FK nx05_ar_ledger）';
COMMENT ON COLUMN "nx05_ar_reminder_log"."reminded_at" IS '催收時間';
COMMENT ON COLUMN "nx05_ar_reminder_log"."reminded_by" IS '催收人員（FK nx01_user）';
COMMENT ON COLUMN "nx05_ar_reminder_log"."remark" IS '備註';
COMMENT ON COLUMN "nx05_ar_reminder_log"."created_at" IS '建立時間';

-- Nx06Dn  →  nx06_dn
COMMENT ON TABLE "nx06_dn" IS '配送單單頭——出貨配送。';
COMMENT ON COLUMN "nx06_dn"."id" IS '[NX06]+[DNHD]+[7碼流水號]，EX : NX06DNHD0000001';
COMMENT ON COLUMN "nx06_dn"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx06_dn"."warehouse_id" IS '出發倉庫ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx06_dn"."doc_no" IS '送貨單號（唯一），[DN]+[年月]+[倉別]+[5碼流水號]，EX：DN-202604-Z01-00001';
COMMENT ON COLUMN "nx06_dn"."dn_date" IS '送貨日期。';
COMMENT ON COLUMN "nx06_dn"."driver_user_id" IS '外務人員ID（FK nx01_user）。';
COMMENT ON COLUMN "nx06_dn"."vehicle_no" IS '車牌號碼（選填）。';
COMMENT ON COLUMN "nx06_dn"."logistics_type" IS '物流類別（DELIVERY / PICKUP / INTL_SHIPPING / RETURN_PICKUP）。';
COMMENT ON COLUMN "nx06_dn"."status" IS '狀態（DRAFT / DISPATCHED / DELIVERED / PICKED_UP / FAILED / VOIDED；國際另含 CUSTOMS / IN_TRANSIT）。';
COMMENT ON COLUMN "nx06_dn"."last_lat" IS '最近一次 GPS 緯度（外務 /driver）。';
COMMENT ON COLUMN "nx06_dn"."last_lng" IS '最近一次 GPS 經度。';
COMMENT ON COLUMN "nx06_dn"."last_location_at" IS 'GPS 更新時間。';
COMMENT ON COLUMN "nx06_dn"."customs_declaration_no" IS '報關單號（國際物流）。';
COMMENT ON COLUMN "nx06_dn"."origin_port" IS '起運港。';
COMMENT ON COLUMN "nx06_dn"."destination_port" IS '目的港。';
COMMENT ON COLUMN "nx06_dn"."eta_date" IS '預計到港日。';
COMMENT ON COLUMN "nx06_dn"."source_so_id" IS '來源銷貨單（配送單自動產生時填入）。';
COMMENT ON COLUMN "nx06_dn"."source_sr_id" IS '來源銷退單（退貨取件單）。';
COMMENT ON COLUMN "nx06_dn"."departed_at" IS '出發時間（外務點擊出發後記錄）。';
COMMENT ON COLUMN "nx06_dn"."completed_at" IS '全部任務完成時間。';
COMMENT ON COLUMN "nx06_dn"."printer_device_id" IS '藍牙印表機裝置 ID（外務員手機 App 配對寫入、NX06-IMPL-01 Phase 1 M2 新增、Crown Q7=a 拍板熱感印表機支援）。';
COMMENT ON COLUMN "nx06_dn"."printed_at" IS '列印時間追蹤（熱感印表機列印後寫入、NX06-IMPL-01 Phase 1 M2 新增）。';
COMMENT ON COLUMN "nx06_dn"."lalamove_order_id" IS 'Lalamove API 訂單 ID（半自動整合、NX06-IMPL-01 Phase 1 M2 新增、Crown Q6=b 拍板）。';
COMMENT ON COLUMN "nx06_dn"."lalamove_tracking_no" IS 'Lalamove 追蹤碼。';
COMMENT ON COLUMN "nx06_dn"."lalamove_callback_status" IS 'Lalamove webhook 最新狀態（PENDING/ASSIGNING/PICKED_UP/COMPLETED/CANCELLED）。';
COMMENT ON COLUMN "nx06_dn"."route_order_in_sequence" IS '多車場景：在某外務員 batch 內的順序（1, 2, 3, ...）。NX06-IMPL-02 M1 新增';
COMMENT ON COLUMN "nx06_dn"."estimated_duration_sec" IS 'Google Maps Distance Matrix 預估配送時長（秒）。NX06-IMPL-02 M1 新增';
COMMENT ON COLUMN "nx06_dn"."route_batch_id" IS '路線優化 batch ID（multi-DN 一次優化批次）。NX06-IMPL-02 M1 新增';
COMMENT ON COLUMN "nx06_dn"."remark" IS '備註（含臨時收件等口頭回報記錄）。';
COMMENT ON COLUMN "nx06_dn"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx06_dn"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx06_dn"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx06_dn"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx06DnItem  →  nx06_dn_item
COMMENT ON TABLE "nx06_dn_item" IS '配送單明細行。';
COMMENT ON COLUMN "nx06_dn_item"."id" IS '[NX06]+[DNIT]+[7碼流水號]，EX : NX06DNIT0000001';
COMMENT ON COLUMN "nx06_dn_item"."dn_id" IS '對應送貨單表頭ID（FK nx06_dn）。';
COMMENT ON COLUMN "nx06_dn_item"."stop_id" IS '對應停靠點ID（FK nx06_dn_stop）。';
COMMENT ON COLUMN "nx06_dn_item"."line_no" IS '明細行號（1,2,3…）。';
COMMENT ON COLUMN "nx06_dn_item"."source_doc_type" IS '來源單據類型（SO=銷貨單NX04/ST=調撥單NX03/TI=調貨單NX02/PR=退供應商NX02/SR=銷退單NX04）。';
COMMENT ON COLUMN "nx06_dn_item"."source_doc_id" IS '來源單據ID。';
COMMENT ON COLUMN "nx06_dn_item"."source_item_id" IS '來源明細ID（可空）。';
COMMENT ON COLUMN "nx06_dn_item"."parcel_id" IS '關聯包裹ID（調撥/寄貨有包貨時填入，FK nx03_parcel）。';
COMMENT ON COLUMN "nx06_dn_item"."part_id" IS '零件ID（FK nx01_part，PICKUP/RETURN任務時填入）。';
COMMENT ON COLUMN "nx06_dn_item"."part_no" IS '零件料號快照。';
COMMENT ON COLUMN "nx06_dn_item"."part_name" IS '零件名稱快照。';
COMMENT ON COLUMN "nx06_dn_item"."qty" IS '應送/取數量。';
COMMENT ON COLUMN "nx06_dn_item"."delivery_status" IS '交付狀態（P=待確認/C=正常交付/E=異常）。外務可標記異常，客戶確認後再簽名。';
COMMENT ON COLUMN "nx06_dn_item"."exception_type" IS '異常類型（W=送錯料號/Q=數量不符/D=貨物損壞/O=其他）。delivery_status=E時必填。';
COMMENT ON COLUMN "nx06_dn_item"."exception_reason" IS '異常說明（delivery_status=E時必填）。';
COMMENT ON COLUMN "nx06_dn_item"."internal_cost" IS '配送成本內部記錄（對外不顯示、自家油錢估算 or Lalamove API 回傳實際費用）。NX06-IMPL-01 Phase 1 M1 新增（Crown Q8/Q9=a 拍板汽配業界客戶不另收運費、內部記錄）。';
COMMENT ON COLUMN "nx06_dn_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx06_dn_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx06_dn_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx06_dn_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx06DnStop  →  nx06_dn_stop
COMMENT ON TABLE "nx06_dn_stop" IS '配送點——一趟配送的多個停靠點。';
COMMENT ON COLUMN "nx06_dn_stop"."id" IS '[NX06]+[DNST]+[7碼流水號]，EX : NX06DNST0000001';
COMMENT ON COLUMN "nx06_dn_stop"."dn_id" IS '對應送貨單表頭ID（FK nx06_dn）。';
COMMENT ON COLUMN "nx06_dn_stop"."stop_no" IS '停靠順序號碼（1,2,3…），物流組長安排路線順序。';
COMMENT ON COLUMN "nx06_dn_stop"."task_type" IS '任務類型（D=DELIVER送貨/K=PICKUP取貨/R=RETURN退貨/C=COLLECT取回退貨）。';
COMMENT ON COLUMN "nx06_dn_stop"."partner_id" IS '交易對象ID（客戶或同行，FK nx01_partner）。';
COMMENT ON COLUMN "nx06_dn_stop"."warehouse_id" IS '目標倉庫ID（調撥送貨時填入，FK nx01_warehouse）。';
COMMENT ON COLUMN "nx06_dn_stop"."address" IS '停靠地址。';
COMMENT ON COLUMN "nx06_dn_stop"."contact_name" IS '聯絡人姓名（選填）。';
COMMENT ON COLUMN "nx06_dn_stop"."contact_phone" IS '聯絡電話（選填）。';
COMMENT ON COLUMN "nx06_dn_stop"."status" IS '停靠狀態（P=待到達/D=已到達/C=已完成/E=異常）。';
COMMENT ON COLUMN "nx06_dn_stop"."arrived_at" IS '實際到達時間。';
COMMENT ON COLUMN "nx06_dn_stop"."completed_at" IS '此停靠點完成時間。';
COMMENT ON COLUMN "nx06_dn_stop"."signer_type" IS '簽收方式（C=客戶簽收/W=倉管簽收/N=不需簽收）。';
COMMENT ON COLUMN "nx06_dn_stop"."signed_at" IS '簽收時間（signer_type=C/W時填入）。';
COMMENT ON COLUMN "nx06_dn_stop"."signed_by_name" IS '簽收人姓名（客戶或倉管）。';
COMMENT ON COLUMN "nx06_dn_stop"."signature_url" IS '電子簽名照片路徑（簽名後上傳存儲）。';
COMMENT ON COLUMN "nx06_dn_stop"."exception_remark" IS '停靠點異常說明（status=E時填入，例：客戶不在/地址錯誤）。';
COMMENT ON COLUMN "nx06_dn_stop"."remark" IS '備註。';
COMMENT ON COLUMN "nx06_dn_stop"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx06_dn_stop"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx06_dn_stop"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07Attendance  →  nx07_attendance
COMMENT ON TABLE "nx07_attendance" IS '出勤紀錄。';
COMMENT ON COLUMN "nx07_attendance"."id" IS '[NX07]+[ATND]+[7碼流水號]，EX : NX07ATND0000001';
COMMENT ON COLUMN "nx07_attendance"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_attendance"."user_id" IS '員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx07_attendance"."work_date" IS '工作日期。';
COMMENT ON COLUMN "nx07_attendance"."schedule_item_id" IS '對應排班明細ID（FK nx07_schedule_item）。';
COMMENT ON COLUMN "nx07_attendance"."clock_in_at" IS '實際上班打卡時間。';
COMMENT ON COLUMN "nx07_attendance"."clock_out_at" IS '實際下班打卡時間。';
COMMENT ON COLUMN "nx07_attendance"."clock_in_method" IS '上班打卡方式（I=IP驗證/M=手動/R=遠端）。';
COMMENT ON COLUMN "nx07_attendance"."clock_out_method" IS '下班打卡方式（I=IP驗證/M=手動/R=遠端）。';
COMMENT ON COLUMN "nx07_attendance"."clock_in_ip" IS '上班打卡IP位址。';
COMMENT ON COLUMN "nx07_attendance"."clock_out_ip" IS '下班打卡IP位址。';
COMMENT ON COLUMN "nx07_attendance"."line_verified" IS 'LINE Login 是否已驗證。';
COMMENT ON COLUMN "nx07_attendance"."std_clock_in" IS '基準上班時間（含主管審核補正後的時間）。';
COMMENT ON COLUMN "nx07_attendance"."std_clock_out" IS '基準下班時間（含主管審核補正後的時間）。';
COMMENT ON COLUMN "nx07_attendance"."late_minutes" IS '遲到分鐘數（系統自動計算）。';
COMMENT ON COLUMN "nx07_attendance"."early_leave_minutes" IS '早退分鐘數（系統自動計算）。';
COMMENT ON COLUMN "nx07_attendance"."work_hours" IS '實際工作時數（系統自動計算）。';
COMMENT ON COLUMN "nx07_attendance"."overtime_hours" IS '加班時數（系統自動計算）。';
COMMENT ON COLUMN "nx07_attendance"."status" IS '狀態（NORMAL/LATE/EARLY/ABSENT/SPECIAL 等；作廢以 voided_at 表示）。';
COMMENT ON COLUMN "nx07_attendance"."approved_by" IS '主管審核人（遲到/早退/遠端打卡時填入）。';
COMMENT ON COLUMN "nx07_attendance"."approved_at" IS '主管審核時間。';
COMMENT ON COLUMN "nx07_attendance"."approve_remark" IS '審核說明（業務需求導致遲到/早退的原因）。';
COMMENT ON COLUMN "nx07_attendance"."voided_at" IS '作廢時間（DELETE 作廢）。';
COMMENT ON COLUMN "nx07_attendance"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_attendance"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_attendance"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_attendance"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07IpWhitelist  →  nx07_ip_whitelist
COMMENT ON TABLE "nx07_ip_whitelist" IS '打卡 IP 白名單。';
COMMENT ON COLUMN "nx07_ip_whitelist"."id" IS '[NX07]+[IPWL]+[7碼流水號]，EX : NX07IPWL0000001';
COMMENT ON COLUMN "nx07_ip_whitelist"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_ip_whitelist"."warehouse_id" IS '對應倉庫ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx07_ip_whitelist"."ip_address" IS 'IP 位址或 CIDR 範圍，例：192.168.1.0/24。';
COMMENT ON COLUMN "nx07_ip_whitelist"."name" IS '名稱說明，例：Z01台北倉固定IP。';
COMMENT ON COLUMN "nx07_ip_whitelist"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx07_ip_whitelist"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_ip_whitelist"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_ip_whitelist"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_ip_whitelist"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07LeaveBalance  →  nx07_leave_balance
COMMENT ON TABLE "nx07_leave_balance" IS '假別餘額——各員工各假別剩餘。';
COMMENT ON COLUMN "nx07_leave_balance"."id" IS '[NX07]+[LVBL]+[7碼流水號]，EX : NX07LVBL0000001';
COMMENT ON COLUMN "nx07_leave_balance"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_leave_balance"."user_id" IS '員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx07_leave_balance"."leave_type_id" IS '假別ID（FK nx07_leave_type）。';
COMMENT ON COLUMN "nx07_leave_balance"."year" IS '年度，例：2026。';
COMMENT ON COLUMN "nx07_leave_balance"."entitled_hours" IS '應有時數（依年資/勞基法計算）。';
COMMENT ON COLUMN "nx07_leave_balance"."used_hours" IS '已使用時數。';
COMMENT ON COLUMN "nx07_leave_balance"."remaining_hours" IS '剩餘時數（entitled_hours - used_hours）。';
COMMENT ON COLUMN "nx07_leave_balance"."carry_over_hours" IS '上年度結轉時數。';
COMMENT ON COLUMN "nx07_leave_balance"."updated_at" IS '更新時間。';

-- Nx07LeaveRequest  →  nx07_leave_request
COMMENT ON TABLE "nx07_leave_request" IS '請假單。';
COMMENT ON COLUMN "nx07_leave_request"."id" IS '[NX07]+[LVRQ]+[7碼流水號]，EX : NX07LVRQ0000001';
COMMENT ON COLUMN "nx07_leave_request"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_leave_request"."user_id" IS '申請人員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx07_leave_request"."leave_type_id" IS '假別ID（FK nx07_leave_type）。';
COMMENT ON COLUMN "nx07_leave_request"."request_type" IS '申請類型（S=排休/T=臨時請假）。';
COMMENT ON COLUMN "nx07_leave_request"."start_at" IS '請假開始時間。';
COMMENT ON COLUMN "nx07_leave_request"."end_at" IS '請假結束時間。';
COMMENT ON COLUMN "nx07_leave_request"."total_hours" IS '請假總時數（系統自動計算）。';
COMMENT ON COLUMN "nx07_leave_request"."reason" IS '請假原因（病假/事假必填）。';
COMMENT ON COLUMN "nx07_leave_request"."attachment_url" IS '附件路徑（病假診斷證明等）。';
COMMENT ON COLUMN "nx07_leave_request"."status" IS '狀態（DRAFT/PENDING/APPROVED/REJECTED/CANCELLED）。';
COMMENT ON COLUMN "nx07_leave_request"."approved_by" IS '審核人（主管，使用者ID）。';
COMMENT ON COLUMN "nx07_leave_request"."approved_at" IS '審核時間。';
COMMENT ON COLUMN "nx07_leave_request"."reject_reason" IS '退件原因（退件時必填）。';
COMMENT ON COLUMN "nx07_leave_request"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_leave_request"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_leave_request"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_leave_request"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07LeaveType  →  nx07_leave_type
COMMENT ON TABLE "nx07_leave_type" IS '假別主檔（字典表）。';
COMMENT ON COLUMN "nx07_leave_type"."id" IS '[NX07]+[LVTP]+[7碼流水號]，EX : NX07LVTP0000001';
COMMENT ON COLUMN "nx07_leave_type"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_leave_type"."code" IS '假別代碼，例：ANNUAL/SICK/PERSONAL。';
COMMENT ON COLUMN "nx07_leave_type"."name" IS '假別名稱，例：特休/病假/事假。';
COMMENT ON COLUMN "nx07_leave_type"."is_paid" IS '是否為有薪假。';
COMMENT ON COLUMN "nx07_leave_type"."max_days_per_year" IS '每年最高天數（NULL表示無上限，依勞基法計算）。';
COMMENT ON COLUMN "nx07_leave_type"."min_apply_hours" IS '最小請假單位（小時），例：0.5=半小時/1=1小時/8=1天。';
COMMENT ON COLUMN "nx07_leave_type"."need_approval" IS '是否需要主管審核。';
COMMENT ON COLUMN "nx07_leave_type"."is_system" IS '是否系統預設假別（TRUE=勞基法規定，不可刪除）。';
COMMENT ON COLUMN "nx07_leave_type"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx07_leave_type"."sort_no" IS '排序用。';
COMMENT ON COLUMN "nx07_leave_type"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_leave_type"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_leave_type"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_leave_type"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07OvertimeRequest  →  nx07_overtime_request
COMMENT ON TABLE "nx07_overtime_request" IS '加班申請單。';
COMMENT ON COLUMN "nx07_overtime_request"."id" IS '[NX07]+[OTRQ]+[7碼流水號]，EX : NX07OTRQ0000001';
COMMENT ON COLUMN "nx07_overtime_request"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_overtime_request"."user_id" IS '申請人員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx07_overtime_request"."work_date" IS '加班日期。';
COMMENT ON COLUMN "nx07_overtime_request"."start_at" IS '加班開始時間。';
COMMENT ON COLUMN "nx07_overtime_request"."end_at" IS '加班結束時間。';
COMMENT ON COLUMN "nx07_overtime_request"."total_hours" IS '加班總時數（系統自動計算）。';
COMMENT ON COLUMN "nx07_overtime_request"."reason" IS '加班原因（必填）。';
COMMENT ON COLUMN "nx07_overtime_request"."ot_type" IS '加班類型（W=平日加班/H=假日加班）。影響加班費計算。';
COMMENT ON COLUMN "nx07_overtime_request"."status" IS '狀態（DRAFT/PENDING/APPROVED/REJECTED/CANCELLED）。';
COMMENT ON COLUMN "nx07_overtime_request"."approved_by" IS '審核人（主管，使用者ID）。';
COMMENT ON COLUMN "nx07_overtime_request"."approved_at" IS '審核時間。';
COMMENT ON COLUMN "nx07_overtime_request"."reject_reason" IS '退件原因。';
COMMENT ON COLUMN "nx07_overtime_request"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_overtime_request"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_overtime_request"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_overtime_request"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07SalaryComponent  →  nx07_salary_component
COMMENT ON TABLE "nx07_salary_component" IS '薪資項目——加給／扣項定義。';
COMMENT ON COLUMN "nx07_salary_component"."id" IS '[NX07]+[SLCP]+[7碼流水號]，EX : NX07SLCP0000001';
COMMENT ON COLUMN "nx07_salary_component"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_salary_component"."code" IS '項目代碼，例：TRANSPORT/MEAL/ATTENDANCE_BONUS。';
COMMENT ON COLUMN "nx07_salary_component"."name" IS '項目名稱，例：交通津貼/餐費補貼/全勤獎金。';
COMMENT ON COLUMN "nx07_salary_component"."comp_type" IS '項目類型（A=加項/D=減項）。加項=加薪，減項=扣薪。';
COMMENT ON COLUMN "nx07_salary_component"."calc_method" IS '計算方式（F=固定金額/R=比率/K=依KPI達成率）。';
COMMENT ON COLUMN "nx07_salary_component"."default_value" IS '預設金額或比率。';
COMMENT ON COLUMN "nx07_salary_component"."kpi_template_id" IS '關聯KPI指標ID（calc_method=K時填入，FK nx01_kpi_template）。';
COMMENT ON COLUMN "nx07_salary_component"."is_system" IS '是否系統預設項目（TRUE=不可刪除，例如底薪/加班費）。';
COMMENT ON COLUMN "nx07_salary_component"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx07_salary_component"."sort_no" IS '排序用。';
COMMENT ON COLUMN "nx07_salary_component"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_salary_component"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_salary_component"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_salary_component"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07SalaryRecord  →  nx07_salary_record
COMMENT ON TABLE "nx07_salary_record" IS '薪資單單頭——每期薪資。';
COMMENT ON COLUMN "nx07_salary_record"."id" IS '[NX07]+[SLRC]+[7碼流水號]，EX : NX07SLRC0000001';
COMMENT ON COLUMN "nx07_salary_record"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_salary_record"."user_id" IS '員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx07_salary_record"."year_month" IS '薪資年月（格式：YYYY-MM）。';
COMMENT ON COLUMN "nx07_salary_record"."base_salary" IS '底薪快照。';
COMMENT ON COLUMN "nx07_salary_record"."work_days" IS '實際工作天數。';
COMMENT ON COLUMN "nx07_salary_record"."work_hours" IS '實際工作時數（兼職計薪用）。';
COMMENT ON COLUMN "nx07_salary_record"."ot_hours_wd" IS '平日加班時數。';
COMMENT ON COLUMN "nx07_salary_record"."ot_hours_holiday" IS '假日加班時數。';
COMMENT ON COLUMN "nx07_salary_record"."ot_pay" IS '加班費（系統自動計算）。';
COMMENT ON COLUMN "nx07_salary_record"."gross_salary" IS '應發薪資合計（底薪+加班費+各加項）。';
COMMENT ON COLUMN "nx07_salary_record"."deduction_total" IS '扣項合計（勞健保/所得稅/各減項）。';
COMMENT ON COLUMN "nx07_salary_record"."net_salary" IS '實發薪資（gross_salary - deduction_total）。';
COMMENT ON COLUMN "nx07_salary_record"."status" IS '狀態（DRAFT/CALCULATING/CONFIRMED/PAID/VOIDED）。';
COMMENT ON COLUMN "nx07_salary_record"."confirmed_at" IS '確認時間。';
COMMENT ON COLUMN "nx07_salary_record"."confirmed_by" IS '確認人（使用者ID）。';
COMMENT ON COLUMN "nx07_salary_record"."paid_at" IS '發放時間。';
COMMENT ON COLUMN "nx07_salary_record"."remark" IS '備註。';
COMMENT ON COLUMN "nx07_salary_record"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_salary_record"."updated_at" IS '更新時間。';

-- Nx07SalaryRecordItem  →  nx07_salary_record_item
COMMENT ON TABLE "nx07_salary_record_item" IS '薪資單明細行——各薪資項目。';
COMMENT ON COLUMN "nx07_salary_record_item"."id" IS '[NX07]+[SLRI]+[7碼流水號]，EX : NX07SLRI0000001';
COMMENT ON COLUMN "nx07_salary_record_item"."salary_record_id" IS '對應薪資記錄ID（FK nx07_salary_record）。';
COMMENT ON COLUMN "nx07_salary_record_item"."component_id" IS '薪資組成項目ID（FK nx07_salary_component）。';
COMMENT ON COLUMN "nx07_salary_record_item"."amount" IS '金額（正數=加項/負數=減項）。';
COMMENT ON COLUMN "nx07_salary_record_item"."calc_basis" IS '計算依據說明，例：KPI達成率85%×5000=4250。';
COMMENT ON COLUMN "nx07_salary_record_item"."created_at" IS '建立時間。';

-- Nx07SalarySetting  →  nx07_salary_setting
COMMENT ON TABLE "nx07_salary_setting" IS '薪資設定——員工薪資基礎。';
COMMENT ON COLUMN "nx07_salary_setting"."id" IS '[NX07]+[SLST]+[7碼流水號]，EX : NX07SLST0000001';
COMMENT ON COLUMN "nx07_salary_setting"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_salary_setting"."user_id" IS '員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx07_salary_setting"."emp_type" IS '員工類別（F=全職月薪/P=兼職時薪）。';
COMMENT ON COLUMN "nx07_salary_setting"."base_salary" IS '底薪（全職=月薪/兼職=時薪）。';
COMMENT ON COLUMN "nx07_salary_setting"."effective_date" IS '生效日期（支援薪資異動記錄）。';
COMMENT ON COLUMN "nx07_salary_setting"."pay_day" IS '發薪日（預設5號，1-28）。';
COMMENT ON COLUMN "nx07_salary_setting"."pay_cycle_start" IS '計薪週期起始日（1表示每月1日）。';
COMMENT ON COLUMN "nx07_salary_setting"."ot_rate_1" IS '平日加班前2小時倍率（勞基法預設1.34）。';
COMMENT ON COLUMN "nx07_salary_setting"."ot_rate_2" IS '平日加班後2小時倍率（勞基法預設1.67）。';
COMMENT ON COLUMN "nx07_salary_setting"."ot_rate_holiday" IS '假日加班倍率（勞基法預設2.00）。';
COMMENT ON COLUMN "nx07_salary_setting"."ot_rate_below_legal" IS '加班倍率是否低於勞基法標準（系統自動檢查，TRUE時顯示警示）。';
COMMENT ON COLUMN "nx07_salary_setting"."remark" IS '備註。';
COMMENT ON COLUMN "nx07_salary_setting"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_salary_setting"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_salary_setting"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_salary_setting"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07Schedule  →  nx07_schedule
COMMENT ON TABLE "nx07_schedule" IS '排班表單頭。';
COMMENT ON COLUMN "nx07_schedule"."id" IS '[NX07]+[SCHD]+[7碼流水號]，EX : NX07SCHD0000001';
COMMENT ON COLUMN "nx07_schedule"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_schedule"."team_id" IS '排班組別ID（FK nx01_team）。';
COMMENT ON COLUMN "nx07_schedule"."year_month" IS '排班年月（格式：YYYY-MM，例：2026-04）。';
COMMENT ON COLUMN "nx07_schedule"."status" IS '狀態（D=草稿/P=已發布/L=已鎖定）。發布後員工可查看，鎖定後不可修改。';
COMMENT ON COLUMN "nx07_schedule"."published_at" IS '發布時間。';
COMMENT ON COLUMN "nx07_schedule"."published_by" IS '發布人（組長，使用者ID）。';
COMMENT ON COLUMN "nx07_schedule"."remark" IS '備註。';
COMMENT ON COLUMN "nx07_schedule"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_schedule"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_schedule"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_schedule"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07ScheduleItem  →  nx07_schedule_item
COMMENT ON TABLE "nx07_schedule_item" IS '排班明細行。';
COMMENT ON COLUMN "nx07_schedule_item"."id" IS '[NX07]+[SCIT]+[7碼流水號]，EX : NX07SCIT0000001';
COMMENT ON COLUMN "nx07_schedule_item"."schedule_id" IS '對應排班主檔ID（FK nx07_schedule）。';
COMMENT ON COLUMN "nx07_schedule_item"."user_id" IS '員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx07_schedule_item"."work_date" IS '排班日期。';
COMMENT ON COLUMN "nx07_schedule_item"."shift_type_id" IS '班別ID（FK nx07_shift_type）。';
COMMENT ON COLUMN "nx07_schedule_item"."swap_user_id" IS '代班人員ID（換班時填入，FK nx01_user）。';
COMMENT ON COLUMN "nx07_schedule_item"."swap_approved" IS '代班是否已核准。';
COMMENT ON COLUMN "nx07_schedule_item"."swap_approved_by" IS '代班核准人（組長，使用者ID）。';
COMMENT ON COLUMN "nx07_schedule_item"."remark" IS '備註。';
COMMENT ON COLUMN "nx07_schedule_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_schedule_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_schedule_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07ShiftType  →  nx07_shift_type
COMMENT ON TABLE "nx07_shift_type" IS '班別主檔（字典表）。';
COMMENT ON COLUMN "nx07_shift_type"."id" IS '[NX07]+[SHFT]+[7碼流水號]，EX : NX07SHFT0000001';
COMMENT ON COLUMN "nx07_shift_type"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx07_shift_type"."code" IS '班別代碼，例：DAY/NIGHT/OFF。';
COMMENT ON COLUMN "nx07_shift_type"."name" IS '班別名稱，例：早班/晚班/休假。';
COMMENT ON COLUMN "nx07_shift_type"."start_time" IS '標準上班時間（例：09:00）。';
COMMENT ON COLUMN "nx07_shift_type"."end_time" IS '標準下班時間（例：18:00）。';
COMMENT ON COLUMN "nx07_shift_type"."is_work_day" IS '是否為工作班（FALSE=休假班）。';
COMMENT ON COLUMN "nx07_shift_type"."cross_midnight" IS '是否跨日班（例：晚班 22:00-06:00）。';
COMMENT ON COLUMN "nx07_shift_type"."color_code" IS '排班顯示顏色（HEX色碼，例：#FF5733）。';
COMMENT ON COLUMN "nx07_shift_type"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx07_shift_type"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx07_shift_type"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx07_shift_type"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx07_shift_type"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx07Performance  →  nx07_performance
COMMENT ON TABLE "nx07_performance" IS '績效考核紀錄。';
COMMENT ON COLUMN "nx07_performance"."id" IS '[NX07]+[PERF]+[7碼流水號]，EX : NX07PERF0000001';
COMMENT ON COLUMN "nx07_performance"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx07_performance"."user_id" IS '受評員工 ID（FK nx01_user）';
COMMENT ON COLUMN "nx07_performance"."title" IS '績效項目標題';
COMMENT ON COLUMN "nx07_performance"."period_label" IS '考核期間標籤';
COMMENT ON COLUMN "nx07_performance"."status" IS '狀態';
COMMENT ON COLUMN "nx07_performance"."score" IS '分數';
COMMENT ON COLUMN "nx07_performance"."comment" IS '評語';
COMMENT ON COLUMN "nx07_performance"."reviewer_user_id" IS '考核人員 ID（FK nx01_user）';
COMMENT ON COLUMN "nx07_performance"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx07_performance"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx07_performance"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx07_performance"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx07Training  →  nx07_training
COMMENT ON TABLE "nx07_training" IS '教育訓練紀錄。';
COMMENT ON COLUMN "nx07_training"."id" IS '[NX07]+[TRNG]+[7碼流水號]，EX : NX07TRNG0000001';
COMMENT ON COLUMN "nx07_training"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx07_training"."title" IS '訓練名稱';
COMMENT ON COLUMN "nx07_training"."start_at" IS '開始時間';
COMMENT ON COLUMN "nx07_training"."end_at" IS '結束時間';
COMMENT ON COLUMN "nx07_training"."location" IS '地點';
COMMENT ON COLUMN "nx07_training"."status" IS '狀態';
COMMENT ON COLUMN "nx07_training"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx07_training"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx07_training"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx07_training"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx07EmployeeChange  →  nx07_employee_change
COMMENT ON TABLE "nx07_employee_change" IS '人事異動單——調職／升遷／離職。';
COMMENT ON COLUMN "nx07_employee_change"."id" IS '[NX07]+[EMCH]+[7碼流水號]，EX : NX07EMCH0000001';
COMMENT ON COLUMN "nx07_employee_change"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx07_employee_change"."target_user_id" IS '異動對象員工 ID（FK nx01_user）';
COMMENT ON COLUMN "nx07_employee_change"."change_type" IS '異動類型';
COMMENT ON COLUMN "nx07_employee_change"."new_role_id" IS '新角色 ID（FK nx01_role）';
COMMENT ON COLUMN "nx07_employee_change"."new_department_id" IS '新部門 ID（FK nx01_department）';
COMMENT ON COLUMN "nx07_employee_change"."effective_date" IS '生效日';
COMMENT ON COLUMN "nx07_employee_change"."remark" IS '備註';
COMMENT ON COLUMN "nx07_employee_change"."status" IS '狀態';
COMMENT ON COLUMN "nx07_employee_change"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx07_employee_change"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx07_employee_change"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx07_employee_change"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx08DailyReport  →  nx08_daily_report
COMMENT ON TABLE "nx08_daily_report" IS '每日營運報表。';
COMMENT ON COLUMN "nx08_daily_report"."id" IS '[NX08]+[DRPT]+[7碼流水號]，EX : NX08DRPT0000001';
COMMENT ON COLUMN "nx08_daily_report"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_daily_report"."user_id" IS '員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx08_daily_report"."report_date" IS '報表日期（每人每日唯一）。';
COMMENT ON COLUMN "nx08_daily_report"."done_items" IS '今日完成事項（逐條填寫，對應五大工作重點）。';
COMMENT ON COLUMN "nx08_daily_report"."kpi_progress" IS 'KPI 當日累計進度（系統自動帶入可量化數字，人工補充說明）。';
COMMENT ON COLUMN "nx08_daily_report"."exception_items" IS '異常事項（需主管協助的問題/風險）。';
COMMENT ON COLUMN "nx08_daily_report"."tomorrow_plan" IS '明日計畫（預計執行事項）。';
COMMENT ON COLUMN "nx08_daily_report"."submitted_at" IS '提交時間（系統記錄）。';
COMMENT ON COLUMN "nx08_daily_report"."supervisor_reply" IS '主管回饋（選填）。';
COMMENT ON COLUMN "nx08_daily_report"."replied_at" IS '主管回饋時間。';
COMMENT ON COLUMN "nx08_daily_report"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_daily_report"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx08_daily_report"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx08_daily_report"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx08FinanceCache  →  nx08_finance_cache
COMMENT ON TABLE "nx08_finance_cache" IS '財務報表快取。';
COMMENT ON COLUMN "nx08_finance_cache"."id" IS '[NX08]+[FICA]+[7碼流水號]，EX : NX08FICA0000001';
COMMENT ON COLUMN "nx08_finance_cache"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_finance_cache"."cache_date" IS '快取計算日期。';
COMMENT ON COLUMN "nx08_finance_cache"."period_type" IS '統計週期（M=月/Q=季/Y=年）。';
COMMENT ON COLUMN "nx08_finance_cache"."period_value" IS '統計期間。';
COMMENT ON COLUMN "nx08_finance_cache"."revenue" IS '營業收入。';
COMMENT ON COLUMN "nx08_finance_cache"."cogs" IS '銷貨成本（COGS）。';
COMMENT ON COLUMN "nx08_finance_cache"."gross_profit" IS '毛利額。';
COMMENT ON COLUMN "nx08_finance_cache"."gross_margin" IS '毛利率（%）。';
COMMENT ON COLUMN "nx08_finance_cache"."expense_total" IS '營業費用合計。';
COMMENT ON COLUMN "nx08_finance_cache"."expense_rate" IS '費用率（expense_total / revenue × 100）。';
COMMENT ON COLUMN "nx08_finance_cache"."ar_total" IS '應收帳款總額快照。';
COMMENT ON COLUMN "nx08_finance_cache"."ar_overdue_rate" IS 'AR逾期率（%）。';
COMMENT ON COLUMN "nx08_finance_cache"."ap_total" IS '應付帳款總額快照。';
COMMENT ON COLUMN "nx08_finance_cache"."cash_cycle_days" IS '現金週轉天數（AR天數 + 庫存天數 - AP天數）。';
COMMENT ON COLUMN "nx08_finance_cache"."hpa_trend" IS '毛利率 HPA 趨勢（U/D/S）。';
COMMENT ON COLUMN "nx08_finance_cache"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_finance_cache"."updated_at" IS '最後計算更新時間。';

-- Nx08HrCache  →  nx08_hr_cache
COMMENT ON TABLE "nx08_hr_cache" IS '人資報表快取。';
COMMENT ON COLUMN "nx08_hr_cache"."id" IS '[NX08]+[HRCA]+[7碼流水號]，EX : NX08HRCA0000001';
COMMENT ON COLUMN "nx08_hr_cache"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_hr_cache"."cache_date" IS '快取計算日期。';
COMMENT ON COLUMN "nx08_hr_cache"."user_id" IS '員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx08_hr_cache"."period_type" IS '統計週期（M=月/Q=季/Y=年）。';
COMMENT ON COLUMN "nx08_hr_cache"."period_value" IS '統計期間。';
COMMENT ON COLUMN "nx08_hr_cache"."attendance_rate" IS '出勤率（%）。';
COMMENT ON COLUMN "nx08_hr_cache"."late_count" IS '遲到次數。';
COMMENT ON COLUMN "nx08_hr_cache"."absence_days" IS '缺勤天數。';
COMMENT ON COLUMN "nx08_hr_cache"."ot_hours" IS '加班時數。';
COMMENT ON COLUMN "nx08_hr_cache"."daily_report_rate" IS '日報表繳交率（%）。';
COMMENT ON COLUMN "nx08_hr_cache"."kpi_achieve_rate" IS 'KPI 總達成率（%）。';
COMMENT ON COLUMN "nx08_hr_cache"."salary_cost" IS '薪資成本快照。';
COMMENT ON COLUMN "nx08_hr_cache"."talent_quadrant" IS '人才象限（HS=高績效高潛力/HL=高績效低潛力/LS=低績效高潛力/LL=低績效低潛力）。';
COMMENT ON COLUMN "nx08_hr_cache"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_hr_cache"."updated_at" IS '最後計算更新時間。';

-- Nx08InventoryCache  →  nx08_inventory_cache
COMMENT ON TABLE "nx08_inventory_cache" IS '庫存報表快取。';
COMMENT ON COLUMN "nx08_inventory_cache"."id" IS '[NX08]+[IVCA]+[7碼流水號]，EX : NX08IVCA0000001';
COMMENT ON COLUMN "nx08_inventory_cache"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_inventory_cache"."cache_date" IS '快取計算日期。';
COMMENT ON COLUMN "nx08_inventory_cache"."part_id" IS '料號ID（FK nx01_part）。';
COMMENT ON COLUMN "nx08_inventory_cache"."warehouse_id" IS '倉庫ID（FK nx01_warehouse）。';
COMMENT ON COLUMN "nx08_inventory_cache"."period_type" IS '統計週期（M=月/Q=季/Y=年）。';
COMMENT ON COLUMN "nx08_inventory_cache"."period_value" IS '統計期間。';
COMMENT ON COLUMN "nx08_inventory_cache"."avg_stock_qty" IS '期間平均庫存量。';
COMMENT ON COLUMN "nx08_inventory_cache"."sales_qty" IS '期間銷售量。';
COMMENT ON COLUMN "nx08_inventory_cache"."sales_amount" IS '期間銷售金額。';
COMMENT ON COLUMN "nx08_inventory_cache"."turnover_rate" IS '庫存週轉率（sales_qty / avg_stock_qty × 12）。';
COMMENT ON COLUMN "nx08_inventory_cache"."stock_value" IS '庫存總值快照。';
COMMENT ON COLUMN "nx08_inventory_cache"."days_stagnant" IS '滯銷天數（最後一次出貨至今天數）。';
COMMENT ON COLUMN "nx08_inventory_cache"."bcg_quadrant" IS 'BCG 矩陣象限（Q=問題/S=明星/C=金牛/D=老狗）。系統自動計算。';
COMMENT ON COLUMN "nx08_inventory_cache"."gross_margin" IS '毛利率（%）。';
COMMENT ON COLUMN "nx08_inventory_cache"."hpa_trend" IS 'HPA 趨勢（U/D/S）。';
COMMENT ON COLUMN "nx08_inventory_cache"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_inventory_cache"."updated_at" IS '最後計算更新時間。';

-- Nx08PestelRecord  →  nx08_pestel_record
COMMENT ON TABLE "nx08_pestel_record" IS 'PESTEL 策略分析紀錄。';
COMMENT ON COLUMN "nx08_pestel_record"."id" IS '[NX08]+[PEST]+[7碼流水號]，EX : NX08PEST0000001';
COMMENT ON COLUMN "nx08_pestel_record"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_pestel_record"."record_date" IS '記錄日期。';
COMMENT ON COLUMN "nx08_pestel_record"."period" IS '分析期間。';
COMMENT ON COLUMN "nx08_pestel_record"."political" IS '政治因素（P）分析。';
COMMENT ON COLUMN "nx08_pestel_record"."economic" IS '經濟因素（E）分析。';
COMMENT ON COLUMN "nx08_pestel_record"."social" IS '社會因素（S）分析。';
COMMENT ON COLUMN "nx08_pestel_record"."technological" IS '技術因素（T）分析。';
COMMENT ON COLUMN "nx08_pestel_record"."environmental" IS '環境因素（E）分析。';
COMMENT ON COLUMN "nx08_pestel_record"."legal" IS '法規因素（L）分析。';
COMMENT ON COLUMN "nx08_pestel_record"."impact_summary" IS '對汽車零件產業的整體影響摘要。';
COMMENT ON COLUMN "nx08_pestel_record"."remark" IS '備註。';
COMMENT ON COLUMN "nx08_pestel_record"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_pestel_record"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx08_pestel_record"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx08_pestel_record"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx08PurchaseCache  →  nx08_purchase_cache
COMMENT ON TABLE "nx08_purchase_cache" IS '採購報表快取。';
COMMENT ON COLUMN "nx08_purchase_cache"."id" IS '[NX08]+[PUCA]+[7碼流水號]，EX : NX08PUCA0000001';
COMMENT ON COLUMN "nx08_purchase_cache"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_purchase_cache"."cache_date" IS '快取計算日期。';
COMMENT ON COLUMN "nx08_purchase_cache"."supplier_id" IS '廠商ID（FK nx01_partner）。';
COMMENT ON COLUMN "nx08_purchase_cache"."period_type" IS '統計週期（M=月/Q=季/Y=年）。';
COMMENT ON COLUMN "nx08_purchase_cache"."period_value" IS '統計期間。';
COMMENT ON COLUMN "nx08_purchase_cache"."po_count" IS '採購單筆數。';
COMMENT ON COLUMN "nx08_purchase_cache"."po_amount" IS '採購金額。';
COMMENT ON COLUMN "nx08_purchase_cache"."pr_amount" IS '退貨金額。';
COMMENT ON COLUMN "nx08_purchase_cache"."on_time_rate" IS '準時交貨率（%）。';
COMMENT ON COLUMN "nx08_purchase_cache"."defect_rate" IS '瑕疵品率（%）。';
COMMENT ON COLUMN "nx08_purchase_cache"."avg_lead_days" IS '平均交期天數。';
COMMENT ON COLUMN "nx08_purchase_cache"."supplier_grade" IS '廠商評級快照（A/B/C/D）。系統依準時率/瑕疵率自動計算。';
COMMENT ON COLUMN "nx08_purchase_cache"."hpa_trend" IS 'HPA 趨勢（U/D/S）。';
COMMENT ON COLUMN "nx08_purchase_cache"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_purchase_cache"."updated_at" IS '最後計算更新時間。';

-- Nx08SalesCache  →  nx08_sales_cache
COMMENT ON TABLE "nx08_sales_cache" IS '銷售報表快取。';
COMMENT ON COLUMN "nx08_sales_cache"."id" IS '[NX08]+[SLCA]+[7碼流水號]，EX : NX08SLCA0000001';
COMMENT ON COLUMN "nx08_sales_cache"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_sales_cache"."cache_date" IS '快取計算日期（每日更新）。';
COMMENT ON COLUMN "nx08_sales_cache"."customer_id" IS '客戶ID（FK nx01_partner）。';
COMMENT ON COLUMN "nx08_sales_cache"."period_type" IS '統計週期（M=月/Q=季/Y=年）。';
COMMENT ON COLUMN "nx08_sales_cache"."period_value" IS '統計期間（YYYY-MM 或 YYYY-Q1 或 YYYY）。';
COMMENT ON COLUMN "nx08_sales_cache"."so_count" IS '銷貨單筆數。';
COMMENT ON COLUMN "nx08_sales_cache"."so_amount" IS '銷售金額。';
COMMENT ON COLUMN "nx08_sales_cache"."sr_amount" IS '銷退金額。';
COMMENT ON COLUMN "nx08_sales_cache"."net_amount" IS '淨銷售額（so_amount - sr_amount）。';
COMMENT ON COLUMN "nx08_sales_cache"."gross_profit" IS '毛利額（淨銷售額 - 進貨成本）。';
COMMENT ON COLUMN "nx08_sales_cache"."gross_margin" IS '毛利率（%）。';
COMMENT ON COLUMN "nx08_sales_cache"."ar_overdue_amt" IS '逾期應收金額快照。';
COMMENT ON COLUMN "nx08_sales_cache"."customer_grade" IS '客戶等級快照（A/B/C/D）。';
COMMENT ON COLUMN "nx08_sales_cache"."hpa_trend" IS 'HPA 趨勢（U=上升/D=下降/S=穩定）。系統依近3期自動判斷。';
COMMENT ON COLUMN "nx08_sales_cache"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_sales_cache"."updated_at" IS '最後計算更新時間。';

-- Nx08SwotRecord  →  nx08_swot_record
COMMENT ON TABLE "nx08_swot_record" IS 'SWOT 策略分析紀錄。';
COMMENT ON COLUMN "nx08_swot_record"."id" IS '[NX08]+[SWOT]+[7碼流水號]，EX : NX08SWOT0000001';
COMMENT ON COLUMN "nx08_swot_record"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx08_swot_record"."record_date" IS '記錄日期（建議每季一次）。';
COMMENT ON COLUMN "nx08_swot_record"."period" IS '分析期間，例：2026-Q1。';
COMMENT ON COLUMN "nx08_swot_record"."strengths" IS '優勢（S）分析內容。';
COMMENT ON COLUMN "nx08_swot_record"."weaknesses" IS '劣勢（W）分析內容。';
COMMENT ON COLUMN "nx08_swot_record"."opportunities" IS '機會（O）分析內容。';
COMMENT ON COLUMN "nx08_swot_record"."threats" IS '威脅（T）分析內容。';
COMMENT ON COLUMN "nx08_swot_record"."so_strategy" IS 'SO 策略（優勢×機會）。';
COMMENT ON COLUMN "nx08_swot_record"."wo_strategy" IS 'WO 策略（劣勢×機會）。';
COMMENT ON COLUMN "nx08_swot_record"."st_strategy" IS 'ST 策略（優勢×威脅）。';
COMMENT ON COLUMN "nx08_swot_record"."wt_strategy" IS 'WT 策略（劣勢×威脅）。';
COMMENT ON COLUMN "nx08_swot_record"."remark" IS '備註。';
COMMENT ON COLUMN "nx08_swot_record"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx08_swot_record"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx08_swot_record"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx08_swot_record"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09Document  →  nx09_document
COMMENT ON TABLE "nx09_document" IS '文件主檔——文件管理。';
COMMENT ON COLUMN "nx09_document"."id" IS '[NX09]+[DOCU]+[7碼流水號]，EX : NX09DOCU0000001';
COMMENT ON COLUMN "nx09_document"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx09_document"."title" IS '文件標題。';
COMMENT ON COLUMN "nx09_document"."doc_category" IS '文件分類（CR=章則彙編/SP=SOP/JD=工作說明書/FM=表單/OT=其他）。';
COMMENT ON COLUMN "nx09_document"."dept_id" IS '適用部門ID（可空=全公司適用，FK nx01_department）。';
COMMENT ON COLUMN "nx09_document"."current_ver" IS '目前版本號（如1.0/2.1）。';
COMMENT ON COLUMN "nx09_document"."effective_date" IS '生效日期。';
COMMENT ON COLUMN "nx09_document"."expired_date" IS '失效日期（選填）。';
COMMENT ON COLUMN "nx09_document"."view_permission" IS '閱覽權限（A=全員/M=主管以上/D=指定部門）。';
COMMENT ON COLUMN "nx09_document"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx09_document"."remark" IS '備註。';
COMMENT ON COLUMN "nx09_document"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_document"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx09_document"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx09_document"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09DocumentVersion  →  nx09_document_version
COMMENT ON TABLE "nx09_document_version" IS '文件版本。';
COMMENT ON COLUMN "nx09_document_version"."id" IS '[NX09]+[DVER]+[7碼流水號]，EX : NX09DVER0000001';
COMMENT ON COLUMN "nx09_document_version"."document_id" IS '對應文件ID（FK nx09_document）。';
COMMENT ON COLUMN "nx09_document_version"."version_no" IS '版本號（如1.0/1.1/2.0）。';
COMMENT ON COLUMN "nx09_document_version"."file_url" IS '檔案儲存路徑（PDF/Word）。';
COMMENT ON COLUMN "nx09_document_version"."file_size_kb" IS '檔案大小（KB）。';
COMMENT ON COLUMN "nx09_document_version"."change_summary" IS '版本修訂說明。';
COMMENT ON COLUMN "nx09_document_version"."print_count" IS '列印次數（系統累計）。';
COMMENT ON COLUMN "nx09_document_version"."last_print_at" IS '最後列印時間。';
COMMENT ON COLUMN "nx09_document_version"."last_print_by" IS '最後列印人（FK nx01_user）。';
COMMENT ON COLUMN "nx09_document_version"."created_at" IS '建立時間（上傳時間）。';
COMMENT ON COLUMN "nx09_document_version"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09KmArticle  →  nx09_km_article
COMMENT ON TABLE "nx09_km_article" IS '知識庫文章。';
COMMENT ON COLUMN "nx09_km_article"."id" IS '[NX09]+[ARTI]+[7碼流水號]，EX : NX09ARTI0000001';
COMMENT ON COLUMN "nx09_km_article"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx09_km_article"."dept_id" IS '所屬部門ID（FK nx01_department，可空=跨部門適用）。';
COMMENT ON COLUMN "nx09_km_article"."category" IS '文章分類（SO=系統操作/BP=業務流程/RG=規章制度/CX=客戶處理/EM=緊急狀況/OT=其他）。';
COMMENT ON COLUMN "nx09_km_article"."question" IS '問題（Q）內容，供搜尋與 Phase 2 RAG 向量化使用。';
COMMENT ON COLUMN "nx09_km_article"."answer" IS '答案（A）內容。';
COMMENT ON COLUMN "nx09_km_article"."context" IS '適用情境說明（選填，補充說明何時適用此 QA）。';
COMMENT ON COLUMN "nx09_km_article"."is_active" IS '是否有效（FALSE=已過時，不顯示在搜尋結果）。';
COMMENT ON COLUMN "nx09_km_article"."expired_at" IS '有效期限（選填，過期後自動設 is_active=FALSE）。';
COMMENT ON COLUMN "nx09_km_article"."view_count" IS '瀏覽次數（系統累計）。';
COMMENT ON COLUMN "nx09_km_article"."helpful_count" IS '已解決次數（員工點擊「已解決」按鈕累計）。';
COMMENT ON COLUMN "nx09_km_article"."remark" IS '備註。';
COMMENT ON COLUMN "nx09_km_article"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_km_article"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx09_km_article"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx09_km_article"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09KmArticleTag  →  nx09_km_article_tag
COMMENT ON TABLE "nx09_km_article_tag" IS '知識庫文章—標籤對應。';
COMMENT ON COLUMN "nx09_km_article_tag"."id" IS '[NX09]+[KMTL]+[7碼流水號]，EX : NX09KMTL0000001';
COMMENT ON COLUMN "nx09_km_article_tag"."article_id" IS '知識庫文章ID（FK nx09_km_article）。';
COMMENT ON COLUMN "nx09_km_article_tag"."tag_id" IS '標籤ID（FK nx09_km_tag）。';
COMMENT ON COLUMN "nx09_km_article_tag"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_km_article_tag"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09KmFeedback  →  nx09_km_feedback
COMMENT ON TABLE "nx09_km_feedback" IS '知識庫文章回饋。';
COMMENT ON COLUMN "nx09_km_feedback"."id" IS '[NX09]+[KMFB]+[7碼流水號]，EX : NX09KMFB0000001';
COMMENT ON COLUMN "nx09_km_feedback"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx09_km_feedback"."article_id" IS '知識庫文章ID（FK nx09_km_article）。';
COMMENT ON COLUMN "nx09_km_feedback"."user_id" IS '回饋員工ID（FK nx01_user）。';
COMMENT ON COLUMN "nx09_km_feedback"."is_helpful" IS '是否有幫助（TRUE=已解決/FALSE=未解決）。';
COMMENT ON COLUMN "nx09_km_feedback"."comment" IS '補充說明（選填）。';
COMMENT ON COLUMN "nx09_km_feedback"."created_at" IS '回饋時間。';

-- Nx09KmTag  →  nx09_km_tag
COMMENT ON TABLE "nx09_km_tag" IS '知識庫標籤主檔。';
COMMENT ON COLUMN "nx09_km_tag"."id" IS '[NX09]+[KMTG]+[7碼流水號]，EX : NX09KMTG0000001';
COMMENT ON COLUMN "nx09_km_tag"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx09_km_tag"."name" IS '標籤名稱，例：Prisma/採購單/報價流程/緊急處理。';
COMMENT ON COLUMN "nx09_km_tag"."is_system" IS '是否系統預設標籤（TRUE=不可刪除）。';
COMMENT ON COLUMN "nx09_km_tag"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx09_km_tag"."sort_no" IS '排序用。';
COMMENT ON COLUMN "nx09_km_tag"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_km_tag"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx09_km_tag"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx09_km_tag"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09Meeting  →  nx09_meeting
COMMENT ON TABLE "nx09_meeting" IS '會議主檔。';
COMMENT ON COLUMN "nx09_meeting"."id" IS '[NX09]+[MTNG]+[7碼流水號]，EX : NX09MTNG0000001';
COMMENT ON COLUMN "nx09_meeting"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx09_meeting"."title" IS '會議主題。';
COMMENT ON COLUMN "nx09_meeting"."meeting_type" IS '會議類型（PS=產銷會議/WK=週會/MN=月會/AD=臨時/TR=教育訓練）。';
COMMENT ON COLUMN "nx09_meeting"."location" IS '會議地點（選填）。';
COMMENT ON COLUMN "nx09_meeting"."start_at" IS '會議開始時間。';
COMMENT ON COLUMN "nx09_meeting"."end_at" IS '會議結束時間。';
COMMENT ON COLUMN "nx09_meeting"."organizer_id" IS '發起人ID（FK nx01_user）。';
COMMENT ON COLUMN "nx09_meeting"."status" IS '狀態（P=預定/I=進行中/C=已完成/X=已取消）。';
COMMENT ON COLUMN "nx09_meeting"."remark" IS '備註。';
COMMENT ON COLUMN "nx09_meeting"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_meeting"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx09_meeting"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx09_meeting"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09MeetingAction  →  nx09_meeting_action
COMMENT ON TABLE "nx09_meeting_action" IS '會議待辦事項。';
COMMENT ON COLUMN "nx09_meeting_action"."id" IS '[NX09]+[MTAC]+[7碼流水號]，EX : NX09MTAC0000001';
COMMENT ON COLUMN "nx09_meeting_action"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx09_meeting_action"."meeting_id" IS '來源會議ID（FK nx09_meeting）。';
COMMENT ON COLUMN "nx09_meeting_action"."minutes_id" IS '來源會議紀錄ID（FK nx09_meeting_minutes）。';
COMMENT ON COLUMN "nx09_meeting_action"."title" IS '追蹤事項標題。';
COMMENT ON COLUMN "nx09_meeting_action"."assignee_id" IS '負責人ID（FK nx01_user）。';
COMMENT ON COLUMN "nx09_meeting_action"."due_date" IS '截止日期。';
COMMENT ON COLUMN "nx09_meeting_action"."status" IS '狀態（O=待處理/I=進行中/C=已完成/D=延期/X=取消）。';
COMMENT ON COLUMN "nx09_meeting_action"."completed_at" IS '完成時間（status=C時填入）。';
COMMENT ON COLUMN "nx09_meeting_action"."result_desc" IS '完成說明（status=C時填入執行結果）。';
COMMENT ON COLUMN "nx09_meeting_action"."is_overdue" IS '是否逾期（系統每日計算：due_date < today AND status!=C）。';
COMMENT ON COLUMN "nx09_meeting_action"."remark" IS '備註。';
COMMENT ON COLUMN "nx09_meeting_action"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_meeting_action"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx09_meeting_action"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx09_meeting_action"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09MeetingAttendee  →  nx09_meeting_attendee
COMMENT ON TABLE "nx09_meeting_attendee" IS '會議出席者。';
COMMENT ON COLUMN "nx09_meeting_attendee"."id" IS '[NX09]+[MTAT]+[7碼流水號]，EX : NX09MTAT0000001';
COMMENT ON COLUMN "nx09_meeting_attendee"."meeting_id" IS '對應會議ID（FK nx09_meeting）。';
COMMENT ON COLUMN "nx09_meeting_attendee"."user_id" IS '出席人員ID（FK nx01_user）。';
COMMENT ON COLUMN "nx09_meeting_attendee"."confirm_status" IS '確認狀態（P=待確認/Y=確認出席/L=請假/N=無法出席）。';
COMMENT ON COLUMN "nx09_meeting_attendee"."actual_attended" IS '是否實際出席（會議結束後更新）。';
COMMENT ON COLUMN "nx09_meeting_attendee"."absent_reason" IS '未出席原因（actual_attended=FALSE時填入）。';
COMMENT ON COLUMN "nx09_meeting_attendee"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_meeting_attendee"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx09_meeting_attendee"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx09MeetingMinutes  →  nx09_meeting_minutes
COMMENT ON TABLE "nx09_meeting_minutes" IS '會議紀錄。';
COMMENT ON COLUMN "nx09_meeting_minutes"."id" IS '[NX09]+[MTMI]+[7碼流水號]，EX : NX09MTMI0000001';
COMMENT ON COLUMN "nx09_meeting_minutes"."meeting_id" IS '對應會議ID（FK nx09_meeting，每會議一筆）。';
COMMENT ON COLUMN "nx09_meeting_minutes"."content" IS '會議內容（討論事項、決議等，支援 Markdown）。';
COMMENT ON COLUMN "nx09_meeting_minutes"."decisions" IS '決議事項摘要（供快速查看）。';
COMMENT ON COLUMN "nx09_meeting_minutes"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx09_meeting_minutes"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx09_meeting_minutes"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx09_meeting_minutes"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx98DocLink  →  nx98_doc_link
COMMENT ON TABLE "nx98_doc_link" IS '單據關聯——跨模組單據串接（劇本串單基礎設施）。';
COMMENT ON COLUMN "nx98_doc_link"."id" IS '[NX98]+[DOCL]+[7碼流水號]，EX : NX98DOCL0000001';
COMMENT ON COLUMN "nx98_doc_link"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx98_doc_link"."from_doc_type" IS '來源單據類型（RF=詢價單/PO=採購單/RR=進貨單/QT=報價單/SO=銷貨單/ST=調撥單/TI=調貨單/SR=銷退單/PR=退供應商）。';
COMMENT ON COLUMN "nx98_doc_link"."from_doc_id" IS '來源單據 ID。';
COMMENT ON COLUMN "nx98_doc_link"."to_doc_type" IS '目標單據類型（同 from_doc_type 可選值）。';
COMMENT ON COLUMN "nx98_doc_link"."to_doc_id" IS '目標單據 ID。';
COMMENT ON COLUMN "nx98_doc_link"."link_type" IS '關聯類型（CV=轉單Converted/RF=參考Reference）。';
COMMENT ON COLUMN "nx98_doc_link"."linked_qty" IS '關聯數量（部分轉單時填入）。';
COMMENT ON COLUMN "nx98_doc_link"."remark" IS '備註。';
COMMENT ON COLUMN "nx98_doc_link"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx98_doc_link"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99Plan  →  nx99_plan
COMMENT ON TABLE "nx99_plan" IS '方案主檔——LITE／PLUS／PRO 版本（席次制）。';
COMMENT ON COLUMN "nx99_plan"."id" IS '[NX99]+[PLAN]+[7碼流水號]，EX : NX99PLAN0000001';
COMMENT ON COLUMN "nx99_plan"."code" IS '方案代碼：NEXORA-LITE / NEXORA-PLUS / NEXORA-PRO';
COMMENT ON COLUMN "nx99_plan"."name" IS '方案名稱';
COMMENT ON COLUMN "nx99_plan"."level_no" IS '方案級距（10/20/30…便於比較）';
COMMENT ON COLUMN "nx99_plan"."base_fee_month" IS '基礎費用（月）';
COMMENT ON COLUMN "nx99_plan"."seat_fee_month" IS '每人加價（月）';
COMMENT ON COLUMN "nx99_plan"."min_seats" IS '最低人數';
COMMENT ON COLUMN "nx99_plan"."max_seats" IS '最高人數';
COMMENT ON COLUMN "nx99_plan"."billing_default" IS '預設收費週期：MONTH/YEAR';
COMMENT ON COLUMN "nx99_plan"."tier" IS '方案級距代碼（S/M/L/XL），LITE:S~M / PLUS:S~L / PRO:S~XL。';
COMMENT ON COLUMN "nx99_plan"."quarter_discount_type" IS '季繳折扣型態（R=比率折扣，預設×2.8即省7%）。';
COMMENT ON COLUMN "nx99_plan"."quarter_discount_value" IS '季繳折扣值（7=省7%，即月費×2.8=3個月費用）。';
COMMENT ON COLUMN "nx99_plan"."year_discount_type" IS '年繳折扣型態。( R=RATE, A=AMOUNT, O=OVERRIDE )';
COMMENT ON COLUMN "nx99_plan"."year_discount_value" IS '折扣值：RATE=折扣百分比(15=折15%)；AMOUNT=折抵金額';
COMMENT ON COLUMN "nx99_plan"."year_price_override" IS 'OVERRIDE：指定年費（選用）';
COMMENT ON COLUMN "nx99_plan"."remark" IS '備註';
COMMENT ON COLUMN "nx99_plan"."sort_no" IS '排序';
COMMENT ON COLUMN "nx99_plan"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx99_plan"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_plan"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_plan"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx99_plan"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99ProductModule  →  nx99_product_module
COMMENT ON TABLE "nx99_product_module" IS '產品模組主檔——可加購模組目錄。';
COMMENT ON COLUMN "nx99_product_module"."id" IS '[NX99]+[PRMO]+[7碼流水號]，EX : NX99PRMO0000001';
COMMENT ON COLUMN "nx99_product_module"."code" IS '產品模組代號（SKU）：NX-LIT-CORE-SSO…';
COMMENT ON COLUMN "nx99_product_module"."name" IS '模組名稱';
COMMENT ON COLUMN "nx99_product_module"."module_level" IS '標/選配。( C=Core, A=Add-on )';
COMMENT ON COLUMN "nx99_product_module"."applicable_plan_code" IS '適用方案代碼（如 NEXORA-LITE）';
COMMENT ON COLUMN "nx99_product_module"."billing_type" IS '計費類型（先支援 F=FIXED）';
COMMENT ON COLUMN "nx99_product_module"."monthly_fee" IS '月費（定價）';
COMMENT ON COLUMN "nx99_product_module"."is_bundle_default" IS '是否標配（TRUE=標配）';
COMMENT ON COLUMN "nx99_product_module"."description" IS '模組說明';
COMMENT ON COLUMN "nx99_product_module"."sort_no" IS '排序';
COMMENT ON COLUMN "nx99_product_module"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx99_product_module"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_product_module"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_product_module"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx99_product_module"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99ProductModuleMap  →  nx99_product_module_map
COMMENT ON TABLE "nx99_product_module_map" IS '方案—模組對應。';
COMMENT ON COLUMN "nx99_product_module_map"."id" IS '[NX99]+[PRMM]+[7碼流水號]，EX : NX99PRMM0000001';
COMMENT ON COLUMN "nx99_product_module_map"."product_module_id" IS '所屬產品模組（SKU）';
COMMENT ON COLUMN "nx99_product_module_map"."app_module_code" IS '程式碼模組代號：NX01~NX09/NX98/NX99（新版模組代碼）。';
COMMENT ON COLUMN "nx99_product_module_map"."is_required" IS '是否必含（通常 TRUE）';
COMMENT ON COLUMN "nx99_product_module_map"."remark" IS '備註';
COMMENT ON COLUMN "nx99_product_module_map"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_product_module_map"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_product_module_map"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx99_product_module_map"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99Release  →  nx99_release
COMMENT ON TABLE "nx99_release" IS '發布版本紀錄。';
COMMENT ON COLUMN "nx99_release"."id" IS '[NX99]+[RELE]+[7碼流水號]，EX : NX99RELE0000001';
COMMENT ON COLUMN "nx99_release"."version" IS '版本號（唯一），例：v1.0.0 / v1.1.0。';
COMMENT ON COLUMN "nx99_release"."release_date" IS '發行日期。';
COMMENT ON COLUMN "nx99_release"."title" IS '版本標題，例：NX01 採購模組上線。';
COMMENT ON COLUMN "nx99_release"."description" IS '版本說明（更新內容摘要）。';
COMMENT ON COLUMN "nx99_release"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx99_release"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_release"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_release"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx99_release"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99ReleaseItem  →  nx99_release_item
COMMENT ON TABLE "nx99_release_item" IS '發布項目明細。';
COMMENT ON COLUMN "nx99_release_item"."id" IS '[NX99]+[REIT]+[7碼流水號]，EX : NX99REIT0000001';
COMMENT ON COLUMN "nx99_release_item"."release_id" IS '對應平台版本ID（FK nx99_release）。';
COMMENT ON COLUMN "nx99_release_item"."item_type" IS '項目類型（T=資料表/F=功能/B=修正）。';
COMMENT ON COLUMN "nx99_release_item"."module_code" IS '所屬模組代碼（NX00~NX99）。';
COMMENT ON COLUMN "nx99_release_item"."item_name" IS '項目名稱（例：nx01_demand / 採購需求單）。';
COMMENT ON COLUMN "nx99_release_item"."description" IS '變更說明。';
COMMENT ON COLUMN "nx99_release_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_release_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99Subscription  →  nx99_subscription
COMMENT ON TABLE "nx99_subscription" IS '租戶訂閱主檔。';
COMMENT ON COLUMN "nx99_subscription"."id" IS '[NX99]+[SUBS]+[7碼流水號]，EX : NX99SUBS0000001';
COMMENT ON COLUMN "nx99_subscription"."tenant_id" IS '租戶ID';
COMMENT ON COLUMN "nx99_subscription"."plan_id" IS '方案ID';
COMMENT ON COLUMN "nx99_subscription"."status" IS '訂閱狀態。( A=ACTIVE, E=EXPIRED, C=CANCELED )';
COMMENT ON COLUMN "nx99_subscription"."billing_cycle" IS '收費週期（M=月繳/Q=季繳/Y=年繳）。';
COMMENT ON COLUMN "nx99_subscription"."seats" IS '授權席次（可啟用使用者上限）';
COMMENT ON COLUMN "nx99_subscription"."start_at" IS '訂閱起始時間';
COMMENT ON COLUMN "nx99_subscription"."end_at" IS '訂閱到期時間';
COMMENT ON COLUMN "nx99_subscription"."auto_renew" IS '是否自動續約';
COMMENT ON COLUMN "nx99_subscription"."base_fee_snapshot" IS '基礎費用快照（月價）';
COMMENT ON COLUMN "nx99_subscription"."seat_fee_snapshot" IS '每人加價快照（月價）';
COMMENT ON COLUMN "nx99_subscription"."discount_type_snapshot" IS '折扣型態快照。( N=NONE, R=RATE, A=AMOUNT, O=OVERRIDE )';
COMMENT ON COLUMN "nx99_subscription"."discount_value_snapshot" IS '折扣值快照（RATE=折扣百分比、AMOUNT=金額）';
COMMENT ON COLUMN "nx99_subscription"."subtotal_snapshot" IS '未折扣合計快照（含加購項目合計）';
COMMENT ON COLUMN "nx99_subscription"."discount_amount_snapshot" IS '折扣金額快照';
COMMENT ON COLUMN "nx99_subscription"."total_snapshot" IS '折扣後總額快照';
COMMENT ON COLUMN "nx99_subscription"."currency_id" IS '幣別';
COMMENT ON COLUMN "nx99_subscription"."remark" IS '備註';
COMMENT ON COLUMN "nx99_subscription"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_subscription"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_subscription"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx99_subscription"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99SubscriptionItem  →  nx99_subscription_item
COMMENT ON TABLE "nx99_subscription_item" IS '訂閱項目明細——加購模組。';
COMMENT ON COLUMN "nx99_subscription_item"."id" IS '[NX99]+[SUIT]+[7碼流水號]，EX : NX99SUIT0000001';
COMMENT ON COLUMN "nx99_subscription_item"."subscription_id" IS '所屬訂閱';
COMMENT ON COLUMN "nx99_subscription_item"."item_type" IS '項目類型。( M=MODULE，※目前先用 MODULE )';
COMMENT ON COLUMN "nx99_subscription_item"."ref_id" IS '參照ID：item_type=MODULE 時，指向 nx99_product_module.id';
COMMENT ON COLUMN "nx99_subscription_item"."status" IS '狀態。( A=ACTIVE, C=CANCELED )';
COMMENT ON COLUMN "nx99_subscription_item"."is_included" IS '是否標配帶入（TRUE=標配，FALSE=加購）';
COMMENT ON COLUMN "nx99_subscription_item"."billing_cycle" IS '收費週期。( M=MONTH, Y=YEAR，※通常跟 subscription 一致 )';
COMMENT ON COLUMN "nx99_subscription_item"."price_snapshot" IS '單價快照（依 billing_cycle 解讀）';
COMMENT ON COLUMN "nx99_subscription_item"."discount_type_snapshot" IS '折扣型態快照。( N=NONE, R=RATE, A=AMOUNT )';
COMMENT ON COLUMN "nx99_subscription_item"."discount_value_snapshot" IS '折扣值快照';
COMMENT ON COLUMN "nx99_subscription_item"."total_snapshot" IS '折扣後金額快照';
COMMENT ON COLUMN "nx99_subscription_item"."start_at" IS '生效時間';
COMMENT ON COLUMN "nx99_subscription_item"."end_at" IS '結束時間';
COMMENT ON COLUMN "nx99_subscription_item"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_subscription_item"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_subscription_item"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx99_subscription_item"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx99Tenant  →  nx99_tenant
COMMENT ON TABLE "nx99_tenant" IS '租戶主檔——多租戶隔離根。';
COMMENT ON COLUMN "nx99_tenant"."id" IS '[NX99]+[TANT]+[7碼流水號]，EX : NX99TANT0000001';
COMMENT ON COLUMN "nx99_tenant"."code" IS '租戶代碼（唯一），可作公司代碼/登入識別碼';
COMMENT ON COLUMN "nx99_tenant"."name" IS '租戶名稱（公司名稱）';
COMMENT ON COLUMN "nx99_tenant"."name_en" IS '租戶英文名稱（公司名稱）';
COMMENT ON COLUMN "nx99_tenant"."status" IS '租戶狀態。( A=ACTIVE, S=SUSPENDED, C=CLOSED )';
COMMENT ON COLUMN "nx99_tenant"."remark" IS '備註';
COMMENT ON COLUMN "nx99_tenant"."sort_no" IS '排序';
COMMENT ON COLUMN "nx99_tenant"."shelf_life_warning_days" IS 'F1-D 銷貨優惠價子系統 2026-06-08：即期提醒門檻（天數、Alex Q3 拍板全域設定）。 引擎用 part.shelfLifeMonths 算保固到期、剩餘天數 < 此值 → 標即期、自動套即期類促銷規則。';
COMMENT ON COLUMN "nx99_tenant"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx99_tenant"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx99_tenant"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_tenant"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx99_tenant"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx99_tenant"."credit_overdue_days_threshold" IS '客戶授信逾期天數閾值（預設 15 天、業界半月 standard、用戶可調 30/45/60）。CreditGuardService 讀此欄、超過此天數既有 AR 未付 → SO paymentTerm 自動轉現金銷售。NX04-IMPL-01 Phase 1 M2 新增（Crown Q-S2=a tenant 層級拍板）。';
COMMENT ON COLUMN "nx99_tenant"."contact_name" IS '租戶主要聯絡人姓名。';
COMMENT ON COLUMN "nx99_tenant"."contact_email" IS '租戶聯絡 Email（系統通知用）。';
COMMENT ON COLUMN "nx99_tenant"."contact_phone" IS '租戶聯絡電話。';
COMMENT ON COLUMN "nx99_tenant"."timezone" IS '時區設定（預設 Asia/Taipei），影響關帳時間計算。';
COMMENT ON COLUMN "nx99_tenant"."locale" IS '語系設定（預設 zh-TW）。';
COMMENT ON COLUMN "nx99_tenant"."tax_id" IS '統一編號（v1.2 §2 開戶後台必填）';
COMMENT ON COLUMN "nx99_tenant"."address" IS '公司地址（v1.2 §2 開戶後台必填、用來寄帳單）';
COMMENT ON COLUMN "nx99_tenant"."phone" IS '公司電話';
COMMENT ON COLUMN "nx99_tenant"."logo_url" IS '公司 LOGO URL（v1.2 §2 必填、本機端安裝顯示）';
COMMENT ON COLUMN "nx99_tenant"."data_start_date" IS '資料起算日（v1.2 §12.3、起算之前歷史只進查詢、不計入報表）';
COMMENT ON COLUMN "nx99_tenant"."import_wizard_completed_at" IS '匯入精靈完成時間（NULL=未完成、首次登入會跳）';
COMMENT ON COLUMN "nx99_tenant"."plan_code" IS '訂閱方案 LITE / PLUS / PRO（v1.2 §2.1）';
COMMENT ON COLUMN "nx99_tenant"."quote_default_validity_days" IS '報價單預設有效期（天數、v1.2 §12.3 系統參數 FU-system-param-01）';

-- Nx01City  →  nx01_city
COMMENT ON TABLE "nx01_city" IS '縣市字典表。';
COMMENT ON COLUMN "nx01_city"."id" IS '[NX01]+[CITY]+[7碼流水號]，EX : NX01CITY0000001';
COMMENT ON COLUMN "nx01_city"."code" IS '縣市代碼（如 TPE / NWT / KAO、ISO 3166-2:TW）';
COMMENT ON COLUMN "nx01_city"."name" IS '中文名（如 臺北市）';
COMMENT ON COLUMN "nx01_city"."name_en" IS '英文名（如 Taipei City）';
COMMENT ON COLUMN "nx01_city"."country_id" IS '國家 ID（FK to nx01_country、預設 TWN 台灣、Q4 國外擴展性預留）';
COMMENT ON COLUMN "nx01_city"."sort_order" IS '排序順位（業界慣例如六都優先）';
COMMENT ON COLUMN "nx01_city"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_city"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_city"."created_by" IS '建立人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_city"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_city"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID；DB 匯入填系統管理員 ID）';

-- Nx01District  →  nx01_district
COMMENT ON TABLE "nx01_district" IS '鄉鎮市區字典表。';
COMMENT ON COLUMN "nx01_district"."id" IS '[NX01]+[DIST]+[7碼流水號]，EX : NX01DIST0000001';
COMMENT ON COLUMN "nx01_district"."city_id" IS '所屬縣市 ID（FK to nx01_city）';
COMMENT ON COLUMN "nx01_district"."code" IS '鄉鎮代碼（如 WSN）';
COMMENT ON COLUMN "nx01_district"."name" IS '中文名（如 文山區）';
COMMENT ON COLUMN "nx01_district"."name_en" IS '英文名（如 Wenshan District）';
COMMENT ON COLUMN "nx01_district"."postal_code" IS '3 碼郵遞區號（中華郵政、選縣市→鄉鎮自動帶；02 對齊第二批 A 軌 CP1 2026-06-06 新增）';
COMMENT ON COLUMN "nx01_district"."sort_order" IS '區內排序';
COMMENT ON COLUMN "nx01_district"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_district"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_district"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_district"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_district"."updated_by" IS '更新人';

-- Nx01Street  →  nx01_street
COMMENT ON TABLE "nx01_street" IS '街道字典表。';
COMMENT ON COLUMN "nx01_street"."id" IS '[NX01]+[STRT]+[7碼流水號]，EX : NX01STRT0000001';
COMMENT ON COLUMN "nx01_street"."district_id" IS '所屬鄉鎮 ID（FK to nx01_district）';
COMMENT ON COLUMN "nx01_street"."name" IS '路街名（如 羅斯福路六段）';
COMMENT ON COLUMN "nx01_street"."name_en" IS '英文名（如 Sec. 6, Roosevelt Rd.）';
COMMENT ON COLUMN "nx01_street"."zipcode_3" IS '3 碼郵遞區號（如 116）';
COMMENT ON COLUMN "nx01_street"."zipcode_full" IS '3+3 完整郵遞區號（如 116-051）';
COMMENT ON COLUMN "nx01_street"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_street"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_street"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_street"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_street"."updated_by" IS '更新人';

-- Nx01PartCompatGroup  →  nx01_part_compat_group
COMMENT ON TABLE "nx01_part_compat_group" IS '業務範式：同一群組內所有 part 互為替代品（如「機油芯通用群」內 BOSCH F004 / MANN W940/1 / MAHLE OC91）';
COMMENT ON COLUMN "nx01_part_compat_group"."id" IS '[NX01]+[PCGP]+[7碼流水號]';
COMMENT ON COLUMN "nx01_part_compat_group"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_part_compat_group"."code" IS '群組代碼（tenant 內唯一、業務命名如 OILFILT-1.6L）';
COMMENT ON COLUMN "nx01_part_compat_group"."name" IS '群組名稱（顯示用、例：1.6L 機油芯通用群）';
COMMENT ON COLUMN "nx01_part_compat_group"."remark" IS '備註（搭配車型 / 排氣量 / 使用注意）';
COMMENT ON COLUMN "nx01_part_compat_group"."sort_no" IS '排序序號';
COMMENT ON COLUMN "nx01_part_compat_group"."is_active" IS '是否啟用（軟刪除旗標：false=已停用，系統不做實體刪除）';
COMMENT ON COLUMN "nx01_part_compat_group"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_part_compat_group"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_part_compat_group"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_part_compat_group"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01PartCompatGroupMember  →  nx01_part_compat_group_member
COMMENT ON TABLE "nx01_part_compat_group_member" IS '多對多 member：part ↔ group + role + 各自售價 + 雙向旗標';
COMMENT ON COLUMN "nx01_part_compat_group_member"."id" IS '[NX01]+[PCMB]+[7碼流水號]';
COMMENT ON COLUMN "nx01_part_compat_group_member"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."group_id" IS '相容群組 ID（FK nx01_part_compat_group）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."part_id" IS '零件 ID（FK nx01_part）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."role" IS '角色（1=PRIMARY 主件 / 2=ALT 替代品）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."custom_price" IS '群組內專屬售價（null=用 part.priceA 預設；有值=群組覆寫）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."is_bidirectional" IS '雙向旗標（true=A↔B 互為替代品；false=單向 A→B、B 找不到 A）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."sort_no" IS '排序序號';
COMMENT ON COLUMN "nx01_part_compat_group_member"."remark" IS '備註';
COMMENT ON COLUMN "nx01_part_compat_group_member"."is_active" IS '是否啟用（軟刪除旗標：false=已停用，系統不做實體刪除）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_part_compat_group_member"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_part_compat_group_member"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_part_compat_group_member"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01Region  →  nx01_region
COMMENT ON TABLE "nx01_region" IS '地區小型主檔（tenant 內、不入 partner code 編號、純展示分類）。 業務範例：北部 / 中部 / 南部 / 東部 / 離島；或更細：台北 / 新北 / 桃園 / 新竹 ...';
COMMENT ON COLUMN "nx01_region"."id" IS '[NX01]+[REGN]+[7碼流水號]，EX : NX01REGN0000001';
COMMENT ON COLUMN "nx01_region"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_region"."code" IS '地區代碼（tenant 內唯一、業務自行決定如 N/C/S/E 或 TPE/TAO 等）';
COMMENT ON COLUMN "nx01_region"."name" IS '地區名稱（顯示用）';
COMMENT ON COLUMN "nx01_region"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_region"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_region"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_region"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_region"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_region"."updated_by" IS '更新人';

-- Nx01PartnerContact  →  nx01_partner_contact
COMMENT ON TABLE "nx01_partner_contact" IS '合 Nx01PartnerBillingAddress + Nx01PartnerShippingAddress 統一衛星表。 addressType: BILLING 收帳（同 partner 內最多 1 筆）/ SHIPPING 送貨（多筆、一筆 isDefault）。 國別分流：countryId=null 預設 TW 走 city/district/postalCode 字典 + 結構化門牌； countryId=非 TW 走 freeformAddress + postalCode 自由填。 客戶（partner）多筆聯絡窗口：對方公司不同窗口（採購／業務／會計／倉管 等）';
COMMENT ON COLUMN "nx01_partner_contact"."id" IS '主鍵 ID（系統產生）';
COMMENT ON COLUMN "nx01_partner_contact"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_partner_contact"."partner_id" IS '往來對象 ID（FK nx01_partner）';
COMMENT ON COLUMN "nx01_partner_contact"."contact_name" IS '聯絡人姓名';
COMMENT ON COLUMN "nx01_partner_contact"."job_title" IS '職務部門（自由文字、不綁本租戶 nx01_department、對方公司部門名）';
COMMENT ON COLUMN "nx01_partner_contact"."phone" IS '電話';
COMMENT ON COLUMN "nx01_partner_contact"."phone_ext" IS '電話分機';
COMMENT ON COLUMN "nx01_partner_contact"."mobile" IS '手機';
COMMENT ON COLUMN "nx01_partner_contact"."email" IS 'Email';
COMMENT ON COLUMN "nx01_partner_contact"."note" IS '備註';
COMMENT ON COLUMN "nx01_partner_contact"."sort_no" IS '排序序號';
COMMENT ON COLUMN "nx01_partner_contact"."is_active" IS '是否啟用（軟刪除旗標：false=已停用，系統不做實體刪除）';
COMMENT ON COLUMN "nx01_partner_contact"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_partner_contact"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_partner_contact"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_partner_contact"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01PartnerAddress  →  nx01_partner_address
COMMENT ON TABLE "nx01_partner_address" IS '往來對象地址（一對多）——多筆地址（門牌拆欄：巷弄號樓室）。';
COMMENT ON COLUMN "nx01_partner_address"."id" IS '主鍵 ID（系統產生）';
COMMENT ON COLUMN "nx01_partner_address"."tenant_id" IS '租戶 ID（外鍵，多租戶隔離）';
COMMENT ON COLUMN "nx01_partner_address"."partner_id" IS '往來對象 ID（FK nx01_partner）';
COMMENT ON COLUMN "nx01_partner_address"."address_type" IS '地址類型：BILLING 收帳 / SHIPPING 送貨';
COMMENT ON COLUMN "nx01_partner_address"."label" IS '顯示用標籤（送貨用、如「總公司」「桃園倉」）';
COMMENT ON COLUMN "nx01_partner_address"."is_default" IS '預設旗標（同 partner+type 內最多 1 筆 isDefault=true、partial unique）';
COMMENT ON COLUMN "nx01_partner_address"."country_id" IS '國別 FK（null 視為 TW 預設、走字典；非 null 走 freeform）';
COMMENT ON COLUMN "nx01_partner_address"."city_id" IS 'TW 字典：縣市';
COMMENT ON COLUMN "nx01_partner_address"."district_id" IS 'TW 字典：鄉鎮市區（從 district 自動帶 postalCode）';
COMMENT ON COLUMN "nx01_partner_address"."postal_code" IS '3 碼郵遞區號（TW 從 district 帶入、國外手填）';
COMMENT ON COLUMN "nx01_partner_address"."street_name" IS '結構化門牌（TW 用、國外可全空走 freeform）';
COMMENT ON COLUMN "nx01_partner_address"."lane" IS '巷';
COMMENT ON COLUMN "nx01_partner_address"."alley" IS '弄';
COMMENT ON COLUMN "nx01_partner_address"."building_no" IS '號';
COMMENT ON COLUMN "nx01_partner_address"."building_sub_no" IS '號之附號';
COMMENT ON COLUMN "nx01_partner_address"."floor" IS '樓';
COMMENT ON COLUMN "nx01_partner_address"."room_no" IS '室';
COMMENT ON COLUMN "nx01_partner_address"."freeform_address" IS '國外自由填整段地址（country 非 TW 時用）';
COMMENT ON COLUMN "nx01_partner_address"."recipient_name" IS '收件 / 送達聯絡';
COMMENT ON COLUMN "nx01_partner_address"."recipient_phone" IS '收件人電話';
COMMENT ON COLUMN "nx01_partner_address"."invoice_title" IS '發票抬頭（BILLING 該筆各自開票用；空=用 partner.invoiceTitle→name）。偉盟 BCUX 印證多據點各自開票。 2026-07-10 執行長拍板（偉盟設計檢視 P1-2）';
COMMENT ON COLUMN "nx01_partner_address"."note" IS '備註';
COMMENT ON COLUMN "nx01_partner_address"."is_active" IS '是否啟用（軟刪除旗標：false=已停用，系統不做實體刪除）';
COMMENT ON COLUMN "nx01_partner_address"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_partner_address"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_partner_address"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_partner_address"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01PartnerAccount  →  nx01_partner_account
COMMENT ON TABLE "nx01_partner_account" IS '客戶等級變更歷史（對齊 Crown 2026-05-29 Q6 拍板、PENDING/APPROVED/REJECTED 流程） 業務員申請、G 核可後 partner.customer_grade_id 同步更新、PENDING/REJECTED 不影響既有 QT 往來帳戶（交易資格閘門載體、規格：docs/專案/規格書/核心/往來帳戶閘門-設計規格.md v1.3、2026-07-21 執行長拍板）。 R=收款帳戶（他付我 → 可銷售/報價）/ P=進貨付款帳戶（採購域、綁採購權限=貨源隔離）/ T=調貨付款帳戶（同行調貨、業務域、免銀行資訊）。 一對象一方向一戶（unique、多銀行戶擴充=將來放寬）；散客 L 與現金客戶（partner.isCashCustomer）不開戶、閘門直接放行。';
COMMENT ON COLUMN "nx01_partner_account"."id" IS '[NX01]+[PACT]+[7碼流水號]，EX : NX01PACT0000001';
COMMENT ON COLUMN "nx01_partner_account"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_partner_account"."partner_id" IS '往來對象 ID（FK nx01_partner）';
COMMENT ON COLUMN "nx01_partner_account"."direction" IS '方向：R=收款帳戶（銷售閘門）/ P=進貨付款帳戶（採購閘門、v1.3 拆種）/ T=調貨付款帳戶（同行調貨閘門、v1.3）';
COMMENT ON COLUMN "nx01_partner_account"."status" IS '狀態：A=啟用 / S=停用（停用=閘門擋、非軟刪）';
COMMENT ON COLUMN "nx01_partner_account"."bank_name" IS '銀行名稱（P 戶匯款路徑、R 戶不需要）';
COMMENT ON COLUMN "nx01_partner_account"."bank_code" IS '銀行代碼';
COMMENT ON COLUMN "nx01_partner_account"."bank_account_no" IS '銀行帳號';
COMMENT ON COLUMN "nx01_partner_account"."account_holder" IS '戶名';
COMMENT ON COLUMN "nx01_partner_account"."needs_backfill" IS '祖父條款待補件標記（遷移舊戶：R=統編未補 / P=銀行帳號未補）';
COMMENT ON COLUMN "nx01_partner_account"."opened_at" IS '開戶時間';
COMMENT ON COLUMN "nx01_partner_account"."opened_by" IS '開戶人';
COMMENT ON COLUMN "nx01_partner_account"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_partner_account"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_partner_account"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_partner_account"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01PartnerGradeHistory  →  nx01_partner_grade_history
COMMENT ON TABLE "nx01_partner_grade_history" IS '往來對象等級異動歷史——客戶／供應商等級變更軌跡。';
COMMENT ON COLUMN "nx01_partner_grade_history"."id" IS '[NX01]+[PGHI]+[7碼流水號]，EX : NX01PGHI0000001';
COMMENT ON COLUMN "nx01_partner_grade_history"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_partner_grade_history"."partner_id" IS '對象客戶 ID（FK nx01_partner、partnerType IN (''C'',''O'')）';
COMMENT ON COLUMN "nx01_partner_grade_history"."old_grade_id" IS '變更前等級 ID（FK nx01_customer_grade）';
COMMENT ON COLUMN "nx01_partner_grade_history"."new_grade_id" IS '變更後等級 ID（FK nx01_customer_grade）';
COMMENT ON COLUMN "nx01_partner_grade_history"."status" IS '變更狀態（PENDING/APPROVED/REJECTED）。APPROVED 後 partner.customer_grade_id 同步更新';
COMMENT ON COLUMN "nx01_partner_grade_history"."requested_by" IS '申請人（業務員、使用者 ID、純 VarChar 對齊既有 approvedBy 範式不建 FK）';
COMMENT ON COLUMN "nx01_partner_grade_history"."requested_at" IS '申請時間';
COMMENT ON COLUMN "nx01_partner_grade_history"."reason" IS '申請理由（必填）';
COMMENT ON COLUMN "nx01_partner_grade_history"."approved_by" IS '核可人（G/負責人、使用者 ID、APPROVED 後填）';
COMMENT ON COLUMN "nx01_partner_grade_history"."approved_at" IS '核可時間（APPROVED 後填）';
COMMENT ON COLUMN "nx01_partner_grade_history"."reject_reason" IS '退件原因（REJECTED 後必填）';
COMMENT ON COLUMN "nx01_partner_grade_history"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_partner_grade_history"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_partner_grade_history"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_partner_grade_history"."updated_by" IS '更新人';

-- Nx01PhoneticDictionary  →  nx01_phonetic_dictionary
COMMENT ON TABLE "nx01_phonetic_dictionary" IS '全域字典（無 tenantId）、SYSADMIN 維護、漢字 → 注音對照表 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §4.1';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."id" IS '[NX01]+[PHDC]+[7碼流水號]，EX : NX01PHDC0000001';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."character" IS '漢字（單字元、全域 unique）';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."primary_phonetic" IS '主要注音（如 ㄅㄧˋ）';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."primary_initial" IS '主要聲母（從 primary_phonetic 抽出、如 ㄅ）';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."usage_freq" IS '使用頻率（多音字優先序、系統統計）';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."is_active" IS '是否啟用（SYSADMIN 可停用錯字）';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_phonetic_dictionary"."updated_by" IS '更新人';

-- Nx01PhoneticIndex  →  nx01_phonetic_index
COMMENT ON TABLE "nx01_phonetic_index" IS '跨主檔注音碼索引、trigger 維護、每租戶獨立 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §4.2';
COMMENT ON COLUMN "nx01_phonetic_index"."id" IS '[NX01]+[PHIX]+[7碼流水號]，EX : NX01PHIX0000001';
COMMENT ON COLUMN "nx01_phonetic_index"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_phonetic_index"."source_table" IS '來源表名（如 nx01_part / nx01_partner / nx01_user）';
COMMENT ON COLUMN "nx01_phonetic_index"."source_id" IS '來源主檔 ID（軟連結、不用 FK constraint）';
COMMENT ON COLUMN "nx01_phonetic_index"."source_field" IS '來源欄位名（如 name / display_name）';
COMMENT ON COLUMN "nx01_phonetic_index"."source_text" IS '來源文字（快搜時顯示用）';
COMMENT ON COLUMN "nx01_phonetic_index"."phonetic_code" IS '聲母碼（如 ㄅㄓㄑ、前綴匹配用）';
COMMENT ON COLUMN "nx01_phonetic_index"."phonetic_full" IS '完整注音（如 ㄅㄧˋ ㄓㄣˋ ㄑㄧˋ、顯示用）';
COMMENT ON COLUMN "nx01_phonetic_index"."is_manual" IS '是否業務人員手動改（手動改後 trigger 不再覆蓋）';
COMMENT ON COLUMN "nx01_phonetic_index"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_phonetic_index"."created_by" IS '建立人（trigger=SYSADMIN ID / 手動改=該使用者）';
COMMENT ON COLUMN "nx01_phonetic_index"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_phonetic_index"."updated_by" IS '更新人';

-- Nx01Model  →  nx01_model
COMMENT ON TABLE "nx01_model" IS '車型主檔（A 主檔、30 年資料承接核心、被 NX01-16 part_model 戰略引用） 對應規格：docs/nx01/spec/intent/nx01-13-model.md v1.0';
COMMENT ON COLUMN "nx01_model"."id" IS '[NX01]+[MODL]+[7碼流水號]';
COMMENT ON COLUMN "nx01_model"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_model"."code" IS '車型代碼（業界縮寫、tenant 內 unique、例：G7-GTI / CAMRY-XV70 / F30）';
COMMENT ON COLUMN "nx01_model"."name" IS '車型全名（正式名稱、報表/客戶單據用、例：Golf 7 GTI）';
COMMENT ON COLUMN "nx01_model"."brand_id" IS '車型品牌 FK（FK nx01_brand isCar=true、必填、規格 §3.2 Crown Q3=A） W6 [3-8] Phase 5 2026-06-06 品牌合併：取代舊 carBrandId';
COMMENT ON COLUMN "nx01_model"."model_year_from" IS '起始年份（選填、2026-06-29 改可空：恆迎匯入有車型無明確起始年、留 NULL；有填則業務檢核 ≥ 1900 + ≤ 當前年+5、規格 §3.3）';
COMMENT ON COLUMN "nx01_model"."model_year_to" IS '結束年份（可空、現役留空、若填必 ≥ modelYearFrom、規格 §3.3）';
COMMENT ON COLUMN "nx01_model"."engine_code" IS '引擎代碼（自由輸入、取消引擎外鍵後改用此欄、例：EA888 / 2GR-FE；2026-06-26 車型分類簡化）';
COMMENT ON COLUMN "nx01_model"."displacement_cc" IS '排氣量 CC（自由輸入、取消引擎外鍵後改用此欄；2026-06-26 車型分類簡化）';
COMMENT ON COLUMN "nx01_model"."remark" IS '備註說明';
COMMENT ON COLUMN "nx01_model"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_model"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_model"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_model"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_model"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_model"."updated_by" IS '更新人';

-- Nx01PartVersion  →  nx01_part_version
COMMENT ON TABLE "nx01_part_version" IS '料號版本紀錄（全 snapshot 範式、Q1=A 拍板） 對應規格：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0';
COMMENT ON COLUMN "nx01_part_version"."id" IS '[NX01]+[PAVE]+[7碼流水號]';
COMMENT ON COLUMN "nx01_part_version"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_part_version"."part_id" IS '對應 part FK';
COMMENT ON COLUMN "nx01_part_version"."version_no" IS '版本號（每 part 從 1 起算、連續編號）';
COMMENT ON COLUMN "nx01_part_version"."effective_from" IS '生效起始日';
COMMENT ON COLUMN "nx01_part_version"."effective_to" IS '結束日（nullable、現役留空）';
COMMENT ON COLUMN "nx01_part_version"."code_snapshot" IS '完整 snapshot 9 欄位（Q1=A 拍板：每次 part update 完整 copy）';
COMMENT ON COLUMN "nx01_part_version"."name_snapshot" IS '品名快照';
COMMENT ON COLUMN "nx01_part_version"."part_brand_id_snapshot" IS '品牌 ID 快照';
COMMENT ON COLUMN "nx01_part_version"."country_id_snapshot" IS '產地國 ID 快照';
COMMENT ON COLUMN "nx01_part_version"."spec_snapshot" IS '規格快照';
COMMENT ON COLUMN "nx01_part_version"."price_a_snapshot" IS 'A 級價快照';
COMMENT ON COLUMN "nx01_part_version"."price_b_snapshot" IS 'B 級價快照';
COMMENT ON COLUMN "nx01_part_version"."price_c_snapshot" IS 'C 級價快照';
COMMENT ON COLUMN "nx01_part_version"."price_d_snapshot" IS 'D 級價快照';
COMMENT ON COLUMN "nx01_part_version"."change_reason" IS '變動原因（業務人員填、稽核用）';
COMMENT ON COLUMN "nx01_part_version"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_part_version"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_part_version"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_part_version"."updated_by" IS '更新人';

-- Nx01PartModel  →  nx01_part_model
COMMENT ON TABLE "nx01_part_model" IS '料號車型適配（A 主檔、戰略表 ⭐⭐、Yaro 30 年知識結構化核心） 對應規格：docs/nx01/spec/intent/nx01-16-part-model.md v1.0';
COMMENT ON COLUMN "nx01_part_model"."id" IS '[NX01]+[PAMO]+[7碼流水號]，EX : NX01PAMO0000001';
COMMENT ON COLUMN "nx01_part_model"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx01_part_model"."part_id" IS '料件 FK（必填、規格 §3.2 Q1=A）';
COMMENT ON COLUMN "nx01_part_model"."model_id" IS '車型 FK（必填、規格 §3.2 Q1=A）';
COMMENT ON COLUMN "nx01_part_model"."fit_level" IS '適配等級（1=原廠 / 2=副廠等效 / 3=通用替代、Q3=B SmallInt enum）';
COMMENT ON COLUMN "nx01_part_model"."remark" IS '備註說明（業務人員手記）';
COMMENT ON COLUMN "nx01_part_model"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_part_model"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_part_model"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_part_model"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_part_model"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_part_model"."updated_by" IS '更新人';

-- Nx01PartKit  →  nx01_part_kit
COMMENT ON TABLE "nx01_part_kit" IS '業務範式：一個「整體件」等同於一組「組件（含數量）」。 - 種類 3 拆解：整體＝正廠總成、組件＝副廠拆出的多個零件（A ＝ B×1 + C×2 + D×1） - 種類 4 組合：整體＝副廠合成件、組件＝多個正廠分售件（X + Y ＝ Z）';
COMMENT ON COLUMN "nx01_part_kit"."id" IS '[NX01]+[PKIT]+[7碼流水號]，EX : NX01PKIT0000001';
COMMENT ON COLUMN "nx01_part_kit"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_part_kit"."whole_part_id" IS '整體件 FK（被替代的單一料號：種類3=正廠總成 / 種類4=副廠合成件）';
COMMENT ON COLUMN "nx01_part_kit"."name" IS '關係名稱（顯示用、例：1K0407621 副廠拆解組）';
COMMENT ON COLUMN "nx01_part_kit"."remark" IS '備註';
COMMENT ON COLUMN "nx01_part_kit"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_part_kit"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_part_kit"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_part_kit"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_part_kit"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_part_kit"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx01PartKitItem  →  nx01_part_kit_item
COMMENT ON TABLE "nx01_part_kit_item" IS '套件組成明細——套件(kit)所含零件。';
COMMENT ON COLUMN "nx01_part_kit_item"."id" IS '[NX01]+[PKII]+[7碼流水號]，EX : NX01PKII0000001';
COMMENT ON COLUMN "nx01_part_kit_item"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_part_kit_item"."kit_id" IS '所屬 kit 表頭 FK（ON DELETE CASCADE）';
COMMENT ON COLUMN "nx01_part_kit_item"."part_id" IS '組件料號 FK';
COMMENT ON COLUMN "nx01_part_kit_item"."qty" IS '此組件在整體件中的數量';
COMMENT ON COLUMN "nx01_part_kit_item"."sort_no" IS '排序';
COMMENT ON COLUMN "nx01_part_kit_item"."remark" IS '備註';
COMMENT ON COLUMN "nx01_part_kit_item"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx01_part_kit_item"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_part_kit_item"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx01_part_kit_item"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx01_part_kit_item"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx06DnHandover  →  nx06_dn_handover
COMMENT ON TABLE "nx06_dn_handover" IS '動態任務轉派紀錄（亞羅簡化版半徑+任務量+ETA、半自動倉管組長拍板）。NX06-IMPL-02 M2 新增。';
COMMENT ON COLUMN "nx06_dn_handover"."id" IS '[NX06]+[DNHO]+[7碼流水號]，EX : NX06DNHO0000001';
COMMENT ON COLUMN "nx06_dn_handover"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx06_dn_handover"."dn_id" IS '對應 DN ID';
COMMENT ON COLUMN "nx06_dn_handover"."from_driver_id" IS '原外務員 user_id';
COMMENT ON COLUMN "nx06_dn_handover"."to_driver_id" IS '接手外務員 user_id';
COMMENT ON COLUMN "nx06_dn_handover"."handover_lat" IS '交接地點推薦 lat';
COMMENT ON COLUMN "nx06_dn_handover"."handover_lng" IS '交接地點推薦 lng';
COMMENT ON COLUMN "nx06_dn_handover"."handover_address" IS '交接地點地址（人類可讀）';
COMMENT ON COLUMN "nx06_dn_handover"."status" IS '狀態（SUGGESTED 演算法建議 / ACCEPTED 兩外務同意 / REJECTED 拒絕 / COMPLETED 交接完成 / CANCELLED 取消）';
COMMENT ON COLUMN "nx06_dn_handover"."reason" IS '演算法推薦理由（如：半徑 3.2km / from 任務 5 to 任務 2 / ETA 短 15 分鐘）';
COMMENT ON COLUMN "nx06_dn_handover"."suggested_by" IS '建議發起人 user_id（倉管組長）';
COMMENT ON COLUMN "nx06_dn_handover"."suggested_at" IS '建議時間';
COMMENT ON COLUMN "nx06_dn_handover"."accepted_at" IS '接受時間';
COMMENT ON COLUMN "nx06_dn_handover"."completed_at" IS '完成交接時間';
COMMENT ON COLUMN "nx06_dn_handover"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx06_dn_handover"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx06_dn_handover"."updated_by" IS '更新人';

-- Nx06PushSubscription  →  nx06_push_subscription
COMMENT ON TABLE "nx06_push_subscription" IS 'Web Push 訂閱（外務員 PWA + 倉管組長瀏覽器）。NX06-IMPL-02 M3 新增。';
COMMENT ON COLUMN "nx06_push_subscription"."id" IS '[NX06]+[PSUB]+[7碼流水號]，EX : NX06PSUB0000001';
COMMENT ON COLUMN "nx06_push_subscription"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx06_push_subscription"."user_id" IS '訂閱 user_id';
COMMENT ON COLUMN "nx06_push_subscription"."endpoint" IS 'Web Push API 推播 endpoint URL';
COMMENT ON COLUMN "nx06_push_subscription"."p256dh_key" IS 'VAPID 公鑰（subscription 內含）';
COMMENT ON COLUMN "nx06_push_subscription"."auth_key" IS 'subscription auth secret';
COMMENT ON COLUMN "nx06_push_subscription"."user_agent" IS '瀏覽器識別（debugging 用）';
COMMENT ON COLUMN "nx06_push_subscription"."is_active" IS '是否啟用（取消訂閱後設 false）';
COMMENT ON COLUMN "nx06_push_subscription"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx06_push_subscription"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx06_push_subscription"."updated_by" IS '更新人';

-- Nx08ApCacheSnapshot  →  nx08_ap_cache_snapshot
COMMENT ON TABLE "nx08_ap_cache_snapshot" IS 'per Nx05ApLedger doc-level 快照（後續 ETL 寫入、本軌 0 writer）。NX08-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."id" IS '[NX08]+[APCS]+[7碼流水號]，EX : NX08APCS0000001';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."ap_ledger_id" IS '對應 AP ledger ID';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."snapshot_date" IS '快照時間';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."original_amount" IS '原始金額';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."paid_amount" IS '已付金額';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."balance_amount" IS '餘額';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."status_at" IS '快照時刻狀態';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."overdue_days" IS '逾期天數（snapshot_date - due_date）';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx08_ap_cache_snapshot"."updated_at" IS '最後更新時間';

-- Nx08ArCacheSnapshot  →  nx08_ar_cache_snapshot
COMMENT ON TABLE "nx08_ar_cache_snapshot" IS 'per Nx05ArLedger doc-level 快照（後續 ETL 寫入、本軌 0 writer）。NX08-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."id" IS '[NX08]+[ARCS]+[7碼流水號]，EX : NX08ARCS0000001';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."ar_ledger_id" IS '對應 AR ledger ID';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."snapshot_date" IS '快照時間';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."original_amount" IS '原始金額';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."paid_amount" IS '已付金額';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."balance_amount" IS '餘額';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."status_at" IS '快照時刻狀態';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."overdue_days" IS '逾期天數';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx08_ar_cache_snapshot"."updated_at" IS '最後更新時間';

-- Nx08DeliveryCacheSnapshot  →  nx08_delivery_cache_snapshot
COMMENT ON TABLE "nx08_delivery_cache_snapshot" IS 'per Nx06Dn doc-level 快照（含 handover_count 統計、後續 ETL 寫入、本軌 0 writer）。NX08-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."id" IS '[NX08]+[DLCS]+[7碼流水號]，EX : NX08DLCS0000001';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."dn_id" IS '對應 DN ID';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."snapshot_date" IS '快照時間';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."driver_user_id" IS '當時 driver';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."status_at" IS '快照時刻 DN 狀態';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."logistics_type" IS '物流類型';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."handover_count" IS '累積動態交接次數';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."internal_cost_sum" IS 'items internalCost 加總';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."duration_sec" IS '配送預估時長（秒）';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx08_delivery_cache_snapshot"."updated_at" IS '最後更新時間';

-- Nx07MedicalRecord  →  nx07_medical_record
COMMENT ON TABLE "nx07_medical_record" IS '員工醫療紀錄（年度健檢 / 特殊作業健康管理、Crown Q1=b 亞羅特色 ⭐）。NX07-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx07_medical_record"."id" IS '[NX07]+[MDRC]+[7碼流水號]，EX : NX07MDRC0000001';
COMMENT ON COLUMN "nx07_medical_record"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx07_medical_record"."user_id" IS '員工 ID（FK nx01_user）';
COMMENT ON COLUMN "nx07_medical_record"."record_date" IS '紀錄日期';
COMMENT ON COLUMN "nx07_medical_record"."record_type" IS '紀錄類型（ANNUAL 年度健檢 / SPECIAL 特殊作業健檢 / FOLLOWUP 追蹤健檢）';
COMMENT ON COLUMN "nx07_medical_record"."exam_items" IS '體檢項目 + 結果（JSON 字串、後續軌升結構化）';
COMMENT ON COLUMN "nx07_medical_record"."conclusion" IS '結論';
COMMENT ON COLUMN "nx07_medical_record"."recommendation" IS '醫師建議';
COMMENT ON COLUMN "nx07_medical_record"."doctor_name" IS '醫師姓名';
COMMENT ON COLUMN "nx07_medical_record"."hospital_name" IS '醫院名稱';
COMMENT ON COLUMN "nx07_medical_record"."attachment_url" IS '附件 URL（後續軌啟動上傳）';
COMMENT ON COLUMN "nx07_medical_record"."remark" IS '備註';
COMMENT ON COLUMN "nx07_medical_record"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx07_medical_record"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx07_medical_record"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx07_medical_record"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx07Injury  →  nx07_injury
COMMENT ON TABLE "nx07_injury" IS '職災追蹤（汽配業常見：搬料 / 切割 / 化學 / 工具意外、亞羅特色業界改革候選 ⭐⭐⭐）。NX07-IMPL-01 M1 新增。';
COMMENT ON COLUMN "nx07_injury"."id" IS '[NX07]+[INJU]+[7碼流水號]，EX : NX07INJU0000001';
COMMENT ON COLUMN "nx07_injury"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx07_injury"."user_id" IS '員工 ID（FK nx01_user）';
COMMENT ON COLUMN "nx07_injury"."injury_date" IS '職災發生日期';
COMMENT ON COLUMN "nx07_injury"."injury_type" IS '職災類型（LIFT 搬料 / CUT 切割 / CHEM 化學 / MACHINE 機械 / ERGO 姿勢職業病 / OTHER）';
COMMENT ON COLUMN "nx07_injury"."injury_location" IS '部位 / 地點';
COMMENT ON COLUMN "nx07_injury"."description" IS '病況描述';
COMMENT ON COLUMN "nx07_injury"."status" IS '狀態（REPORTED 通報 / TREATING 治療中 / RECOVERED 康復 / DISABLED 失能 / FATAL 死亡）';
COMMENT ON COLUMN "nx07_injury"."recovery_at" IS '康復時間';
COMMENT ON COLUMN "nx07_injury"."insurance_claim" IS '保險理賠金額';
COMMENT ON COLUMN "nx07_injury"."attachment_url" IS '附件 URL';
COMMENT ON COLUMN "nx07_injury"."remark" IS '備註';
COMMENT ON COLUMN "nx07_injury"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx07_injury"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx07_injury"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx07_injury"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx09SystemManual  →  nx09_system_manual
COMMENT ON TABLE "nx09_system_manual" IS 'NEXORA 系統操作手冊（業界 ERP 標配 SAP/Oracle/MS Dynamics 對標）。NX09-IMPL-01 M1 新增。 featureKey 命名規範：模組.功能.動作（如 nx04.so.create / nx05.ar.statement）';
COMMENT ON COLUMN "nx09_system_manual"."id" IS '[NX09]+[SYMA]+[7碼流水號]，EX : NX09SYMA0000001';
COMMENT ON COLUMN "nx09_system_manual"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx09_system_manual"."feature_key" IS 'feature 對應 key、命名規範：模組.功能.動作';
COMMENT ON COLUMN "nx09_system_manual"."title" IS '手冊標題';
COMMENT ON COLUMN "nx09_system_manual"."content" IS 'markdown 內文';
COMMENT ON COLUMN "nx09_system_manual"."steps" IS '操作步驟 JSON 字串陣列';
COMMENT ON COLUMN "nx09_system_manual"."screenshots" IS 'screenshot URL JSON 字串陣列';
COMMENT ON COLUMN "nx09_system_manual"."category" IS '手冊分類（GENERAL / FAQ / TROUBLESHOOT）';
COMMENT ON COLUMN "nx09_system_manual"."version" IS '版本號';
COMMENT ON COLUMN "nx09_system_manual"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx09_system_manual"."remark" IS '備註';
COMMENT ON COLUMN "nx09_system_manual"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx09_system_manual"."created_by" IS '建立人員（FK nx01_user）';
COMMENT ON COLUMN "nx09_system_manual"."updated_at" IS '最後更新時間';
COMMENT ON COLUMN "nx09_system_manual"."updated_by" IS '最後更新人員（FK nx01_user）';

-- Nx09VinLookup  →  nx09_vin_lookup
COMMENT ON TABLE "nx09_vin_lookup" IS 'VIN 17 碼結構化主檔（NHTSA decode + 手動建檔混合、業界改革 ⭐⭐⭐）。NX09-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx09_vin_lookup"."id" IS '[NX09]+[VINL]+[7碼流水號]，EX : NX09VINL0000001';
COMMENT ON COLUMN "nx09_vin_lookup"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx09_vin_lookup"."vin" IS 'VIN 17 碼國際標準（ISO 3779 / SAE J853）';
COMMENT ON COLUMN "nx09_vin_lookup"."brand_id" IS '車型品牌 FK（FK nx01_brand isCar=true、NHTSA Make 對照或業務員手動指定、可空） W6 [3-8] Phase 5 2026-06-06 品牌合併：取代舊 carBrandId';
COMMENT ON COLUMN "nx09_vin_lookup"."model_id" IS '車型 FK（業務員手動關聯後即可走 PartModel 鏈、可空）';
COMMENT ON COLUMN "nx09_vin_lookup"."source" IS '資料來源（API=NHTSA / MANUAL=業務員手動）';
COMMENT ON COLUMN "nx09_vin_lookup"."decoded_at" IS 'NHTSA decode 時間（API 來源才有）';
COMMENT ON COLUMN "nx09_vin_lookup"."raw_api_response" IS 'NHTSA decode 原始 JSON（debug + 補錄用）';
COMMENT ON COLUMN "nx09_vin_lookup"."notes" IS '業務員備註';
COMMENT ON COLUMN "nx09_vin_lookup"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx09_vin_lookup"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx09_vin_lookup"."created_by" IS '建立人';
COMMENT ON COLUMN "nx09_vin_lookup"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx09_vin_lookup"."updated_by" IS '更新人';

-- Nx09RepairSop  →  nx09_repair_sop
COMMENT ON TABLE "nx09_repair_sop" IS '維修 SOP 結構化主檔（步驟 + 工具 + 注意事項 + 預估時間、業界改革 ⭐⭐⭐）。NX09-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx09_repair_sop"."id" IS '[NX09]+[RPSP]+[7碼流水號]，EX : NX09RPSP0000001';
COMMENT ON COLUMN "nx09_repair_sop"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx09_repair_sop"."code" IS 'SOP 代碼（tenant 內 unique、例：OIL-CHG-001）';
COMMENT ON COLUMN "nx09_repair_sop"."title" IS 'SOP 標題';
COMMENT ON COLUMN "nx09_repair_sop"."category" IS '維修分類（ENGINE/BRAKE/ELECTRIC/MAINTAIN/SUSPENSION/AC/TRANS/OTHER）';
COMMENT ON COLUMN "nx09_repair_sop"."steps" IS '步驟 JSON 陣列：[{seq, description, tool, warning, imageUrl}]';
COMMENT ON COLUMN "nx09_repair_sop"."tools" IS '工具 JSON 陣列';
COMMENT ON COLUMN "nx09_repair_sop"."warnings" IS '注意事項 JSON 陣列';
COMMENT ON COLUMN "nx09_repair_sop"."estimated_minutes" IS '預估時間（分鐘）';
COMMENT ON COLUMN "nx09_repair_sop"."photos" IS '照片 URL JSON 陣列';
COMMENT ON COLUMN "nx09_repair_sop"."car_model_filter" IS '適用車型過濾（可空 = 通用、FK Nx01Model）';
COMMENT ON COLUMN "nx09_repair_sop"."difficulty" IS '維修難度（1-5、預設 1 簡易）';
COMMENT ON COLUMN "nx09_repair_sop"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx09_repair_sop"."remark" IS '備註';
COMMENT ON COLUMN "nx09_repair_sop"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx09_repair_sop"."created_by" IS '建立人';
COMMENT ON COLUMN "nx09_repair_sop"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx09_repair_sop"."updated_by" IS '更新人';

-- Nx09RepairSopPartModel  →  nx09_repair_sop_part_model
COMMENT ON TABLE "nx09_repair_sop_part_model" IS 'RepairSop ↔ Nx01PartModel link 表（業界改革 ⭐⭐⭐ 雙向查詢：查料件→看 SOP / 查 SOP→看料件）。NX09-IMPL-02 M1 新增。';
COMMENT ON COLUMN "nx09_repair_sop_part_model"."id" IS '[NX09]+[RSPM]+[7碼流水號]，EX : NX09RSPM0000001';
COMMENT ON COLUMN "nx09_repair_sop_part_model"."repair_sop_id" IS 'RepairSop FK';
COMMENT ON COLUMN "nx09_repair_sop_part_model"."part_model_id" IS 'PartModel FK（cross-ref NX01PartModel）';
COMMENT ON COLUMN "nx09_repair_sop_part_model"."notes" IS '為什麼這料件適用此 SOP（業務員備註）';
COMMENT ON COLUMN "nx09_repair_sop_part_model"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx09_repair_sop_part_model"."created_by" IS '建立人';

-- Nx01SupplierGrade  →  nx01_supplier_grade
COMMENT ON TABLE "nx01_supplier_grade" IS '供應商分級主檔（A/B/C/D），對齊 Nx01CustomerGrade 範式。 初期手動指派為主、付款條件累積後算自動評級、信用紀錄/不良率累積後再補。';
COMMENT ON COLUMN "nx01_supplier_grade"."id" IS '[NX01]+[SUGR]+[7碼流水號]，EX : NX01SUGR0000001';
COMMENT ON COLUMN "nx01_supplier_grade"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_supplier_grade"."code" IS '等級代碼（租戶內唯一），預設：A/B/C/D，可自行新增。';
COMMENT ON COLUMN "nx01_supplier_grade"."name" IS '等級名稱（顯示用），例：優質供應商、一般供應商、品質不穩、黑名單。';
COMMENT ON COLUMN "nx01_supplier_grade"."description" IS '等級描述（顯示用、業務人員判讀規則）';
COMMENT ON COLUMN "nx01_supplier_grade"."sort_no" IS '排序用（數字越小等級越優）。';
COMMENT ON COLUMN "nx01_supplier_grade"."is_active" IS '是否啟用。';
COMMENT ON COLUMN "nx01_supplier_grade"."is_builtin" IS '系統內建旗標（執行長 2026-06-18 拍板 B:true=系統內建、UI 可改名但不允許停用/刪）。';
COMMENT ON COLUMN "nx01_supplier_grade"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx01_supplier_grade"."created_by" IS '建立人（必填；系統操作帶入使用者 ID;DB 匯入填系統管理員 ID）';
COMMENT ON COLUMN "nx01_supplier_grade"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx01_supplier_grade"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID;DB 匯入填系統管理員 ID）';

-- Nx02WarrantyClaim  →  nx02_warranty_claim
COMMENT ON TABLE "nx02_warranty_claim" IS '保固申請單：兩型發起（客訴 CUST / 自用 SELF）+ 4 種審核結果（NEW/REF/RPR/REJ）。 claimType=CUST 連 sourceSoId（NX04 SO 還沒做 LITE、暫不建 @relation FK constraint、純 nullable 欄位預留）。';
COMMENT ON COLUMN "nx02_warranty_claim"."id" IS '[NX02]+[WCLM]+[7碼流水號]，EX : NX02WCLM0000001';
COMMENT ON COLUMN "nx02_warranty_claim"."tenant_id" IS '租戶 ID（外鍵）。';
COMMENT ON COLUMN "nx02_warranty_claim"."doc_no" IS '保固申請單號（唯一），[WC]+[年月]+[倉別]+[5碼流水號]，EX：WC-202606-Z01-00001';
COMMENT ON COLUMN "nx02_warranty_claim"."claim_type" IS '申請類型（CUST=客訴型連 SO / SELF=自用型不連 SO）。';
COMMENT ON COLUMN "nx02_warranty_claim"."source_so_id" IS '來源銷貨單 ID（FK nx04_so，僅 claimType=CUST 填）。NX04 LITE 尚未實作、暫不建 @relation 約束、純預留 nullable';
COMMENT ON COLUMN "nx02_warranty_claim"."source_so_no" IS '來源銷貨單號 snapshot（顯示用、避免 SO 改 docNo 影響歷史）';
COMMENT ON COLUMN "nx02_warranty_claim"."supplier_id" IS '供應商 ID（FK nx01_partner、application 層 guard partner_type=''S'' 純供應商、向誰申請保固）';
COMMENT ON COLUMN "nx02_warranty_claim"."part_id" IS '零件 ID（FK nx01_part、什麼料壞了）';
COMMENT ON COLUMN "nx02_warranty_claim"."part_no" IS '零件料號 snapshot';
COMMENT ON COLUMN "nx02_warranty_claim"."part_name" IS '零件名稱 snapshot';
COMMENT ON COLUMN "nx02_warranty_claim"."qty" IS '數量（壞了幾個）';
COMMENT ON COLUMN "nx02_warranty_claim"."claim_date" IS '申請日期';
COMMENT ON COLUMN "nx02_warranty_claim"."issue_description" IS '問題描述（業務人員填、給供應商審核參考）';
COMMENT ON COLUMN "nx02_warranty_claim"."status" IS '狀態（D=DRAFT 草稿/S=SUBMITTED 已送出/R=REVIEWING 供應商審核中/C=COMPLETED 已完成有審核結果/V=VOIDED 作廢）';
COMMENT ON COLUMN "nx02_warranty_claim"."result" IS '審核結果（status=C 才有值：NEW=換新/REF=退錢/RPR=維修後還/REJ=駁回、null=尚未審核）';
COMMENT ON COLUMN "nx02_warranty_claim"."result_remark" IS '審核回覆說明（供應商給的審核理由、status=C 必填）';
COMMENT ON COLUMN "nx02_warranty_claim"."resulted_at" IS '審核完成時間（status=C 才有）';
COMMENT ON COLUMN "nx02_warranty_claim"."resulted_by" IS '審核登記人（使用者 ID、收到供應商回覆後登記的業務員）';
COMMENT ON COLUMN "nx02_warranty_claim"."refund_amount" IS '階段 F P5 加：退錢金額（result=REF 時填）。系統建議值=進貨成本×qty、業務可手動改、其他 result 為 null';
COMMENT ON COLUMN "nx02_warranty_claim"."refund_method" IS '階段 F P5 加：退錢方式（result=REF 時必填）：O=Offset 下次扣抵 / A=Allowance 折讓單 / R=Refund 直接退現';
COMMENT ON COLUMN "nx02_warranty_claim"."source_pr_id" IS '階段 I P1 加：來源退貨單 ID（FK nx02_pr、Q1=a 拍板）。退貨單選「走保固」(dispositionFlag=W) 時 service 自動建保固單、回填此欄追溯來源。CUST/SELF 兩種既有 claimType 仍可為 null（人工開保固單時）。';
COMMENT ON COLUMN "nx02_warranty_claim"."source_pr_item_id" IS '階段 I P1 加：來源退貨明細 ID（FK nx02_pr_item、Q1=a 拍板）。對應 sourcePrId 的具體 line item、便於追溯「哪筆退貨產生此保固單」、報表可 group。';
COMMENT ON COLUMN "nx02_warranty_claim"."source_issue_report_id" IS 'W5 異常鏈 Step 3 2026-07-11 加：來源異常回報單 ID（軟連結 nx03_issue_report、不建 FK）。IR dispose 一鍵開單 / 手動連結時 service 回填；保固審核完成（status=C）時回寫 IR 自動結案。';
COMMENT ON COLUMN "nx02_warranty_claim"."remark" IS '備註';
COMMENT ON COLUMN "nx02_warranty_claim"."created_at" IS '建立時間。';
COMMENT ON COLUMN "nx02_warranty_claim"."created_by" IS '建立人（必填；系統操作帶入使用者 ID）';
COMMENT ON COLUMN "nx02_warranty_claim"."updated_at" IS '更新時間。';
COMMENT ON COLUMN "nx02_warranty_claim"."updated_by" IS '更新人（必填；系統操作帶入使用者 ID）';
COMMENT ON COLUMN "nx02_warranty_claim"."voided_at" IS '作廢時間（status=V 才有）';
COMMENT ON COLUMN "nx02_warranty_claim"."voided_by" IS '作廢人（使用者 ID）';

-- Nx02WarrantyClaimAttachment  →  nx02_warranty_claim_attachment
COMMENT ON TABLE "nx02_warranty_claim_attachment" IS '保固申請附件：行照 LIC / 照片 PHO / 影片 VID 三型、對齊 Nx01BulletinAttachment 範式（storageKey + mimeType + fileSize）。';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."id" IS '[NX02]+[WCAT]+[7碼流水號]，EX : NX02WCAT0000001';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."tenant_id" IS '租戶 ID（外鍵、軌 1 FileUploadService.upload() tenantId prefix 強制驗證對齊）';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."claim_id" IS '保固申請單 FK';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."file_type" IS '檔案類型（LIC=行照/PHO=問題照片/VID=影片）';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."storage_key" IS '檔案在 storage 的 key（範式：{tenantId}/nx02_warranty/{yyyy}/{mm}/{uuid}{ext}、階段 1 本地路徑、階段 2 R2 object key）';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."mime_type" IS 'MIME 類型（image/png / video/mp4 / application/pdf 等）';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."file_size" IS '檔案大小（bytes、application 層 guard：照片 ≤ 10MB / 影片 ≤ 100MB / 行照 ≤ 5MB）';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."orig_filename" IS '上傳時原始檔名';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."uploader_user_id" IS '上傳者 FK';
COMMENT ON COLUMN "nx02_warranty_claim_attachment"."created_at" IS '上傳時間';

-- Nx98TaskPool  →  nx98_task_pool
COMMENT ON TABLE "nx98_task_pool" IS '全模組共用框架：進貨/銷貨/庫存/財務等模組產生的待辦事項都進此池。 業務語意（Crown 2026-05-28 拍板）： - 任何人可建、可指派或留池中（assigneeUserId=null = 池中無人領） - 池中待辦任何人可領取（領後 status=CLAIMED、其他人不能領） - 主管 ABCD 可指派給 EF（assignee 變更）、EF 只能領取（⚠️ RBAC TODO、本軌 minimal 不 enforce） - 已領取可放回池（CLAIMED→OPEN） - 完成 status=DONE、作廢 status=VOIDED - 跨模組通用：sourceModule + sourceDocType + sourceDocId 軟連結業務單據（不建 FK constraint）';
COMMENT ON COLUMN "nx98_task_pool"."id" IS '[NX98]+[TPOL]+[7碼流水號]，EX : NX98TPOL0000001';
COMMENT ON COLUMN "nx98_task_pool"."tenant_id" IS '租戶 ID';
COMMENT ON COLUMN "nx98_task_pool"."doc_no" IS '待辦單號（optional、若需流水號用 [TASK]+[YYYYMM]+[5 碼]）';
COMMENT ON COLUMN "nx98_task_pool"."source_module" IS '來源模組碼（NX02/NX03/NX04/NX05、可空 = 跨模組獨立待辦）';
COMMENT ON COLUMN "nx98_task_pool"."source_doc_type" IS '來源單據類型（RR/PO/SO/RFQ 等、可空）';
COMMENT ON COLUMN "nx98_task_pool"."source_doc_id" IS '來源單據 ID（軟連結、不建 FK constraint、跨模組通用）';
COMMENT ON COLUMN "nx98_task_pool"."source_doc_no" IS '來源單據單號 snapshot（顯示用、避免改 docNo 影響歷史）';
COMMENT ON COLUMN "nx98_task_pool"."title" IS '待辦標題（業務人員看的描述）';
COMMENT ON COLUMN "nx98_task_pool"."description" IS '待辦詳細說明（可空）';
COMMENT ON COLUMN "nx98_task_pool"."category" IS '業務分類（PURCHASE_RECEIVE 待驗收 / SALES_PICK 待撿貨 / INVENTORY_DISPOSAL 待異常處理 等）';
COMMENT ON COLUMN "nx98_task_pool"."priority" IS '優先級（L=低 / M=中 / H=高）';
COMMENT ON COLUMN "nx98_task_pool"."due_date" IS '截止日期（可空）';
COMMENT ON COLUMN "nx98_task_pool"."department_id" IS '部門 ID（FK nx01_department、null = 全公司池）';
COMMENT ON COLUMN "nx98_task_pool"."assignee_user_id" IS '被指派人（user ID、可空 = 池中、有值 = 已指派或已領取）';
COMMENT ON COLUMN "nx98_task_pool"."assigned_at" IS '指派時間（assignee 變更為非 null 時更新）';
COMMENT ON COLUMN "nx98_task_pool"."assigned_by" IS '指派人（user ID、主管或建單人）';
COMMENT ON COLUMN "nx98_task_pool"."claimed_at" IS '領取時間（EF 主動領、status OPEN→CLAIMED）';
COMMENT ON COLUMN "nx98_task_pool"."claimed_by" IS '領取人（user ID）';
COMMENT ON COLUMN "nx98_task_pool"."status" IS '狀態（OPEN=池中未領 / CLAIMED=已領取 / DONE=已完成 / VOIDED=作廢）';
COMMENT ON COLUMN "nx98_task_pool"."completed_at" IS '完成時間';
COMMENT ON COLUMN "nx98_task_pool"."completed_by" IS '完成人（user ID）';
COMMENT ON COLUMN "nx98_task_pool"."completed_remark" IS '完成備註（業務完成時填）';
COMMENT ON COLUMN "nx98_task_pool"."voided_at" IS '作廢時間';
COMMENT ON COLUMN "nx98_task_pool"."voided_by" IS '作廢人（user ID）';
COMMENT ON COLUMN "nx98_task_pool"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx98_task_pool"."created_by" IS '建立人';
COMMENT ON COLUMN "nx98_task_pool"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx98_task_pool"."updated_by" IS '更新人';

-- Nx02RfqGreetingTemplate  →  nx02_rfq_greeting_template
COMMENT ON TABLE "nx02_rfq_greeting_template" IS '詢價文字客套話設定（每租戶 1:1、unique）：業務從料件+數量發起詢價、系統產生「開頭客套話 + 料件清單 + 結尾客套話」、業務複製到 LINE/電話問供應商。';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."id" IS '[NX02]+[RGTM]+[7碼流水號]，EX : NX02RGTM0000001';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."tenant_id" IS '租戶 ID（外鍵、unique 每租戶一套）';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."greeting_content" IS '開頭客套話（例：「您好、想詢價以下零件：」）';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."closing_content" IS '結尾客套話（例：「麻煩報價謝謝」）';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."is_active" IS '是否啟用';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."created_by" IS '建立人';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx02_rfq_greeting_template"."updated_by" IS '更新人';

-- PlatformAdmin  →  platform_admin
COMMENT ON TABLE "platform_admin" IS '平台層 vs 租戶層分離軌 Phase 1（2026-06-02） 性質：⚠️ 平台基礎設施、**非 spec 驅動**、手動維護（不在 docs/spec/ CSV 範圍） 用途：伊諾瓦營運超管帳號、與客戶租戶 nx01_user 徹底分家、跨層不耦合 FK：created_by / updated_by 用 VARCHAR(15) scalar 不建 FK（跟 nx99_tenant 範式一致）';
COMMENT ON COLUMN "platform_admin"."id" IS '[PLAT]+[ADMN]+[7碼流水號]，EX : PLATADMN0000001';
COMMENT ON COLUMN "platform_admin"."account" IS '平台登入帳號（跨平台唯一、不分租戶）';
COMMENT ON COLUMN "platform_admin"."password_hash" IS '密碼雜湊';
COMMENT ON COLUMN "platform_admin"."display_name" IS '顯示名稱';
COMMENT ON COLUMN "platform_admin"."email" IS 'Email（選填）';
COMMENT ON COLUMN "platform_admin"."phone" IS '電話（選填）';
COMMENT ON COLUMN "platform_admin"."is_active" IS '是否啟用（停用後不可登入）';
COMMENT ON COLUMN "platform_admin"."must_change_password" IS '首次登入強制改密碼';
COMMENT ON COLUMN "platform_admin"."last_login_at" IS '最後登入時間';
COMMENT ON COLUMN "platform_admin"."failed_login_count" IS '連續失敗登入次數';
COMMENT ON COLUMN "platform_admin"."locked_until" IS '帳號鎖定到何時';
COMMENT ON COLUMN "platform_admin"."remark" IS '備註';
COMMENT ON COLUMN "platform_admin"."created_at" IS '建立時間';
COMMENT ON COLUMN "platform_admin"."created_by" IS '建立人（VARCHAR scalar、無 FK、首筆 seed 自參考）';
COMMENT ON COLUMN "platform_admin"."updated_at" IS '更新時間';
COMMENT ON COLUMN "platform_admin"."updated_by" IS '更新人（VARCHAR scalar、無 FK）';

-- Nx01UserPref  →  nx01_user_pref
COMMENT ON TABLE "nx01_user_pref" IS '使用者層級個人偏好設定（2026-06-03 段 B 前置） 性質：⚠️ 非 spec 驅動、手動維護（不在 docs/spec/ CSV 範圍） 用途：user × pref_key、pref_value JSONB、彈性結構 首頁儀表板 5 格設定 / 未來主題 / 預設頁 / 提醒設定都走這張表 範式：對齊 nx01_user_page_guide（同樣是 user × key 設計、是它兄弟）';
COMMENT ON COLUMN "nx01_user_pref"."id" IS '[NX01]+[UPRF]+[7碼流水號]，EX : NX01UPRF0000001';
COMMENT ON COLUMN "nx01_user_pref"."tenant_id" IS '租戶 ID（外鍵、查詢 scope）';
COMMENT ON COLUMN "nx01_user_pref"."user_id" IS '使用者 ID（外鍵、設定擁有者）';
COMMENT ON COLUMN "nx01_user_pref"."pref_key" IS '偏好設定 key（例 ''home.dashboard.metrics''、''theme''、''default-landing''）';
COMMENT ON COLUMN "nx01_user_pref"."pref_value" IS '偏好設定值（JSONB、彈性結構）';
COMMENT ON COLUMN "nx01_user_pref"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_user_pref"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_user_pref"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_user_pref"."updated_by" IS '更新人';

-- Nx01WarehouseZone  →  nx01_warehouse_zone
COMMENT ON TABLE "nx01_warehouse_zone" IS '倉庫內分區（A 區、B 區、不良品區…）。樹層級：site → warehouse → zone → location。 migration 階段為每倉預建一筆 code=''Z00'' name=''主區''、現有 location.zoneId 全指該預設。';
COMMENT ON COLUMN "nx01_warehouse_zone"."id" IS '[NX01]+[WHZN]+[7碼流水號]，EX : NX01WHZN0000001';
COMMENT ON COLUMN "nx01_warehouse_zone"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_warehouse_zone"."warehouse_id" IS '所屬倉庫 ID（FK to nx01_warehouse、ON DELETE Restrict）';
COMMENT ON COLUMN "nx01_warehouse_zone"."code" IS '分區代碼（倉內唯一）';
COMMENT ON COLUMN "nx01_warehouse_zone"."name" IS '分區名稱';
COMMENT ON COLUMN "nx01_warehouse_zone"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_warehouse_zone"."is_active" IS '是否啟用（停用不刪資料）';
COMMENT ON COLUMN "nx01_warehouse_zone"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_warehouse_zone"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_warehouse_zone"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_warehouse_zone"."updated_by" IS '更新人';

-- Nx01WarehouseRack  →  nx01_warehouse_rack
COMMENT ON TABLE "nx01_warehouse_rack" IS '倉庫貨架主檔——儲位層級（倉庫→儲區→貨架）之貨架層。';
COMMENT ON COLUMN "nx01_warehouse_rack"."id" IS '[NX01]+[WHRK]+[7碼流水號]，EX : NX01WHRK0000001';
COMMENT ON COLUMN "nx01_warehouse_rack"."tenant_id" IS '租戶 ID（外鍵）';
COMMENT ON COLUMN "nx01_warehouse_rack"."zone_id" IS '所屬區域 ID（FK to nx01_warehouse_zone、ON DELETE Restrict）';
COMMENT ON COLUMN "nx01_warehouse_rack"."code" IS '貨架代碼（區域內唯一）';
COMMENT ON COLUMN "nx01_warehouse_rack"."name" IS '貨架名稱';
COMMENT ON COLUMN "nx01_warehouse_rack"."sort_no" IS '排序用';
COMMENT ON COLUMN "nx01_warehouse_rack"."is_active" IS '是否啟用（停用不刪資料）';
COMMENT ON COLUMN "nx01_warehouse_rack"."created_at" IS '建立時間';
COMMENT ON COLUMN "nx01_warehouse_rack"."created_by" IS '建立人';
COMMENT ON COLUMN "nx01_warehouse_rack"."updated_at" IS '更新時間';
COMMENT ON COLUMN "nx01_warehouse_rack"."updated_by" IS '更新人';
