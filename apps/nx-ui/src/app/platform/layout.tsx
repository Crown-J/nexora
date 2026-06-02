// apps/nx-ui/src/app/platform/layout.tsx
// 平台層 vs 租戶層分離軌 Phase 6.5：layout 拆成 server（本檔、export metadata）+ client（PlatformShell）
//
// 為什麼拆：
// - root layout 用 metadata.title='NEXORA GRID' + apple-mobile-web-app-title='NEXORA GRID'
// - 平台後台必須拿掉這個品牌殘留（連 <head> 的 title / SEO meta 也要乾淨）
// - Next.js metadata 必須在 server component 裡 export、client component 不行
// - 解法：本檔變 server、export metadata 覆蓋 root；認證 / 互動邏輯下沉到 PlatformShell（client）

import type { Metadata, Viewport } from 'next';

import { PlatformShell } from '@/features/platform/ui/PlatformShell';

export const metadata: Metadata = {
  // absolute 強制覆蓋 root 的 template '%s | NEXORA GRID'、平台後台不掛客戶端品牌
  title: {
    absolute: 'Platform Console',
    template: '%s · Platform Console',
  },
  description: 'NEXORA platform operator console — restricted area.',
  // 移除 apple-mobile-web-app-title 殘留（root 的 'NEXORA GRID'）
  appleWebApp: {
    capable: true,
    title: 'Platform Console',
    statusBarStyle: 'black-translucent',
  },
  // robots：平台後台不該被搜尋引擎索引
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
