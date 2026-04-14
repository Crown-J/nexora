import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class Nx10ExpAwardDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  @MaxLength(200)
  reason!: string;

  @IsString()
  @MaxLength(10)
  sourceModule!: string;
}
