import { IsOptional, IsString, MaxLength } from 'class-validator';

import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';

export class Nx09ArticleListQueryDto extends Nx07ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  tagId?: string;

  /** Y=只列有效；N=含停用（預設 Y） */
  @IsOptional()
  @IsString()
  @MaxLength(1)
  activeOnly?: string;
}
