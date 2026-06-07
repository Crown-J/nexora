// apps/nx-api/src/nx01/user-team/dto/user-team.dto.ts
// 05 批 T3 2026-06-07：UserTeam 衛星 DTO（範式對齊 user-role）
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListUserTeamQueryDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() teamId?: string;

  @IsOptional()
  @Type(() => Boolean)
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
  @IsOptional() @Type(() => Boolean) @IsBoolean() isPrimary?: boolean;

  /** 是否為該組組長 */
  @IsOptional() @Type(() => Boolean) @IsBoolean() isLeader?: boolean;
}

export class RevokeUserTeamDto {
  @IsOptional() @IsString() reason?: string;
}

export class SetPrimaryUserTeamDto {
  @Type(() => Boolean) @IsBoolean() isPrimary!: boolean;
}

export class SetLeaderUserTeamDto {
  @Type(() => Boolean) @IsBoolean() isLeader!: boolean;
}

export class SetActiveUserTeamDto {
  @Type(() => Boolean) @IsBoolean() isActive!: boolean;
}
