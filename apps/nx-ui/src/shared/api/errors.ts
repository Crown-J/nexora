/**
 * File: apps/nx-ui/src/shared/api/error.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-ERR-001：統一 API 錯誤型別
 */

export class ApiClientError extends Error {
  status: number;
  body?: string;

  constructor(status: number, message: string, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}