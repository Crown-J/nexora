/**
 * @SYS-AUTH-MID-001-F01
 * Dashboard 路由：Demo 模式直接放行（其餘維持 next，供日後擴充 Edge 驗證）
 *
 * 2026-07-26 新版面封存軌（執行長拍板）：
 * - 舊版面 /dashboard 全區軟封存 → 一律導新殼 /work（檔案原地不動、隨時可回復）
 * - 內部開關（本機對照用）：/dashboard?legacy=1 → 種 nx-legacy cookie 放行；?legacy=0 → 清除
 * - Demo 模式維持原樣放行（撿包看板等本機 e2e 示範腳本走舊頁）
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const LEGACY_COOKIE = 'nx-legacy';

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const legacy = searchParams.get('legacy');
    if (legacy === '1') {
      const res = NextResponse.next();
      res.cookies.set(LEGACY_COOKIE, '1', { path: '/' });
      return res;
    }
    if (legacy === '0') {
      const res = NextResponse.redirect(new URL('/work', request.url));
      res.cookies.delete(LEGACY_COOKIE);
      return res;
    }
    if (request.cookies.get(LEGACY_COOKIE)?.value === '1') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/work', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 平台層 vs 租戶層分離軌 Phase 4：/platform 路由由 platform/layout client-side
  // useEffect 自行驗證 platform token（打 /platform/auth/me）、middleware 不擋；
  // 此處列入 matcher 僅為未來統一邊緣驗證留欄位。
  matcher: ['/dashboard', '/dashboard/:path*', '/platform', '/platform/:path*'],
};
