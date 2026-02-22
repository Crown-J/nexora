/**
 * File: apps/nx-ui/src/app/layout.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-ROOT-001：全域 Root Layout
 *
 * Notes:
 * - 套用全域字型（Geist）
 * - 套用深色主題基底
 * - 提供 metadata（SEO / title）
 * - 未來可加入 AuthProvider / ThemeProvider
 */

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * @CONFIG nxui_root_metadata_001
 */
export const metadata: Metadata = {
  title: {
    default: 'NEXORA ERP',
    template: '%s | NEXORA',
  },
  description: 'Nexora ERP Console — Modular Enterprise System',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          'antialiased',
          'bg-[#05070b]',          // 全域深色基底
          'text-white',            // 預設字色
          'min-h-screen',
        ].join(' ')}
      >
        {/* 未來可放 Global Providers */}
        {children}
      </body>
    </html>
  );
}