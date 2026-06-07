// apps/nx-ui/src/app/dashboard/nx07/department/page.tsx
// 05 批 T1 2026-06-07：部門主檔已升級到 /dashboard/base/department、本路徑 redirect 過去
//
// 為什麼：舊 placeholder 屬 NX07 人資模組、現在部門是核心主檔（被 8 個業務表用）、
// 應該歸在「主檔中心 → 帳號與權限」、與職務 / 使用者並列。
import { redirect } from 'next/navigation';

export default function Page(): never {
  redirect('/dashboard/base/department');
}
