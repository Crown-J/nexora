// apps/nx-ui/src/features/nx01/org/user-zoned/PositionAddDialog.tsx
// 2026-06-23 執行長拍板：職務新增 dialog（4 步：部門 → 組別 → 職務 → 主要）
//
// 流程：
//   1. 部門必選
//   2. 組別選填（依部門 filter；選了會 assign user-team）
//   3. 職務必選（依部門 filter）
//   4. 是否設為主要 checkbox（對應 user-role.isPrimary）
//   5. 確認 → call assignUserTeam (if 組別) + assignUserRole (with isPrimary)
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Check, X } from 'lucide-react';

import { cn } from '@design/utils/cn';
import { listDepartments, type DepartmentDto } from '@data/endpoints/nx01/api/department';
import { listRoles, type RoleDto } from '@data/endpoints/nx01/api/role';
import { listTeams, type TeamDto } from '@data/endpoints/nx01/api/team';
import { assignUserRole } from '@data/endpoints/nx01/api/user-role';
import { assignUserTeam } from '@data/endpoints/nx01/api/user-team';

export type PositionAddDialogProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
};

export function PositionAddDialog({ open, onClose, userId, onSuccess }: PositionAddDialogProps) {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);

  const [deptId, setDeptId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 開啟時 reset + 載資料
  useEffect(() => {
    if (!open) return;
    setDeptId('');
    setTeamId('');
    setRoleId('');
    setIsPrimary(false);
    setError(null);
    void (async () => {
      try {
        const [depRes, teamRes, roleRes] = await Promise.all([
          listDepartments({ pageSize: 100, isActive: true }),
          listTeams({ pageSize: 200, isActive: true }),
          listRoles({ pageSize: 200, isActive: true }),
        ]);
        setDepartments(depRes.items);
        setTeams(teamRes.items);
        setRoles(roleRes.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [open]);

  const teamsForDept = useMemo(
    () => teams.filter((t) => !deptId || t.departmentId === deptId),
    [teams, deptId],
  );
  // 2026-06-24：職務硬綁組別後、依 teamId filter（無 teamId 時 fallback deptId、過渡期相容）
  const rolesForTeam = useMemo(
    () =>
      roles.filter((r) => {
        if (teamId) return r.teamId === teamId;
        if (deptId) return r.departmentId === deptId && !r.teamId;
        return true;
      }),
    [roles, teamId, deptId],
  );

  // 2026-06-24：組別變必選（職務歸組別、需先選組別才能列職務）
  const canSubmit = deptId !== '' && teamId !== '' && roleId !== '' && !submitting;

  const handleConfirm = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (teamId) {
        await assignUserTeam({ userId, teamId });
      }
      await assignUserRole({ userId, roleId, isPrimary });
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, teamId, userId, roleId, isPrimary, onSuccess, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-2xl border border-[#2A2A30] bg-[#131316] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#2A2A30] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <Briefcase className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-[#F0F0F3]">新增職務</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
            Add Position
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4 text-sm">
          <Step
            num={1}
            label="部門"
            required
            children={
              <select
                className={selectCls}
                value={deptId}
                onChange={(e) => {
                  setDeptId(e.target.value);
                  setTeamId('');
                  setRoleId('');
                }}
                disabled={submitting}
              >
                <option value="">請選擇部門</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-popover">
                    {d.code} · {d.name}
                  </option>
                ))}
              </select>
            }
          />
          <Step
            num={2}
            label="組別"
            required
            children={
              <select
                className={selectCls}
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setRoleId('');
                }}
                disabled={!deptId || submitting}
              >
                <option value="">請選擇組別</option>
                {teamsForDept.map((t) => (
                  <option key={t.id} value={t.id} className="bg-popover">
                    {t.code} · {t.name}
                  </option>
                ))}
              </select>
            }
          />
          <Step
            num={3}
            label="職務"
            required
            children={
              <select
                className={selectCls}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={!teamId || submitting}
              >
                <option value="">請選擇職務</option>
                {rolesForTeam.map((r) => (
                  <option key={r.id} value={r.id} className="bg-popover">
                    {r.code} · {r.name}
                  </option>
                ))}
              </select>
            }
          />
          <Step
            num={4}
            label="是否設為主要職務"
            children={
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="size-4"
                />
                設為主要
              </label>
            }
          />
          {error ? (
            <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-3 py-2 text-xs text-[#E26060]">
              {error}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] hover:bg-[#22222A] disabled:opacity-50"
          >
            <X className="size-3.5" />
            取消
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleConfirm}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition-colors',
              canSubmit
                ? 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F] hover:bg-[#22D88F]/20'
                : 'cursor-not-allowed border-border bg-muted/30 text-muted-foreground',
            )}
          >
            <Check className="size-3.5" />
            {submitting ? '建立中…' : '確認新增'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  num,
  label,
  required,
  children,
}: {
  num: number;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-full bg-[#E8A020]/15 text-[10px] font-bold text-[#E8A020]">
          {num}
        </span>
        <span className="text-[12px] font-semibold text-foreground">
          {label}
          {required ? <span className="ml-1 text-[#E26060]">*</span> : null}
        </span>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}

const selectCls =
  'h-9 w-full rounded-md border border-[#E8A020]/30 bg-[var(--nx-surface-input)] px-2.5 text-sm text-foreground outline-none focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40 disabled:opacity-50';
