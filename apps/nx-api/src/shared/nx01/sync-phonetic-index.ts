// apps/nx-api/src/shared/nx01/sync-phonetic-index.ts
// 02 對齊第二批 C 軌 CP2-b 2026-06-06：注音索引同步 helper
//
// 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §4.2
// 範式：partner / part create / update 時 call、自動拆 sourceText 字元、
// 查 phonetic_dictionary 取主注音、組 phoneticCode（聲母串）+ phoneticFull（完整注音串）、
// upsert 進 phonetic_index。isManual=true 的 row 不覆蓋（業務員手動改後 trigger 跳過）。
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * 同步注音索引（partner.name / part.name 變動時呼叫）。
 * 失敗（如字典缺字、DB error）不擋業務流程、本函數 swallow exception。
 */
export async function syncPhoneticIndex(
  prisma: PrismaService,
  params: {
    tenantId: string;
    sourceTable: string;  // 'nx01_partner' / 'nx01_part' 等
    sourceId: string;
    sourceField: string;  // 'name' / 'short_name' 等
    sourceText: string;   // 原始文字（如 "陳氏汽車"）
    userId: string;
  },
): Promise<void> {
  try {
    const text = (params.sourceText ?? '').trim();
    if (!text) {
      // 空文字 → 刪除既有 index（如改名清空）
      await prisma.nx01PhoneticIndex.deleteMany({
        where: {
          tenantId: params.tenantId,
          sourceTable: params.sourceTable,
          sourceId: params.sourceId,
        },
      });
      return;
    }

    // 拆字符（含中英數、實際 dictionary 只查得到漢字、其他字符 fallback 原樣）
    const chars = Array.from(text);
    const dictRows = await prisma.nx01PhoneticDictionary.findMany({
      where: { character: { in: chars }, isActive: true },
      select: { character: true, primaryPhonetic: true, primaryInitial: true },
    });
    const dict = new Map(dictRows.map((d) => [d.character, d] as const));

    const initials: string[] = [];
    const fulls: string[] = [];
    for (const ch of chars) {
      const d = dict.get(ch);
      if (d) {
        initials.push(d.primaryInitial);
        fulls.push(d.primaryPhonetic);
      } else {
        // 字典查不到（英數 / 標點 / 罕字）→ 原樣保留、業務員仍可用打字搜得到
        initials.push(ch);
        fulls.push(ch);
      }
    }
    const phoneticCode = initials.join('').slice(0, 50);
    const phoneticFull = fulls.join(' ').slice(0, 200);

    // 既有 isManual=true 不覆蓋
    const existing = await prisma.nx01PhoneticIndex.findFirst({
      where: {
        tenantId: params.tenantId,
        sourceTable: params.sourceTable,
        sourceId: params.sourceId,
      },
      select: { id: true, isManual: true },
    });
    if (existing?.isManual) return;

    if (existing) {
      await prisma.nx01PhoneticIndex.update({
        where: { id: existing.id },
        data: {
          sourceField: params.sourceField,
          sourceText: text.slice(0, 500),
          phoneticCode,
          phoneticFull,
          updatedBy: params.userId,
        },
      });
    } else {
      await prisma.nx01PhoneticIndex.create({
        data: {
          tenantId: params.tenantId,
          sourceTable: params.sourceTable,
          sourceId: params.sourceId,
          sourceField: params.sourceField,
          sourceText: text.slice(0, 500),
          phoneticCode,
          phoneticFull,
          isManual: false,
          createdBy: params.userId,
          updatedBy: params.userId,
        },
      });
    }
  } catch {
    // sync 失敗不擋業務流程（trigger best-effort）
  }
}

/**
 * 對 sourceTable 搜尋 phonetic match 的 sourceId list（list service 用、再 filter partner / part）。
 * 接受 phonetic input（如「ㄔㄣˊ」或「ㄔㄈ」聲母組）、做 phoneticFull contains + phoneticCode contains OR。
 */
export async function searchPhoneticSourceIds(
  prisma: PrismaService,
  tenantId: string,
  sourceTable: string,
  phoneticQuery: string,
): Promise<string[]> {
  const p = phoneticQuery.trim();
  if (!p) return [];
  const rows = await prisma.nx01PhoneticIndex.findMany({
    where: {
      tenantId,
      sourceTable,
      OR: [
        { phoneticFull: { contains: p } },
        { phoneticCode: { contains: p } },
        { sourceText: { contains: p, mode: 'insensitive' } },
      ],
    },
    select: { sourceId: true },
    take: 500,
  });
  return Array.from(new Set(rows.map((r) => r.sourceId)));
}
