import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchApDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}
