import path from 'node:path';

/** Expect `process.cwd()` = packages/db-core when running seed scripts. */
export function prismaDirFromCwd(): string {
  return path.resolve(process.cwd(), 'prisma');
}

export function seedDataSystemDir(): string {
  return path.join(prismaDirFromCwd(), 'seed-data', 'system');
}
