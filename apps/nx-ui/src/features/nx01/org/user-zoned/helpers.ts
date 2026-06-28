// apps/nx-ui/src/features/nx01/org/user-zoned/helpers.ts
// 2026-06-18 對齊 Hana demo CFG.emp 4 tabs：basic / education / orgPosition / account
//   + hr (PRO) 保留
//
// 可編欄位策略：合併成單一 FIELD_WRITABLE Set、跨 zone 統一判斷

import {
  USER_FIELDS,
  type UserZone,
} from '@/features/nx01/shell/zones';

export type UserDraft = Record<string, string | boolean>;

/**
 * UserDto 既有命名差異：username / displayName ≠ schema userAccount / userName
 * 本 helpers 把 zone key 對映回 UserDto 命名以共用既有 API client
 */
export type UserRow = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  // 未在 DTO、但 row 可能含
  isTenantOwner?: boolean;
  mustChangePassword?: boolean;
  failedLoginCount?: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  createdByUsername?: string | null;
  createdByName?: string | null;
  updatedAt?: string;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
};

/** zone key → UserDto row key 對映表（user-zones.ts P1 用 schema 命名、UserDto 用 username/displayName） */
const ZONE_KEY_TO_ROW_KEY: Record<string, string> = {
  userAccount: 'username',
  userName: 'displayName',
};
/** zone key → DTO body key 對映表 */
const ZONE_KEY_TO_BODY_KEY: Record<string, string> = {
  userAccount: 'username',
  userName: 'displayName',
};

function readUserRowField(row: UserRow, zoneKey: string): unknown {
  const r = row as unknown as Record<string, unknown>;
  const mapped = ZONE_KEY_TO_ROW_KEY[zoneKey] ?? zoneKey;
  return r[mapped];
}

/** 跨 5 zone 統一的可編欄位 Set（DTO 已支援的 keys）
 *  2026-06-18 重整：原 BASIC_WRITABLE + PERMISSION_WRITABLE 合併、
 *  欄位 zone 已依 demo 重分布（學歷 → education、到職/離職/啟用 → account、部門/據點 → orgPosition） */
export const FIELD_WRITABLE = new Set([
  // basic 基本資料
  'userAccount',
  'userName',
  'userNameEn',
  'email',
  'phone',
  'gender',
  'birthday',
  'nationalId',
  'countryId',
  'householdCityId',
  'householdDistrictId',
  'householdPostalCode',
  'householdDetail',
  'mailingCityId',
  'mailingDistrictId',
  'mailingPostalCode',
  'mailingDetail',
  'emergencyContact',
  'emergencyRelation',
  'emergencyPhone',
  'legacyCode',
  // education 教育程度
  'highestEducation',
  'graduateSchool',
  'militaryService',
  'healthCheckDate',
  'healthCheckResult',
  // orgPosition 職務部門
  'departmentId',
  'permissionLevelId',
  'primarySiteId',
  // account 帳號狀況
  'hireDate',
  'leftAt',
  'twoFaEnabled',
  'isActive',
]);

/** 後端 row → 編輯 draft（自動 mapping userAccount↔username / userName↔displayName） */
export function userRowToDraft(row: UserRow): UserDraft {
  const draft: UserDraft = {};
  for (const f of USER_FIELDS) {
    if (f.isSatellite) continue;
    const v = readUserRowField(row, f.key);
    if (
      f.key === 'isActive' ||
      f.key === 'isTenantOwner' ||
      f.key === 'mustChangePassword' ||
      f.key === 'twoFaEnabled'
    ) {
      draft[f.key] = Boolean(v);
    } else draft[f.key] = v == null ? '' : String(v);
  }
  return draft;
}

/** 空 draft（新增用） */
export function emptyUserDraft(): UserDraft {
  const draft: UserDraft = {};
  for (const f of USER_FIELDS) {
    if (f.isSatellite) continue;
    if (f.key === 'isActive') draft[f.key] = true;
    else if (
      f.key === 'isTenantOwner' ||
      f.key === 'mustChangePassword' ||
      f.key === 'twoFaEnabled'
    ) draft[f.key] = false;
    else draft[f.key] = '';
  }
  return draft;
}

/**
 * draft → PATCH body
 * - 只送 DTO 已支援的欄位（basic 4 個 + isActive）
 * - editableZones 過濾後再交叉「DTO 支援」白名單
 * - 員工編號制改造（2026-06-02）：userAccount 編輯模式可送（UpdateUserDto 已支援）
 */
const DTO_SUPPORTED = new Set([
  'userAccount',
  'userName',
  'userNameEn',
  'email',
  'phone',
  'isActive',
  'gender',
  'birthday',
  'nationalId',
  'countryId',
  'householdCityId',
  'householdDistrictId',
  'householdPostalCode',
  'householdDetail',
  'mailingCityId',
  'mailingDistrictId',
  'mailingPostalCode',
  'mailingDetail',
  'hireDate',
  'emergencyContact',
  'emergencyRelation',
  'emergencyPhone',
  'highestEducation',
  'graduateSchool',
  'militaryService',
  'healthCheckDate',
  'healthCheckResult',
  'departmentId',
  'primarySiteId',
  'leftAt',
  'legacyCode',
  'twoFaEnabled',
]);

export function userDraftToBody(
  draft: UserDraft,
  editableZones: Set<UserZone> | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: { isCreate: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of USER_FIELDS) {
    if (f.isSatellite) continue;
    if (!DTO_SUPPORTED.has(f.key)) continue; // security/hr 暫不送
    if (editableZones && !editableZones.has(f.zone)) continue;
    const v = draft[f.key];
    if (f.key === 'isActive' || f.key === 'twoFaEnabled') {
      body[f.key] = Boolean(v);
      continue;
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '' && !f.required) continue;
      const bodyKey = ZONE_KEY_TO_BODY_KEY[f.key] ?? f.key;
      body[bodyKey] = trimmed;
    }
  }
  return body;
}
