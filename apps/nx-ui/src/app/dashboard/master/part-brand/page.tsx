// apps/nx-ui/src/app/dashboard/master/part-brand/page.tsx
// 2026-06-18 退役:零件廠牌已併入 nx01/brands（用 isPart 開關）。
//   舊 URL redirect 到 /dashboard/master/brand。
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/master/brand');
}
