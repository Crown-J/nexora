import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type UserDto = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  jobTitle: string | null;
  warehouseSummary: string | null;
  /** 舊版 API 相容（已改為多據點 summary 後可能仍短暫存在） */
  warehouseCode?: string | null;
  warehouseName?: string | null;
  // W3 [3-3] basic zone 7 欄位 + 02 對齊第二批 B 軌 5 欄位 + [3-2] legacyCode
  // 2026-06-18 補 Hana demo 欄位:英文姓名 + 兩階段驗證
  userNameEn?: string | null;
  twoFaEnabled?: boolean;
  gender?: string | null;
  birthday?: string | null;
  nationalId?: string | null;
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、改結構化兩組（戶籍 + 通訊）+ countryId
  countryId?: string | null;
  householdCityId?: string | null;
  householdDistrictId?: string | null;
  householdPostalCode?: string | null;
  householdDetail?: string | null;
  mailingCityId?: string | null;
  mailingDistrictId?: string | null;
  mailingPostalCode?: string | null;
  mailingDetail?: string | null;
  hireDate?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  // 2026-06-18 補 Hana demo 欄位:緊急聯絡人關係
  emergencyRelation?: string | null;
  highestEducation?: string | null;
  graduateSchool?: string | null;
  militaryService?: string | null;
  healthCheckDate?: string | null;
  healthCheckResult?: string | null;
  // 02 第三批 T1 2026-06-07：員工隸屬部門（解綁 PRO → LITE）
  departmentId?: string | null;
  // 02 第四批 軌 1 2026-06-07：主要據點 / 離職日期 / 大頭貼旗標
  primarySiteId?: string | null;
  leftAt?: string | null;
  /** 後端 hasPhoto = Boolean(photoStorageKey)、不外洩 storage key */
  hasPhoto?: boolean;
  legacyCode?: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByUsername: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedByName: string | null;
};

const BASE = '/nx01/users';

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export async function listUsers(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  /** 依 nx01_user_role（已生效指派）篩選：使用者須擁有其中任一角色 */
  primaryRoleIds?: string[];
  /** 2026-06-18 M 排序：欄位 + 方向（後端白名單守、非法欄位 400） */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<PagedResult<UserDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const pr =
    params.primaryRoleIds && params.primaryRoleIds.length > 0
      ? params.primaryRoleIds.map((x) => x.trim()).filter(Boolean).join(',')
      : undefined;
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    primaryRoleIds: pr,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_user_list');
  return normalizePaged<UserDto>(await res.json());
}

export async function getUser(id: string): Promise<UserDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_user_get');
  return res.json() as Promise<UserDto>;
}

/** 後端 CreateUserDto 與 UpdateUserDto 用 userAccount / userName 命名；
 *  client 對外保留 username / displayName（list/get response 用法），內部 transform。
 *  email / phone 為 null 或空字串時不送（後端 DTO 不接受 null）。
 *  W3 [3-1] 2026-06-06：username 改 optional（未填系統自動產 Y+4 碼）；
 *  W3 [3-2][3-3]：新增 7 basic 欄位 + legacyCode 透傳。 */
export type UserBasicWritable = {
  // 2026-06-18 補 Hana demo 欄位
  userNameEn?: string | null;
  twoFaEnabled?: boolean;
  gender?: string | null;
  birthday?: string | null;
  nationalId?: string | null;
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、改結構化兩組（戶籍 + 通訊）+ countryId
  countryId?: string | null;
  householdCityId?: string | null;
  householdDistrictId?: string | null;
  householdPostalCode?: string | null;
  householdDetail?: string | null;
  mailingCityId?: string | null;
  mailingDistrictId?: string | null;
  mailingPostalCode?: string | null;
  mailingDetail?: string | null;
  hireDate?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  // 2026-06-18 補 Hana demo 欄位:緊急聯絡人關係
  emergencyRelation?: string | null;
  highestEducation?: string | null;
  graduateSchool?: string | null;
  militaryService?: string | null;
  healthCheckDate?: string | null;
  healthCheckResult?: string | null;
  // 02 第三批 T1 2026-06-07：員工隸屬部門（解綁 PRO → LITE）
  departmentId?: string | null;
  // 02 第四批 軌 1 2026-06-07
  primarySiteId?: string | null;
  leftAt?: string | null;
  legacyCode?: string | null;
};

function writeBasicToApi(apiBody: Record<string, unknown>, body: Partial<UserBasicWritable>): void {
  // 2026-06-18 補 Hana demo 欄位
  if (body.userNameEn !== undefined) apiBody.userNameEn = body.userNameEn;
  if (body.twoFaEnabled !== undefined) apiBody.twoFaEnabled = body.twoFaEnabled;
  if (body.gender !== undefined) apiBody.gender = body.gender;
  if (body.birthday !== undefined) apiBody.birthday = body.birthday;
  if (body.nationalId !== undefined) apiBody.nationalId = body.nationalId;
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、改結構化兩組
  if (body.countryId !== undefined) apiBody.countryId = body.countryId;
  if (body.householdCityId !== undefined) apiBody.householdCityId = body.householdCityId;
  if (body.householdDistrictId !== undefined) apiBody.householdDistrictId = body.householdDistrictId;
  if (body.householdPostalCode !== undefined) apiBody.householdPostalCode = body.householdPostalCode;
  if (body.householdDetail !== undefined) apiBody.householdDetail = body.householdDetail;
  if (body.mailingCityId !== undefined) apiBody.mailingCityId = body.mailingCityId;
  if (body.mailingDistrictId !== undefined) apiBody.mailingDistrictId = body.mailingDistrictId;
  if (body.mailingPostalCode !== undefined) apiBody.mailingPostalCode = body.mailingPostalCode;
  if (body.mailingDetail !== undefined) apiBody.mailingDetail = body.mailingDetail;
  if (body.hireDate !== undefined) apiBody.hireDate = body.hireDate;
  if (body.emergencyContact !== undefined) apiBody.emergencyContact = body.emergencyContact;
  if (body.emergencyPhone !== undefined) apiBody.emergencyPhone = body.emergencyPhone;
  // 2026-06-18 補 Hana demo 欄位
  if (body.emergencyRelation !== undefined) apiBody.emergencyRelation = body.emergencyRelation;
  if (body.highestEducation !== undefined) apiBody.highestEducation = body.highestEducation;
  if (body.graduateSchool !== undefined) apiBody.graduateSchool = body.graduateSchool;
  if (body.militaryService !== undefined) apiBody.militaryService = body.militaryService;
  if (body.healthCheckDate !== undefined) apiBody.healthCheckDate = body.healthCheckDate;
  if (body.healthCheckResult !== undefined) apiBody.healthCheckResult = body.healthCheckResult;
  // 02 第三批 T1 2026-06-07：隸屬部門
  if (body.departmentId !== undefined) apiBody.departmentId = body.departmentId;
  // 02 第四批 軌 1 2026-06-07：主要據點 / 離職日期
  if (body.primarySiteId !== undefined) apiBody.primarySiteId = body.primarySiteId;
  if (body.leftAt !== undefined) apiBody.leftAt = body.leftAt;
  if (body.legacyCode !== undefined) apiBody.legacyCode = body.legacyCode;
}

export async function createUser(body: {
  /** W3 [3-1]：未填則後端 service 自動產 Y+4 碼 */
  username?: string;
  password: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
} & UserBasicWritable): Promise<UserDto> {
  const apiBody: Record<string, unknown> = {
    password: body.password,
    userName: body.displayName,
  };
  if (body.username != null && body.username !== '') apiBody.userAccount = body.username;
  if (body.email != null && body.email !== '') apiBody.email = body.email;
  if (body.phone != null && body.phone !== '') apiBody.phone = body.phone;
  if (body.isActive !== undefined) apiBody.isActive = body.isActive;
  writeBasicToApi(apiBody, body);
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(apiBody),
  });
  await assertOk(res, 'nxui_base_user_create');
  return res.json() as Promise<UserDto>;
}

export async function updateUser(
  id: string,
  body: {
    username?: string;
    password?: string;
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
    /** 2026-06-23：admin 重設密碼時帶 true、員工首次登入強制改 */
    mustChangePassword?: boolean;
  } & UserBasicWritable,
): Promise<UserDto> {
  const apiBody: Record<string, unknown> = {};
  if (body.username !== undefined) apiBody.userAccount = body.username;
  if (body.password !== undefined) apiBody.password = body.password;
  if (body.displayName !== undefined) apiBody.userName = body.displayName;
  if (body.email != null) apiBody.email = body.email;
  if (body.phone != null) apiBody.phone = body.phone;
  if (body.isActive !== undefined) apiBody.isActive = body.isActive;
  if (body.mustChangePassword !== undefined) apiBody.mustChangePassword = body.mustChangePassword;
  writeBasicToApi(apiBody, body);
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(apiBody),
  });
  await assertOk(res, 'nxui_base_user_update');
  return res.json() as Promise<UserDto>;
}

export async function setUserActive(id: string, isActive: boolean): Promise<UserDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_base_user_set_active');
  return res.json() as Promise<UserDto>;
}
