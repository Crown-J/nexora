/**
 * File: apps/nx-ui/src/features/nx00/rbac/ui/CreateRoleModal.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-UI-004：Create Role Modal（render-only）
 *
 * Notes:
 * - 僅負責 UI 與輸入收集
 * - submit 後呼叫 onSubmit（由上層 hook/service 負責打 API）
 */

'use client';

import type { ReactNode, FormEvent } from 'react';
import { useMemo, useState } from 'react';

import { cx } from '@/shared/lib/cx';
import type { CreateRoleInput } from '@/features/nx00/rbac/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateRoleInput) => Promise<void> | void;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @FUNCTION_CODE NX00-RBAC-UI-004-F01
 * 說明：
 * - CreateRoleModal：只負責 UI 與輸入
 * - submit 後呼叫 onSubmit（由上層 hook 負責打 API）
 */
export function CreateRoleModal({ open, onClose, onSubmit }: Props) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    desc: '',
    isActive: true,
  });

  const canSubmit = useMemo(() => {
    return form.code.trim().length > 0 && form.name.trim().length > 0 && !saving;
  }, [form.code, form.name, saving]);

  /**
   * @FUNCTION_CODE NX00-RBAC-UI-004-F02
   * 說明：
   * - reset：關閉時清掉狀態
   */
  function resetAndClose() {
    setErr(null);
    setSaving(false);
    setForm({ code: '', name: '', desc: '', isActive: true });
    onClose();
  }

  /**
   * @FUNCTION_CODE NX00-RBAC-UI-004-F03
   * 說明：
   * - submit：基本驗證 + 呼叫 onSubmit
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!form.code.trim()) {
      setErr('Role code is required');
      return;
    }
    if (!form.name.trim()) {
      setErr('Role name is required');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        code: form.code.trim(),
        name: form.name.trim(),
        desc: form.desc.trim() ? form.desc.trim() : null,
        isActive: form.isActive,
      });

      resetAndClose();
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* overlay */}
      <button
        type="button"
        onClick={resetAndClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Close modal overlay"
      />

      {/* modal */}
      <div className="relative w-[560px] max-w-[calc(100vw-32px)] rounded-2xl border border-white/10 bg-[#0b0f14]/90 backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs tracking-wider text-white/55">RBAC</div>
            <div className="mt-0.5 text-sm text-white/85">Create Role</div>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Field label="Role Code (unique)">
            <input
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="ex: ADMIN / WAREHOUSE"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <Field label="Role Name">
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="ex: System Administrator"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={form.desc}
              onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
              placeholder="short description…"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            />
          </Field>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Active
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className={cx(
                  'rounded-xl border px-4 py-2 text-sm font-medium',
                  'border-[#39ff14]/40 bg-[#39ff14] text-black hover:bg-[#39ff14]/90',
                  !canSubmit && 'cursor-not-allowed opacity-60'
                )}
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>

          {err ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
              ※ {err}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

/**
 * @FUNCTION_CODE NX00-RBAC-UI-004-F04
 * 說明：
 * - Field：簡單欄位容器（modal 專用）
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs tracking-wider text-white/55">{label.toUpperCase()}</div>
      {children}
    </div>
  );
}