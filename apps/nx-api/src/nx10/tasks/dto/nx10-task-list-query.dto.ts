import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class Nx10TaskListQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isCompleted?: boolean;
}
