// apps/nx-ui/src/features/nx01/product/universal-group/UniversalGroupPage.tsx
// 通用件群組（接真 API、2026-06-22 重寫）
//
// 執行長拍板規格：
//   - 群組標題 = 主件（料號+品名）、不另取名
//   - 主件 unique（不能兩群組同主件、靠 group.code = partId 守）
//   - 同顆零件可在多群組當成員
//   - 搜尋：match 主件 OR 任一成員料號
//   - 設為主件 ⭐ 鈕：換主件後標題自動跟著變
//   - 衝突時（該成員已是其他群組主件）⭐ 鈕 disable + tooltip 提示
//   - 新建：先選主件 → 自動建群組（code=partId、name=「partCode · partName」）
//   - 主件不可移除（要先換主件再移除）
//   - 砍掉專屬售價（用零件主檔）、保留備註
//
// 後端對齊：
//   - group = nx01_part_compat_group { code, name, ... }
//   - member = nx01_part_compat_group_member { partId, role (1=PRIMARY 主件 / 2=ALT 替代品), remark, ... }
//   - 主件 unique 靠 group.code (tenantId+code unique) + 約定 code=partId
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Layers, PackagePlus, Star } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig } from '@design/components/master-batch';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import type { PagedResult } from '@data/types/nx01/api';
import { cn } from '@design/utils/cn';
import { listParts, type PartDto } from '@data/endpoints/nx01/api/part';
import {
  addGroupMember,
  createPartCompatGroup,
  listGroupMembers,
  listPartCompatGroups,
  removeGroupMember,
  updateGroupMember,
  type CompatMemberRow,
  type PartCompatGroupRow,
} from '@data/endpoints/shared/part-compat/part-compat-group-api';

import { SelectMainPartModal } from './SelectMainPartModal';

type GroupWithMembers = {
  group: PartCompatGroupRow;
  members: CompatMemberRow[];
};

export function UniversalGroupPage() {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickerGroupId, setPickerGroupId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // ---------- 載入 groups + 所有 members ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 2026-06-25 修：對齊公司標準 pageSize=100（Nx01ListQueryDto @Max(100)）。
        // 之前 200 違反 base dto 限制、會 400「pageSize must not be greater than 100」。
        // 同 EntityMasterPage「取消分頁、顯前 100 筆」範式；超過再加搜尋過濾。
        const res = await listPartCompatGroups({ pageSize: 100, isActive: true });
        if (cancelled) return;
        const membersList = await Promise.all(
          res.rows.map((g) => listGroupMembers(g.id).catch(() => [] as CompatMemberRow[])),
        );
        if (cancelled) return;
        const combined: GroupWithMembers[] = res.rows.map((g, i) => ({
          group: g,
          members: membersList[i] ?? [],
        }));
        setGroups(combined);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const triggerReload = useCallback(() => setReloadTick((t) => t + 1), []);

  // ---------- 用 partId 找該成員的 main 群組（不含當前群組） ----------
  const findConflictMainGroup = useCallback(
    (currentGroupId: string, partId: string): GroupWithMembers | null => {
      for (const gm of groups) {
        if (gm.group.id === currentGroupId) continue;
        const mainMember = gm.members.find((m) => m.role === 1);
        if (mainMember?.partId === partId) return gm;
      }
      return null;
    },
    [groups],
  );

  // ---------- 群組標題 = 主件 ----------
  const subjectTitleOf = useCallback((gm: GroupWithMembers) => {
    const mainMember = gm.members.find((m) => m.role === 1);
    if (mainMember?.part) return `${mainMember.part.code} · ${mainMember.part.name}`;
    return gm.group.name || gm.group.code;
  }, []);

  // ---------- 搜尋：match 主件 OR 任一成員料號/品名 ----------
  const subjectSearchOf = useCallback((gm: GroupWithMembers, q: string) => {
    const qq = q.toLowerCase();
    return gm.members.some((m) => {
      if (!m.part) return false;
      return m.part.code.toLowerCase().includes(qq) || m.part.name.includes(q);
    });
  }, []);

  // ---------- 新建群組（選主件 → create group + add main member） ----------
  const handleCreate = useCallback(
    async (mainPart: PartDto) => {
      // group.code 上限 30 字、partId 是 15 字、放心用
      // group.name 上限 100 字、code+name 加分隔可能超過、截斷
      const nameRaw = `${mainPart.code} · ${mainPart.name}`;
      const name = nameRaw.length > 100 ? nameRaw.slice(0, 100) : nameRaw;
      try {
        const created = await createPartCompatGroup({
          code: mainPart.id,
          name,
        });
        await addGroupMember(created.id, {
          partId: mainPart.id,
          role: 1,
        });
        setCreateOpen(false);
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`新增失敗：${msg}`);
      }
    },
    [triggerReload],
  );

  // ---------- 設為主件（兩步 update：currentMain → 2、target → 1） ----------
  const handleSetAsMain = useCallback(
    async (groupId: string, memberId: string) => {
      const gm = groups.find((g) => g.group.id === groupId);
      if (!gm) return;
      const currentMain = gm.members.find((m) => m.role === 1);
      try {
        if (currentMain && currentMain.id !== memberId) {
          await updateGroupMember(groupId, currentMain.id, { role: 2 });
        }
        await updateGroupMember(groupId, memberId, { role: 1 });
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`換主件失敗：${msg}`);
      }
    },
    [groups, triggerReload],
  );

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<GroupWithMembers, CompatMemberRow>>(
    () => ({
      title: '通用件群組',
      category: '產品與料號',
      desc: '同群組成員互相通用；群組標題 = 主件。用料號搜尋即可找到所在群組。',
      subjectIcon: Layers,
      subjectNoun: '群組',
      memberNoun: '成員',
      memberUnit: '項',
      addLabel: '加入零件',
      addIcon: PackagePlus,
      searchPlaceholder: '搜尋料號 / 品名…',

      leftMode: 'flat',
      subjects: () => groups,
      subjectId: (gm) => gm.group.id,
      subjectTitle: subjectTitleOf,
      subjectSearch: subjectSearchOf,
      subjectCount: (gm) => gm.members.length,

      leftCreatable: true,
      createLabel: '新增群組',
      onCreate: () => setCreateOpen(true),

      rightMode: 'list',
      members: (gm) => gm.members,
      memberId: (m) => m.id,
      renderMember: (m, _i, _focused, gm) => {
        const isMain = m.role === 1;
        const conflict = isMain ? null : findConflictMainGroup(gm.group.id, m.partId);
        return (
          <MemberRow
            member={m}
            isMain={isMain}
            conflictTitle={conflict ? subjectTitleOf(conflict) : null}
            onSetAsMain={() => handleSetAsMain(gm.group.id, m.id)}
          />
        );
      },

      onAdd: (gm) => setPickerGroupId(gm.group.id),
      onRemoveMember: async (gm, memberId, ctx) => {
        const target = gm.members.find((m) => m.id === memberId);
        if (!target) return;
        if (target.role === 1) {
          ctx.showToast('主件不可移除、請先換主件再移除', 'danger');
          return;
        }
        try {
          await removeGroupMember(gm.group.id, memberId);
          ctx.showToast(`已將「${target.part?.name ?? target.partId}」移出群組`, 'success');
          triggerReload();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          ctx.showToast(`移除失敗：${msg}`, 'danger');
        }
      },
      emptyText: () => ({
        title: '此群組目前只有主件',
        desc: '點右上「加入零件」勾選後加入；同群組所有零件互相通用。',
      }),
    }),
    [groups, findConflictMainGroup, handleSetAsMain, subjectSearchOf, subjectTitleOf, triggerReload],
  );

  // ---------- 加入零件 picker（async search） ----------
  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<PartDto>> => {
      if (!pickerGroupId) return { items: [], page: 1, pageSize: 0, total: 0 };
      const gm = groups.find((g) => g.group.id === pickerGroupId);
      const memberPartIds = new Set((gm?.members ?? []).map((m) => m.partId));
      const res = await listParts({ q: q.trim() || undefined, pageSize: 50, isActive: true });
      const filtered = res.items.filter((p) => !memberPartIds.has(p.id));
      return { items: filtered, page: 1, pageSize: filtered.length, total: filtered.length };
    },
    [groups, pickerGroupId],
  );

  const handlePickerConfirm = useCallback(
    async (selected: PartDto[]) => {
      if (!pickerGroupId) return;
      try {
        for (const p of selected) {
          await addGroupMember(pickerGroupId, { partId: p.id, role: 2 });
        }
        triggerReload();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`加入失敗：${msg}`);
      }
    },
    [pickerGroupId, triggerReload],
  );

  // ---------- 新建可選 parts：排除已是任何群組主件的 partId ----------
  const excludeMainPartIds = useMemo(() => {
    const s = new Set<string>();
    for (const gm of groups) {
      const main = gm.members.find((m) => m.role === 1);
      if (main) s.add(main.partId);
    }
    return s;
  }, [groups]);

  const pickerGm = pickerGroupId ? groups.find((g) => g.group.id === pickerGroupId) : null;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    );
  }

  return (
    <>
      <MasterBatchShell config={config} />

      {createOpen ? (
        <SelectMainPartModal
          onClose={() => setCreateOpen(false)}
          excludePartIds={excludeMainPartIds}
          onConfirm={handleCreate}
        />
      ) : null}

      <EntityPickerDialog<PartDto>
        open={pickerGroupId !== null}
        onClose={() => setPickerGroupId(null)}
        title={pickerGm ? `加入零件到「${subjectTitleOf(pickerGm)}」` : '加入零件'}
        subtitle="Add Group Members"
        icon={Box}
        searchPlaceholder="搜尋料號或品名…"
        search={pickerSearch}
        getId={(p) => p.id}
        getLabel={(p) => `${p.code} · ${p.name}`}
        getDescription={(p) => `${p.partBrandCode ?? '—'} · ${p.countryCode ?? '—'}`}
        onConfirm={handlePickerConfirm}
        confirmLabel="加入"
      />
    </>
  );
}

/* ============ 成員列渲染（含「設為主件」鈕） ============ */
function MemberRow({
  member,
  isMain,
  conflictTitle,
  onSetAsMain,
}: {
  member: CompatMemberRow;
  isMain: boolean;
  /** 該成員若已是其他群組的主件、傳該群組標題；否則 null */
  conflictTitle: string | null;
  onSetAsMain: () => void;
}) {
  const disabled = conflictTitle !== null;
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-md bg-[#E8A020]/14 text-[#E8A020]">
        <Box className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-foreground">{member.part?.name ?? member.partId}</span>
          {isMain ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#E8A020]/45 bg-[#E8A020]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8A020]">
              <Star className="size-3" />
              主件
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground/85">{member.part?.code ?? member.partId}</span>
          {member.remark ? <span className="text-muted-foreground/70">· {member.remark}</span> : null}
        </div>
      </div>
      {!isMain ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onSetAsMain();
          }}
          disabled={disabled}
          title={disabled ? `已是「${conflictTitle}」的主件` : '設為主件（標題自動跟著變）'}
          aria-label={disabled ? `已是「${conflictTitle}」的主件` : '設為主件'}
          className={cn(
            'inline-flex h-7 flex-none items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
            disabled
              ? 'cursor-not-allowed border-border bg-background/30 text-muted-foreground/50'
              : 'border-border bg-background/60 text-muted-foreground hover:border-[#E8A020]/45 hover:bg-[#E8A020]/12 hover:text-[#E8A020]',
          )}
        >
          <Star className="size-3.5" />
          {disabled ? '已為他組主件' : '設為主件'}
        </button>
      ) : null}
    </div>
  );
}
