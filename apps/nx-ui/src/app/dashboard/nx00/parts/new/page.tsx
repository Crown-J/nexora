/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/new/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-004：Parts Form（Create）
 *
 * Notes:
 * - 建立成功後導向 Edit 頁：/dashboard/nx00/parts/:id
 */

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import PartForm from '@/features/nx00/parts/ui/PartForm';
import { createPart, type CreatePartBody } from '@/features/nx00/parts/api/parts';

export default function PartNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  /**
   * @CODE nxui_nx00_parts_new_submit_001
   * 說明：
   * - 建立零件資料
   * - 成功後導向 Edit 頁（方便延續編輯 / 看 id）
   */
  const onSubmit = useCallback(
    async (body: CreatePartBody) => {
      setSaving(true);

      try {
        const created = await createPart(body);
        router.replace(`/dashboard/nx00/parts/${created.id}`);
      } finally {
        setSaving(false);
      }
    },
    [router]
  );

  /**
   * @CODE nxui_nx00_parts_new_cancel_001
   * 說明：
   * - 取消 → 回列表
   */
  const onCancel = useCallback(() => {
    router.push('/dashboard/nx00/parts');
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
      <PartForm mode="create" submitting={saving} onCancel={onCancel} onSubmit={onSubmit} />
    </div>
  );
}