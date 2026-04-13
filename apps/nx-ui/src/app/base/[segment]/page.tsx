/**
 * File: apps/nx-ui/src/app/base/[segment]/page.tsx
 *
 * Purpose:
 * - 路由 v2.0 redirect：/base/[segment] → /dashboard/base/[segment]
 */

import { redirect } from 'next/navigation';

type Props = { params: Promise<{ segment: string }> };

export default async function BaseSegmentRedirectPage({ params }: Props) {
  const { segment } = await params;
  redirect(`/dashboard/base/${segment}`);
}
