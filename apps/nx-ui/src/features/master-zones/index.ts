// apps/nx-ui/src/features/master-zones/index.ts
// v1.2 對齊軌 階段 E P1：主檔分區框架 barrel

export type {
  FieldDef,
  PlanTier,
  ZoneDef,
  ZoneRenderContext,
} from './types';
export {
  fieldsInZone,
  fieldsInZones,
  isFieldVisibleAtPlan,
  normalizePlanTier,
} from './types';

export type { PartnerZone } from './partner-zones';
export {
  PARTNER_FIELDS,
  PARTNER_ZONES,
  visibleZonesByPartnerType,
} from './partner-zones';

export type { PartZone } from './part-zones';
export { PART_FIELDS, PART_ZONES } from './part-zones';

export type { WarehouseZone } from './warehouse-zones';
export {
  DELIVERY_VIEW_FIELD_KEYS,
  WAREHOUSE_FIELDS,
  WAREHOUSE_ZONES,
} from './warehouse-zones';

export type { UserZone } from './user-zones';
export { USER_FIELDS, USER_ZONES } from './user-zones';
