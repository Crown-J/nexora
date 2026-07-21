// apps/nx-api/src/shared/nx01/partner-account-gate.ts
// 往來帳戶閘門共用檢查（規格：docs/專案/規格書/核心/往來帳戶閘門-設計規格.md v1.3、2026-07-21 執行長拍板）
//
// 三種帳戶（nx01_partner_account.direction）：
//   R=收款帳戶（銷售/報價閘門）/ P=進貨付款帳戶（採購域、貨源隔離）/ T=調貨付款帳戶（同行調貨）
// 銷售放行三擇一：散客 L ／ 現金客戶標記 isCashCustomer ／ 持有啟用 R 帳戶。
// 錯誤碼家族 PA-：001 未開收款戶 / 002 未開進貨付款戶 / 003 未開調貨付款戶 / 004 供應商清單需採購權限
// （前端據 PA- 碼辨識「未開戶」→ 一鍵開戶 dialog、Step 3 接）

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { PrismaService } from '../../prisma/prisma.service';

type Db = Prisma.TransactionClient | PrismaService;

/** 散客類型碼（不記名、閘門直接放行） */
const RETAIL_TYPE = 'L';

/** 對象是否持有指定方向的啟用帳戶 */
export async function hasActiveAccount(
  db: Db,
  tenantId: string,
  partnerId: string,
  direction: 'R' | 'P' | 'T',
): Promise<boolean> {
  const acct = await db.nx01PartnerAccount.findFirst({
    where: { tenantId, partnerId, direction, status: 'A' },
    select: { id: true },
  });
  return !!acct;
}

/** 銷售/報價閘門：散客 L／現金客戶／R 收款帳戶 三擇一，否則 PA-001。 */
export async function assertSellable(
  db: Db,
  tenantId: string,
  partner: { id: string; partnerType: string; isCashCustomer: boolean },
): Promise<void> {
  if (partner.partnerType === RETAIL_TYPE) return;
  if (partner.isCashCustomer) return;
  if (await hasActiveAccount(db, tenantId, partner.id, 'R')) return;
  throw new BadRequestException(
    '[PA-001] 此對象尚未開立收款帳戶（也非散客/現金客戶）、無法銷售——請先開戶或標記現金客戶',
  );
}

/** 採購域閘門（詢價/採購/進貨/進退/保固）：P 進貨付款帳戶，否則 PA-002。 */
export async function assertPurchasable(db: Db, tenantId: string, partnerId: string): Promise<void> {
  if (await hasActiveAccount(db, tenantId, partnerId, 'P')) return;
  throw new BadRequestException('[PA-002] 此對象尚未開立進貨付款帳戶、無法採購——請先開戶（銀行匯款資訊必填）');
}

/** 同行調貨閘門：T 調貨付款帳戶（呼叫端仍須先驗 O/canTransferStock 身分），否則 PA-003。 */
export async function assertTransferable(db: Db, tenantId: string, partnerId: string): Promise<void> {
  if (await hasActiveAccount(db, tenantId, partnerId, 'T')) return;
  throw new BadRequestException('[PA-003] 此同行尚未開立調貨付款帳戶、無法調貨——可一鍵開戶（免銀行資訊）');
}

/**
 * 貨源隔離：查「持有 P 進貨付款帳戶清單」（=供應商名單）需採購域權限。
 * 判定：SYSADMIN/OWNER 直通（對齊 PermissionsGuard bypass）、或任一啟用角色持有 purchase.* 權限。
 * 不足 → PA-004 Forbidden。
 */
export async function assertPurchaseDomainAccess(db: Db, userId: string): Promise<void> {
  const userRoles = await db.nx01UserRole.findMany({
    where: { userId, isActive: true },
    select: { role: { select: { id: true, code: true, isActive: true } } },
  });
  const active = userRoles.filter((ur) => ur.role.isActive);
  const SUPER = new Set(['SYSADMIN', 'OWNER']);
  if (active.some((ur) => SUPER.has(String(ur.role.code).trim().toUpperCase()))) return;
  const roleIds = active.map((ur) => ur.role.id);
  if (roleIds.length) {
    const grant = await db.nx01RolePermission.findFirst({
      where: {
        roleId: { in: roleIds },
        permission: { isActive: true, code: { startsWith: 'purchase.' } },
      },
      select: { id: true },
    });
    if (grant) return;
  }
  throw new ForbiddenException('[PA-004] 供應商清單（進貨付款帳戶持有者）需採購權限');
}
