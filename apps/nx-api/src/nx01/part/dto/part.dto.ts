import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

/** 正廠對應料號子表項（下半場 B） */
export class PartOemCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partBrandId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  oemCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}

// 02 第三批 T3 2026-06-07：總經理拍板簡化三選項（N=不可退不保固 / S=未使用可退 / W=走保固流程）
// 既有舊值 F / R 仍接受讀（不破壞既有 row）、新寫入接 5 值但 UI 只顯示 3 個
const RETURN_POLICIES = ['F', 'S', 'R', 'N', 'W'] as const;

/**
 * 軸 1：part.type 升 SmallInt（1=專用 / 2=通用 / 3=組合 / 4=拆解）
 * 對齊 NX01-14 fuelType / NX01-15 transmissionType SmallInt 範式
 */
const PART_TYPE_MIN = 1;
const PART_TYPE_MAX = 4;

export class ListPartQueryDto extends Nx01ListQueryDto {
  /** 02 對齊第二批 C 軌 CP2-b：注音搜尋（partner 同範式）*/
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phonetic?: string;

  /** 2026-06-22：依品牌篩選（供應商供貨對應「按品牌批次加入」用） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  brandId?: string;
}

/**
 * Crown Q7=B：part.code 預覽 DTO
 * 前端 onChange 即時呼叫 POST /nx01/parts/preview-code、回 { code: string }
 */
export class PreviewPartCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  codeRuleId!: string;

  @IsOptional() @IsString() @MaxLength(10) seg1?: string;
  @IsOptional() @IsString() @MaxLength(10) seg2?: string;
  @IsOptional() @IsString() @MaxLength(10) seg3?: string;
  @IsOptional() @IsString() @MaxLength(10) seg4?: string;
  @IsOptional() @IsString() @MaxLength(10) seg5?: string;

  @IsOptional() @IsString() @MaxLength(15) partBrandId?: string;
  /** W6-切換軌 2026-06-06：brandId 為主、service 端 fallback partBrandId 查 part_brand 表 */
  @IsOptional() @IsString() @MaxLength(15) brandId?: string;
  @IsOptional() @IsString() @MaxLength(15) countryId?: string;
}

export class CreatePartDto {
  /**
   * 規格 §3 + Crown Q5=A 拍板：codeRuleId 必填（業務先建 brand_code_rule、再建 part）
   * @IsOptional 保 DTO 形式相容、但 service 強制檢核（非空檢查 + verify 存在）
   */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  codeRuleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partBrandId?: string;

  /** W6 [3-8] 2026-06-06 品牌合併：新 brandId 為主、partBrandId 保留待後續軌 drop */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  brandId?: string;

  /**
   * W5 [3-7] 2026-06-06 Crown 拍板四層編碼：
   *   零件料號 = 顯示主碼、必填。新增時若 user 未填、service 端 fallback 帶入 oldCode（舊有料號）。
   *   DTO 改 optional 讓 service 決定（兩者皆空才拒收）；UI 端表單應 oldCode → code mirror。
   *   建立後 code 鎖定不可改（UpdatePartDto 已無 code 欄位、確保 NX 內碼錨點不漂移）。
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  secCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  oldCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg5?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  countryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partGroupId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PART_TYPE_MIN)
  @Max(PART_TYPE_MAX)
  partType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spec?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  uom?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  @IsIn(RETURN_POLICIES)
  returnPolicy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  warrantyMonths?: number;

  // 02 第四批 軌 6 2026-06-07：建議保存期限（月、可覆寫族群預設、留空=取族群預設）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  shelfLifeMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceB?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceD?: number;

  /** 正廠對應料號（整批；不傳＝不動）*/
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartOemCodeDto)
  oemCodes?: PartOemCodeDto[];

  /** 變動原因（業務人員填、寫入 part_version.changeReason、規格 §5 / Q1=A） */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}

/**
 * W5 [3-7] 2026-06-06 Crown 拍板四層編碼鎖定：
 *   零件料號（code）建立後鎖定不可改、本 DTO 無 code 欄位 = service.update 不會寫 code。
 *   舊料號（oldCode）+ 副廠料號（secCode）仍可改、僅內碼（part.id）+ 顯示主碼（code）鎖定。
 *   內碼錨點：part.id（NX01PART0000001）= 17+ 業務單據明細 FK、永不變、單據顯示用 partNo snapshot。
 */
export class UpdatePartDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOem?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  secCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  oldCode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg1?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg2?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg3?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg4?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  seg5?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  countryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partBrandId?: string | null;

  /** W6 [3-8] 2026-06-06 品牌合併：新 brandId */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  brandId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partGroupId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PART_TYPE_MIN)
  @Max(PART_TYPE_MAX)
  partType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spec?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  uom?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  @IsIn(RETURN_POLICIES)
  returnPolicy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  warrantyMonths?: number;

  // 02 第四批 軌 6 2026-06-07：建議保存期限（月、可覆寫族群預設、留空=取族群預設）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  shelfLifeMonths?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceB?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  priceD?: number;

  /** 正廠對應料號（整批取代；不傳＝不動）*/
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartOemCodeDto)
  oemCodes?: PartOemCodeDto[];

  /** 變動原因（業務人員填、寫入 part_version.changeReason、規格 §5 / Q1=A） */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
