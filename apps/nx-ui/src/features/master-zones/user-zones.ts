// apps/nx-ui/src/features/master-zones/user-zones.ts
// v1.2 對齊軌 階段 E P1：user 分區定義
//
// 對齊 intent v1.1 §2.3：
// - 4 zone：basic / permission / security / hr
// - security zone 給負責人 admin 看（員工自己不看自己的失敗登入次數）
// - hr zone 是 PRO 才啟用
//
// ⚠️ 對齊 v1.1：本檔不寫死任何角色名（OWNER 等是系統內建角色 code、非客戶自訂角色）
//    isTenantOwner 是 flag、不是角色名

import type { FieldDef, ZoneDef } from './types';

export type UserZone = 'basic' | 'permission' | 'security' | 'hr';

export const USER_ZONES: ZoneDef<UserZone>[] = [
  { zone: 'basic', label: '基本資料', description: '登入帳號 / 姓名 / 聯絡' },
  { zone: 'permission', label: '權限', description: '角色掛載 / 負責人旗標' },
  { zone: 'security', label: '安全', description: '強制改密 / 登入失敗 / 鎖定狀態' },
  { zone: 'hr', label: '人資（PRO）', description: '員工主檔關聯 / 部門 / 團隊' },
];

export const USER_FIELDS: FieldDef<UserZone>[] = [
  // ─── basic 基本資料區 ───
  { key: 'userAccount', label: '登入帳號', zone: 'basic', required: true, notes: 'unique per system' },
  { key: 'userName', label: '姓名', zone: 'basic', required: true },
  { key: 'email', label: 'Email', zone: 'basic', notes: '通知 / 重設密碼用' },
  { key: 'phone', label: '電話', zone: 'basic' },

  // ─── permission 權限區 ───
  {
    key: 'roles',
    label: '角色掛載（可多筆）',
    zone: 'permission',
    isSatellite: true,
    satelliteName: 'nx01_user_role',
    notes: '客戶自訂角色 m-n、isPrimary 標主要角色',
  },
  { key: 'isTenantOwner', label: '是否負責人', zone: 'permission', notes: '系統內建旗標、非客戶自訂角色' },
  { key: 'isActive', label: '帳號啟用', zone: 'permission' },

  // ─── security 安全區（負責人 admin 看）───
  { key: 'mustChangePassword', label: '強制改密', zone: 'security', notes: '首次登入 true' },
  { key: 'failedLoginCount', label: '登入失敗次數', zone: 'security' },
  { key: 'lockedUntil', label: '鎖定至', zone: 'security' },
  { key: 'lastLoginAt', label: '最後登入時間', zone: 'security' },

  // ─── hr 人資區（PRO）───
  { key: 'employeeId', label: '員工主檔', zone: 'hr', notes: 'PRO 才啟用' },
  { key: 'roleId', label: '人資主檔職務角色', zone: 'hr', notes: 'PRO、與 user_role 並存' },
  { key: 'departmentId', label: '部門', zone: 'hr', notes: 'PRO' },
  {
    key: 'teams',
    label: '團隊（可多筆）',
    zone: 'hr',
    isSatellite: true,
    satelliteName: 'nx01_user_team',
    notes: 'PRO',
  },
];
