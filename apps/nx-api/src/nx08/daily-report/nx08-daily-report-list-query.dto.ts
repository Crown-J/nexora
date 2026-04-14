import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';

export class Nx08DailyReportListQueryDto extends Nx07ListQueryDto {
  @IsOptional()
  @IsDateString()
  reportDateFrom?: string;

  @IsOptional()
  @IsDateString()
  reportDateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  userId?: string;
}
