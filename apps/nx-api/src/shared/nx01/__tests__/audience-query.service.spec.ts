// apps/nx-api/src/shared/nx01/__tests__/audience-query.service.spec.ts
// Nx01AudienceQueryService unit test — mock Prisma、驗證 A037 closure 3 個 query 範式。

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Nx01AudienceQueryService } from '../audience-query.service';

const TENANT_ID = 'NX99TANT9900002';

function makeService(findMany: ReturnType<typeof vi.fn>): Nx01AudienceQueryService {
  const prisma = {
    nx01UserTeam: { findMany },
  } as never;
  return new Nx01AudienceQueryService(prisma);
}

describe('Nx01AudienceQueryService', () => {
  describe('findLeaderUserIds', () => {
    it('returns distinct user IDs where isLeader=true', async () => {
      const findMany = vi.fn().mockResolvedValue([
        { userId: 'NX01USER9900021' },
        { userId: 'NX01USER9900022' },
      ]);
      const svc = makeService(findMany);

      const result = await svc.findLeaderUserIds(TENANT_ID);

      expect(result).toEqual(['NX01USER9900021', 'NX01USER9900022']);
      expect(findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          isLeader: true,
          user: { isActive: true },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
    });

    it('returns empty array when no leader', async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const svc = makeService(findMany);

      expect(await svc.findLeaderUserIds(TENANT_ID)).toEqual([]);
    });
  });

  describe('findUserIdsByTeam', () => {
    it('queries by teamId + tenantId + active', async () => {
      const findMany = vi.fn().mockResolvedValue([{ userId: 'NX01USER9900021' }]);
      const svc = makeService(findMany);
      const teamId = 'NX01TEAM0000001';

      const result = await svc.findUserIdsByTeam(TENANT_ID, teamId);

      expect(result).toEqual(['NX01USER9900021']);
      expect(findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          teamId,
          user: { isActive: true },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
    });
  });

  describe('findUserIdsByDepartment', () => {
    it('queries by team.department.code', async () => {
      const findMany = vi.fn().mockResolvedValue([
        { userId: 'NX01USER9900021' },
        { userId: 'NX01USER9900027' },
      ]);
      const svc = makeService(findMany);

      const result = await svc.findUserIdsByDepartment(TENANT_ID, 'SALES');

      expect(result).toEqual(['NX01USER9900021', 'NX01USER9900027']);
      expect(findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          team: { department: { code: 'SALES' } },
          user: { isActive: true },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
    });

    it('returns empty array when department has no user', async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const svc = makeService(findMany);

      expect(await svc.findUserIdsByDepartment(TENANT_ID, 'NONEXIST')).toEqual([]);
    });
  });

  describe('multi-tenant isolation', () => {
    it('always passes tenantId in WHERE', async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const svc = makeService(findMany);

      await svc.findLeaderUserIds(TENANT_ID);
      await svc.findUserIdsByTeam(TENANT_ID, 'NX01TEAM0000001');
      await svc.findUserIdsByDepartment(TENANT_ID, 'SALES');

      for (const call of findMany.mock.calls) {
        expect(call[0].where.tenantId).toBe(TENANT_ID);
      }
    });
  });
});
