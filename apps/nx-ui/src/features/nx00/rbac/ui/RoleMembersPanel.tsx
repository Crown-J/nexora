/**
 * File: apps/nx-ui/src/features/nx00/rbac/ui/RoleMembersPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-UI-002：角色成員面板（Role Members Panel）
 *
 * Notes:
 * - render-only：只負責 UI 呈現與互動
 * - 資料、搜尋狀態、事件 handler 由上層（View / Hook）注入
 * - 風格對齊 Dashboard Shell：暗黑 + 玻璃卡 + 螢光綠強調
 * - 支援草稿模式：Add/Remove 先改 UI，按 Save 才寫入後端
 */

'use client';

import { cx } from '@/shared/lib/cx';
import type { UserLite } from '@/features/nx00/rbac/types';

type Props = {
  title?: string;

  /** 目前選取的角色資訊（用於標題顯示） */
  roleName?: string | null;

  /** 搜尋輸入值（受控） */
  query: string;
  onChangeQuery: (v: string) => void;

  /** 候選使用者（搜尋結果） */
  candidates?: UserLite[];
  selectedCandidateId?: string | null;
  onSelectCandidate?: (userId: string) => void;

  /** 右上角 +：把「目前選取 candidate」加入草稿 members */
  onAddMember?: () => void;

  /** 草稿 members（畫面顯示用） */
  members: UserLite[];

  /** 點 chip 的 x 移除（移除草稿） */
  onRemoveMember?: (userId: string) => void;

  /** 草稿狀態：是否有未儲存變更 */
  dirty?: boolean;

  /** 儲存草稿 → 寫入後端 */
  onSave?: () => void;
  saving?: boolean;

  /** 放棄草稿 → 回到後端載入狀態 */
  onReset?: () => void;
};

/**
 * @FUNCTION_CODE NX00-RBAC-UI-002-F01
 * 說明：
 * - RoleMembersPanel：角色成員面板（草稿模式）
 */
export function RoleMembersPanel({
  title = 'Role Members',
  roleName,
  query,
  onChangeQuery,
  candidates = [],
  selectedCandidateId = null,
  onSelectCandidate,
  onAddMember,
  members,
  onRemoveMember,
  dirty = false,
  onSave,
  saving = false,
  onReset,
}: Props) {
  const canAdd = !!onAddMember && !!selectedCandidateId && !saving;
  const canSave = !!onSave && dirty && !saving;
  const canReset = !!onReset && dirty && !saving;

  return (
    <section className="relative rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <div className="text-xs tracking-wider text-white/55">RBAC</div>
          <div className="mt-0.5 text-sm text-white/85">{title}</div>

          <div className="mt-1 truncate text-xs text-white/35">
            {roleName ? (
              <>
                role: <span className="text-white/70">{roleName}</span>
              </>
            ) : (
              'role: —'
            )}
          </div>

          {dirty ? (
            <div className="mt-2 inline-flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#39ff14]/30 bg-[#39ff14]/10 px-2 py-0.5 text-[10px] text-[#39ff14]">
                UNSAVED
              </span>
              <span className="text-[10px] text-white/35">changes pending</span>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className={cx(
              'rounded-xl border px-3 py-2 text-xs transition',
              canReset
                ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
            )}
            title="Reset changes"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className={cx(
              'rounded-xl border px-3 py-2 text-xs transition',
              canSave
                ? 'border-[#39ff14]/35 bg-[#39ff14]/10 text-[#39ff14] hover:bg-[#39ff14]/15'
                : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
            )}
            title="Save changes"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            type="button"
            onClick={onAddMember}
            disabled={!canAdd}
            aria-label="Add member"
            title={canAdd ? 'Add member (to draft)' : 'Select a user to add'}
            className={cx(
              'flex h-9 w-9 items-center justify-center rounded-full border transition',
              canAdd
                ? 'border-[#39ff14]/35 bg-[#39ff14]/10 text-[#39ff14] hover:bg-[#39ff14]/15'
                : 'cursor-not-allowed border-white/10 bg-white/5 text-white/35'
            )}
          >
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </div>

      {/* Search + Candidates */}
      <div className="px-5 pt-4">
        <input
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Search users… (username)"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
        />

        {candidates.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {candidates.map((u) => {
              const active = u.id === selectedCandidateId;

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSelectCandidate?.(u.id)}
                  className={cx(
                    'w-full border-b border-white/10 px-4 py-2.5 text-left transition last:border-b-0',
                    active ? 'bg-[#39ff14]/10' : 'hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={cx(
                          'truncate text-sm',
                          active ? 'text-[#39ff14]' : 'text-white/85'
                        )}
                      >
                        {u.username}
                      </div>

                      {u.displayName ? (
                        <div className="truncate text-xs text-white/35">{u.displayName}</div>
                      ) : null}
                    </div>

                    <span
                      className={cx(
                        'rounded-full border px-2 py-1 text-[10px]',
                        active
                          ? 'border-[#39ff14]/35 bg-[#39ff14]/10 text-[#39ff14]'
                          : 'border-white/10 bg-white/5 text-white/45'
                      )}
                    >
                      {active ? 'SELECTED' : 'SELECT'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : query.trim() ? (
          <div className="mt-3 text-xs text-white/35">No candidates</div>
        ) : null}
      </div>

      {/* Members chips */}
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs tracking-wider text-white/55">MEMBERS</div>
          <div className="text-xs text-white/35">Total: {members.length}</div>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/45">
            No members
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/80"
              >
                <span className="text-white/90">{u.username}</span>
                {u.displayName ? <span className="text-white/40">({u.displayName})</span> : null}

                {onRemoveMember ? (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(u.id)}
                    disabled={saving}
                    className={cx(
                      'ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border transition',
                      saving
                        ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                    aria-label={`Remove ${u.username}`}
                    title="Remove (draft)"
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}