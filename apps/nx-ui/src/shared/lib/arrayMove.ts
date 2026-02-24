/**
 * File: apps/nx-ui/src/shared/lib/arrayMove.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-ARRAYMOVE-001：array move helper（drag reorder）
 */

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}