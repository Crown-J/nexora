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
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、改結構化兩組
  { key: 'countryId', label: '國別', zone: 'basic', notes: '空白=台灣（走字典）；非台灣=國外自由填' },
  { key: 'householdCityId', label: '戶籍-縣市', zone: 'basic' },
  { key: 'householdDistrictId', label: '戶籍-鄉鎮', zone: 'basic' },
  { key: 'householdPostalCode', label: '戶籍-郵遞區號', zone: 'basic', notes: '台灣選鄉鎮自動帶；國外手填' },
  { key: 'householdDetail', label: '戶籍-地址明細', zone: 'basic', notes: '路/巷/弄/號/樓/室（國外時整段地址放這）' },
  { key: 'mailingCityId', label: '通訊-縣市', zone: 'basic' },
  { key: 'mailingDistrictId', label: '通訊-鄉鎮', zone: 'basic' },
  { key: 'mailingPostalCode', label: '通訊-郵遞區號', zone: 'basic' },
  { key: 'mailingDetail', label: '通訊-地址明細', zone: 'basic' },
  { key: 'hireDate', label: '到職日期', zone: 'basic', notes: 'YYYY-MM-DD' },
  // 02 第四批 軌 1 2026-06-07：離職日期（留空=在職、不刪資料）
  { key: 'leftAt', label: '離職日期', zone: 'basic', notes: '留空=在職、有值=已離職、資料保留' },
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
  // 02 第四批 軌 1 2026-06-07：隸屬據點 forward ref（A 拍板、與 user_warehouse 多倉衛星並存）
  // 02 結案 2026-06-07：label 由「主要據點」改「隸屬據點」對齊手冊用詞
  { key: 'primarySiteId', label: '隸屬據點', zone: 'permission', notes: '單值、一人一個；多倉存取走「使用者據點設定」批次工具' },

  // ─── security 安全區（負責人 admin 看）───
  { key: 'mustChangePassword', label: '強制改密', zone: 'security', notes: '首次登入 true' },
  { key: 'failedLoginCount', label: '登入失敗次數', zone: 'security' },
  { key: 'lockedUntil', label: '鎖定至', zone: 'security' },
  { key: 'lastLoginAt', label: '最後登入時間', zone: 'security' },

  // ─── hr 人資區（PRO）───
  { key: 'employeeId', label: '員工主檔', zone: 'hr', notes: 'PRO 才啟用' },
  { key: 'roleId', label: '人資主檔職務角色', zone: 'hr', notes: 'PRO、與 user_role 並存' },
  // 02 第三批 T1 2026-06-07：解綁 PRO → 移到 basic zone（總經理拍板：組織欄位各版本都能用）
  { key: 'departmentId', label: '部門', zone: 'basic', notes: '隸屬部門、LITE 起可編' },
  // 05 批 T2 2026-06-07：teams 衛星從 hr/PRO 解綁、移到 permission zone（與職務並列、LITE 起可用）
  // 業務語意：員工歸屬組（多筆、可標主組 + 組長 isLeader）；影響 NX01-08 公告對象、員工部門自動帶（T3 動）。
  {
    key: 'teams',
    label: '隸屬組（可多筆）',
    zone: 'permission',
    isSatellite: true,
    satelliteName: 'nx01_user_team',
    notes: 'm-n、主組決定員工部門、isLeader 標組長（影響公告對象）',
  },
];
