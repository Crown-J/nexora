import { IsOptional, IsString, MaxLength } from 'class-validator';

import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';

export class Nx08MonthlyReportListQueryDto extends Nx07ListQueryDto {
  @IsString()
  @MaxLength(7)
  yearMonth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  userId?: string;
}

export class Nx08MonthlyReportSummaryQueryDto {
  @IsString()
  @MaxLength(7)
  yearMonth!: string;
}
