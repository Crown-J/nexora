/**
 * NEXORA PRO 級方案（NX07/NX08/NX09 等 PRO 模組共用）。
 */
export function planSupportsNexoraPro(planCode: string | null | undefined): boolean {
  const p = (planCode ?? '').trim().toUpperCase();
  if (!p) return false;
  return p === 'PRO' || p === 'NEXORA-PRO' || p === 'NEXORA-ENTERPRISE';
}
