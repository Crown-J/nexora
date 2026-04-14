import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateAllowanceItemDto {
  @IsString()
  @MaxLength(200)
  reason!: string;

  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  disposalMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  refDocId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  refDocType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateAllowanceDto {
  @IsString()
  @MaxLength(1)
  allowanceType!: string;

  @IsString()
  @MaxLength(15)
  partnerId!: string;

  @IsDateString()
  allowanceDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  refArId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  refApId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAllowanceItemDto)
  items!: CreateAllowanceItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchAllowanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejectReason?: string;
}
