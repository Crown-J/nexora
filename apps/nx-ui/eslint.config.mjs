import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ⭐ 字級下限守門（介面架構 §6：內文 15–16px、最小級距 14）
//
// 為什麼要用 lint 擋，而不是寫在規格書裡就好：
//   v3.css 的檔頭已經寫了理由——「一致性靠意志力守不住，只能靠沒得選」。
//   實測：單一頁面曾有 86 處硬編字級、9 種大小；2026-08-02 全站盤點時
//   仍有 text-xs 1,549 處 ＋ text-[11~13px] 773 處（合計 2,322 處）。
//   使用者年紀偏大是產品的硬約束，12px 的料號欄等於那一欄沒人看得清楚。
//
// ⚠️ 分兩級是刻意的：
//   · v3 新範式區（design/templates、design/layout/v3）＝ error，⛔ 新程式碼不准再長出來
//   · 其餘既有頁面 ＝ warn，讓 2,322 處可以慢慢清，⛔ 不讓 lint 變成擋路的紅牆
const TINY_TEXT = String.raw`text-xs\b|text-\[1[0-3](\.[0-9]+)?px\]`;
const tinyTextRules = (level) => ({
  "no-restricted-syntax": [
    level,
    {
      selector: `Literal[value=/${TINY_TEXT}/]`,
      message:
        "字級低於 14px（介面架構 §6 最小級距 14、內文 15–16）。改掛 v3.css 的語意類別（nx-hint / nx-body / nx-th…），⛔ 不要自己選數字。",
    },
    {
      selector: `TemplateElement[value.raw=/${TINY_TEXT}/]`,
      message:
        "字級低於 14px（介面架構 §6 最小級距 14、內文 15–16）。改掛 v3.css 的語意類別（nx-hint / nx-body / nx-th…），⛔ 不要自己選數字。",
    },
  ],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 既有頁面：warn（2,322 處待清）
  { files: ["src/**/*.{ts,tsx}"], rules: tinyTextRules("warn") },
  // v3 新範式區：error（⛔ 不准回歸）
  {
    files: ["src/design/templates/**/*.{ts,tsx}", "src/design/layout/v3/**/*.{ts,tsx}"],
    rules: tinyTextRules("error"),
  },
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
