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

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { PwaRegister } from '@/components/pwa-register';
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
    default: 'NEXORA ERP — DAILYLOG',
    template: '%s | NEXORA',
  },
  description:
    'Nexora ERP Console — Modular Enterprise System（純網頁 PWA；DAILYLOG 見 repo dailylog/）',
  icons: {
    icon: '/favicon.ico',
    apple: '/pwa-icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'NEXORA ERP — DAILYLOG',
    statusBarStyle: 'black-translucent',
  },
};

/**
 * @CONFIG nxui_root_viewport_001
 * PWA / 行動裝置主題列與色彩
 */
export const viewport: Viewport = {
  themeColor: '#141414',
  colorScheme: 'dark',
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
          'font-sans',
          'min-h-screen',
        ].join(' ')}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}