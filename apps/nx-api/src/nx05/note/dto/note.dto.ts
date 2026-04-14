import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MaxLength(2)
  noteType!: string;

  @IsString()
  @MaxLength(1)
  direction!: string;

  @IsString()
  @MaxLength(15)
  partnerId!: string;

  @IsString()
  @MaxLength(50)
  noteNo!: string;

  @IsString()
  @MaxLength(100)
  bankName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccount?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999999999.99)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  currencyId?: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  paylogId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class PatchNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bouncedReason?: string;
}
