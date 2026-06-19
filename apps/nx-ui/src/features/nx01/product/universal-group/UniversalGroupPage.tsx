// apps/nx-ui/src/features/nx01/product/universal-group/UniversalGroupPage.tsx
// 通用件群組（案例 3 / Step 5）
//
// 執行長拍板規格：
//   - 群組標題 = 主件（料號+品名）、不另取名
//   - 主件 unique（不能兩群組同主件）
//   - 同顆零件可在多群組當成員
//   - 搜尋：match 主件 OR 任一成員料號
//   - 設為主件 ⭐ 鈕：換主件後標題自動跟著變
//   - 衝突時（該成員已是其他群組主件）⭐ 鈕 disable + tooltip 提示
//   - 新建：先選主件 → 自動建群組
//   - 主件不可移除（要先換主件再移除）
//   - 砍掉專屬售價（用零件主檔）、保留備註
'use client';

import { useCallback, useMemo, useState } from 'react';
import { Box, Layers, PackagePlus, Star } from 'lucide-react';

import { MasterBatchShell } from '@design/components/master-batch';
import type { MasterBatchConfig } from '@design/components/master-batch';
import { EntityPickerDialog } from '@design/components/multi-select-modal/EntityPickerDialog';
import type { PagedResult } from '@data/types/nx01/api';
import { cn } from '@design/utils/cn';

import { SelectMainPartModal } from './SelectMainPartModal';
import {
  GROUPS_SEED,
  PARTS,
  partOf,
  type GroupMemberMock,
  type PartMock,
  type UniversalGroupMock,
} from './mock-data';

export function UniversalGroupPage() {
  const [groups, setGroups] = useState<UniversalGroupMock[]>(GROUPS_SEED);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickerGroupId, setPickerGroupId] = useState<string | null>(null);

  // ---------- 群組標題 = 主件 ----------
  const subjectTitleOf = useCallback((g: UniversalGroupMock) => {
    const mp = partOf(g.mainPartCode);
    return mp ? `${mp.code} · ${mp.name}` : g.mainPartCode;
  }, []);

  // ---------- 搜尋：match 主件 OR 任一成員料號 ----------
  const subjectSearchOf = useCallback((g: UniversalGroupMock, q: string) => {
    const matchPart = (code: string) => {
      const p = partOf(code);
      if (!p) return false;
      return p.code.toLowerCase().includes(q) || p.name.includes(q);
    };
    if (matchPart(g.mainPartCode)) return true;
    return g.members.some((m) => matchPart(m.partCode));
  }, []);

  // ---------- 新建群組 ----------
  const handleCreate = useCallback(
    (mainPart: PartMock) => {
      const newId = `UG${String(
        Math.max(0, ...groups.map((g) => Number(g.id.replace('UG', '')))) + 1,
      ).padStart(3, '0')}`;
      setGroups((prev) => [
        ...prev,
        {
          id: newId,
          mainPartCode: mainPart.code,
          members: [{ partCode: mainPart.code }],
        },
      ]);
      setCreateOpen(false);
    },
    [groups],
  );

  // ---------- 設為主件（先在 renderMember 內檢查衝突、所以這裡單純 setState） ----------
  const handleSetAsMain = useCallback((groupId: string, partCode: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, mainPartCode: partCode } : g)));
  }, []);

  // ---------- 找出衝突主件群組（用於 disable ⭐ 鈕） ----------
  const findConflictGroup = useCallback(
    (currentGroupId: string, partCode: string) =>
      groups.find((g) => g.id !== currentGroupId && g.mainPartCode === partCode) ?? null,
    [groups],
  );

  // ---------- config ----------
  const config = useMemo<MasterBatchConfig<UniversalGroupMock, GroupMemberMock>>(
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
      subjectId: (g) => g.id,
      subjectTitle: subjectTitleOf,
      subjectSearch: subjectSearchOf,
      subjectCount: (g) => g.members.length,

      leftCreatable: true,
      createLabel: '新增群組',
      onCreate: () => setCreateOpen(true),

      rightMode: 'list',
      members: (g) => g.members,
      memberId: (m) => m.partCode,
      renderMember: (m, _i, _focused, g) => {
        const isMain = m.partCode === g.mainPartCode;
        const conflict = isMain ? null : findConflictGroup(g.id, m.partCode);
        return (
          <MemberRow
            member={m}
            isMain={isMain}
            conflictTitle={conflict ? subjectTitleOf(conflict) : null}
            onSetAsMain={() => handleSetAsMain(g.id, m.partCode)}
          />
        );
      },

      onAdd: (g) => setPickerGroupId(g.id),
      onRemoveMember: (g, partCode, ctx) => {
        if (partCode === g.mainPartCode) {
          ctx.showToast('主件不可移除、請先換主件再移除', 'danger');
          return;
        }
        setGroups((prev) =>
          prev.map((x) =>
            x.id === g.id ? { ...x, members: x.members.filter((mb) => mb.partCode !== partCode) } : x,
          ),
        );
        const p = partOf(partCode);
        ctx.showToast(`已將「${p?.name ?? partCode}」移出群組`, 'success');
      },
      emptyText: () => ({
        title: '此群組目前只有主件',
        desc: '點右上「加入零件」勾選後加入；同群組所有零件互相通用。',
      }),
    }),
    [groups, findConflictGroup, handleSetAsMain, subjectSearchOf, subjectTitleOf],
  );

  // ---------- Picker：加入零件（client array + fake search） ----------
  const pickerSearch = useCallback(
    async (q: string): Promise<PagedResult<PartMock>> => {
      if (!pickerGroupId) return { items: [], page: 1, pageSize: 0, total: 0 };
      const g = groups.find((x) => x.id === pickerGroupId);
      if (!g) return { items: [], page: 1, pageSize: 0, total: 0 };
      const memberPartCodes = new Set(g.members.map((m) => m.partCode));
      const qq = q.trim().toLowerCase();
      const items = PARTS.filter((p) => {
        if (memberPartCodes.has(p.code)) return false;
        if (!qq) return true;
        return p.code.toLowerCase().includes(qq) || p.name.includes(q);
      });
      return { items, page: 1, pageSize: items.length, total: items.length };
    },
    [groups, pickerGroupId],
  );

  const handlePickerConfirm = useCallback(
    async (selected: PartMock[]) => {
      if (!pickerGroupId) return;
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== pickerGroupId) return g;
          const newMembers = selected
            .filter((p) => !g.members.some((m) => m.partCode === p.code))
            .map((p) => ({ partCode: p.code }));
          return { ...g, members: [...g.members, ...newMembers] };
        }),
      );
    },
    [pickerGroupId],
  );

  // ---------- 新建可選 parts（排除已是其他群組主件的） ----------
  const availablePartsForCreate = useMemo(
    () => PARTS.filter((p) => !groups.some((g) => g.mainPartCode === p.code)),
    [groups],
  );

  const pickerGroup = pickerGroupId ? groups.find((g) => g.id === pickerGroupId) : null;

  return (
    <>
      <MasterBatchShell config={config} />

      {createOpen ? (
        <SelectMainPartModal
          onClose={() => setCreateOpen(false)}
          availableParts={availablePartsForCreate}
          onConfirm={handleCreate}
        />
      ) : null}

      <EntityPickerDialog<PartMock>
        open={pickerGroupId !== null}
        onClose={() => setPickerGroupId(null)}
        title={pickerGroup ? `加入零件到「${subjectTitleOf(pickerGroup)}」` : '加入零件'}
        subtitle="Add Group Members"
        icon={Box}
        searchPlaceholder="搜尋料號或品名…"
        search={pickerSearch}
        getId={(p) => p.code}
        getLabel={(p) => `${p.code} · ${p.name}`}
        getDescription={(p) => `${p.brand} · ${p.origin}`}
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
  member: GroupMemberMock;
  isMain: boolean;
  /** 該成員若已是其他群組的主件、傳該群組標題；否則 null */
  conflictTitle: string | null;
  onSetAsMain: () => void;
}) {
  const part = partOf(member.partCode);
  const disabled = conflictTitle !== null;
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-md bg-[#E8A020]/14 text-[#E8A020]">
        <Box className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-foreground">{part?.name ?? member.partCode}</span>
          {isMain ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#E8A020]/45 bg-[#E8A020]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8A020]">
              <Star className="size-3" />
              主件
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="font-mono text-foreground/85">{member.partCode}</span>
          {part ? (
            <>
              <span>· {part.brand}</span>
              <span>· {part.origin}</span>
            </>
          ) : null}
          {member.note ? <span className="text-muted-foreground/70">· {member.note}</span> : null}
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
