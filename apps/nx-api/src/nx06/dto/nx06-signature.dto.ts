import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SignatureDto {
  @IsString()
  @MaxLength(1)
  signerType!: string;

  @IsString()
  @MaxLength(50)
  signerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  signatureUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  stopId?: string;
}
