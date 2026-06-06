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
  // W3 [3-1] 員工編號 = 登入帳號（Crown 拍板）；新增時未填→系統自動產 Y0001、可手動覆寫
  { key: 'userAccount', label: '員工編號', zone: 'basic', notes: '= 登入帳號、未填系統自動產 Y+4 碼、可手動覆寫' },
  { key: 'userName', label: '姓名', zone: 'basic', required: true },
  { key: 'email', label: '聯絡信箱', zone: 'basic', notes: '通知 / 重設密碼用、非登入帳號' },
  { key: 'phone', label: '電話', zone: 'basic' },
  // W3 [3-3] basic zone 補 7 欄位（NX-MANUAL-02 v2.0 §4.1）
  { key: 'gender', label: '性別', zone: 'basic', notes: 'M=男 / F=女 / O=其他' },
  { key: 'birthday', label: '生日', zone: 'basic', notes: 'YYYY-MM-DD' },
  { key: 'nationalId', label: '身分證字號', zone: 'basic' },
  { key: 'address', label: '通訊地址', zone: 'basic' },
  { key: 'hireDate', label: '到職日期', zone: 'basic', notes: 'YYYY-MM-DD' },
  { key: 'emergencyContact', label: '緊急聯絡人', zone: 'basic' },
  { key: 'emergencyPhone', label: '緊急聯絡電話', zone: 'basic' },
  // 02 對齊第二批 B 軌：basic zone 補 5 欄位
  { key: 'highestEducation', label: '最高學歷', zone: 'basic', notes: '高中 / 專科 / 大學 / 碩士 / 博士 等' },
  { key: 'graduateSchool', label: '畢業學校', zone: 'basic' },
  { key: 'militaryService', label: '服兵役', zone: 'basic', notes: '已服 / 未服 / 免役 / 替代役 / 服役中 等' },
  { key: 'healthCheckDate', label: '體檢日期', zone: 'basic', notes: 'YYYY-MM-DD' },
  { key: 'healthCheckResult', label: '體檢結果', zone: 'basic', notes: '合格 / 不合格 / 複檢 / 未體檢 等' },
  // W3 [3-2] 舊代號（純對照、不綁 FK）
  { key: 'legacyCode', label: '舊代號', zone: 'basic', notes: '舊系統員工編號、純對照不綁 FK' },

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
