// apps/nx-ui/src/features/user-zoned/helpers.ts
// v1.2 對齊軌 階段 E P4：user 共用 helper
//
// 對齊 v1.1 §2.3：4 zone basic / permission / security / hr(PRO)
// P4 階段策略（簡化版）：
// - basic 完整可編（userAccount/userName/email/phone）
// - permission：roles 衛星 P5、isActive 可編（即「停用帳號」）
// - security：mustChangePassword/failedLoginCount/lockedUntil 全 placeholder（DTO 尚不支援）
// - hr：全 placeholder（PRO 才啟用）

import {
  USER_FIELDS,
  type UserZone,
} from '@/features/master-zones';

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

/** 本軌可編欄位（DTO 已支援）的 keys */
export const BASIC_WRITABLE = new Set(['userAccount', 'userName', 'email', 'phone']);
export const PERMISSION_WRITABLE = new Set(['isActive']);

/** 後端 row → 編輯 draft（自動 mapping userAccount↔username / userName↔displayName） */
export function userRowToDraft(row: UserRow): UserDraft {
  const draft: UserDraft = {};
  for (const f of USER_FIELDS) {
    if (f.isSatellite) continue;
    const v = readUserRowField(row, f.key);
    if (
      f.key === 'isActive' ||
      f.key === 'isTenantOwner' ||
      f.key === 'mustChangePassword'
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
    else if (f.key === 'isTenantOwner' || f.key === 'mustChangePassword') draft[f.key] = false;
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
const DTO_SUPPORTED = new Set(['userAccount', 'userName', 'email', 'phone', 'isActive']);

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
    if (f.key === 'isActive') {
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
