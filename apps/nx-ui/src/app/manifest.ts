import type { MetadataRoute } from 'next';

/**
 * Web App Manifest（純網頁 PWA）
 * 圖示來自 public：favicon／PNG 由設計匯出；描述仍標註 DAILYLOG 與 repo 對應。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXORA GRID',
    short_name: 'NEXORA GRID',
    description:
      'NEXORA GRID 企業資源規劃主控台 — 可安裝 PWA；專案工作日誌見 repo dailylog/（DAILYLOG）。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#141414',
    theme_color: '#141414',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
