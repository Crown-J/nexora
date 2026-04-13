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
  matcher: ['/dashboard', '/dashboard/:path*'],
};
