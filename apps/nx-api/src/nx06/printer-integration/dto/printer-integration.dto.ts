// apps/nx-api/src/nx06/printer-integration/dto/printer-integration.dto.ts
// NX06 PrinterIntegration DTO（熱感印表機列印標記）
// 對齊 overview §6.2 + Crown Q7=a（藍牙熱感印表機）

import { IsString, MaxLength } from 'class-validator';

export class PrintDnDto {
  /** 藍牙印表機裝置 ID（外務員 App 配對寫入）。 */
  @IsString()
  @MaxLength(50)
  printerDeviceId!: string;
}
