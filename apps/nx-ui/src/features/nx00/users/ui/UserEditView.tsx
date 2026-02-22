/**
 * File: apps/nx-ui/src/features/nx00/users/ui/UserEditView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-EDIT-UI-001：User Edit UI（render-only）
 *
 * Notes:
 * - 本元件只負責 render
 * - 所有 state/actions 由 useUserEdit() 提供
 */

'use client';

import { useUserEdit } from '@/features/nx00/users/hooks/useUserEdit';
import { Field } from '@/features/nx00/users/ui/Field';

/**
 * @COMPONENT_CODE nxui_nx00_users_edit_view_001
 * 說明：
 * - UserEditView：render-only
 * - 所有 state/actions 由 useUserEdit() 提供
 */
export function UserEditView() {
  const { state, actions } = useUserEdit();
  const { id, user, form, pw, loading, saving, err } = state;
  const { setForm, setPw, backToList, save, toggleActive, changePassword } = actions;

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm tracking-[0.35em] text-white/70">NX00</div>
          <h1 className="text-xl font-semibold">Edit User</h1>
          <div className="text-xs text-white/35">{id}</div>
        </div>

        <button
          onClick={backToList}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
        >
          Back to list
        </button>
      </div>

      {loading ? (
        <div className="text-white/50">Loading…</div>
      ) : err ? (
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
          ※ {err}
        </div>
      ) : user ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Profile */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6">
            <div className="mb-4 text-sm text-white/70">Profile</div>

            <div className="mb-4 text-xs text-white/40">
              username:{' '}
              <span className="text-white/80">{user.username}</span>
            </div>

            <Field label="Display name" required>
              <input
                value={form.displayName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, displayName: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
                />
              </Field>

              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
                />
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl border border-[#39ff14]/40 bg-[#39ff14] px-4 py-2 text-sm font-medium text-black hover:bg-[#39ff14]/90 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>

              <button
                onClick={toggleActive}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                {user.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6">
            <div className="mb-4 text-sm text-white/70">Security</div>

            <Field label="Change password">
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="new password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
              />
            </Field>

            <div className="pt-3">
              <button
                onClick={changePassword}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Update password
              </button>
            </div>

            <div className="mt-6 space-y-1 text-xs text-white/35">
              <div>isActive: {String(user.isActive)}</div>
              <div>status: {user.statusCode}</div>
              <div>lastLoginAt: {user.lastLoginAt || '-'}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}