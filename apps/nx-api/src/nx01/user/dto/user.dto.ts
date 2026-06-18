import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

function csvToIdList(value: unknown): string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value
      .flatMap((v) => String(v).split(','))
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  const s = String(value).trim();
  if (!s) return undefined;
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
}

/** 列表查詢：繼承共用分頁／search／isActive，並支援依「已指派角色」篩選（OR，nx01_user_role） */
export class ListUserQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @Transform(({ value }) => csvToIdList(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(15, { each: true })
  primaryRoleIds?: string[];
}

/**
 * W3 [3-1] 2026-06-06：員工編號 Y + 4 碼制（Crown 拍板 employeeNo = userAccount = 登入帳號）
 *   - userAccount 未填 → service create 自動取下一個 Y 編號
 *   - userAccount 已填 → 直接用（手動覆寫）；若 Y\d{4} 格式且 ≥ counter.next_no 自動跳號防衝突
 *   - 不強制 Y 格式（彈性、給系統帳號 / 資料匯入用）
 *
 * W3 [3-3]：basic zone 補 7 欄位（性別 / 生日 / 身分證 / 地址 / 到職 / 緊急聯絡 / 緊急電話）
 * W3 [3-2]：加 legacyCode（舊系統員工編號、純對照）
 */
export class CreateUserDto {
  /** 員工編號（= 登入帳號）。未填則自動產生 Y + 4 碼 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  userAccount?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userName!: string;

  // 2026-06-18 補 Hana demo 欄位:英文姓名（外籍員工或顯示用）
  @IsOptional() @IsString() @MaxLength(100) userNameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  // ── W3 [3-3] basic zone 7 欄位 ────────────────────────────
  @IsOptional() @IsString() @IsIn(['M', 'F', 'O']) gender?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsString() @MaxLength(20) nationalId?: string;
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、改結構化兩組（戶籍 + 通訊）+ countryId
  @IsOptional() @IsString() @MaxLength(15) countryId?: string;
  @IsOptional() @IsString() @MaxLength(15) householdCityId?: string;
  @IsOptional() @IsString() @MaxLength(15) householdDistrictId?: string;
  @IsOptional() @IsString() @MaxLength(10) householdPostalCode?: string;
  @IsOptional() @IsString() @MaxLength(200) householdDetail?: string;
  @IsOptional() @IsString() @MaxLength(15) mailingCityId?: string;
  @IsOptional() @IsString() @MaxLength(15) mailingDistrictId?: string;
  @IsOptional() @IsString() @MaxLength(10) mailingPostalCode?: string;
  @IsOptional() @IsString() @MaxLength(200) mailingDetail?: string;
  @IsOptional() @IsDateString() hireDate?: string;
  @IsOptional() @IsString() @MaxLength(50) emergencyContact?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyPhone?: string;
  // 2026-06-18 補 Hana demo 欄位:緊急聯絡人關係（父/母/配偶 等）
  @IsOptional() @IsString() @MaxLength(20) emergencyRelation?: string;

  // ── 02 對齊第二批 B 軌：basic zone 補 5 欄位 ──────────────────
  @IsOptional() @IsString() @MaxLength(20) highestEducation?: string;
  @IsOptional() @IsString() @MaxLength(100) graduateSchool?: string;
  @IsOptional() @IsString() @MaxLength(20) militaryService?: string;
  @IsOptional() @IsDateString() healthCheckDate?: string;
  @IsOptional() @IsString() @MaxLength(20) healthCheckResult?: string;

  // ── 02 第三批 T1 2026-06-07：員工隸屬部門（解綁 PRO → LITE） ──
  @IsOptional() @IsString() @MaxLength(15) departmentId?: string;

  // ── 02 第四批 軌 1 2026-06-07：主要據點（forward 視角、單值 ref、A 拍板） ──
  @IsOptional() @IsString() @MaxLength(15) primarySiteId?: string;

  // ── 02 第四批 軌 1 2026-06-07：離職日期（留空=在職、不刪資料） ──
  @IsOptional() @IsDateString() leftAt?: string;

  // ── W3 [3-2] 舊系統員工編號（純對照）──────────────────────
  @IsOptional() @IsString() @MaxLength(50) legacyCode?: string;

  // 2026-06-18 補 Hana demo 欄位:兩階段驗證開關（security zone）
  @IsOptional() @Type(() => Boolean) @IsBoolean() twoFaEnabled?: boolean;
}

/**
 * 席次制：批次啟用員工（精靈第二步 + 主檔批次操作共用）
 * - 已 isActive=true 的成員忽略（不算 delta）
 * - 後端會檢查（current active + delta）≤ subscription.seats、超過擋 SE-001
 */
export class BulkActivateUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(15, { each: true })
  userIds!: string[];
}

export class UpdateUserDto {
  /**
   * 員編可改（2026-06-02 員工編號制改造）：
   * - userAccount = 登入帳號 = 員工編號（自由輸入、租戶內唯一）
   * - 改完後該員工下次登入要用新帳號
   * - 內碼 id 不變、所有業務資料 / 角色 / 稽核紀錄 / FK 關聯完全保留
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userAccount?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userName?: string;

  // 2026-06-18 補 Hana demo 欄位:英文姓名
  @IsOptional() @IsString() @MaxLength(100) userNameEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  // ── W3 [3-3] basic zone 7 欄位 ────────────────────────────
  @IsOptional() @IsString() @IsIn(['M', 'F', 'O']) gender?: string | null;
  @IsOptional() @IsDateString() birthday?: string | null;
  @IsOptional() @IsString() @MaxLength(20) nationalId?: string | null;
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、改結構化兩組 + countryId
  @IsOptional() @IsString() @MaxLength(15) countryId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) householdCityId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) householdDistrictId?: string | null;
  @IsOptional() @IsString() @MaxLength(10) householdPostalCode?: string | null;
  @IsOptional() @IsString() @MaxLength(200) householdDetail?: string | null;
  @IsOptional() @IsString() @MaxLength(15) mailingCityId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) mailingDistrictId?: string | null;
  @IsOptional() @IsString() @MaxLength(10) mailingPostalCode?: string | null;
  @IsOptional() @IsString() @MaxLength(200) mailingDetail?: string | null;
  @IsOptional() @IsDateString() hireDate?: string | null;
  @IsOptional() @IsString() @MaxLength(50) emergencyContact?: string | null;
  @IsOptional() @IsString() @MaxLength(30) emergencyPhone?: string | null;
  // 2026-06-18 補 Hana demo 欄位:緊急聯絡人關係
  @IsOptional() @IsString() @MaxLength(20) emergencyRelation?: string | null;

  // ── 02 對齊第二批 B 軌：basic zone 補 5 欄位 ──────────────────
  @IsOptional() @IsString() @MaxLength(20) highestEducation?: string | null;
  @IsOptional() @IsString() @MaxLength(100) graduateSchool?: string | null;
  @IsOptional() @IsString() @MaxLength(20) militaryService?: string | null;
  @IsOptional() @IsDateString() healthCheckDate?: string | null;
  @IsOptional() @IsString() @MaxLength(20) healthCheckResult?: string | null;

  // ── 02 第三批 T1 2026-06-07：員工隸屬部門（解綁 LITE） ──
  @IsOptional() @IsString() @MaxLength(15) departmentId?: string | null;

  // ── 02 第四批 軌 1 2026-06-07：主要據點 ──
  @IsOptional() @IsString() @MaxLength(15) primarySiteId?: string | null;

  // ── 02 第四批 軌 1 2026-06-07：離職日期 ──
  @IsOptional() @IsDateString() leftAt?: string | null;

  // ── W3 [3-2] 舊系統員工編號（純對照）──────────────────────
  @IsOptional() @IsString() @MaxLength(50) legacyCode?: string | null;

  // 2026-06-18 補 Hana demo 欄位:兩階段驗證開關（security zone 整合時實作 OTP）
  @IsOptional() @Type(() => Boolean) @IsBoolean() twoFaEnabled?: boolean;
}
