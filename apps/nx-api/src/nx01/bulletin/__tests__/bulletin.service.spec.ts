// apps/nx-api/src/nx01/bulletin/__tests__/bulletin.service.spec.ts
// BulletinService unit test — status transition + audience resolution + read log + attachment + multi-tenant 隔離

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { BulletinService } from '../bulletin.service';

const TENANT_ID = 'NX99TANT9900002';
const USER_ID = 'NX01USER9900002';
const fakeUser = {
  sub: USER_ID,
  username: 'admin',
  roles: ['SYSADMIN'],
  tenantId: TENANT_ID,
  tenantCode: 'TEST',
  planCode: 'PLUS',
} as never;

function makeMocks() {
  const prisma = {
    nx01Bulletin: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    nx01BulletinCategory: { findFirst: vi.fn() },
    nx01BulletinAttachment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    nx01BulletinReadLog: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
    nx01User: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const audit = { write: vi.fn().mockResolvedValue(undefined) };
  const fileUpload = {
    upload: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
    download: vi.fn(),
  };
  const audienceQuery = {
    findLeaderUserIds: vi.fn().mockResolvedValue([]),
    findUserIdsByTeam: vi.fn().mockResolvedValue([]),
    findUserIdsByDepartment: vi.fn().mockResolvedValue([]),
  };
  const svc = new BulletinService(
    prisma as never,
    audit as never,
    fileUpload as never,
    audienceQuery as never,
  );
  return { svc, prisma, audit, fileUpload, audienceQuery };
}

describe('BulletinService', () => {
  describe('list', () => {
    it('filters by tenantId + status + categoryId', async () => {
      const { svc, prisma } = makeMocks();
      await svc.list(fakeUser, { status: 'published', categoryId: 'NX01BCAT0000003' });
      const call = prisma.nx01Bulletin.findMany.mock.calls[0][0];
      expect(call.where.tenantId).toBe(TENANT_ID);
      expect(call.where.status).toBe('published');
      expect(call.where.categoryId).toBe('NX01BCAT0000003');
    });
  });

  describe('create', () => {
    it('defaults status=draft when not provided', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.create.mockResolvedValue({
        id: 'NX01BULL0000001',
        tenantId: TENANT_ID,
        title: 'Test',
        status: 'draft',
      });
      await svc.create(fakeUser, { title: 'Test' });
      const call = prisma.nx01Bulletin.create.mock.calls[0][0];
      expect(call.data.status).toBe('draft');
      expect(call.data.importance).toBe('normal');
      expect(call.data.audienceUserIds).toEqual([]);
    });

    it('rejects invalid categoryId', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01BulletinCategory.findFirst.mockResolvedValue(null);
      await expect(
        svc.create(fakeUser, { title: 'X', categoryId: 'INVALID' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('status transitions', () => {
    it('rejects invalid transition (published → draft)', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({
        id: 'NX01BULL0000001',
        tenantId: TENANT_ID,
        status: 'published',
        title: 'X',
      });
      await expect(
        svc.update(fakeUser, 'NX01BULL0000001', { status: 'draft' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows draft → published', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({
        id: 'NX01BULL0000001',
        tenantId: TENANT_ID,
        status: 'draft',
        title: 'X',
      });
      prisma.nx01Bulletin.update.mockResolvedValue({
        id: 'NX01BULL0000001',
        tenantId: TENANT_ID,
        status: 'published',
        title: 'X',
      });
      const result = await svc.publish(fakeUser, 'NX01BULL0000001');
      expect(result.status).toBe('published');
    });

    it('rejects withdrawn → published', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({
        id: 'X',
        tenantId: TENANT_ID,
        status: 'withdrawn',
        title: 'X',
      });
      await expect(
        svc.update(fakeUser, 'X', { status: 'published' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resolveAudienceUserIds', () => {
    it('tenant_all returns all active users', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({
        audienceUserIds: [],
        category: { code: 'all', audienceLogic: 'tenant_all', teamId: null },
      });
      prisma.nx01User.findMany.mockResolvedValue([
        { id: 'NX01USER9900021' },
        { id: 'NX01USER9900022' },
      ]);
      const ids = await svc.resolveAudienceUserIds(fakeUser, 'NX01BULL0000001');
      expect(ids.sort()).toEqual(['NX01USER9900021', 'NX01USER9900022']);
    });

    it('leaders_all calls audienceQuery.findLeaderUserIds', async () => {
      const { svc, prisma, audienceQuery } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({
        audienceUserIds: [],
        category: { code: 'mgmt', audienceLogic: 'leaders_all', teamId: null },
      });
      audienceQuery.findLeaderUserIds.mockResolvedValue(['NX01USER9900025']);
      const ids = await svc.resolveAudienceUserIds(fakeUser, 'NX01BULL0000001');
      expect(audienceQuery.findLeaderUserIds).toHaveBeenCalledWith(TENANT_ID);
      expect(ids).toEqual(['NX01USER9900025']);
    });

    it('by_team_id calls audienceQuery.findUserIdsByTeam', async () => {
      const { svc, prisma, audienceQuery } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({
        audienceUserIds: [],
        category: { code: 'sales', audienceLogic: 'by_team_id', teamId: 'NX01TEAM0000002' },
      });
      audienceQuery.findUserIdsByTeam.mockResolvedValue(['NX01USER9900028']);
      const ids = await svc.resolveAudienceUserIds(fakeUser, 'NX01BULL0000001');
      expect(audienceQuery.findUserIdsByTeam).toHaveBeenCalledWith(TENANT_ID, 'NX01TEAM0000002');
      expect(ids).toEqual(['NX01USER9900028']);
    });

    it('audienceUserIds 補充指定 user 與 category 對象去重', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({
        audienceUserIds: ['NX01USER9900099', 'NX01USER9900021'],
        category: { code: 'all', audienceLogic: 'tenant_all', teamId: null },
      });
      prisma.nx01User.findMany.mockResolvedValue([
        { id: 'NX01USER9900021' },
        { id: 'NX01USER9900022' },
      ]);
      const ids = await svc.resolveAudienceUserIds(fakeUser, 'NX01BULL0000001');
      expect(new Set(ids)).toEqual(
        new Set(['NX01USER9900021', 'NX01USER9900022', 'NX01USER9900099']),
      );
    });
  });

  describe('markRead', () => {
    it('first read inserts log + increments readCount', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({ id: 'NX01BULL0000001' });
      prisma.nx01BulletinReadLog.findUnique.mockResolvedValue(null);
      const result = await svc.markRead(fakeUser, 'NX01BULL0000001', {});
      expect(result.alreadyRead).toBe(false);
    });

    it('second read returns alreadyRead=true、不重複增 count', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({ id: 'NX01BULL0000001' });
      prisma.nx01BulletinReadLog.findUnique.mockResolvedValue({ id: 'NX01BRLG0000001' });
      const result = await svc.markRead(fakeUser, 'NX01BULL0000001', {});
      expect(result.alreadyRead).toBe(true);
    });
  });

  describe('attachment', () => {
    it('upload calls FileUploadService + creates db row', async () => {
      const { svc, prisma, fileUpload } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({ id: 'NX01BULL0000001' });
      fileUpload.upload.mockResolvedValue({
        storageKey: `${TENANT_ID}/nx01-bulletin/2026/05/uuid.pdf`,
        size: 100,
        mimeType: 'application/pdf',
        origFilename: 'memo.pdf',
      });
      prisma.nx01BulletinAttachment.create.mockResolvedValue({ id: 'NX01BATT0000001' });
      await svc.addAttachment(fakeUser, 'NX01BULL0000001', {
        originalFilename: 'memo.pdf',
        mimeType: 'application/pdf',
        base64Content: Buffer.from('hello').toString('base64'),
      });
      expect(fileUpload.upload).toHaveBeenCalledTimes(1);
      const uploadCall = fileUpload.upload.mock.calls[0][0];
      expect(uploadCall.tenantId).toBe(TENANT_ID);
      expect(uploadCall.module).toBe('nx01-bulletin');
    });

    it('rejects empty attachment', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue({ id: 'X' });
      await expect(
        svc.addAttachment(fakeUser, 'X', {
          originalFilename: 'empty.pdf',
          mimeType: 'application/pdf',
          base64Content: '',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('multi-tenant 隔離', () => {
    it('getById 404 when bulletin not in tenant', async () => {
      const { svc, prisma } = makeMocks();
      prisma.nx01Bulletin.findFirst.mockResolvedValue(null);
      await expect(svc.getById(fakeUser, 'OTHER_TENANT_BULLETIN')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
