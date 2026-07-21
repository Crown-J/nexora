import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
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

export class CreatePartDto {
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
   * 基準料號 = 顯示主碼、純手動輸入、必填（2026-06-26 分段編碼規則已廢）。
   * 建立後 code 仍可改（執行長 2026-06-26 拍板：開放修改）。
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isOem?: boolean;

  // 2026-06-26 廠牌料號改必填（基準料號 + 廠牌料號皆必填）
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  secCode!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost?: number;

  // 2026-06-26 分類一・採購角度（選填、1=保養 / 2=維修 / 3=事故 / 4=改裝 / 5=油品耗材）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  purchaseCategory?: number;

  // 2026-06-26 分類二・技術角度（選填、1~9 寫死）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  techCategory?: number;

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
  @Transform(toBoolean)
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
 * 2026-06-26 Crown 拍板：
 *   基準料號（code）開放修改（不再鎖定）；廠牌料號（secCode）必填。
 *   內碼錨點：part.id（NX01PART0000001）= 17+ 業務單據明細 FK、永不變、為真正的定位器。
 *   分段編碼（codeRuleId/seg）與舊料號（oldCode）已廢除。
 */
export class UpdatePartDto {
  // 2026-06-26 基準料號開放修改
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isOem?: boolean;

  // 2026-06-26 廠牌料號必填、更新時若帶入不可為 null
  @IsOptional()
  @IsString()
  @MaxLength(50)
  secCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cost?: number;

  // 2026-06-26 分類一・採購角度（選填）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  purchaseCategory?: number;

  // 2026-06-26 分類二・技術角度（選填）
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  techCategory?: number;

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
  @Transform(toBoolean)
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
