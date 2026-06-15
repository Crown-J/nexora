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
  // design 區邊界守：design/* 不該 import @/features/* 業務邏輯
  // 階段二設 warn level（非 error）、現有 14 處反向依賴標 ⚠️ 給階段三處理：
  //   - design/{dashboard,home,layout,theme} 引 features/auth/hooks/* (5 處)
  //   - design/{home,layout,theme} 引 features/sys-dashboard/context/* (5 處)
  //   - design/home/dock.tsx 引 features/base/config/master-cards (1 處)
  //   - design/layout/DashboardShell 引 features/page-guide (1 處)
  // 階段三若把這些 features 拆乾淨後可升級為 error。
  {
    files: ["src/design/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["warn", {
        patterns: [
          {
            group: ["@/features/*"],
            message: "design 區不該 import @/features/* 業務邏輯（請改用 @data/* 或留 ⚠️ TODO 給階段三）",
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
