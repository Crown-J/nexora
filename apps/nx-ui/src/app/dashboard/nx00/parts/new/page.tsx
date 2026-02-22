/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/new/page.tsx
 * Purpose: NX00-UI-004 part_form（新增）
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PartForm from '@/features/nx00/components/PartForm';
import { createPart, type CreatePartBody } from '@/features/nx00/api/parts';

export default function PartNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(body: CreatePartBody) {
    setSaving(true);
    try {
      const created = await createPart(body);
      // 建立成功 → 進編輯頁（或回列表你也可以改）
      router.replace(`/dashboard/nx00/parts/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
      <PartForm
        mode="create"
        submitting={saving}
        onCancel={() => router.push('/dashboard/nx00/parts')}
        onSubmit={onSubmit}
      />
    </div>
  );
}
