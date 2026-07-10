// apps/nx-api/src/nx01/part-barcode/dto/part-barcode.dto.ts
// 偉盟 P2 2.6 2026-07-11：零件條碼對照 DTO

import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePartBarcodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  barcode!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  remark?: string;
}

export class UpdatePartBarcodeDto {
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  remark?: string | null;
}
