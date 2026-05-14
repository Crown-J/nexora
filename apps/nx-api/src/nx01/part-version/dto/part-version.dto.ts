// apps/nx-api/src/nx01/part-version/dto/part-version.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0
// part_version 是 read-only 模組（write 由 part.service.update tx 同步寫入）
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListPartVersionQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  versionNo?: number;
}
