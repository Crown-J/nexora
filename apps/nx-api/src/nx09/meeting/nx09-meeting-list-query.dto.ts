import { IsOptional, IsString, MaxLength } from 'class-validator';

import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';

export class Nx09MeetingListQueryDto extends Nx07ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(1)
  status?: string;

  /** Y=排除已取消 X（預設 Y） */
  @IsOptional()
  @IsString()
  @MaxLength(1)
  excludeCancelled?: string;
}
