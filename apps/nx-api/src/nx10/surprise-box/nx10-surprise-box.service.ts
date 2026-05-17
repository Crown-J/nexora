// apps/nx-api/src/nx10/surprise-box/nx10-surprise-box.service.ts
// NX10 SurpriseBox service（八角驅動力 #7 不可預期與好奇 ⭐ 業界 gamification 經典範式）
//
// 對齊：
//   - overview v0.1.0 §1.2 驅動力 #7
//   - audit-01 §6.2 業界 muscle memory #6 驚喜寶箱
//   - plan §L2 + Hank Q-H7：N=10~30 / R=31~80 / E=81~200 隨機 Exp
//
// 業務語意：
//   - openBox：員工手動開箱（每日最多 3 個）
//     * boxType 隨機（30% E / 30% R / 40% N、boxType 越稀有 Exp 越多）
//     * triggerType='OT' （手動觸發）
//     * 自動 award Exp via Nx10ExpService.applyExpChange（內部 wire）
//   - listMyBoxes：個人歷史

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx10ExpService } from '../exp/nx10-exp.service';
import { formatYmdInTimeZone } from '../nx10-timezone.util';

const DAILY_LIMIT = 3;

interface BoxRange {
  type: 'N' | 'R' | 'E';
  min: number;
  max: number;
  weight: number;
}

const BOX_RANGES: BoxRange[] = [
  { type: 'E', min: 81, max: 200, weight: 30 }, // 史詩 30%
  { type: 'R', min: 31, max: 80, weight: 30 },  // 稀有 30%
  { type: 'N', min: 10, max: 30, weight: 40 },  // 普通 40%
];

function pickRandomBox(): BoxRange {
  const total = BOX_RANGES.reduce((s, b) => s + b.weight, 0);
  let r = Math.floor(Math.random() * total);
  for (const b of BOX_RANGES) {
    r -= b.weight;
    if (r < 0) return b;
  }
  return BOX_RANGES[BOX_RANGES.length - 1]!;
}

function rollExpInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

@Injectable()
export class Nx10SurpriseBoxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exp: Nx10ExpService,
  ) {}

  private async tenantTz(tenantId: string) {
    const t = await this.prisma.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { timezone: true },
    });
    return (t?.timezone || 'Asia/Taipei').trim() || 'Asia/Taipei';
  }

  /**
   * 開箱（驅動力 #7 不可預期與好奇）。
   * 每日上限 3 個、隨機 boxType + 隨機 Exp。
   */
  async openBox(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const tz = await this.tenantTz(user.tenantId);
    const todayYmd = formatYmdInTimeZone(new Date(), tz);
    const dayStart = new Date(`${todayYmd}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayYmd}T23:59:59.999Z`);

    const out = await this.prisma.$transaction(async (tx) => {
      const todayCount = await tx.nx10SurpriseBoxLog.count({
        where: {
          tenantId: user.tenantId!,
          userId: user.sub,
          openedAt: { gte: dayStart, lte: dayEnd },
        },
      });
      if (todayCount >= DAILY_LIMIT) {
        throw new BadRequestException(`已達每日上限（${DAILY_LIMIT} 個寶箱）`);
      }

      const box = pickRandomBox();
      const exp = rollExpInRange(box.min, box.max);

      const log = await tx.nx10SurpriseBoxLog.create({
        data: {
          tenantId: user.tenantId!,
          userId: user.sub,
          boxType: box.type,
          triggerType: 'OT',
          expEarned: exp,
          dailyCount: todayCount + 1,
        },
      });

      const expOut = await this.exp.applyExpChange(tx, {
        tenantId: user.tenantId!,
        userId: user.sub,
        amount: exp,
        sourceType: 'SB',
        reason: `驚喜寶箱（${box.type}）+${exp} Exp`,
        sourceRefId: log.id,
        actorUserId: user.sub,
      });

      return { log, expOut, box };
    });

    return {
      ok: true,
      boxId: out.log.id,
      boxType: out.box.type,
      boxTypeName: { N: '普通', R: '稀有', E: '史詩' }[out.box.type],
      expEarned: out.log.expEarned,
      dailyCount: out.log.dailyCount,
      totalExp: out.expOut.totalExp,
      currentLevel: out.expOut.levelName,
    };
  }

  /** 個人開箱歷史。 */
  async listMyBoxes(user: RequestUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.prisma.nx10SurpriseBoxLog.findMany({
      where: { tenantId: user.tenantId, userId: user.sub },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
    return { ok: true, count: rows.length, rows };
  }
}
