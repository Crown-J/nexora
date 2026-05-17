// apps/nx-api/src/nx10/team-task/dto/nx10-team-task.dto.ts
// NX10 TeamTask DTO

import { IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const TARGET_TYPES = ['AT', 'KP', 'DR', 'OT'] as const;
const TASK_CYCLES = ['W', 'M'] as const;

export class CreateTeamTaskDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsIn(TARGET_TYPES as unknown as string[])
  targetType!: 'AT' | 'KP' | 'DR' | 'OT';

  @IsNumberString()
  targetValue!: string;

  @IsString()
  @IsIn(TASK_CYCLES as unknown as string[])
  taskCycle!: 'W' | 'M';

  @IsInt()
  @Min(0)
  rewardExp!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PatchTeamTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumberString()
  targetValue?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rewardExp?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
