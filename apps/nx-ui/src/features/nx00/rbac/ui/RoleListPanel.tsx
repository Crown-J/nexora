/**
 * File: apps/nx-ui/src/features/nx00/rbac/ui/RoleListPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-RBAC-UI-001：角色清單面板（Role List Panel）
 *
 * Notes:
 * - 本元件只負責 UI 呈現與使用者互動（render-only）
 * - 角色資料、選取狀態、事件 handler 由上層（View / Hook）注入
 * - 風格對齊 Dashboard Shell：暗黑 + 玻璃卡 + 螢光綠強調
 */

'use client';

import React, { useMemo } from 'react';
import { cx } from '@/shared/lib/cx';

export type RoleListItem = {
  id: string;
  name: string;
  desc?: string | null;
  isActive?: boolean;
};

type Props = {
  title?: string;
  roles: RoleListItem[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;

  /** 右上角 + 按鈕（先做 UI hook 點） */
  onCreateRole?: () => void;

  /** 可選：顯示簡易搜尋框（先保留，不開也可以） */
  enableSearch?: boolean;
};

/**
 * @FUNCTION_CODE NX00-RBAC-UI-001-F01
 * 說明：
 * - RoleListPanel：角色清單面板
 * - 功能：
 *   1) 顯示角色列表（可點選）
 *   2) 顯示選取狀態（active 高亮）
 *   3) 顯示右上角新增按鈕（+）
 *   4)（可選）顯示搜尋框（純前端 filter，不改動上層資料來源）
 */
export function RoleListPanel({
  title = 'Roles',
  roles,
  selectedRoleId,
  onSelectRole,
  onCreateRole,
  enableSearch = true,
}: Props) {
  /**
   * @FUNCTION_CODE NX00-RBAC-UI-001-F02
   * 說明：
   * - 面板內建搜尋（純 UI）
   * - 不強制，先做在面板內：後續若你要改成 query/URL/全域搜尋，直接關掉 enableSearch 即可
   */
  const [q, setQ] = React.useState('');

  /**
   * @FUNCTION_CODE NX00-RBAC-UI-001-F03
   * 說明：
   * - 依搜尋字串做前端過濾（case-insensitive）
   * - 僅針對 name/desc
   */
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
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <div className="text-xs tracking-wider text-white/55">RBAC</div>
          <div className="mt-0.5 text-sm text-white/85">{title}</div>
        </div>

        <button
          type="button"
          onClick={onCreateRole}
          className={cx(
            'h-9 w-9 rounded-full border flex items-center justify-center',
            'border-[#39ff14]/35 bg-[#39ff14]/10 text-[#39ff14]',
            'hover:bg-[#39ff14]/15 transition',
            !onCreateRole && 'opacity-50 cursor-not-allowed'
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
          /**
           * @FUNCTION_CODE NX00-RBAC-UI-001-F04
           * 說明：
           * - 空狀態：當 roles 為空或搜尋無結果
           */
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/45">
            No roles
          </div>
        ) : (
          /**
           * @FUNCTION_CODE NX00-RBAC-UI-001-F05
           * 說明：
           * - 角色清單渲染
           * - 選取角色會高亮（綠色邊框 + 文字強調）
           */
          <div className="space-y-2">
            {filtered.map((r) => {
              const active = r.id === selectedRoleId;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRole(r.id)}
                  className={cx(
                    'w-full text-left rounded-xl border px-4 py-3 transition',
                    active
                      ? 'border-[#39ff14]/40 bg-[#39ff14]/10'
                      : 'border-white/10 bg-black/20 hover:bg-black/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={cx('text-sm font-semibold truncate', active ? 'text-[#39ff14]' : 'text-white/90')}>
                        {r.name}
                      </div>
                      {r.desc ? (
                        <div className="mt-1 text-xs text-white/40 line-clamp-2">{r.desc}</div>
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