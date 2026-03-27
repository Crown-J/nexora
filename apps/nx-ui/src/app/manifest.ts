import type { MetadataRoute } from 'next';

/**
 * Web App Manifest（純網頁 PWA）
 * 名稱與描述含 DAILYLOG，與 repo `dailylog/` 工作日誌對應。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXORA ERP — DAILYLOG',
    short_name: 'NEXORA',
    description:
      'NEXORA 企業資源規劃主控台 — 與專案 DAILYLOG（dailylog/）對應之可安裝 PWA。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#141414',
    theme_color: '#141414',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/pwa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/pwa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
