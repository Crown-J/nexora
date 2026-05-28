// apps/nx-api/src/nx02/rfq-greeting-template/dto/rfq-greeting-template.dto.ts
// LITE 階段 1 M2-e：詢價客套話設定 DTO（每租戶 1:1、unique）

import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRfqGreetingTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  greetingContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  closingContent?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
