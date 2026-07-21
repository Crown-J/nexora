// apps/nx-api/src/nx01/user-team/dto/user-team.dto.ts
// 05 批 T3 2026-06-07：UserTeam 衛星 DTO（範式對齊 user-role）
import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListUserTeamQueryDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() teamId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class AssignUserTeamDto {
  @IsString() userId!: string;
  @IsString() teamId!: string;

  /** 主組旗標、true 時自動把該員工其他 isPrimary=true 改 false */
  @IsOptional() @Transform(toBoolean) @IsBoolean() isPrimary?: boolean;

  /** 是否為該組組長 */
  @IsOptional() @Transform(toBoolean) @IsBoolean() isLeader?: boolean;
}

export class RevokeUserTeamDto {
  @IsOptional() @IsString() reason?: string;
}

export class SetPrimaryUserTeamDto {
  @Transform(toBoolean) @IsBoolean() isPrimary!: boolean;
}

export class SetLeaderUserTeamDto {
  @Transform(toBoolean) @IsBoolean() isLeader!: boolean;
}

export class SetActiveUserTeamDto {
  @Transform(toBoolean) @IsBoolean() isActive!: boolean;
}
