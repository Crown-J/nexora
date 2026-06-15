import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // data 區邊界守：data/* 不可 import features/* 或 components/*（design 邊界）
  {
    files: ["src/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/features/*", "@/components/*"],
            message: "data 區不可 import @/features/* 或 @/components/*（資料/設計邊界、改用 @data/* 或留 ⚠️ TODO 給階段二）",
          },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
