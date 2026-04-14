import { IsOptional, IsString, MaxLength } from 'class-validator';

import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';

export class Nx09DocumentListQueryDto extends Nx07ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(2)
  docCategory?: string;

  /** Y=只列啟用（預設 Y） */
  @IsOptional()
  @IsString()
  @MaxLength(1)
  activeOnly?: string;
}
