// apps/nx-api/vitest.config.ts
// 為 D4 翻譯器測試補的 vitest 設定。
// 結構：
// - default 模式跑所有 .spec.ts + .int-spec.ts
// - test:unit 排除 .int-spec.ts（CI 預設只跑這條，跑得快）
// - test:integration 只跑 .int-spec.ts（需要 Docker testcontainers，較慢）
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{spec,int-spec}.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // 整合測試共用同一 DB（fixture loading + cleanup 不能並行 race）
    // unit tests 並行收益微小，全部序列化簡化心智負擔
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{spec,int-spec}.ts', 'src/**/dto/*.ts'],
    },
  },
});
