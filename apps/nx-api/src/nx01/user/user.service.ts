import * as bcrypt from 'bcryptjs';
import { ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { NexoraHttpException } from '../../shared/errors/nexora-error';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { isSysadmin, SYSADMIN_ROLE_CODE } from '../../shared/nx01/is-sysadmin';
import { SeqCounterService } from '../../shared/nx01/seq-counter.service';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { BulkActivateUsersDto, CreateUserDto, ListUserQueryDto, UpdateUserDto } from './dto/user.dto';

export type SeatUsage = {
  /** 已 isActive=true 的使用者數（含負責人 / SYSADMIN / OWNER） */
  used: number;
  /** 訂閱席次上限（nx99_subscription.seats、status='A'） */
  total: number;
  /** 剩餘可啟用席次（total - used、最小 0） */
  available: number;
};

const SEL = {
  id: true,
  tenantId: true,
  employeeId: true,
  userAccount: true,
  userName: true,
  userNameEn: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  // 02 第三批 T1 2026-06-07：員工隸屬部門（解綁 PRO → LITE）
  departmentId: true,
  // 職務↔權限拆分軌 2026-06-28：權限等級（RBAC、一人一等級）
  permissionLevelId: true,
  // W3 [3-3] basic zone 7 欄位 + [3-2] legacyCode
  gender: true,
  birthday: true,
  nationalId: true,
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、改結構化兩組（戶籍 + 通訊）+ countryId
  countryId: true,
  householdCityId: true,
  householdDistrictId: true,
  householdPostalCode: true,
  householdDetail: true,
  mailingCityId: true,
  mailingDistrictId: true,
  mailingPostalCode: true,
  mailingDetail: true,
  hireDate: true,
  emergencyContact: true,
  emergencyPhone: true,
  // 2026-06-18 補 Hana demo 欄位:緊急聯絡人關係
  emergencyRelation: true,
  // 02 對齊第二批 B 軌：basic zone 補 5 欄位（學歷/學校/兵役/體檢日/體檢結果）
  highestEducation: true,
  graduateSchool: true,
  militaryService: true,
  healthCheckDate: true,
  healthCheckResult: true,
  // 02 第四批 軌 1 2026-06-07：主要據點 / 離職日期 / 大頭貼 4 欄
  primarySiteId: true,
  leftAt: true,
  photoStorageKey: true,
  photoMimeType: true,
  photoFileSize: true,
  photoOrigFilename: true,
  legacyCode: true,
  twoFaEnabled: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type Row = Prisma.Nx01UserGetPayload<{ select: typeof SEL }>;

/** 列表／明細：含主要角色、倉庫摘要、建立／修改人帳號姓名 */
const LIST_SELECT = {
  ...SEL,
  createdByUser: { select: { userAccount: true, userName: true } },
  updatedByUser: { select: { userAccount: true, userName: true } },
  rev_Nx01UserRole_userId: {
    where: { isPrimary: true, isActive: true, revokedAt: null },
    take: 1,
    select: { role: { select: { name: true } } },
  },
  rev_Nx01UserWarehouse_userId: {
    where: { isActive: true, revokedAt: null },
    select: { warehouse: { select: { code: true, name: true } } },
  },
} as const;

type ListRow = Prisma.Nx01UserGetPayload<{ select: typeof LIST_SELECT }>;

export type Nx01UserPublicDto = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  jobTitle: string | null;
  warehouseSummary: string | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  // W3 [3-3] basic zone 7 欄位 + [3-2] legacyCode
  // 02 第三批 T1 2026-06-07：員工隸屬部門（LITE）
  departmentId: string | null;
  gender: string | null;
  birthday: string | null;
  nationalId: string | null;
  // 02 對齊第二批 A 軌 CP2 2026-06-06
  countryId: string | null;
  householdCityId: string | null;
  householdDistrictId: string | null;
  householdPostalCode: string | null;
  householdDetail: string | null;
  mailingCityId: string | null;
  mailingDistrictId: string | null;
  mailingPostalCode: string | null;
  mailingDetail: string | null;
  hireDate: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  // 02 對齊第二批 B 軌：basic zone 補 5 欄位
  highestEducation: string | null;
  graduateSchool: string | null;
  militaryService: string | null;
  healthCheckDate: string | null;
  healthCheckResult: string | null;
  // 02 第四批 軌 1 2026-06-07
  primarySiteId: string | null;
  leftAt: string | null;
  /** true 表示有大頭貼、URL 走 GET /nx01/users/:id/photo/raw */
  hasPhoto: boolean;
  legacyCode: string | null;
  createdAt: string;
  createdBy: string;
  createdByUsername: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string;
  updatedByUsername: string | null;
  updatedByName: string | null;
};

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    private readonly seq: SeqCounterService,
  ) {}

  private whereList(tenantId: string, q: ListUserQueryDto): Prisma.Nx01UserWhereInput {
    const where: Prisma.Nx01UserWhereInput = { tenantId };
    const and: Prisma.Nx01UserWhereInput[] = [];

    if (q.search?.trim()) {
      const s = q.search.trim();
      and.push({
        OR: [
          { userAccount: { contains: s, mode: 'insensitive' } },
          { userName: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s, mode: 'insensitive' } },
          {
            rev_Nx01UserRole_userId: {
              some: {
                isPrimary: true,
                isActive: true,
                revokedAt: null,
                role: { name: { contains: s, mode: 'insensitive' } },
              },
            },
          },
          {
            rev_Nx01UserWarehouse_userId: {
              some: {
                isActive: true,
                revokedAt: null,
                warehouse: {
                  OR: [
                    { code: { contains: s, mode: 'insensitive' } },
                    { name: { contains: s, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (q.primaryRoleIds?.length) {
      and.push({
        rev_Nx01UserRole_userId: {
          some: {
            tenantId,
            roleId: { in: q.primaryRoleIds },
            isActive: true,
            revokedAt: null,
          },
        },
      });
    }

    if (and.length) where.AND = and;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    return where;
  }

  /** W3 [3-3] / [3-2] + 02 對齊第二批 B 軌：把 user row 的 basic 欄位 + legacyCode 攤平給 public DTO */
  private basicAndLegacy(row: Row | ListRow) {
    return {
      // 02 第三批 T1 2026-06-07
      departmentId: row.departmentId ?? null,
      // 職務↔權限拆分軌：權限等級（一人一等級）
      permissionLevelId:
        (row as { permissionLevelId?: string | null }).permissionLevelId ?? null,
      gender: row.gender ?? null,
      birthday: row.birthday ? row.birthday.toISOString().slice(0, 10) : null,
      nationalId: row.nationalId ?? null,
      // 02 對齊第二批 A 軌 CP2：純文字 address DROP、改結構化兩組地址 + countryId
      countryId: row.countryId ?? null,
      householdCityId: row.householdCityId ?? null,
      householdDistrictId: row.householdDistrictId ?? null,
      householdPostalCode: row.householdPostalCode ?? null,
      householdDetail: row.householdDetail ?? null,
      mailingCityId: row.mailingCityId ?? null,
      mailingDistrictId: row.mailingDistrictId ?? null,
      mailingPostalCode: row.mailingPostalCode ?? null,
      mailingDetail: row.mailingDetail ?? null,
      hireDate: row.hireDate ? row.hireDate.toISOString().slice(0, 10) : null,
      emergencyContact: row.emergencyContact ?? null,
      emergencyPhone: row.emergencyPhone ?? null,
      emergencyRelation: row.emergencyRelation ?? null,
      highestEducation: row.highestEducation ?? null,
      graduateSchool: row.graduateSchool ?? null,
      militaryService: row.militaryService ?? null,
      healthCheckDate: row.healthCheckDate ? row.healthCheckDate.toISOString().slice(0, 10) : null,
      healthCheckResult: row.healthCheckResult ?? null,
      // 02 第四批 軌 1 2026-06-07
      primarySiteId: row.primarySiteId ?? null,
      leftAt: row.leftAt ? row.leftAt.toISOString().slice(0, 10) : null,
      hasPhoto: Boolean(row.photoStorageKey),
      legacyCode: row.legacyCode ?? null,
    };
  }

  private toPublicUserFromListRow(row: ListRow): Nx01UserPublicDto {
    const whRows = row.rev_Nx01UserWarehouse_userId.map((x) => x.warehouse).filter(Boolean);
    const parts = whRows.map((w) => `${w.code} ${w.name}`.trim()).filter(Boolean);
    const warehouseSummary = parts.length ? parts.join('、') : null;
    const firstWh = whRows[0];
    const primaryUr = row.rev_Nx01UserRole_userId[0];
    return {
      id: row.id,
      username: row.userAccount,
      displayName: row.userName,
      email: row.email,
      phone: row.phone,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      jobTitle: primaryUr?.role?.name ?? null,
      warehouseSummary,
      warehouseCode: firstWh?.code ?? null,
      warehouseName: firstWh?.name ?? null,
      ...this.basicAndLegacy(row),
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      createdByUsername: row.createdByUser?.userAccount ?? null,
      createdByName: row.createdByUser?.userName ?? null,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      updatedByUsername: row.updatedByUser?.userAccount ?? null,
      updatedByName: row.updatedByUser?.userName ?? null,
    };
  }

  private toPublicUserFromRow(row: Row): Nx01UserPublicDto {
    return {
      id: row.id,
      username: row.userAccount,
      displayName: row.userName,
      email: row.email,
      phone: row.phone,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      jobTitle: null,
      warehouseSummary: null,
      warehouseCode: null,
      warehouseName: null,
      ...this.basicAndLegacy(row),
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      createdByUsername: null,
      createdByName: null,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      updatedByUsername: null,
      updatedByName: null,
    };
  }

  async list(user: RequestUser, q: ListUserQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    // SYSADMIN 鎖定：一般用戶看不到擁有系統管理員職務的使用者（伊諾瓦後台帳號）
    if (!isSysadmin(user)) {
      where.NOT = {
        rev_Nx01UserRole_userId: {
          some: {
            isActive: true,
            revokedAt: null,
            role: { code: { equals: SYSADMIN_ROLE_CODE, mode: 'insensitive' } },
          },
        },
      };
    }
    // 2026-06-18 M 排序:依 q.sortBy / q.sortOrder 動態組 orderBy（白名單由 DTO 守、不會拿到非法欄位）
    const sortField = q.sortBy ?? 'userAccount';
    const sortDir: 'asc' | 'desc' = q.sortOrder ?? 'asc';
    const orderBy = { [sortField]: sortDir } as Prisma.Nx01UserOrderByWithRelationInput;
    const [total, rows] = await Promise.all([
      this.prisma.nx01User.count({ where }),
      this.prisma.nx01User.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: LIST_SELECT,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.toPublicUserFromListRow(r)) };
  }

  /** target 使用者是否擁有 active SYSADMIN 職務（SYSADMIN 鎖定用） */
  private async hasSysadminRole(tenantId: string, userId: string): Promise<boolean> {
    const c = await this.prisma.nx01UserRole.count({
      where: {
        tenantId,
        userId,
        isActive: true,
        revokedAt: null,
        role: { code: { equals: SYSADMIN_ROLE_CODE, mode: 'insensitive' } },
      },
    });
    return c > 0;
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx01User.findFirst({ where: { id, tenantId }, select: LIST_SELECT });
    if (!row) throw new NotFoundException('User not found');
    // SYSADMIN 鎖定：一般用戶看不到系統管理員帳號 → 裝作不存在
    if (!isSysadmin(user) && (await this.hasSysadminRole(tenantId, id))) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUserFromListRow(row);
  }

  async create(user: RequestUser, dto: CreateUserDto) {
    const tenantId = requireTenantId(user);
    // W3 [3-1]：userAccount 未填 → 自動取下一個 Y 編號；已填 → 用填的（手動覆寫）+ 推進 counter 防衝突
    let acc = dto.userAccount?.trim();
    if (!acc) {
      acc = await this.seq.nextEmployeeNo(tenantId);
    } else {
      const n = SeqCounterService.parseSerialNumber(acc, 'Y');
      if (n != null) await this.seq.reserveIfHigher(tenantId, 'EMPLOYEE', n);
    }
    const dup = await this.prisma.nx01User.findFirst({
      where: { tenantId, userAccount: { equals: acc, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) throw new ConflictException('員工編號已被其他人使用、請改用其他編號');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const row = await this.prisma.nx01User.create({
      data: {
        tenantId,
        userAccount: acc,
        passwordHash,
        userName: dto.userName.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        isActive: dto.isActive ?? true,
        // W3 [3-3] basic zone 7 欄位
        // 02 第三批 T1 2026-06-07：隸屬部門
        departmentId: dto.departmentId?.trim() || null,
        // 職務↔權限拆分軌：權限等級
        permissionLevelId: dto.permissionLevelId?.trim() || null,
        gender: dto.gender ?? null,
        birthday: dto.birthday ? new Date(dto.birthday) : null,
        nationalId: dto.nationalId?.trim() || null,
        // 02 對齊第二批 A 軌 CP2：純文字 address DROP、改結構化
        countryId: dto.countryId?.trim() || null,
        householdCityId: dto.householdCityId?.trim() || null,
        householdDistrictId: dto.householdDistrictId?.trim() || null,
        householdPostalCode: dto.householdPostalCode?.trim() || null,
        householdDetail: dto.householdDetail?.trim() || null,
        mailingCityId: dto.mailingCityId?.trim() || null,
        mailingDistrictId: dto.mailingDistrictId?.trim() || null,
        mailingPostalCode: dto.mailingPostalCode?.trim() || null,
        mailingDetail: dto.mailingDetail?.trim() || null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        emergencyContact: dto.emergencyContact?.trim() || null,
        emergencyPhone: dto.emergencyPhone?.trim() || null,
        emergencyRelation: dto.emergencyRelation?.trim() || null,
        // 02 對齊第二批 B 軌：basic zone 補 5 欄位
        highestEducation: dto.highestEducation?.trim() || null,
        graduateSchool: dto.graduateSchool?.trim() || null,
        militaryService: dto.militaryService?.trim() || null,
        healthCheckDate: dto.healthCheckDate ? new Date(dto.healthCheckDate) : null,
        healthCheckResult: dto.healthCheckResult?.trim() || null,
        // 02 第四批 軌 1 2026-06-07
        primarySiteId: dto.primarySiteId?.trim() || null,
        leftAt: dto.leftAt ? new Date(dto.leftAt) : null,
        // W3 [3-2] legacyCode
        legacyCode: dto.legacyCode?.trim() || null,
        userNameEn: dto.userNameEn?.trim() || null,
        twoFaEnabled: dto.twoFaEnabled ?? false,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'CREATE',
      entityTable: 'nx01_user',
      entityId: row.id,
      entityCode: row.userAccount,
      summary: '建立使用者',
      afterData: row as object,
    });
    return this.toPublicUserFromRow(row);
  }

  async update(user: RequestUser, id: string, dto: UpdateUserDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01User.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('User not found');
    // 席次制：未啟用 → 啟用、走 seat capacity 檢查；啟用 → 未啟用 / 同狀態，不檢查
    if (dto.isActive === true && existing.isActive === false) {
      await this.assertSeatCapacity(tenantId, 1);
    }
    // 員編可改（2026-06-02）：userAccount 改完不影響任何 FK（FK 全指 id）、不斷關聯
    let nextUserAccount: string | undefined;
    if (dto.userAccount !== undefined) {
      const acc = dto.userAccount.trim();
      if (acc !== existing.userAccount) {
        const dup = await this.prisma.nx01User.findFirst({
          where: { tenantId, userAccount: { equals: acc, mode: 'insensitive' }, NOT: { id } },
          select: { id: true },
        });
        if (dup) throw new ConflictException('員工編號已被其他人使用、請改用其他編號');
        nextUserAccount = acc;
      }
    }
    const data: Prisma.Nx01UserUncheckedUpdateInput = {
      updatedBy: user.sub,
      ...(nextUserAccount !== undefined ? { userAccount: nextUserAccount } : {}),
      ...(dto.userName !== undefined ? { userName: dto.userName.trim() } : {}),
      ...(dto.userNameEn !== undefined ? { userNameEn: dto.userNameEn?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      // W3 [3-3] basic zone 7 欄位
      // 02 第三批 T1 2026-06-07：隸屬部門
      ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
      // 職務↔權限拆分軌：權限等級（傳 null 清除）
      ...(dto.permissionLevelId !== undefined ? { permissionLevelId: dto.permissionLevelId } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.birthday !== undefined
        ? { birthday: dto.birthday ? new Date(dto.birthday) : null }
        : {}),
      ...(dto.nationalId !== undefined ? { nationalId: dto.nationalId } : {}),
      // 02 對齊第二批 A 軌 CP2：純文字 address DROP、改結構化
      ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
      ...(dto.householdCityId !== undefined ? { householdCityId: dto.householdCityId } : {}),
      ...(dto.householdDistrictId !== undefined ? { householdDistrictId: dto.householdDistrictId } : {}),
      ...(dto.householdPostalCode !== undefined ? { householdPostalCode: dto.householdPostalCode } : {}),
      ...(dto.householdDetail !== undefined ? { householdDetail: dto.householdDetail } : {}),
      ...(dto.mailingCityId !== undefined ? { mailingCityId: dto.mailingCityId } : {}),
      ...(dto.mailingDistrictId !== undefined ? { mailingDistrictId: dto.mailingDistrictId } : {}),
      ...(dto.mailingPostalCode !== undefined ? { mailingPostalCode: dto.mailingPostalCode } : {}),
      ...(dto.mailingDetail !== undefined ? { mailingDetail: dto.mailingDetail } : {}),
      ...(dto.hireDate !== undefined
        ? { hireDate: dto.hireDate ? new Date(dto.hireDate) : null }
        : {}),
      ...(dto.emergencyContact !== undefined ? { emergencyContact: dto.emergencyContact } : {}),
      ...(dto.emergencyPhone !== undefined ? { emergencyPhone: dto.emergencyPhone } : {}),
      ...(dto.emergencyRelation !== undefined ? { emergencyRelation: dto.emergencyRelation } : {}),
      // 02 對齊第二批 B 軌：basic zone 補 5 欄位
      ...(dto.highestEducation !== undefined ? { highestEducation: dto.highestEducation } : {}),
      ...(dto.graduateSchool !== undefined ? { graduateSchool: dto.graduateSchool } : {}),
      ...(dto.militaryService !== undefined ? { militaryService: dto.militaryService } : {}),
      ...(dto.healthCheckDate !== undefined
        ? { healthCheckDate: dto.healthCheckDate ? new Date(dto.healthCheckDate) : null }
        : {}),
      ...(dto.healthCheckResult !== undefined ? { healthCheckResult: dto.healthCheckResult } : {}),
      // 02 第四批 軌 1 2026-06-07：主要據點 / 離職日期
      ...(dto.primarySiteId !== undefined ? { primarySiteId: dto.primarySiteId } : {}),
      ...(dto.leftAt !== undefined
        ? { leftAt: dto.leftAt ? new Date(dto.leftAt) : null }
        : {}),
      // W3 [3-2] legacyCode
      ...(dto.legacyCode !== undefined ? { legacyCode: dto.legacyCode } : {}),
      ...(dto.twoFaEnabled !== undefined ? { twoFaEnabled: dto.twoFaEnabled } : {}),
    };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    // 2026-06-23 admin 重設密碼專用：mustChangePassword 透傳寫入
    if (dto.mustChangePassword !== undefined) {
      data.mustChangePassword = dto.mustChangePassword;
    }
    const row = await this.prisma.nx01User.update({ where: { id }, data, select: SEL });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'UPDATE',
      entityTable: 'nx01_user',
      entityId: id,
      entityCode: row.userAccount,
      summary: '修改使用者',
      beforeData: existing as object,
      afterData: row as object,
    });
    const full = await this.prisma.nx01User.findFirst({ where: { id: row.id, tenantId }, select: LIST_SELECT });
    return full ? this.toPublicUserFromListRow(full) : this.toPublicUserFromRow(row);
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    if (id === user.sub) throw new ConflictException('Cannot deactivate self');
    const existing = await this.prisma.nx01User.findFirst({ where: { id, tenantId }, select: SEL });
    if (!existing) throw new NotFoundException('User not found');
    // SYSADMIN 鎖定：系統管理員帳號無法被一般用戶停用 → 裝作不存在
    if (!isSysadmin(user) && (await this.hasSysadminRole(tenantId, id))) {
      throw new NotFoundException('User not found');
    }
    const row = await this.prisma.nx01User.update({
      where: { id },
      data: { isActive: false, updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX01',
      action: 'DELETE',
      entityTable: 'nx01_user',
      entityId: id,
      entityCode: row.userAccount,
      summary: '軟刪除使用者',
      beforeData: existing as object,
      afterData: row as object,
    });
    const full = await this.prisma.nx01User.findFirst({ where: { id: row.id, tenantId }, select: LIST_SELECT });
    return full ? this.toPublicUserFromListRow(full) : this.toPublicUserFromRow(row);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 席次制（2026-06-03、Crown 拍板）：啟用受訂閱 seats 限制、資料筆數不限
  //   - assertSeatCapacity(tenantId, delta)：檢查 (current active + delta) ≤ seats
  //   - bulkActivate：批次啟用、原子性檢查 + transaction 更新
  //   - getSeatUsage：query 用、給前端「已用 X / Y 席」計數
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 啟用關卡共用守門：「該租戶已啟用使用者數 + 本次新增啟用數 ≤ subscription.seats」
   * delta 為新增啟用數（已啟用者不算 delta、由 caller 過濾）。
   * 失敗拋 SE-001（席次上限）、無有效訂閱拋 SE-002（防護）。
   */
  private async assertSeatCapacity(tenantId: string, delta: number): Promise<SeatUsage> {
    if (delta <= 0) {
      // delta=0 表示沒新增啟用、直接通過；仍回 usage 給 caller 參考
      const used = await this.prisma.nx01User.count({ where: { tenantId, isActive: true } });
      const sub0 = await this.prisma.nx99Subscription.findFirst({
        where: { tenantId, status: 'A' },
        select: { seats: true },
        orderBy: { createdAt: 'desc' },
      });
      const total0 = sub0?.seats ?? 0;
      return { used, total: total0, available: Math.max(0, total0 - used) };
    }
    const [used, sub] = await Promise.all([
      this.prisma.nx01User.count({ where: { tenantId, isActive: true } }),
      this.prisma.nx99Subscription.findFirst({
        where: { tenantId, status: 'A' },
        select: { seats: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!sub) {
      throw new NexoraHttpException({
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'SE-002',
        message: '租戶尚無有效訂閱、無法啟用使用者',
      });
    }
    const total = sub.seats;
    if (used + delta > total) {
      throw new NexoraHttpException({
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'SE-001',
        message: `已達席次上限（${used}/${total} 席）、本次無法啟用 ${delta} 名使用者`,
      });
    }
    return { used, total, available: total - used };
  }

  /** 給前端 query「已用 X / Y 席」用 */
  async getSeatUsage(user: RequestUser): Promise<SeatUsage> {
    const tenantId = requireTenantId(user);
    return this.assertSeatCapacity(tenantId, 0);
  }

  /**
   * 批次啟用（精靈第二步「挑啟用」共用）：
   *   - 過濾 userIds 中當前已 isActive=true 的（不算 delta、idempotent）
   *   - 走 assertSeatCapacity(delta)
   *   - transaction：每個 user update + audit
   * 回傳：activated 數 + 啟用後最新 seatUsage
   */
  async bulkActivate(user: RequestUser, dto: BulkActivateUsersDto) {
    const tenantId = requireTenantId(user);
    const uniqueIds = Array.from(new Set(dto.userIds.map((s) => s.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      throw new ConflictException('未指定要啟用的使用者');
    }

    // 取目標 user 當前狀態（同 tenant、避免跨租戶寫入）
    const targets = await this.prisma.nx01User.findMany({
      where: { tenantId, id: { in: uniqueIds } },
      select: SEL,
    });
    const foundIds = new Set(targets.map((r) => r.id));
    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`找不到使用者：${missingIds.join(', ')}`);
    }

    const toActivate = targets.filter((r) => !r.isActive);
    const delta = toActivate.length;
    // delta=0 → 全是已啟用、idempotent；仍回 usage 給前端刷新
    if (delta === 0) {
      const usage = await this.assertSeatCapacity(tenantId, 0);
      return { activated: 0, seatUsage: usage };
    }

    // 守門（current + delta ≤ seats）
    await this.assertSeatCapacity(tenantId, delta);

    // transaction：更新 + audit
    await this.prisma.$transaction(async (tx) => {
      for (const target of toActivate) {
        const after = await tx.nx01User.update({
          where: { id: target.id },
          data: { isActive: true, updatedBy: user.sub },
          select: SEL,
        });
        await this.audit.write({
          tenantId,
          actorUserId: user.sub,
          moduleCode: 'NX01',
          action: 'UPDATE',
          entityTable: 'nx01_user',
          entityId: target.id,
          entityCode: target.userAccount,
          summary: '啟用使用者（席次制）',
          beforeData: target as object,
          afterData: after as object,
        });
      }
    });

    // 啟用後刷新 usage
    const usage = await this.assertSeatCapacity(tenantId, 0);
    return { activated: delta, seatUsage: usage };
  }
}
