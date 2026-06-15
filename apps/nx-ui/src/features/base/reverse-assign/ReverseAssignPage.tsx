// apps/nx-ui/src/features/base/reverse-assign/ReverseAssignPage.tsx
/**
 * 雙欄指派頁（reverse master-detail）：左實體列表 / 右成員清單
 * 用於「使用者職務設定」（左職務/右成員）、「使用者據點設定」（左據點/右成員）。
 *
 * 全鍵盤：↑↓ 切左欄實體 / → 進右欄 / ← 回左欄 / 右欄 ↑↓ 選成員 /
 *   Alt+A 指派成員 / Delete 撤銷選中成員（離開改走星球選單 Alt+X、[1-2] 2026-06-05 Alt+Q 移除）。
 * 鋼鐵星球視覺 + MasterTopBar 統一置頂列。
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import { ConfirmDialog, type ConfirmState } from '@/features/master-shell/ui/ConfirmDialog';
import { EntityPickerDialog } from '@/features/master-shell/ui/EntityPickerDialog';
import { listUsers, type UserDto } from '@data/endpoints/base/api/user';

export type ReverseEntity = { id: string; code: string; name: string };
export type ReverseMember = { recordId: string; userId: string; label: string; sub: string };

export type ReverseAssignConfig = {
  category: string;
  title: string;
  entityNoun: string;
  memberNoun: string;
  loadEntities: () => Promise<ReverseEntity[]>;
  loadMembers: (entityId: string) => Promise<ReverseMember[]>;
  assign: (entityId: string, userId: string) => Promise<void>;
  revoke: (recordId: string) => Promise<void>;
};

export function ReverseAssignPage({ config }: { config: ReverseAssignConfig }) {
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [entities, setEntities] = useState<ReverseEntity[]>([]);
  const [entityIdx, setEntityIdx] = useState(0);
  const [members, setMembers] = useState<ReverseMember[]>([]);
  const [memberIdx, setMemberIdx] = useState(0);
  const [col, setCol] = useState<'entity' | 'member'>('entity');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const selectedEntity = entities[entityIdx] ?? null;

  useEffect(() => {
    void (async () => {
      try {
        setEntities(await config.loadEntities());
      } catch (e) {
        showToast((e as Error)?.message ?? '載入失敗', 'danger');
      }
    })();
  }, [config, showToast]);

  useEffect(() => {
    if (!selectedEntity) {
      setMembers([]);
      return;
    }
    void (async () => {
      try {
        setMembers(await config.loadMembers(selectedEntity.id));
        setMemberIdx(0);
      } catch (e) {
        showToast((e as Error)?.message ?? '成員載入失敗', 'danger');
      }
    })();
  }, [selectedEntity, config, showToast, reloadTick]);

  const requestNavigate = useCallback((href: string) => router.push(href), [router]);

  const handleRevoke = useCallback(
    (m: ReverseMember) => {
      setConfirm({
        title: `撤銷${config.memberNoun}`,
        message: `確定將「${m.label}」自「${selectedEntity?.name}」撤銷？（軟刪除、保留紀錄）`,
        confirmLabel: '撤銷',
        variant: 'danger',
        onConfirm: () => {
          void (async () => {
            try {
              await config.revoke(m.recordId);
              showToast('已撤銷', 'success');
              setReloadTick((t) => t + 1);
            } catch (e) {
              showToast((e as Error)?.message ?? '撤銷失敗', 'danger');
            }
          })();
        },
      });
    },
    [config, selectedEntity, showToast],
  );

  const memberUserIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);

  // 鍵盤
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (pickerOpen || confirm) return;
      if (e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'a' && selectedEntity) { e.preventDefault(); setPickerOpen(true); }
        else if (k === 'q') { e.preventDefault(); router.push('/dashboard'); }
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const d = e.key === 'ArrowDown' ? 1 : -1;
        if (col === 'entity') setEntityIdx((i) => Math.min(entities.length - 1, Math.max(0, i + d)));
        else setMemberIdx((i) => Math.min(members.length - 1, Math.max(0, i + d)));
      } else if (e.key === 'ArrowRight') {
        if (col === 'entity' && members.length > 0) { e.preventDefault(); setCol('member'); setMemberIdx(0); }
      } else if (e.key === 'ArrowLeft') {
        if (col === 'member') { e.preventDefault(); setCol('entity'); }
      } else if (e.key === 'Delete') {
        if (col === 'member' && members[memberIdx]) { e.preventDefault(); handleRevoke(members[memberIdx]); }
      } else if (e.key === 'Enter') {
        if (col === 'entity' && members.length > 0) { e.preventDefault(); setCol('member'); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [col, entities, members, memberIdx, selectedEntity, pickerOpen, confirm, handleRevoke, router]);

  return (
    <div className="flex h-dvh flex-col text-[#E8E8EB]" style={{ backgroundImage: 'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)' }}>
      <MasterTopBar category={config.category} title={config.title} count={`${entities.length} 個${config.entityNoun}`} requestNavigate={requestNavigate} />

      <div className="flex min-h-0 flex-1">
        {/* 左：實體列表 */}
        <div className={cn('flex w-60 shrink-0 flex-col border-r border-[#2A2A30] bg-[#0C0C10] overflow-auto nx-master-scroll', col === 'entity' && 'ring-1 ring-inset ring-[#E8A020]/30')}>
          <div className="sticky top-0 border-b border-[#2A2A30] bg-[#0E0E12] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5A5A60]">
            {config.entityNoun}（↑↓ 選 · → 進成員）
          </div>
          {entities.map((en, i) => {
            const on = i === entityIdx;
            return (
              <button
                key={en.id}
                type="button"
                onClick={() => { setEntityIdx(i); setCol('entity'); }}
                className={cn(
                  'flex flex-col gap-0.5 border-b border-[#1A1A1F]/60 px-3 py-2 text-left transition-colors',
                  on ? 'bg-[#E8A020]/12 text-[#E8A020]' : 'text-[#E8E8EB] hover:bg-[#1A1A22]',
                  on && col === 'entity' && 'ring-1 ring-inset ring-[#E8A020]/60',
                )}
              >
                <span className="text-sm font-medium">{en.name}</span>
                <span className="font-mono text-[10px] text-[#5A5A60]">{en.code}</span>
              </button>
            );
          })}
        </div>

        {/* 右：成員清單 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-[#2A2A30] bg-[#0E0E12] px-4 py-2">
            <span className="text-sm font-semibold text-[#F0F0F3]">
              {selectedEntity ? `「${selectedEntity.name}」的${config.memberNoun}` : config.memberNoun}
            </span>
            <span className="rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-0.5 text-[11px] font-mono text-[#B8B8C0]">{members.length}</span>
            <div className="flex-1" />
            <button
              type="button"
              disabled={!selectedEntity}
              onClick={() => setPickerOpen(true)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#E8A020]/30 bg-[#E8A020]/10 px-3 text-[11px] font-medium text-[#E8A020] transition-colors hover:bg-[#E8A020]/20 disabled:opacity-40"
            >
              <Plus className="size-3" /> 指派{config.memberNoun} (Alt+A)
            </button>
          </div>
          <div className={cn('min-h-0 flex-1 overflow-auto nx-master-scroll', col === 'member' && 'ring-1 ring-inset ring-[#E8A020]/30')}>
            {members.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-[#5A5A60]">{selectedEntity ? `尚無${config.memberNoun}` : `請先在左側選一個${config.entityNoun}`}</div>
            ) : (
              members.map((m, i) => {
                const on = i === memberIdx;
                return (
                  <div
                    key={m.recordId}
                    onMouseEnter={() => { setCol('member'); setMemberIdx(i); }}
                    className={cn(
                      'flex items-center gap-3 border-b border-[#1A1A1F]/60 px-4 py-2.5',
                      on && col === 'member' ? 'bg-[#E8A020]/8 ring-1 ring-inset ring-[#E8A020]/50' : 'hover:bg-[#1A1A22]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-[#E8E8EB]">{m.label}</div>
                      <div className="truncate font-mono text-[10px] text-[#5A5A60]">{m.sub}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(m)}
                      className="inline-flex h-6 items-center gap-1 rounded border border-[#5A2A2A] bg-[#1F1212] px-2 text-[10px] font-medium text-[#C84A4A] transition-colors hover:bg-[#2A1818] hover:text-[#E26060]"
                    >
                      <X className="size-3" /> 撤銷
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 指派 picker：選使用者 */}
      <EntityPickerDialog<UserDto>
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={`指派${config.memberNoun}`}
        searchPlaceholder="搜尋帳號 / 姓名..."
        search={(q) => listUsers({ q, pageSize: 50 })}
        getId={(u) => u.id}
        getLabel={(u) => u.displayName || u.username}
        getDescription={(u) => u.username}
        disabledIds={memberUserIds}
        onConfirm={async (selected) => {
          if (!selectedEntity) return;
          for (const u of selected) await config.assign(selectedEntity.id, u.id);
        }}
        onSuccess={(count) => {
          showToast(`已指派 ${count} 位${config.memberNoun}`, 'success');
          setReloadTick((t) => t + 1);
        }}
      />

      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
