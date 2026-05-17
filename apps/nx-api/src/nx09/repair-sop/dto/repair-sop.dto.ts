// apps/nx-api/src/nx09/repair-sop/dto/repair-sop.dto.ts
// NX09 RepairSop DTOs（維修 SOP 結構化主檔）

import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const REPAIR_CATEGORIES = ['ENGINE', 'BRAKE', 'ELECTRIC', 'MAINTAIN', 'SUSPENSION', 'AC', 'TRANS', 'OTHER'] as const;

export class CreateRepairSopDto {
  @IsString() @MaxLength(30) code!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsIn(REPAIR_CATEGORIES) category!: string;
  /** steps JSON 陣列字串（service 端 parse 驗證）。 */
  @IsString() steps!: string;
  @IsOptional() @IsString() tools?: string;
  @IsOptional() @IsString() warnings?: string;
  @IsOptional() @IsInt() @Min(1) @Max(9999) estimatedMinutes?: number;
  @IsOptional() @IsString() photos?: string;
  @IsOptional() @IsString() carModelFilter?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) difficulty?: number;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class PatchRepairSopDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsIn(REPAIR_CATEGORIES) category?: string;
  @IsOptional() @IsString() steps?: string;
  @IsOptional() @IsString() tools?: string;
  @IsOptional() @IsString() warnings?: string;
  @IsOptional() @IsInt() @Min(1) @Max(9999) estimatedMinutes?: number;
  @IsOptional() @IsString() photos?: string;
  @IsOptional() @IsString() carModelFilter?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) difficulty?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class LinkPartModelDto {
  /** 一次掛多個 partModelId。 */
  @IsArray()
  @IsString({ each: true })
  partModelIds!: string[];

  @IsOptional() @IsString() @MaxLength(200) notes?: string;
}
