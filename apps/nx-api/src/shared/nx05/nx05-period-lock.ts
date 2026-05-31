import { BadRequestException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import type { PrismaClient } from 'db-core';

// ────────────────────────────────────────────────────────────
// v1.2 階段 F P3：期粒度鎖定（C 案上報旗標）
//
// 對齊意圖書 §5.3：
//   - 鎖以「期」為粒度（雙月一期、含兩個月）
//   - 月關帳 status='CLOSED' → 該月鎖、但若期未上報可解鎖（status='REOPENED'）
//   - 期已上報（report_filed_at 非 null）→ 整期所有月鎖死、解鎖按鈕消失
//
// 期碼格式：YYYY-EE
//   - 01 期 = 1-2 月    （月 1, 2  → '2026-01'）
//   - 02 期 = 3-4 月    （月 3, 4  → '2026-02'）
//   - 03 期 = 5-6 月    （月 5, 6  → '2026-03'）
//   - 04 期 = 7-8 月    （月 7, 8  → '2026-04'）
//   - 05 期 = 9-10 月   （月 9, 10 → '2026-05'）
//   - 06 期 = 11-12 月  （月 11, 12 → '2026-06'）
// ────────────────────────────────────────────────────────────

function yearMonth(d: Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}

/** 算曆月日期所屬的 401 期碼（YYYY-EE）。 */
export function yearPeriod(d: Date): string {
  const x = new Date(d);
  const month = x.getMonth() + 1; // 1~12
  const period = Math.ceil(month / 2); // 1=Jan/Feb, 2=Mar/Apr, ..., 6=Nov/Dec
  return `${x.getFullYear()}-${String(period).padStart(2, '0')}`;
}

/** 算 401 期所含的兩個月（YYYY-MM 清單、用於整期鎖定範圍說明）。 */
export function monthsInPeriod(yp: string): string[] {
  const m = yp.match(/^(\d{4})-(\d{2})$/);
  if (!m) return [];
  const year = parseInt(m[1]!, 10);
  const period = parseInt(m[2]!, 10);
  const month1 = period * 2 - 1;
  const month2 = period * 2;
  return [
    `${year}-${String(month1).padStart(2, '0')}`,
    `${year}-${String(month2).padStart(2, '0')}`,
  ];
}

/**
 * 期粒度鎖定：
 *   - 該月所屬期已上報 401 → 整期所有月鎖死、不可修改
 *   - 期未上報、該月 CLOSED 未 REOPENED → 該月鎖（負責人可解鎖回頭改）
 *   - 期未上報、該月 REOPENED → 該月可改
 */
export async function assertFinancePeriodMutable(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  docDate: Date,
): Promise<void> {
  const ym = yearMonth(docDate);
  const yp = yearPeriod(docDate);

  // 1) 期已上報 → 整期硬鎖
  const filed = await db.nx05Closing.findFirst({
    where: {
      tenantId,
      reportPeriod: yp,
      reportFiledAt: { not: null },
    },
    select: { id: true },
  });
  if (filed) {
    throw new BadRequestException(
      `401 申報期 ${yp} 已上報、整期（含 ${monthsInPeriod(yp).join(' / ')}）鎖死、不可修改`,
    );
  }

  // 2) 月鎖（既有曆月邏輯保留）：CLOSED 未 REOPENED → 該月鎖
  const closings = await db.nx05Closing.findMany({
    where: { tenantId, status: 'CLOSED' },
    select: { closingDate: true },
  });
  for (const c of closings) {
    if (yearMonth(new Date(c.closingDate)) === ym) {
      throw new BadRequestException(
        `會計月份 ${ym} 已關帳、不可修改（期 ${yp} 未上報、負責人可解鎖回頭改）`,
      );
    }
  }
}
