/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/[id]/page.tsx
 * Purpose: NX00-UI-004 part_form（修改）
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import PartForm from '@/features/nx00/components/PartForm';
import { getPart, updatePart, type CreatePartBody } from '@/features/nx00/api/parts';
import type { PartRow } from '@/features/nx00/types';

export default function PartEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [row, setRow] = useState<PartRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function boot() {
      if (!id) return;

      setLoading(true);
      setErr(null);
      try {
        const r = await getPart(id);
        if (!alive) return;
        setRow(r);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Load failed');
      } finally {
        if (alive) setLoading(false);
      }
    }
    boot();
    return () => {
      alive = false;
    };
  }, [id]);

  async function onSubmit(body: CreatePartBody) {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updatePart(id, body);
      setRow(updated);
      // 留在原頁即可（也可以 router.replace 同頁）
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 text-sm text-white/50">
          Loading…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6">
          <div className="text-sm text-red-200">{err}</div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.push('/dashboard/nx00/parts')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
      <PartForm
        mode="edit"
        initial={row}
        submitting={saving}
        onCancel={() => router.push('/dashboard/nx00/parts')}
        onSubmit={onSubmit}
      />
    </div>
  );
}
