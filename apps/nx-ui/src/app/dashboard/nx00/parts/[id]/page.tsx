/**
 * File: apps/nx-ui/src/app/dashboard/nx00/parts/[id]/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-004：Parts Edit Page（修改）
 *
 * Notes:
 * - 本頁只負責「頁面層」：取 route param、載入資料、呼叫 API、導頁
 * - Form UI 交由 features/nx00/parts/ui/PartForm
 * - API client 走 shared/api（apiFetch + assertOk）
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import PartForm from '@/features/nx00/parts/ui/PartForm';
import { getPart, updatePart, type CreatePartBody } from '@/features/nx00/parts/api/parts';
import type { PartRow } from '@/features/nx00/parts/types';

type RouteParams = { id: string };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @PAGE_CODE nxui_nx00_parts_edit_page_001
 */
export default function PartEditPage() {
  const router = useRouter();
  const params = useParams<RouteParams>();

  const id = useMemo(() => params.id, [params.id]);

  const [row, setRow] = useState<PartRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * @CODE nxui_nx00_parts_edit_load_001
   * 說明：
   * - 依 id 載入 Part
   */
  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const r = await getPart(id);
      setRow(r);
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Load failed');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * @CODE nxui_nx00_parts_edit_submit_001
   * 說明：
   * - submit：更新後留在原頁（同步更新 row）
   */
  const onSubmit = useCallback(
    async (body: CreatePartBody) => {
      setSaving(true);
      setErr(null);

      try {
        const updated = await updatePart(id, body);
        setRow(updated);
      } catch (e: unknown) {
        setErr(getErrorMessage(e) || 'Save failed');
        throw e; // 讓 PartForm 也能顯示錯誤（若你在 PartForm 有 catch）
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  /**
   * @CODE nxui_nx00_parts_edit_back_001
   */
  const backToList = useCallback(() => {
    router.push('/dashboard/nx00/parts');
  }, [router]);

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
              type="button"
              onClick={backToList}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Back to list
            </button>

            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Retry
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
        onCancel={backToList}
        onSubmit={onSubmit}
      />
    </div>
  );
}