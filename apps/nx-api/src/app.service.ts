/**
 * File: apps/nx-api/src/app.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - CORE-API-APP-SVC-001：App Service（最小核心服務）
 *
 * Notes:
 * - 僅提供 health/info 相關功能
 * - 不直接操作 Prisma（避免與業務邏輯耦合）
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {

  /**
   * @FUNCTION_CODE nxapi_core_health_service_001
   *
   * 說明：
   * - 提供健康檢查資訊
   */
  health() {
    return {
      ok: true,
      service: 'nx-api',
      ts: new Date().toISOString(),
    };
  }

  /**
   * @FUNCTION_CODE nxapi_core_info_service_001
   *
   * 說明：
   * - 提供基本資訊（可擴充版本號）
   */
  info() {
    return {
      name: 'nx-api',
      version: 'LITE',
    };
  }
}