import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTrainingDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export class PatchTrainingDto {
  @IsString()
  @MaxLength(30)
  status!: string;
}
