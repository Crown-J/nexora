/**
 * File: apps/nx-ui/src/features/nx00/users/ui/UserCreateView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-CREATE-UI-001：User Create UI（render only）
 */

'use client';

import { Field } from '@/features/nx00/users/ui/Field';
import { useUserCreate } from '@/features/nx00/users/hooks/useUserCreate';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-CREATE-UI-001-F01
 * 說明：
 * - UserCreateView：只負責 render
 * - submit/back/form state 由 useUserCreate() 提供
 */
export function UserCreateView() {
  const { state, actions } = useUserCreate();
  const { saving, err, form } = state;
  const { setForm, back, submit } = actions;

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
      <div className="mb-5">
        <div className="text-sm tracking-[0.35em] text-white/70">NX00</div>
        <h1 className="text-xl font-semibold">Create User</h1>
        <div className="text-xs text-white/35">W03-UI-002 · create</div>
      </div>

      <div className="max-w-xl rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Username">
            <input
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <Field label="Display name">
            <input
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Email">
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
              />
            </Field>
          </div>

          <Field label="Password (optional)">
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
            />
          </Field>

          {err ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
              ※ {err}
            </div>
          ) : null}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={back}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Back
            </button>

            <button
              disabled={saving}
              className="rounded-xl border border-[#39ff14]/40 bg-[#39ff14] px-4 py-2 text-sm font-medium text-black hover:bg-[#39ff14]/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}