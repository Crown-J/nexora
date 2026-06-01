/**
 * @SYS-AUTH-MID-001-F01
 * Dashboard 路由：Demo 模式直接放行（其餘維持 next，供日後擴充 Edge 驗證）
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  void request;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // 平台層 vs 租戶層分離軌 Phase 4：/platform 路由由 platform/layout client-side
  // useEffect 自行驗證 platform token（打 /platform/auth/me）、middleware 不擋；
  // 此處列入 matcher 僅為未來統一邊緣驗證留欄位。
  matcher: ['/dashboard', '/dashboard/:path*', '/platform', '/platform/:path*'],
};
