/**
 * File: apps/nx-api/src/nx02/shortage/dto/shortage.dto.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-SHOR-DTO-001：缺貨簿 API 請求型別
 */

export type ShortageToRfqBodyDto = {
  shortageIds: string[];
};
