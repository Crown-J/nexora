/**
 * File: apps/nx-ui/src/features/layout/ui/dock-icons.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Dock 導覽圖示（ErpAppShell / 共用）
 */

export function IconHome() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z"
      />
    </svg>
  );
}

export function IconLayers() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m3 12 9 5 9-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m3 16 9 5 9-5" />
    </svg>
  );
}

export function IconBox() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m12 2 8 4.5v11L12 22 4 17.5v-11L12 2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 22V11.5M20 6.5l-8 5-8-5" />
    </svg>
  );
}

export function IconWarehouse() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M3 10 12 4l9 6v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 21v-7h8v7M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
}

export function IconCart() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 .96-.72L21 7H7.1"
      />
      <circle cx="10" cy="19" r="1.7" />
      <circle cx="17" cy="19" r="1.7" />
    </svg>
  );
}

export function IconReceipt() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M7 3h10a1 1 0 0 1 1 1v16l-2.5-1.5L13 20l-2.5-1.5L8 20 6 18.5V4a1 1 0 0 1 1-1Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconChart() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 20V9m6 11V4m6 16v-7m6 7V6" />
    </svg>
  );
}
