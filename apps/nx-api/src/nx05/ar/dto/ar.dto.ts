import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateArDto {
  @IsString()
  @MaxLength(15)
  soId!: string;
}

export class PatchArDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}
