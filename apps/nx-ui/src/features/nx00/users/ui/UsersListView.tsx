/**
 * File: apps/nx-ui/src/features/nx00/users/ui/UsersListView.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-LIST-UI-001：Users List UI（render only）
 *
 * Notes:
 * - 本檔案只負責畫面，不直接呼叫 API
 * - 所有資料與操作由 useUsersList() 提供
 */

'use client';

import { cx } from '@/shared/lib/cx';
import { useUsersList } from '@/features/nx00/users/hooks/useUsersList';

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-LIST-UI-001-F01
 * 說明：
 * - UsersListView：把 UI 與資料邏輯分離
 * - UI 只讀 state、呼叫 actions
 */
export function UsersListView() {
  const { query, state, actions } = useUsersList();
  const { page, pageSize, q } = query;
  const { items, total, loading, err, qInput, totalPages } = state;
  const { setQInput, go, goNew, goEdit, toggleActive } = actions;

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-6 text-white">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm tracking-[0.35em] text-white/70">NX00</div>
          <h1 className="text-xl font-semibold">Users</h1>
          <div className="text-xs text-white/35">W03-UI-001 · list / search / pagination</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goNew}
            className="rounded-xl border border-[#39ff14]/40 bg-[#39ff14] px-4 py-2 text-sm font-medium text-black hover:bg-[#39ff14]/90"
          >
            + New
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search username / displayName"
              className="w-[280px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
            />

            <button
              onClick={() => go({ q: qInput })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Search
            </button>

            {q ? (
              <button
                onClick={() => {
                  setQInput('');
                  go({ q: '' });
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:bg-white/10"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-sm text-white/60">
            <span>
              Page {page} / {totalPages}
            </span>

            <select
              value={pageSize}
              onChange={(e) => go({ pageSize: Number(e.target.value), page: 1 })}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {err ? (
          <div className="p-4 text-sm text-red-200">{err}</div>
        ) : loading ? (
          <div className="p-4 text-sm text-white/50">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/50">
                <tr className="border-b border-white/10">
                  <th className="p-3 text-left">Username</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Active</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="p-3">
                      <div className="font-medium text-white/90">{u.username}</div>
                      <div className="text-xs text-white/30">{u.id}</div>
                    </td>

                    <td className="p-3 text-white/80">{u.displayName}</td>
                    <td className="p-3 text-white/60">{u.email || '-'}</td>

                    <td className="p-3">
                      <span
                        className={cx(
                          'inline-flex items-center rounded-full border px-2 py-1 text-xs',
                          u.isActive
                            ? 'border-[#39ff14]/30 bg-[#39ff14]/10 text-[#39ff14]'
                            : 'border-white/10 bg-white/5 text-white/50'
                        )}
                      >
                        {u.isActive ? 'ON' : 'OFF'}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => goEdit(u.id)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleActive(u)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {items.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-white/40" colSpan={5}>
                      No data
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between p-4">
          <button
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
            className={cx(
              'rounded-xl border px-3 py-2 text-sm',
              page <= 1
                ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
            )}
          >
            Prev
          </button>

          <div className="text-xs text-white/35">Total: {total}</div>

          <button
            disabled={page >= totalPages}
            onClick={() => go({ page: page + 1 })}
            className={cx(
              'rounded-xl border px-3 py-2 text-sm',
              page >= totalPages
                ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
            )}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}