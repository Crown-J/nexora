import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePayrollDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsString()
  @MaxLength(7)
  yearMonth!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;
}

export class PatchPayrollDto {
  @IsString()
  @MaxLength(30)
  status!: string;
}
