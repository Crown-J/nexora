// apps/nx-api/src/sys-admin/onboarding/onboarding.service.ts
// v1.2 對齊軌 C：開戶後台 service
//
// 流程（v1.2 §2.2）：
//   1. 建租戶（is_active=true、status='A'、plan_code 對應 LITE/PLUS/PRO）
//   2. 建負責人 user（is_tenant_owner=true、must_change_password=true）
//   3. 指派 OWNER 角色給負責人（OWNER 角色由 apply-role.ts seed 預建）
//   4. 建主據點 + 主倉
//   5. 模擬寄通知 Email（console.log、實際 email 需另接 mailer）

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

import type { CreateOnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /// 隨機產初始密碼（10 字元、英數字 + 特殊符號）
  private generateInitialPassword(): string {
    const buf = randomBytes(8).toString('base64');
    return `${buf}!1`.replace(/[/+=]/g, '').slice(0, 10);
  }

  async createTenantAndOwner(user: RequestUser, dto: CreateOnboardingDto) {
    // 1. 驗證 Email 唯一（檢 nx01_user.user_account）
    const existingUser = await this.prisma.nx01User.findFirst({
      where: { userAccount: dto.ownerEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException(`Email ${dto.ownerEmail} 已存在、不可重複`);
    }

    // 2. 決定 tenantCode（自動產或用 input）
    const tenantCode = dto.tenantCode?.trim() || `T${Date.now().toString(36).toUpperCase()}`;
    const existingTenant = await this.prisma.nx99Tenant.findFirst({
      where: { code: tenantCode },
      select: { id: true },
    });
    if (existingTenant) {
      throw new BadRequestException(`租戶代碼 ${tenantCode} 已存在`);
    }

    // 3. 決定初始密碼
    const rawPassword = dto.initialPassword?.trim() || this.generateInitialPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 4. tx：建租戶 → 負責人 → 指派 OWNER → 主據點 + 主倉
    const result = await this.prisma.$transaction(async (tx) => {
      // 4.1 建租戶
      const tenant = await tx.nx99Tenant.create({
        data: {
          code: tenantCode,
          name: dto.companyName,
          nameEn: dto.companyNameEn ?? null,
          status: 'A',
          sortNo: 0,
          isActive: true,
          taxId: dto.taxId,
          address: dto.address,
          phone: dto.phone ?? null,
          logoUrl: dto.logoUrl,
          planCode: dto.planCode,
          contactName: dto.ownerName,
          contactEmail: dto.ownerEmail,
          contactPhone: dto.phone ?? null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });

      // 4.2 建負責人 user
      const owner = await tx.nx01User.create({
        data: {
          tenantId: tenant.id,
          userAccount: dto.ownerEmail,
          passwordHash,
          userName: dto.ownerName,
          email: dto.ownerEmail,
          isActive: true,
          mustChangePassword: true,
          isTenantOwner: true,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });

      // 4.3 指派 OWNER 角色（OWNER 是系統內建角色、apply-role seed 預建）
      // 注意：新租戶的 OWNER 角色由 apply-role 在租戶建立時應該已套用
      // 但實際 seed 流程未跑、我們手動建一個 OWNER 角色給此租戶
      const ownerRole = await tx.nx01Role.create({
        data: {
          tenantId: tenant.id,
          code: 'OWNER',
          name: '負責人',
          description: '老闆 / 總經理、全模組總覽（自動全權限）',
          isSystem: true,
          sortNo: 2,
          isActive: true,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });

      await tx.nx01UserRole.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          roleId: ownerRole.id,
          isPrimary: true,
          assignedBy: user.sub,
          isActive: true,
        },
      });

      // 4.4 建主據點
      const site = await tx.nx01Site.create({
        data: {
          tenantId: tenant.id,
          code: 'HQ',
          name: '總部據點',
          address: dto.address,
          isMain: true,
          isActive: true,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });

      // 4.5 建主倉
      const warehouseName = dto.mainWarehouseName?.trim() || '主倉';
      const warehouse = await tx.nx01Warehouse.create({
        data: {
          tenantId: tenant.id,
          code: 'M01',
          name: warehouseName,
          siteId: site.id,
          isMain: true,
          isActive: true,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
      });

      return { tenant, owner, ownerRole, site, warehouse };
    });

    // 5. 模擬寄通知 Email（v1.2 §2.2）
    this.logger.log(
      `[ONBOARDING-EMAIL] To: ${dto.ownerEmail}\n` +
        `Subject: NEXORA 帳號開通通知\n` +
        `公司：${dto.companyName}\n` +
        `登入網址：https://app.nexora-grid.com/login\n` +
        `Email：${dto.ownerEmail}\n` +
        `初始密碼：${rawPassword}\n` +
        `（首次登入會強制改密碼）`,
    );

    return {
      tenantId: result.tenant.id,
      tenantCode: result.tenant.code,
      ownerUserId: result.owner.id,
      ownerEmail: dto.ownerEmail,
      initialPassword: rawPassword,
      mainWarehouseId: result.warehouse.id,
      message: '開戶完成、初始密碼已記錄在 server log（測試環境）、實際 Email 寄送需接 mailer',
    };
  }
}
