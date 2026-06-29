// apps/nx-ui/src/design/brand/BrandLogo.tsx
// NEXORA GRID 品牌標記（立體 N、墨藍×銀）。2026-06-29 取代舊鋼鐵星球 logo。
// 與 public/pwa-icon.svg / app/icon.svg 同一造型，全站一致。
import type { CSSProperties } from 'react';

const N_PATH = 'M30,32 L46,32 L74,74 L74,32 L90,32 L90,92 L74,92 L46,50 L46,92 L30,92 Z';

export function BrandLogo({
  size = 44,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={style}
      role="img"
      aria-label="NEXORA GRID"
    >
      <rect width="120" height="120" rx="28" fill="#25365a" />
      <path d={N_PATH} fill="#16223b" transform="translate(4,5)" />
      <path d={N_PATH} fill="#e8ebf0" />
      <path d={N_PATH} fill="none" stroke="#9fb6d6" strokeWidth="1.2" strokeOpacity="0.6" />
    </svg>
  );
}
