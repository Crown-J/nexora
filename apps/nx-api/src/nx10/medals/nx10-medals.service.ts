import { ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Nx10MedalsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    return this.prisma.nx10MedalLevel.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortNo: 'asc' },
      select: {
        id: true,
        levelCode: true,
        levelName: true,
        tier: true,
        rank: true,
        sortNo: true,
        expThreshold: true,
        iconUrl: true,
      },
    });
  }

  async me(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const levels = await this.prisma.nx10MedalLevel.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortNo: 'asc' },
    });
    const medal = await this.prisma.nx10EmpMedal.findUnique({
      where: { userId: user.sub },
      include: { medalLevel: true },
    });
    const totalExp = medal?.totalExp ?? 0;
    const current = medal?.medalLevel ?? levels[0] ?? null;
    const idx = current ? levels.findIndex((l) => l.id === current.id) : 0;
    const next = idx >= 0 && idx + 1 < levels.length ? levels[idx + 1] : null;
    return {
      totalExp,
      currentLevel: current
        ? {
            id: current.id,
            levelCode: current.levelCode,
            levelName: current.levelName,
            expThreshold: current.expThreshold,
          }
        : null,
      nextLevel: next
        ? {
            id: next.id,
            levelCode: next.levelCode,
            levelName: next.levelName,
            expThreshold: next.expThreshold,
          }
        : null,
      expToNext: next ? Math.max(0, next.expThreshold - totalExp) : 0,
      ladder: levels.map((l) => ({
        id: l.id,
        levelCode: l.levelCode,
        levelName: l.levelName,
        expThreshold: l.expThreshold,
        reached: totalExp >= l.expThreshold,
      })),
    };
  }
}
