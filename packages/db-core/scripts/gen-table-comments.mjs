// packages/db-core/scripts/gen-table-comments.mjs
// 把 schema.prisma 的 /// 註解轉成 Postgres COMMENT ON SQL（表格＋欄位備註）。
// 用途：Prisma 的 /// 不會寫進 DB，本腳本補上——產出可重跑、冪等的 SQL，本機/Railway 同套。
// 執行：node packages/db-core/scripts/gen-table-comments.mjs
// 產出：packages/db-core/sql/table-comments.sql（+ 缺註解清單印到 stderr）

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCHEMA = path.join(ROOT, 'packages/db-core/prisma/schema.prisma');
const OUT_DIR = path.join(ROOT, 'packages/db-core/sql');
const OUT_SQL = path.join(OUT_DIR, 'table-comments.sql');

const SCALARS = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes']);

// ── 補註解來源 2：樣板欄位（意義全表一致；schema.prisma 漏標的用這套標準說明補上）──
const BOILERPLATE = {
  id: '主鍵 ID（系統產生）',
  tenant_id: '租戶 ID（外鍵，多租戶隔離）',
  created_at: '建立時間',
  created_by: '建立人員（FK nx01_user）',
  updated_at: '最後更新時間',
  updated_by: '最後更新人員（FK nx01_user）',
  is_active: '是否啟用（軟刪除旗標：false=已停用，系統不做實體刪除）',
  sort_no: '排序序號',
  granted_at: '授予時間',
  granted_by: '授予人員（FK nx01_user）',
  revoked_at: '撤銷時間',
  revoked_by: '撤銷人員（FK nx01_user）',
  seen_at: '檢視／已讀時間',
  imported_at: '匯入時間',
  deleted_at: '刪除時間（軟刪除）',
  deleted_by: '刪除人員（FK nx01_user）',
  uploaded_by: '上傳人員（FK nx01_user）',
  uploader_user_id: '上傳者 ID（FK nx01_user）',
  can_read: '權限：可檢視', can_create: '權限：可新增', can_update: '權限：可修改',
  can_delete: '權限：可刪除（停用）', can_export: '權限：可匯出', can_approve: '權限：可審核',
};

// ── 補註解來源 3：缺表描述（清洗掉 banner 後仍無描述的 128 張，依模組＋名稱＋欄位判斷）──
const TABLE_SUPPLEMENT = {
  // NX01 主檔／RBAC／行政／地址／汽配
  nx01_audit_log: '稽核軌跡日誌——記錄系統操作異動（誰於何時改了什麼）。',
  nx01_bulletin: '公告主檔——公司內部公告。',
  nx01_calendar_event: '行事曆事件——公司／個人排程。',
  nx01_country: '國家主檔（字典表）。',
  nx01_currency: '幣別主檔（字典表）。',
  nx01_customer_grade: '客戶等級主檔——分級連動毛利率／售價級距。',
  nx01_department: '部門主檔（字典表）。',
  nx01_discount_code: '折扣代碼主檔。',
  nx01_kpi_record: 'KPI 實績紀錄——各期實際數值。',
  nx01_kpi_target: 'KPI 目標值——各期目標設定。',
  nx01_kpi_template: 'KPI 指標範本——指標定義。',
  nx01_location: '儲位主檔——倉庫內細分儲位。',
  nx01_site: '站點／門市主檔——營運據點。',
  nx01_part: '零件主檔——料號核心（內碼／基準／廠牌三種料號、分類三維）。',
  nx01_part_relation: '零件關聯——替代料／相關料關係。',
  nx01_part_group: '零件自訂群組主檔——客戶自訂的料號分群（偉盟匯入 18912 群），非車型、非分類。',
  nx01_partner: '往來對象主檔——客戶／同行／供應商／外包物流／銀行／一般廠商六分類。',
  nx01_partner_address: '往來對象地址（一對多）——多筆地址（門牌拆欄：巷弄號樓室）。',
  nx01_partner_grade_history: '往來對象等級異動歷史——客戶／供應商等級變更軌跡。',
  nx01_role: '角色主檔（RBAC）。',
  nx01_role_view: '角色—功能頁授權對應。',
  nx01_team: '團隊／群組主檔。',
  nx01_user: '使用者主檔——員工帳號。',
  nx01_user_role: '使用者—角色對應（多對多）。',
  nx01_user_team: '使用者—團隊對應（多對多）。',
  nx01_user_warehouse: '使用者—倉庫對應——員工可操作倉別。',
  nx01_view: '功能頁主檔——系統頁面／權限點目錄。',
  nx01_warehouse: '倉庫主檔。',
  nx01_warehouse_type: '倉庫類型字典表。',
  nx01_warehouse_rack: '倉庫貨架主檔——儲位層級（倉庫→儲區→貨架）之貨架層。',
  nx01_city: '縣市字典表。',
  nx01_district: '鄉鎮市區字典表。',
  nx01_street: '街道字典表。',
  nx01_part_kit_item: '套件組成明細——套件(kit)所含零件。',
  // NX02 進貨採購
  nx02_demand: '採購需求池——補貨需求來源（缺貨／請購／手動）。',
  nx02_po: '採購單單頭。', nx02_po_item: '採購單明細行。',
  nx02_pr: '請購單單頭。', nx02_pr_item: '請購單明細行。',
  nx02_qt: '供應商報價——採購側詢價回報。',
  nx02_rfq: '詢價單單頭——對供應商詢價。', nx02_rfq_item: '詢價單明細行。',
  nx02_rr: '進貨驗收單單頭——收貨入庫。', nx02_rr_item: '進貨驗收單明細行。',
  nx02_rr_import: '進貨驗收匯入暫存。',
  nx02_ti: '同行調貨單單頭——跟同業調貨補客戶單。', nx02_ti_item: '同行調貨單明細行。',
  // NX03 庫存
  nx03_init: '期初庫存單單頭——建檔期初存量。', nx03_init_item: '期初庫存單明細行。',
  nx03_parcel: '包裹——包貨產生的箱／件。',
  nx03_part_stock_setting: '零件庫存設定——安全存量／補貨點。',
  nx03_pk: '撿貨單單頭。', nx03_pk_item: '撿貨單明細行。',
  nx03_pl: '包貨單單頭（裝箱）。', nx03_pl_item: '包貨單明細行。',
  nx03_shortage: '缺貨紀錄——銷貨缺貨待補。',
  nx03_st: '調撥單單頭——倉對倉移轉。', nx03_st_item: '調撥單明細行。',
  nx03_stock_balance: '庫存餘額——各倉各料即時存量（存貨子帳餘額）。',
  nx03_stock_ledger: '庫存異動帳——每筆進出流水（存貨子帳明細）。',
  nx03_stock_take: '盤點單單頭。', nx03_stock_take_item: '盤點單明細行。',
  nx03_inbound: '入庫單單頭——通用入庫。', nx03_inbound_item: '入庫單明細行。',
  nx03_outbound: '出庫單單頭——通用出庫。', nx03_outbound_item: '出庫單明細行。',
  // NX04 銷售
  nx04_co: '客戶訂單單頭（CO 單）。', nx04_order: '訂單單頭（ORDR 單）。⚠️與 co/so 疑似重疊、待確認是否為舊表。',
  nx04_order_item: '訂單明細行。',
  nx04_quote: '報價單單頭。', nx04_quote_item: '報價單明細行。',
  nx04_so: '銷貨單單頭。', nx04_so_item: '銷貨單明細行。',
  nx04_sr: '銷退單單頭——銷貨退回。', nx04_sr_item: '銷退單明細行。',
  // NX05 財務
  nx05_account_code: '會計科目表——I/E/A/L 分類科目。',
  nx05_allowance: '折讓單單頭。', nx05_allowance_item: '折讓單明細行。',
  nx05_ap_ledger: '應付帳款明細帳（應付子帳）。',
  nx05_ar_ledger: '應收帳款明細帳（應收子帳）。',
  nx05_closing: '月關帳紀錄。',
  nx05_note: '票據——支票／本票管理。',
  nx05_paylog: '收付款紀錄——收款／付款流水。',
  // NX06 配送
  nx06_dn: '配送單單頭——出貨配送。', nx06_dn_item: '配送單明細行。',
  nx06_dn_stop: '配送點——一趟配送的多個停靠點。',
  // NX07 人資薪工
  nx07_attendance: '出勤紀錄。', nx07_ip_whitelist: '打卡 IP 白名單。',
  nx07_leave_balance: '假別餘額——各員工各假別剩餘。', nx07_leave_request: '請假單。',
  nx07_leave_type: '假別主檔（字典表）。', nx07_overtime_request: '加班申請單。',
  nx07_salary_component: '薪資項目——加給／扣項定義。',
  nx07_salary_record: '薪資單單頭——每期薪資。', nx07_salary_record_item: '薪資單明細行——各薪資項目。',
  nx07_salary_setting: '薪資設定——員工薪資基礎。',
  nx07_schedule: '排班表單頭。', nx07_schedule_item: '排班明細行。',
  nx07_shift_type: '班別主檔（字典表）。',
  nx07_performance: '績效考核紀錄。', nx07_training: '教育訓練紀錄。',
  nx07_employee_change: '人事異動單——調職／升遷／離職。',
  // NX08 報表決策
  nx08_daily_report: '每日營運報表。',
  nx08_finance_cache: '財務報表快取。', nx08_hr_cache: '人資報表快取。',
  nx08_inventory_cache: '庫存報表快取。', nx08_purchase_cache: '採購報表快取。',
  nx08_sales_cache: '銷售報表快取。',
  nx08_pestel_record: 'PESTEL 策略分析紀錄。', nx08_swot_record: 'SWOT 策略分析紀錄。',
  // NX09 知識／文件／會議
  nx09_document: '文件主檔——文件管理。', nx09_document_version: '文件版本。',
  nx09_km_article: '知識庫文章。', nx09_km_article_tag: '知識庫文章—標籤對應。',
  nx09_km_feedback: '知識庫文章回饋。', nx09_km_tag: '知識庫標籤主檔。',
  nx09_meeting: '會議主檔。', nx09_meeting_action: '會議待辦事項。',
  nx09_meeting_attendee: '會議出席者。', nx09_meeting_minutes: '會議紀錄。',
  // NX98 共用
  nx98_doc_link: '單據關聯——跨模組單據串接（劇本串單基礎設施）。',
  // NX99 平台
  nx99_plan: '方案主檔——LITE／PLUS／PRO 版本（席次制）。',
  nx99_product_module: '產品模組主檔——可加購模組目錄。',
  nx99_product_module_map: '方案—模組對應。',
  nx99_release: '發布版本紀錄。', nx99_release_item: '發布項目明細。',
  nx99_subscription: '租戶訂閱主檔。', nx99_subscription_item: '訂閱項目明細——加購模組。',
  nx99_tenant: '租戶主檔——多租戶隔離根。',
};

// ── 補註解來源 4：缺註解的業務欄位（103 個，依名稱＋模組語意判斷）──
const COL_SUPPLEMENT = {
  'nx01_part_photo.part_id': '零件 ID（FK nx01_part）', 'nx01_part_photo.mime_type': '檔案 MIME 類型',
  'nx01_part_photo.file_size': '檔案大小（bytes）', 'nx01_part_photo.orig_filename': '原始檔名',
  'nx01_permission_level_permission.permission_level_id': '權限等級 ID（FK nx01_permission_level）',
  'nx01_permission_level_permission.permission_id': '權限 ID（FK nx01_permission）',
  'nx01_permission_level_view.permission_level_id': '權限等級 ID（FK nx01_permission_level）',
  'nx01_permission_level_view.view_id': '功能頁 ID（FK nx01_view）',
  'nx01_user_page_guide.user_id': '使用者 ID（FK nx01_user）',
  'nx01_import_batch.file_name': '匯入檔名', 'nx01_import_batch.total_rows': '總筆數',
  'nx01_import_batch.success_rows': '成功筆數', 'nx01_import_batch.failed_rows': '失敗筆數',
  'nx03_inbound.doc_no': '入庫單號', 'nx03_inbound.warehouse_id': '入庫倉庫 ID（FK nx01_warehouse）',
  'nx03_inbound.inbound_date': '入庫日期', 'nx03_inbound.status': '單據狀態', 'nx03_inbound.remark': '備註',
  'nx03_inbound.voided_at': '作廢時間', 'nx03_inbound.voided_by': '作廢人員（FK nx01_user）',
  'nx03_inbound.posted_at': '過帳時間', 'nx03_inbound.posted_by': '過帳人員（FK nx01_user）',
  'nx03_inbound_item.inbound_id': '入庫單 ID（FK nx03_inbound）', 'nx03_inbound_item.line_no': '行號',
  'nx03_inbound_item.part_id': '零件 ID（FK nx01_part）', 'nx03_inbound_item.part_no': '料號（快照）',
  'nx03_inbound_item.part_name': '品名（快照）', 'nx03_inbound_item.location_id': '儲位 ID（FK nx01_location）',
  'nx03_inbound_item.qty': '入庫數量', 'nx03_inbound_item.unit_cost': '單位成本',
  'nx03_inbound_item.line_amount': '行金額', 'nx03_inbound_item.remark': '備註',
  'nx03_outbound.doc_no': '出庫單號', 'nx03_outbound.warehouse_id': '出庫倉庫 ID（FK nx01_warehouse）',
  'nx03_outbound.outbound_date': '出庫日期', 'nx03_outbound.status': '單據狀態', 'nx03_outbound.remark': '備註',
  'nx03_outbound.voided_at': '作廢時間', 'nx03_outbound.voided_by': '作廢人員（FK nx01_user）',
  'nx03_outbound.shipped_at': '出貨時間', 'nx03_outbound.shipped_by': '出貨人員（FK nx01_user）',
  'nx03_outbound_item.outbound_id': '出庫單 ID（FK nx03_outbound）', 'nx03_outbound_item.line_no': '行號',
  'nx03_outbound_item.part_id': '零件 ID（FK nx01_part）', 'nx03_outbound_item.part_no': '料號（快照）',
  'nx03_outbound_item.part_name': '品名（快照）', 'nx03_outbound_item.location_id': '儲位 ID（FK nx01_location）',
  'nx03_outbound_item.qty': '出庫數量', 'nx03_outbound_item.unit_cost': '單位成本',
  'nx03_outbound_item.line_amount': '行金額', 'nx03_outbound_item.remark': '備註',
  'nx05_paylog_settlement.paylog_id': '收付款紀錄 ID（FK nx05_paylog）', 'nx05_paylog_settlement.remark': '備註',
  'nx05_ar_reminder_log.ar_id': '應收帳款 ID（FK nx05_ar_ledger）', 'nx05_ar_reminder_log.reminded_at': '催收時間',
  'nx05_ar_reminder_log.reminded_by': '催收人員（FK nx01_user）', 'nx05_ar_reminder_log.remark': '備註',
  'nx07_performance.user_id': '受評員工 ID（FK nx01_user）', 'nx07_performance.title': '績效項目標題',
  'nx07_performance.period_label': '考核期間標籤', 'nx07_performance.status': '狀態', 'nx07_performance.score': '分數',
  'nx07_performance.comment': '評語', 'nx07_performance.reviewer_user_id': '考核人員 ID（FK nx01_user）',
  'nx07_training.title': '訓練名稱', 'nx07_training.start_at': '開始時間', 'nx07_training.end_at': '結束時間',
  'nx07_training.location': '地點', 'nx07_training.status': '狀態',
  'nx07_employee_change.target_user_id': '異動對象員工 ID（FK nx01_user）', 'nx07_employee_change.change_type': '異動類型',
  'nx07_employee_change.new_role_id': '新角色 ID（FK nx01_role）', 'nx07_employee_change.new_department_id': '新部門 ID（FK nx01_department）',
  'nx07_employee_change.effective_date': '生效日', 'nx07_employee_change.remark': '備註', 'nx07_employee_change.status': '狀態',
  'nx01_part_compat_group_member.group_id': '相容群組 ID（FK nx01_part_compat_group）',
  'nx01_part_compat_group_member.part_id': '零件 ID（FK nx01_part）', 'nx01_part_compat_group_member.remark': '備註',
  'nx01_partner_contact.partner_id': '往來對象 ID（FK nx01_partner）', 'nx01_partner_contact.contact_name': '聯絡人姓名',
  'nx01_partner_contact.phone': '電話', 'nx01_partner_contact.phone_ext': '電話分機', 'nx01_partner_contact.mobile': '手機',
  'nx01_partner_contact.email': 'Email', 'nx01_partner_contact.note': '備註',
  'nx01_partner_address.partner_id': '往來對象 ID（FK nx01_partner）', 'nx01_partner_address.lane': '巷',
  'nx01_partner_address.alley': '弄', 'nx01_partner_address.building_no': '號', 'nx01_partner_address.building_sub_no': '號之附號',
  'nx01_partner_address.floor': '樓', 'nx01_partner_address.room_no': '室', 'nx01_partner_address.recipient_phone': '收件人電話',
  'nx01_partner_address.note': '備註',
  'nx01_part_version.name_snapshot': '品名快照', 'nx01_part_version.part_brand_id_snapshot': '品牌 ID 快照',
  'nx01_part_version.country_id_snapshot': '產地國 ID 快照', 'nx01_part_version.spec_snapshot': '規格快照',
  'nx01_part_version.price_a_snapshot': 'A 級價快照', 'nx01_part_version.price_b_snapshot': 'B 級價快照',
  'nx01_part_version.price_c_snapshot': 'C 級價快照', 'nx01_part_version.price_d_snapshot': 'D 級價快照',
};

const src = fs.readFileSync(SCHEMA, 'utf8');
const lines = src.split(/\r?\n/);

const models = [];
let cur = null;
let pending = []; // 累積的 /// 行

for (const raw of lines) {
  const t = raw.trim();

  const doc = t.match(/^\/\/\/\s?(.*)$/);
  if (doc) { pending.push(doc[1]); continue; }

  const mStart = t.match(/^model\s+(\w+)\s*\{/);
  if (mStart) {
    cur = { name: mStart[1], dbName: null, doc: pending.join('\n').trim(), fields: [] };
    models.push(cur);
    pending = [];
    continue;
  }

  if (cur) {
    if (t === '}') { cur = null; pending = []; continue; }
    const mmap = t.match(/^@@map\("([^"]+)"\)/);
    if (mmap) { cur.dbName = mmap[1]; pending = []; continue; }
    if (t.startsWith('@@')) { pending = []; continue; }

    const fm = t.match(/^(\w+)\s+([A-Za-z0-9_]+)(\[\])?(\?)?/);
    if (fm) {
      const [, fname, base, list] = fm;
      const isScalar = SCALARS.has(base) && !list;
      const cmap = t.match(/@map\("([^"]+)"\)/);
      cur.fields.push({ fname, col: cmap ? cmap[1] : fname, isScalar, doc: pending.join('\n').trim() });
      pending = [];
      continue;
    }
    pending = [];
  } else {
    pending = [];
  }
}

const esc = (s) => s.replace(/'/g, "''");

// 清洗表描述：濾掉 ===== 分隔線 banner 與「ModelName — DB table `xxx`」標題行，只留真描述
function cleanTableDoc(doc) {
  if (!doc) return '';
  return doc.split('\n').map((l) => l.trim())
    .filter((l) => l && !/^=+$/.test(l) && !/—\s*DB table\s*`/.test(l))
    .join(' ').replace(/\s+/g, ' ').trim();
}
// 清洗欄位描述：去掉尾巴「；啟用最低需求版本：XXX」的內部 metadata 噪音
function cleanColDoc(doc) {
  if (!doc) return '';
  return doc.replace(/；?\s*啟用最低需求版本[：:]\S*/g, '').replace(/\s+/g, ' ').trim();
}

const out = ['-- packages/db-core/sql/table-comments.sql'];
out.push('-- 自動產生：node packages/db-core/scripts/gen-table-comments.mjs（勿手改，改 schema.prisma 的 /// 後重跑）');
out.push('-- 內容：schema.prisma 的 /// 註解 → COMMENT ON TABLE/COLUMN；冪等、可重跑、本機/Railway 同套。');
out.push('');

let nTable = 0, nCol = 0;
const tablesNoDoc = [];
const colsNoDoc = [];

let nSupTable = 0, nSupCol = 0, nBoiler = 0;
for (const m of models) {
  if (!m.dbName) continue;
  out.push(`-- ${m.name}  →  ${m.dbName}`);
  const realDoc = cleanTableDoc(m.doc);
  const tableDoc = realDoc || TABLE_SUPPLEMENT[m.dbName];
  if (tableDoc) {
    out.push(`COMMENT ON TABLE "${m.dbName}" IS '${esc(tableDoc)}';`);
    realDoc ? nTable++ : nSupTable++;
  } else tablesNoDoc.push(`${m.name} (${m.dbName})`);

  for (const f of m.fields) {
    if (!f.isScalar) continue;
    const key = `${m.dbName}.${f.col}`;
    const realCol = cleanColDoc(f.doc);
    const colDoc = realCol || COL_SUPPLEMENT[key] || BOILERPLATE[f.col];
    if (colDoc) {
      out.push(`COMMENT ON COLUMN "${m.dbName}"."${f.col}" IS '${esc(colDoc)}';`);
      if (realCol) nCol++; else if (COL_SUPPLEMENT[key]) nSupCol++; else nBoiler++;
    } else colsNoDoc.push(key);
  }
  out.push('');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_SQL, out.join('\n'), 'utf8');

console.error(`✅ 產出：${OUT_SQL}`);
console.error(`   表註解：${nTable} 來自 schema + ${nSupTable} 補充 = ${nTable + nSupTable}/${models.length}`);
console.error(`   欄位註解：${nCol} 來自 schema + ${nSupCol} 業務補充 + ${nBoiler} 樣板補充 = ${nCol + nSupCol + nBoiler}`);
console.error(`   ⚠️ 仍缺表註解：${tablesNoDoc.length}   仍缺欄位註解：${colsNoDoc.length}`);
if (tablesNoDoc.length) { console.error('--- 仍缺表 ---'); console.error(tablesNoDoc.join('\n')); }
if (colsNoDoc.length) { console.error('--- 仍缺欄位 ---'); console.error(colsNoDoc.join('\n')); }
