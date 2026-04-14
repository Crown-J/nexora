import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePerformanceDto {
  @IsString()
  @MaxLength(15)
  userId!: string;

  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(30)
  periodLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  reviewerUserId?: string;
}

export class PatchPerformanceDto {
  @IsString()
  @MaxLength(30)
  status!: string;
}
