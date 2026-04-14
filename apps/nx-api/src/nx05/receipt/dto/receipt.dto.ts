import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReceiptDto {
  @IsDateString()
  payDate!: string;

  @IsString()
  @MaxLength(15)
  arId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(999999999999.99)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  currencyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  payMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}
