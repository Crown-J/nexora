export type SeedTier = 'LITE' | 'PLUS' | 'PRO';

export function parseSeedTier(raw: string | undefined, fallback: SeedTier): SeedTier {
  const u = (raw ?? '').toUpperCase();
  if (u === 'LITE' || u === 'PLUS' || u === 'PRO') return u;
  return fallback;
}

/** CSV seed_type: ALL / PLUS / PRO */
export function includeSeedRow(seedType: string, tier: SeedTier): boolean {
  const s = (seedType ?? 'ALL').toUpperCase().trim();
  if (s === 'ALL') return true;
  if (s === 'PLUS') return tier === 'PLUS' || tier === 'PRO';
  if (s === 'PRO') return tier === 'PRO';
  return true;
}
