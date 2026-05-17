// apps/nx-api/src/nx06/web-push/dto/web-push.dto.ts
// NX06 Web Push 訂閱 DTO

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubscribeDto {
  /** Web Push API endpoint URL（瀏覽器產出）。 */
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  endpoint!: string;

  /** VAPID public key（subscription.keys.p256dh）。 */
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  p256dhKey!: string;

  /** subscription auth secret（subscription.keys.auth）。 */
  @IsString()
  @MinLength(10)
  @MaxLength(100)
  authKey!: string;

  /** 瀏覽器 user agent（debug）。 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}

export class SendNotificationDto {
  /** 目標 user_id。 */
  @IsString()
  @MaxLength(15)
  userId!: string;

  /** 通知標題（< 100 字）。 */
  @IsString()
  @MaxLength(100)
  title!: string;

  /** 通知內文（< 200 字）。 */
  @IsString()
  @MaxLength(200)
  body!: string;

  /** click URL（可選）。 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;
}
