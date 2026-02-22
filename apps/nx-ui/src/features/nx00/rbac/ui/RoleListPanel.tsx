/**
 * File: apps/nx-ui/src/features/nx00/rbac/ui/RoleListPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-UI-001：角色清單面板（Role List Panel）
 *
 * Notes:
 * - render-only：只負責 UI 呈現與互動
 * - 資料與 handler 由上層注入
 * - 風格對齊 Dashboard Shell：暗黑 + 玻璃卡 + 螢光綠強調
 */

'use client';

import { useMemo, useState } from 'react';

import { cx } from '@/shared/lib/cx';
import type { RoleListItem } from '@/features/nx00/rbac/types';

type Props = {
  title?: string;

  roles: RoleListItem[];
  selectedRoleId: string | null;

  onSelectRole: (roleId: string) => void;

  /** 右上角 + 按鈕 */
  onCreateRole?: () => void;

  /** 可選：顯示簡易搜尋框（純前端 filter） */
  enableSearch?: boolean;
};

/**
 * @FUNCTION_CODE NX00-RBAC-UI-001-F01
 * 說明：
 * - RoleListPanel：角色清單面板
 * - 支援：選取高亮 + 新增按鈕 +（可選）前端搜尋
 */
export function RoleListPanel({
  title = 'Roles',
  roles,
  selectedRoleId,
  onSelectRole,
  onCreateRole,
  enableSearch = true,
}: Props) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return roles;

    return roles.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const desc = (r.desc || '').toLowerCase();
      return name.includes(keyword) || desc.includes(keyword);
    });
  }, [q, roles]);

  return (
    <section className="relative rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-xs tracking-wider text-white/55">RBAC</div>
          <div className="mt-0.5 text-sm text-white/85">{title}</div>
        </div>

        <button
          type="button"
          onClick={onCreateRole}
          className={cx(
            'flex h-9 w-9 items-center justify-center rounded-full border',
            'border-[#39ff14]/35 bg-[#39ff14]/10 text-[#39ff14]',
            'transition hover:bg-[#39ff14]/15',
            !onCreateRole && 'cursor-not-allowed opacity-50'
          )}
          disabled={!onCreateRole}
          aria-label="Create role"
          title="Create role"
        >
          <span className="text-lg leading-none">+</span>
        </button>
      </div>

      {/* Search (optional) */}
      {enableSearch ? (
        <div className="px-5 pt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roles…"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10"
          />
        </div>
      ) : null}

      {/* List */}
      <div className="p-5">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/45">
            No roles
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const active = r.id === selectedRoleId;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRole(r.id)}
                  className={cx(
                    'w-full rounded-xl border px-4 py-3 text-left transition',
                    active
                      ? 'border-[#39ff14]/40 bg-[#39ff14]/10'
                      : 'border-white/10 bg-black/20 hover:bg-black/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={cx(
                          'truncate text-sm font-semibold',
                          active ? 'text-[#39ff14]' : 'text-white/90'
                        )}
                      >
                        {r.name}
                      </div>

                      {r.desc ? (
                        <div className="mt-1 line-clamp-2 text-xs text-white/40">
                          {r.desc}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      <span
                        className={cx(
                          'inline-flex items-center rounded-full border px-2 py-1 text-[10px]',
                          r.isActive === false
                            ? 'border-white/10 bg-white/5 text-white/40'
                            : active
                              ? 'border-[#39ff14]/35 bg-[#39ff14]/10 text-[#39ff14]'
                              : 'border-white/10 bg-white/5 text-white/55'
                        )}
                      >
                        {r.isActive === false ? 'DISABLED' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}