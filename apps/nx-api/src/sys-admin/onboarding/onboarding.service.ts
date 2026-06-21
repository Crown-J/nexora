// apps/nx-api/src/sys-admin/onboarding/onboarding.service.ts
// v1.2 對齊軌 C：開戶後台 service
// 平台/租戶層分離軌 Phase 3：actor 從 RequestUser（nx01_user）改成 platform admin id。
//
// 流程（v1.2 §2.2）：
//   1. 建租戶（is_active=true、status='A'、plan_code 對應 LITE/PLUS/PRO）
//   2. 建負責人 user（is_tenant_owner=true、must_change_password=true）
//   3. 指派 OWNER 角色給負責人（OWNER 角色由 apply-role.ts seed 預建）
//   4. 建主據點 + 主倉
//   5. 模擬寄通知 Email（console.log、實際 email 需另接 mailer）
//
// createdBy 分流（schema FK 約束決定）：
// - nx99_tenant.createdBy = actorPlatformAdminId（無 FK、保留 platform 審計）
// - nx01_user.createdBy = SYSADMIN_USER_ID（有 FK 指向 nx01_user(id)、必填佔位、跟 INNOVA seed 範式一致）
// - 其他表 createdBy = actorPlatformAdminId（無 FK）

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';

import type { CreateOnboardingDto } from './dto/onboarding.dto';

/**
 * SYSADMIN 佔位 id（nx01_user.createdBy FK 必填）
 * 對應 packages/db-core/prisma/seed/system/constants.ts:SYSADMIN_USER_ID
 * hardcode 是為了避免 nx-api 直接依賴 db-core 的 seed module、與既有 chicken-and-egg
 * 範式（nx99_innova_tenant.ts seed 也是這個寫法）保持一致。
 */
const SYSADMIN_USER_ID = 'NX01USER0000001';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /// 隨機產初始密碼（10 字元、英數字 + 特殊符號）
  private generateInitialPassword(): string {
    const buf = randomBytes(8).toString('base64');
    return `${buf}!1`.replace(/[/+=]/g, '').slice(0, 10);
  }

  /// 員編格式化：純數字 → Y+4 碼補零（例：1 → Y0001、156 → Y0156）
  /// 已是 Y+數字格式或自由文字（如 wang）原樣返回
  /// CYTIC 對齊規格 §387「Y+4 碼自動給號、可手動覆寫」
  private formatEmployeeAccount(value: string): string {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return `Y${trimmed.padStart(4, '0')}`;
    }
    return trimmed;
  }

  async createTenantAndOwner(actorPlatformAdminId: string, dto: CreateOnboardingDto) {
    // 1. 員工編號制改造（2026-06-02）：員編租戶內唯一、開戶當下租戶尚未建立、
    //    不需查衝突（@@unique[tenantId, userAccount] 在 tx 內建立時自動保證）。
    //    email 衝突（@@unique[tenantId, email]）同樣由 schema 保證、此處不前置查。

    // 2. 自動產 tenantCode（Phase 6.3）
    // - dto.isTest=true → seq_tenant_code_zt → ZT-{6digits}
    // - 否則（正式客戶）→ seq_tenant_code_tw → TW-{6digits}
    // 流水號 6 位實心、純遞增、無前導 0（起點 100001）
    const isTest = dto.isTest === true;
    const sequenceName = isTest ? 'seq_tenant_code_zt' : 'seq_tenant_code_tw';
    const prefix = isTest ? 'ZT' : 'TW';
    const [{ nextval }] = await this.prisma.$queryRawUnsafe<Array<{ nextval: bigint }>>(
      `SELECT nextval('${sequenceName}') AS nextval`,
    );
    const serial = nextval.toString();
    const tenantCode = `${prefix}-${serial}`;
    // 防呆：sequence 不該回傳重複值、但若有人手動把同 code row 種進 DB、攔下
    const existingTenant = await this.prisma.nx99Tenant.findFirst({
      where: { code: tenantCode },
      select: { id: true },
    });
    if (existingTenant) {
      throw new BadRequestException(`租戶代碼 ${tenantCode} 已存在（sequence 與資料不同步、請檢查）`);
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
          logoUrl: dto.logoStorageKey ?? null,
          planCode: dto.planCode,
          contactName: dto.ownerName,
          contactEmail: dto.ownerEmail,
          contactPhone: dto.phone ?? null,
          createdBy: actorPlatformAdminId,
          updatedBy: actorPlatformAdminId,
        },
      });

      // 4.2 建負責人 user
      // ⚠️ nx01_user.createdBy 有 FK 指向 nx01_user(id)、不能填 PLATADMN id；
      //    用 SYSADMIN_USER_ID 佔位、語意「系統開戶流程自動建」、跟 INNOVA seed 範式一致
      // 員工編號制改造（2026-06-02）：
      //    userAccount = dto.ownerEmployeeAccount（負責人自己填的員編、登入用）
      //    email = dto.ownerEmail（聯絡信箱、寄信/重設密碼用、非登入帳號）
      // CYTIC 對齊規格 §387（2026-06-21）：
      //    ownerEmployeeAccount 留空時系統自動產 Y0001（從 EMPLOYEE seq counter）
      //    ownerLegacyCode 灌進 nx01_user.legacy_code（舊系統員編對照）
      const ownerEmployeeAccount = dto.ownerEmployeeAccount
        ? this.formatEmployeeAccount(dto.ownerEmployeeAccount)
        : 'Y0001';
      const owner = await tx.nx01User.create({
        data: {
          tenantId: tenant.id,
          userAccount: ownerEmployeeAccount,
          passwordHash,
          userName: dto.ownerName,
          email: dto.ownerEmail,
          legacyCode: dto.ownerLegacyCode ?? null,
          isActive: true,
          mustChangePassword: true,
          isTenantOwner: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
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
          createdBy: actorPlatformAdminId,
          updatedBy: actorPlatformAdminId,
        },
      });

      await tx.nx01UserRole.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          roleId: ownerRole.id,
          isPrimary: true,
          assignedBy: actorPlatformAdminId,
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
          createdBy: actorPlatformAdminId,
          updatedBy: actorPlatformAdminId,
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
          createdBy: actorPlatformAdminId,
          updatedBy: actorPlatformAdminId,
        },
      });

      // 4.5b 建散客 partner（W4 [3-5] 2026-06-06、NX-MANUAL-02 v2.0 §3.5）
      // - 每租戶內建一筆「散客」L0001、給 B2C 無統編散戶交易統收用
      // - 只能現銷（PREPAY）、固定二聯、不允許賒帳（creditStatus=N、creditLimit=0）
      // - 同時建 PARTNER_L seq_counter row（nextNo=2、下次取號從 2 起）
      const retailPartner = await tx.nx01Partner.create({
        data: {
          tenantId: tenant.id,
          code: 'L0001',
          name: '散客',
          partnerType: 'L',
          canTransferStock: false,
          paymentTermDomestic: 'PREPAY',
          creditStatus: 'N',
          creditLimit: 0,
          defaultInvoiceCopies: 2,
          isActive: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
      await tx.nx01SeqCounter.create({
        data: {
          tenantId: tenant.id,
          scope: 'PARTNER_L',
          nextNo: 2,
        },
      });

      // 4.5c 建 EMPLOYEE seq counter（CYTIC 對齊規格 §387、2026-06-21 audit B6）
      // - 開戶建立 Y0001 負責人後、下一個員工從 Y0002 起跳
      // - importer / 主檔頁新增員工時讀此 counter
      // - 規格 §128/§387：「Y+4 碼自動給號、可手動覆寫、租戶內唯一」
      await tx.nx01SeqCounter.create({
        data: {
          tenantId: tenant.id,
          scope: 'EMPLOYEE',
          nextNo: 2,
        },
      });

      // 4.6 建訂閱（2026-06-02 補：對齊 seed/test/lite/tenant.ts 範式）
      // 之前 onboarding 漏建 nx99_subscription、導致 me API plan_code=null、
      // 客戶端 21 卡載入失敗 / mustChange redirect race / 報表 plan 判斷錯
      // dto.planCode 映射 nx99_plan code：LITE→NEXORA-LITE-M / PLUS→NEXORA-PLUS-L / PRO→NEXORA-PRO-XL
      const PLAN_CODE_MAP: Record<'LITE' | 'PLUS' | 'PRO', string> = {
        LITE: 'NEXORA-LITE-M',
        PLUS: 'NEXORA-PLUS-L',
        PRO: 'NEXORA-PRO-XL',
      };
      const planNxCode = PLAN_CODE_MAP[dto.planCode];
      const plan = await tx.nx99Plan.findUniqueOrThrow({ where: { code: planNxCode } });
      const twd = await tx.nx01Currency.findUniqueOrThrow({ where: { code: 'TWD' } });
      const subscription = await tx.nx99Subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: 'A',
          billingCycle: 'M',
          seats: 10,
          startAt: new Date().toISOString().slice(0, 10),
          endAt: '2099-12-31',
          autoRenew: true,
          baseFeeSnapshot: plan.baseFeeMonth,
          seatFeeSnapshot: plan.seatFeeMonth,
          discountTypeSnapshot: 'N',
          discountValueSnapshot: 0,
          subtotalSnapshot: plan.baseFeeMonth,
          discountAmountSnapshot: 0,
          totalSnapshot: plan.baseFeeMonth,
          currencyId: twd.id,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });

      // 4.7 開戶完成檢查（BUG #1 LITE 上線防呆、避免後續軌靜默掛丟）
      // 在 transaction 末段驗證「負責人真的掛好 OWNER」、不對則整個 rollback、
      // 避免 Innova 操作完成顯示成功、實際客戶拿到不能用的系統。
      const verifyUserRole = await tx.nx01UserRole.findFirst({
        where: {
          tenantId: tenant.id,
          userId: owner.id,
          roleId: ownerRole.id,
          isActive: true,
        },
        select: { id: true },
      });
      if (!verifyUserRole) {
        throw new BadRequestException(
          `開戶完成檢查失敗：負責人 ${owner.id} 未掛 OWNER role、整個 onboarding rollback`,
        );
      }
      const verifyOwnerFlag = await tx.nx01User.findFirst({
        where: { id: owner.id, isTenantOwner: true, isActive: true },
        select: { id: true },
      });
      if (!verifyOwnerFlag) {
        throw new BadRequestException(
          `開戶完成檢查失敗：負責人 ${owner.id} isTenantOwner 非 true 或停用、整個 onboarding rollback`,
        );
      }

      return { tenant, owner, ownerRole, site, warehouse, subscription };
    });

    // 5. 模擬寄通知 Email（v1.2 §2.2）
    this.logger.log(
      `[ONBOARDING-EMAIL] To: ${dto.ownerEmail}\n` +
        `Subject: NEXORA 帳號開通通知\n` +
        `公司：${dto.companyName}\n` +
        `公司帳號：${result.tenant.code}\n` +
        `員工編號（登入帳號）：${dto.ownerEmployeeAccount}\n` +
        `聯絡信箱：${dto.ownerEmail}\n` +
        `初始密碼：${rawPassword}\n` +
        `登入網址：https://app.nexora-grid.com/login\n` +
        `（首次登入會強制改密碼）`,
    );

    return {
      tenantId: result.tenant.id,
      tenantCode: result.tenant.code,
      ownerUserId: result.owner.id,
      ownerEmployeeAccount: dto.ownerEmployeeAccount,
      ownerEmail: dto.ownerEmail,
      initialPassword: rawPassword,
      mainWarehouseId: result.warehouse.id,
      message: '開戶完成、初始密碼已記錄在 server log（測試環境）、實際 Email 寄送需接 mailer',
    };
  }
}
