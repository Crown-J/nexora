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
