// apps/nx-ui/src/features/nx01/shell/zones/user-zones.ts
// 2026-06-23 執行長拍板：合併全分頁、移除 hr 分頁（PRO 模組目前用不到）
// 原 4 zones（basic/education/orgPosition/account）保留作為單頁長表的 section 分組
//
// Demo 對映（docs/專案/介面規格/ERP SYSTEM TEST/nx-page-configs.js line 30-104）：
//   section 1 基本資料  → basic       編號 / 姓名 / 個資 / 聯絡 / 地址 / 緊急聯絡
//   section 2 教育程度  → education   學歷 / 學校 / 兵役 / 體檢
//   section 3 職務部門  → orgPosition 部門 / 組 / 職務 / 據點 / 負責人
//   section 4 帳號狀況  → account     在職 / 帳號安全 / 啟用
//
// ⚠️ 對齊 v1.1：本檔不寫死任何角色名（OWNER 等是系統內建角色 code）
//    isTenantOwner 是 flag、不是角色名

import type { FieldDef, ZoneDef } from '@data/types/master-zones';

export type UserZone = 'basic' | 'education' | 'orgPosition' | 'account';

export const USER_ZONES: ZoneDef<UserZone>[] = [
  { zone: 'basic', label: '基本資料', description: '編號 / 姓名 / 個人資料 / 聯絡 / 地址 / 緊急聯絡' },
  { zone: 'education', label: '教育程度', description: '學歷 / 學校 / 兵役 / 體檢' },
  { zone: 'orgPosition', label: '職務部門', description: '部門 / 組 / 職務 / 據點 / 負責人' },
  { zone: 'account', label: '帳號狀況', description: '在職 / 帳號安全 / 啟用' },
];

/** 2026-06-23 執行長拍板：sub-section header（編號/姓名/個資...）拿掉、太占空間。
 *  保留 export 空物件、UserFormZoned 仍會檢查但永遠不會 push header item。 */
export const USER_FIELD_SECTIONS: Record<string, string> = {};

export const USER_FIELDS: FieldDef<UserZone>[] = [
  // ─── basic 基本資料區（編號 / 姓名 / 個資 / 聯絡 / 地址 / 緊急聯絡）───
  // W3 [3-1] 員工編號 = 登入帳號（Crown 拍板）；新增時未填→系統自動產 Y0001、可手動覆寫
  { key: 'userAccount', label: '員工編號', zone: 'basic', notes: '= 登入帳號、未填系統自動產 Y+4 碼、可手動覆寫' },
  // W3 [3-2] 舊代號（純對照、不綁 FK）
  { key: 'legacyCode', label: '舊系統員工編號', zone: 'basic', notes: '資料轉移對照用、純對照不綁 FK' },
  // 姓名
  { key: 'userName', label: '中文姓名', zone: 'basic', required: true },
  { key: 'userNameEn', label: '英文姓名', zone: 'basic', notes: '選填、外籍員工或顯示用' },
  // 個人資料
  { key: 'gender', label: '性別', zone: 'basic', notes: 'M=男 / F=女 / O=其他' },
  { key: 'birthday', label: '生日', zone: 'basic', notes: 'YYYY-MM-DD' },
  { key: 'nationalId', label: '身分證字號', zone: 'basic' },
  { key: 'countryId', label: '國籍', zone: 'basic', notes: '空白=台灣（走字典）；非台灣=國外自由填' },
  // 聯絡方式
  { key: 'email', label: 'Email', zone: 'basic', notes: '通知 / 重設密碼用、非登入帳號' },
  { key: 'phone', label: '電話', zone: 'basic' },
  // 地址 9 欄（UserAddressSection 統一渲染）
  { key: 'householdCityId', label: '戶籍-縣市', zone: 'basic' },
  { key: 'householdDistrictId', label: '戶籍-鄉鎮', zone: 'basic' },
  { key: 'householdPostalCode', label: '戶籍-郵遞區號', zone: 'basic', notes: '台灣選鄉鎮自動帶；國外手填' },
  { key: 'householdDetail', label: '戶籍-地址明細', zone: 'basic', notes: '路/巷/弄/號/樓/室（國外時整段地址放這）' },
  { key: 'mailingCityId', label: '通訊-縣市', zone: 'basic' },
  { key: 'mailingDistrictId', label: '通訊-鄉鎮', zone: 'basic' },
  { key: 'mailingPostalCode', label: '通訊-郵遞區號', zone: 'basic' },
  { key: 'mailingDetail', label: '通訊-地址明細', zone: 'basic' },
  // 緊急聯絡
  { key: 'emergencyContact', label: '緊急聯絡人姓名', zone: 'basic' },
  { key: 'emergencyRelation', label: '緊急聯絡人關係', zone: 'basic', notes: '父/母/配偶/兄弟姊妹/朋友 等' },
  { key: 'emergencyPhone', label: '緊急聯絡人電話', zone: 'basic' },

  // ─── education 教育程度區 ───
  { key: 'highestEducation', label: '最高學歷', zone: 'education', notes: '高中 / 專科 / 大學 / 碩士 / 博士 等' },
  { key: 'graduateSchool', label: '畢業學校', zone: 'education' },
  { key: 'militaryService', label: '兵役狀況', zone: 'education', notes: '已服 / 未服 / 免役 / 替代役 / 服役中 等' },
  { key: 'healthCheckDate', label: '體檢日期', zone: 'education', notes: 'YYYY-MM-DD' },
  { key: 'healthCheckResult', label: '體檢結果', zone: 'education', notes: '合格 / 不合格 / 複檢 / 未體檢' },

  // ─── orgPosition 職務部門區 ───
  // 部門：有主組則 readonly 自動帶（主組決定部門）、無主組則 fallback editable
  { key: 'departmentId', label: '部門', zone: 'orgPosition', notes: '由主組往上推導、無主組時可 fallback 手動設' },
  // 隸屬組（衛星 m-n、主組決定員工部門、isLeader 標組長）
  {
    key: 'teams',
    label: '隸屬組（可多筆）',
    zone: 'orgPosition',
    isSatellite: true,
    satelliteName: 'nx01_user_team',
    notes: 'm-n、主組決定員工部門、isLeader 標組長（影響公告對象）',
  },
  // 職務（衛星 m-n、isPrimary 標主要職務）
  {
    key: 'roles',
    label: '職務（可多筆）',
    zone: 'orgPosition',
    isSatellite: true,
    satelliteName: 'nx01_user_role',
    notes: '客戶自訂角色 m-n、isPrimary 標主要角色',
  },
  // 據點
  { key: 'primarySiteId', label: '隸屬據點', zone: 'orgPosition', notes: '單值、一人一個；多倉存取走「使用者據點設定」批次工具' },
  // 負責人旗標
  { key: 'isTenantOwner', label: '是否負責人', zone: 'orgPosition', notes: '系統內建旗標、非客戶自訂角色' },

  // ─── account 帳號狀況區 ───
  { key: 'hireDate', label: '到職日', zone: 'account', notes: '供年資計算、YYYY-MM-DD' },
  { key: 'leftAt', label: '離職日期', zone: 'account', notes: '留空=在職、有值=已離職、資料保留、建議一併停用以釋出席次' },
  { key: 'mustChangePassword', label: '強制改密', zone: 'account', notes: '首次登入 true' },
  { key: 'twoFaEnabled', label: '兩階段驗證', zone: 'account', notes: '開啟登入需 OTP' },
  { key: 'lastLoginAt', label: '最近登入時間', zone: 'account' },
  { key: 'failedLoginCount', label: '登入失敗次數', zone: 'account' },
  { key: 'lockedUntil', label: '鎖定至', zone: 'account' },
  { key: 'isActive', label: '是否啟用', zone: 'account', notes: '啟用後才能登入、受席次上限管控' },
];
