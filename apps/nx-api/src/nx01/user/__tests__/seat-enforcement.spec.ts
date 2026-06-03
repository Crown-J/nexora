// apps/nx-api/src/nx01/user/__tests__/seat-enforcement.spec.ts
// 席次制 enforcement 單元測試（mock prisma）
//
// Crown 規則（2026-06-03）：
//   - 員工資料筆數不限
//   - 已啟用使用者數（含負責人）≤ 訂閱 seats
//   - 啟用關卡擋：bulkActivate / update(isActive=false→true) 兩處共用 assertSeatCapacity

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { UserService } from '../user.service';
import { NexoraHttpException } from '../../../shared/errors/nexora-error';

const TENANT_ID = 'NX99TANT9900002';
const ADMIN_ID = 'NX01USER9900002';

const adminUser = {
  sub: ADMIN_ID,
  username: 'admin',
  roles: ['SYSADMIN'],
  tenantId: TENANT_ID,
  tenantCode: 'TEST-LITE',
  planCode: 'LITE',
} as never;

type UserStub = {
  id: string;
  tenantId: string;
  userAccount: string;
  userName: string;
  isActive: boolean;
};

type State = {
  users: Map<string, UserStub>;
  subscriptionSeats: number | null;
};

function makeService(state: State): UserService {
  const prisma = {
    nx01User: {
      count: vi.fn(async (args: { where: { tenantId: string; isActive?: boolean } }) => {
        let count = 0;
        for (const u of state.users.values()) {
          if (u.tenantId !== args.where.tenantId) continue;
          if (args.where.isActive !== undefined && u.isActive !== args.where.isActive) continue;
          count++;
        }
        return count;
      }),
      findFirst: vi.fn(async (args: { where: { id: string; tenantId: string } }) => {
        const u = state.users.get(args.where.id);
        if (!u || u.tenantId !== args.where.tenantId) return null;
        // 補關聯欄位（select=LIST_SELECT 時用、toPublicUserFromListRow 需要）
        return {
          ...u,
          createdByUser: { userAccount: 'admin', userName: '管理員' },
          updatedByUser: { userAccount: 'admin', userName: '管理員' },
          rev_Nx01UserRole_userId: [],
          rev_Nx01UserWarehouse_userId: [],
          employeeId: null,
          email: null,
          phone: null,
          lastLoginAt: null,
          createdAt: new Date(),
          createdBy: 'admin',
          updatedAt: new Date(),
          updatedBy: 'admin',
        };
      }),
      findMany: vi.fn(async (args: { where: { tenantId: string; id: { in: string[] } } }) => {
        return args.where.id.in
          .map((id) => state.users.get(id))
          .filter((u): u is UserStub => Boolean(u) && u.tenantId === args.where.tenantId);
      }),
      update: vi.fn(async (args: { where: { id: string }; data: { isActive?: boolean } }) => {
        const u = state.users.get(args.where.id);
        if (!u) throw new Error('not found');
        if (args.data.isActive !== undefined) u.isActive = args.data.isActive;
        return {
          ...u,
          employeeId: null,
          email: null,
          phone: null,
          lastLoginAt: null,
          createdAt: new Date(),
          createdBy: 'admin',
          updatedAt: new Date(),
          updatedBy: 'admin',
        };
      }),
    },
    nx99Subscription: {
      findFirst: vi.fn(async () => {
        if (state.subscriptionSeats === null) return null;
        return { seats: state.subscriptionSeats };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  } as never;

  const audit = { write: vi.fn().mockResolvedValue(undefined) } as never;
  return new UserService(prisma, audit);
}

function seedState(seats: number | null, users: UserStub[]): State {
  return {
    subscriptionSeats: seats,
    users: new Map(users.map((u) => [u.id, u])),
  };
}

const owner: UserStub = {
  id: 'NX01USEROWNER001',
  tenantId: TENANT_ID,
  userAccount: 'crown',
  userName: '林翰杰（負責人）',
  isActive: true,
};

function pendingEmployee(idx: number): UserStub {
  return {
    id: `NX01USEREMP${String(idx).padStart(5, '0')}`,
    tenantId: TENANT_ID,
    userAccount: `EMP${idx}`,
    userName: `員工${idx}`,
    isActive: false,
  };
}

describe('getSeatUsage', () => {
  it('回傳 used / total / available（含負責人計入 used）', async () => {
    const state = seedState(10, [owner, pendingEmployee(1), pendingEmployee(2)]);
    const svc = makeService(state);
    const usage = await svc.getSeatUsage(adminUser);
    expect(usage.used).toBe(1); // 只有 owner 是 active
    expect(usage.total).toBe(10);
    expect(usage.available).toBe(9);
  });

  it('seats 全用完、available 為 0', async () => {
    const all10 = [owner, ...Array.from({ length: 9 }).map((_, i) => ({ ...pendingEmployee(i + 1), isActive: true }))];
    const state = seedState(10, all10);
    const svc = makeService(state);
    const usage = await svc.getSeatUsage(adminUser);
    expect(usage.used).toBe(10);
    expect(usage.total).toBe(10);
    expect(usage.available).toBe(0);
  });
});

describe('bulkActivate — Crown 規則：含負責人 ≤ seats', () => {
  it('seats=10、已用 1（負責人）、勾 9 名員工全啟用 → 成功、used=10', async () => {
    const employees = Array.from({ length: 12 }).map((_, i) => pendingEmployee(i + 1));
    const state = seedState(10, [owner, ...employees]);
    const svc = makeService(state);
    const targetIds = employees.slice(0, 9).map((u) => u.id);

    const result = await svc.bulkActivate(adminUser, { userIds: targetIds });
    expect(result.activated).toBe(9);
    expect(result.seatUsage.used).toBe(10); // owner + 9 員工 = 10
    expect(result.seatUsage.total).toBe(10);
    expect(result.seatUsage.available).toBe(0);
  });

  it('seats=10、已用 1（負責人）、勾 10 名員工 → 全擋（10+1>10）、SE-001', async () => {
    const employees = Array.from({ length: 12 }).map((_, i) => pendingEmployee(i + 1));
    const state = seedState(10, [owner, ...employees]);
    const svc = makeService(state);
    const targetIds = employees.slice(0, 10).map((u) => u.id);

    await expect(svc.bulkActivate(adminUser, { userIds: targetIds })).rejects.toMatchObject({
      constructor: NexoraHttpException,
    });
    // 啟用前狀態應全保持
    for (const id of targetIds) {
      expect(state.users.get(id)!.isActive).toBe(false);
    }
  });

  it('擋的訊息含「已達席次上限（1/10 席）」、無推銷字眼', async () => {
    const employees = Array.from({ length: 12 }).map((_, i) => pendingEmployee(i + 1));
    const state = seedState(10, [owner, ...employees]);
    const svc = makeService(state);

    try {
      await svc.bulkActivate(adminUser, { userIds: employees.slice(0, 10).map((u) => u.id) });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(NexoraHttpException);
      const err = e as NexoraHttpException;
      expect(err.errorCode).toBe('SE-001');
      expect(err.message).toContain('1/10');
      expect(err.message).toContain('席次上限');
      // 無推銷字眼
      expect(err.message).not.toMatch(/升級|加購|聯絡|upgrade|contact/i);
    }
  });

  it('已啟用的不算 delta（idempotent）：勾 5 名其中 3 已啟用、只 activate 2', async () => {
    const employees = Array.from({ length: 10 }).map((_, i) => {
      const u = pendingEmployee(i + 1);
      if (i < 3) u.isActive = true; // 前 3 已啟用
      return u;
    });
    const state = seedState(10, [owner, ...employees]);
    const svc = makeService(state);
    // used 起始 = 1 (owner) + 3 (前 3) = 4
    const result = await svc.bulkActivate(adminUser, { userIds: employees.slice(0, 5).map((u) => u.id) });
    expect(result.activated).toBe(2);
    expect(result.seatUsage.used).toBe(6); // 4 + 2
  });

  it('無有效訂閱 → SE-002 防護', async () => {
    const state = seedState(null, [owner, pendingEmployee(1)]);
    const svc = makeService(state);
    try {
      await svc.bulkActivate(adminUser, { userIds: ['NX01USEREMP00001'] });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(NexoraHttpException);
      expect((e as NexoraHttpException).errorCode).toBe('SE-002');
    }
  });

  it('userIds 中有不屬本租戶的 id → NotFound', async () => {
    const state = seedState(10, [owner, pendingEmployee(1)]);
    const svc = makeService(state);
    await expect(
      svc.bulkActivate(adminUser, { userIds: ['NX01USERNOTEXIST'] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('userIds 空陣列（trim 後）→ ConflictException', async () => {
    const state = seedState(10, [owner]);
    const svc = makeService(state);
    await expect(svc.bulkActivate(adminUser, { userIds: ['   '] })).rejects.toThrow(ConflictException);
  });
});

describe('update — false→true 走 seat check、true→false 不檢查', () => {
  it('將未啟用切啟用、席次滿（10/10）→ 擋、SE-001、isActive 保持 false', async () => {
    const all10 = [owner, ...Array.from({ length: 9 }).map((_, i) => ({ ...pendingEmployee(i + 1), isActive: true }))];
    const pending = pendingEmployee(99);
    const state = seedState(10, [...all10, pending]);
    const svc = makeService(state);
    await expect(svc.update(adminUser, pending.id, { isActive: true })).rejects.toMatchObject({
      constructor: NexoraHttpException,
    });
    expect(state.users.get(pending.id)!.isActive).toBe(false);
  });

  it('將未啟用切啟用、席次未滿 → 通過、isActive=true', async () => {
    const pending = pendingEmployee(1);
    const state = seedState(10, [owner, pending]);
    const svc = makeService(state);
    await svc.update(adminUser, pending.id, { isActive: true });
    expect(state.users.get(pending.id)!.isActive).toBe(true);
  });

  it('將已啟用切未啟用、不走 seat check（即使席次滿）', async () => {
    const all10 = [owner, ...Array.from({ length: 9 }).map((_, i) => ({ ...pendingEmployee(i + 1), isActive: true }))];
    const state = seedState(10, all10);
    const svc = makeService(state);
    const target = all10[5]!; // 任一已啟用員工
    await svc.update(adminUser, target.id, { isActive: false });
    expect(state.users.get(target.id)!.isActive).toBe(false);
  });
});
