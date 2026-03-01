/**
 * File: apps/nx-ui/src/shared/lib/parse.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - SHARED-LIB-PARSE-001：parse helpers（trim/int）
 *
 * Notes:
 * - 給 hooks / ui 共用的小工具
 */

export function trimOrEmpty(v: string | null | undefined): string {
    return (v ?? '').trim();
}

export function trimOrUndef(v: string | null | undefined): string | undefined {
    const s = (v ?? '').trim();
    return s ? s : undefined;
}

export function parsePositiveInt(v: string | null, fallback: number): number {
    if (!v) return fallback;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}