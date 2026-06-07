// apps/nx-ui/src/features/master-zones/types.ts
// v1.2 對齊軌 階段 E P1：主檔分區框架共用型別
//
// 對齊 v1.2 §11 + intent v1.1：
// - zone 是「同一份主檔資料、在不同地方看到不同欄位」的歸屬
// - 各模組頁面 render 某一個 zone、主檔中心 render 全部 zones
// - v1.1：本軌不在 service 層做欄位過濾、純前端 render decisions

/// 模組頁面與 zone 的對應方向
/// - 'module-view'：模組頁、只 render 該頁分區的欄位
/// - 'master-full'：主檔中心、render 全部分區
export type ZoneRenderContext = 'module-view' | 'master-full';

/// 版本門檻（對齊 master-cards.ts MasterHubMinPlan、版本只差功能廣度）
/// - 'LITE'（預設、未指定 = LITE）：所有版本皆顯示
/// - 'PLUS'：LITE 版隱藏；PLUS / PRO 顯示
/// - 'PRO'：LITE / PLUS 版隱藏；PRO 顯示
export type PlanTier = 'LITE' | 'PLUS' | 'PRO';

/// Zone 定義（label / 描述等元資料）
export interface ZoneDef<Z extends string> {
  zone: Z;
  /// 中文顯示名
  label: string;
  /// 區的用途描述
  description?: string;
}

/// 欄位定義（field 與 zone 的對應）
export interface FieldDef<Z extends string> {
  /// 欄位 key（camelCase、對應 API 回傳的物件鍵）
  key: string;
  /// 中文顯示名
  label: string;
  /// 所屬 zone
  zone: Z;
  /// 是否必填
  required?: boolean;
  /// 是否走衛星表 / 子表（rendering 時跳到對應 sub-form）
  isSatellite?: boolean;
  /// 補充說明（給開發 / 表單渲染參考、可空）
  notes?: string;
  /// 衛星表名稱（isSatellite=true 時填、給 UI 知道用哪個 sub-component）
  satelliteName?: string;
  /// 版本門檻；02 第四批 軌 3a 2026-06-07 新增。
  /// 不指定 = 全版本顯示；指定 PLUS / PRO = 低於該版本的租戶 UI 隱藏（資料結構保留、API 仍可寫）。
  minPlan?: PlanTier;
}

/// 版本層級數字（純內部排序、由低至高）
const PLAN_RANK: Record<PlanTier, number> = { LITE: 0, PLUS: 1, PRO: 2 };

/// 將任意 planCode 字串收斂為 PlanTier（對齊 master-cards.ts normalizePlanCode）
export function normalizePlanTier(raw: string | null | undefined): PlanTier {
  const p = (raw ?? '').trim().toUpperCase().replace(/^NEXORA-/, '');
  if (p === 'PRO' || p === 'ENTERPRISE') return 'PRO';
  if (p === 'PLUS') return 'PLUS';
  return 'LITE';
}

/// 判定欄位是否在目前版本可見
export function isFieldVisibleAtPlan<Z extends string>(
  field: FieldDef<Z>,
  currentPlan: PlanTier,
): boolean {
  const required = field.minPlan ?? 'LITE';
  return PLAN_RANK[currentPlan] >= PLAN_RANK[required];
}

/// 對某個 zone 過濾欄位
export function fieldsInZone<Z extends string>(
  fields: FieldDef<Z>[],
  zone: Z,
): FieldDef<Z>[] {
  return fields.filter((f) => f.zone === zone);
}

/// 對多個 zones 過濾欄位、保留 fields 原順序
export function fieldsInZones<Z extends string>(
  fields: FieldDef<Z>[],
  zones: Iterable<Z>,
): FieldDef<Z>[] {
  const visible = new Set(zones);
  return fields.filter((f) => visible.has(f.zone));
}
