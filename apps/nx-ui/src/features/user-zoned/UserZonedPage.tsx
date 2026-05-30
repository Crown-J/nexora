// apps/nx-ui/src/features/user-zoned/UserZonedPage.tsx
// v1.2 對齊軌 階段 E P4：user 分區編輯 list+detail 容器
//
// P4 階段：本元件僅供「主檔中心 zoned demo」/dashboard/base/users/zoned 用、
// 既有 /dashboard/base/users（UserMasterPage 1725 行、含 RBAC 連動）保留、
// 範式統一決定留 P6 closure STOP-1 由總經理裁定。
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { USER_FIELDS, type UserZone } from '@/features/master-zones';
import { ConfirmDialog, type ConfirmState } from '@/features/master-shell/ui/ConfirmDialog';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import {
  ErpToolbar,
  type ErpMode,
  type ExportFormat,
} from '@/features/master-shell/ui/ErpToolbar';
import { SearchPanel } from '@/features/master-shell/ui/SearchPanel';
import {
  MasterTable,
  MASTER_TABLE_PAGE_SIZES,
  type MasterTableColumn,
} from '@/features/master-shell/ui/MasterTable';
import { MasterDetailScroll, EmptyDetail, SectionHeader } from '@/features/master-shell/ui/MasterDetail';
import { FormField } from '@/features/master-shell/ui/FormField';
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';
import { MasterTabs } from '@/features/master-shell/entity-master/MasterTabs';
import { formatDateTimeZh } from '@/features/master-shell/entity-master/format';
import {
  listUsers,
  setUserActive,
  updateUser,
  type UserDto,
} from '@/features/base/api/user';

import { UserFormZoned } from './UserFormZoned';
import {
  emptyUserDraft,
  userDraftToBody,
  userRowToDraft,
  type UserDraft,
} from './helpers';

type Tab = 'list' | 'detail';

export type UserZonedPageProps = {
  pageCategory: string;
  pageTitle: string;
  editableZones?: Set<UserZone>;
  entityNoun: string;
};

export function UserZonedPage({
  pageCategory,
  pageTitle,
  editableZones,
  entityNoun,
}: UserZonedPageProps) {
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [rows, setRows] = useState<UserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(MASTER_TABLE_PAGE_SIZES[1]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<Tab>('list');
  const [creating, setCreating] = useState(false);
  const [activeZone, setActiveZone] = useState<UserZone>('basic');

  const [draft, setDraft] = useState<UserDraft>({});
  const [original, setOriginal] = useState<UserDraft>({});

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUsers({
        page,
        pageSize,
        q: debouncedKw,
        isActive: showInactive ? undefined : true,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast((e as Error)?.message ?? '載入失敗', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKw, page, pageSize, showInactive, reloadTick]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (rows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const isDirty = useMemo(() => {
    if (mode !== 'edit') return false;
    return Object.keys({ ...draft, ...original }).some(
      (k) => String(draft[k] ?? '') !== String(original[k] ?? ''),
    );
  }, [mode, draft, original]);

  const performCancel = useCallback(() => {
    setMode('browse');
    setCreating(false);
    setDraft({});
    setOriginal({});
    setActiveZone('basic');
  }, []);

  const handleCreate = useCallback(() => {
    // 新增帳號需要密碼、本軌簡化版不做（既有 /lab/users / /dashboard/base/users 已有 CreateUserDialog）
    showToast('新增帳號請至既有「使用者主檔」頁面（含密碼設定）', 'info');
  }, [showToast]);

  const handleEdit = useCallback(() => {
    if (!selected) return;
    const d = userRowToDraft(selected as unknown as Parameters<typeof userRowToDraft>[0]);
    setCreating(false);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [selected]);

  const performSave = useCallback(async () => {
    const requiredFields = USER_FIELDS.filter((f) => {
      if (f.isSatellite) return false;
      if (!f.required) return false;
      if (editableZones && !editableZones.has(f.zone)) return false;
      return true;
    });
    for (const f of requiredFields) {
      const v = String(draft[f.key] ?? '').trim();
      if (!v) {
        showToast(`「${f.label}」為必填`, 'danger');
        return;
      }
    }
    const body = userDraftToBody(draft, editableZones, { isCreate: false });
    try {
      if (!selectedId) return;
      await updateUser(selectedId, body);
      showToast('已存檔', 'success');
      setReloadTick((t) => t + 1);
      performCancel();
    } catch (e) {
      showToast((e as Error)?.message ?? '存檔失敗', 'danger');
    }
  }, [draft, editableZones, selectedId, performCancel, showToast]);

  const handleSave = useCallback(() => {
    setConfirm({
      title: '存檔變更',
      message: `確定儲存對「${selected?.displayName ?? ''}」的變更？`,
      confirmLabel: '存檔',
      onConfirm: () => void performSave(),
    });
  }, [selected, performSave]);

  const handleCancel = useCallback(() => {
    if (!isDirty) {
      performCancel();
      return;
    }
    setConfirm({
      title: '尚有未儲存的變更',
      message: '要先存檔再離開，還是丟棄變更？',
      confirmLabel: '存檔後離開',
      onConfirm: () => void performSave(),
      secondaryAction: { label: '丟棄變更', variant: 'danger', onClick: performCancel },
    });
  }, [isDirty, performCancel, performSave]);

  const handleDelete = useCallback(() => {
    if (!selected) return;
    const turningOff = selected.isActive;
    const label = selected.displayName;
    setConfirm({
      title: turningOff ? `停用${entityNoun}` : `啟用${entityNoun}`,
      message: turningOff
        ? `確定停用「${label}」？（系統不刪資料、停用後可從「顯示停用」恢復）`
        : `確定重新啟用「${label}」？`,
      confirmLabel: turningOff ? '停用' : '啟用',
      variant: turningOff ? 'danger' : 'default',
      onConfirm: () => {
        void (async () => {
          try {
            await setUserActive(selected.id, !selected.isActive);
            showToast(turningOff ? '已停用' : '已啟用', 'success');
            setReloadTick((t) => t + 1);
          } catch (e) {
            showToast((e as Error)?.message ?? '操作失敗', 'danger');
          }
        })();
      },
    });
  }, [selected, entityNoun, showToast]);

  const attemptTabChange = useCallback(
    (next: Tab) => {
      if (mode === 'edit' && isDirty) {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開編輯要先存檔，還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            setTab(next);
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              setTab(next);
            },
          },
        });
        return;
      }
      setTab(next);
    },
    [mode, isDirty, performSave, performCancel],
  );

  const handleExit = useCallback(() => {
    if (mode === 'edit' && isDirty) {
      handleCancel();
      return;
    }
    router.push('/dashboard');
  }, [mode, isDirty, handleCancel, router]);

  const requestNavigate = useCallback(
    (href: string) => {
      if (mode === 'edit' && isDirty) {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開此頁要先存檔，還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            router.push(href);
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              router.push(href);
            },
          },
        });
        return;
      }
      router.push(href);
    },
    [mode, isDirty, performSave, performCancel, router],
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (format !== 'csv') {
        showToast(`${format.toUpperCase()} 匯出尚未開放，先用 CSV`, 'info');
        return;
      }
      const header = ['帳號', '姓名', 'Email', '電話', '狀態'].join(',');
      const lines = rows.map((r) =>
        [r.username, r.displayName, r.email ?? '', r.phone ?? '', r.isActive ? '啟用' : '停用']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      );
      const csv = [header, ...lines].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pageTitle}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [rows, pageTitle, showToast],
  );

  const toggleSearch = useCallback(() => setSearchOpen((s) => !s), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey) {
        const k = e.key.toLowerCase();
        const map: Record<string, () => void> = {
          '1': () => attemptTabChange('list'),
          '2': () => attemptTabChange('detail'),
        };
        if (mode === 'browse') {
          Object.assign(map, {
            a: handleCreate,
            e: () => selected && handleEdit(),
            f: toggleSearch,
            d: () => selected && handleDelete(),
            r: () => setReloadTick((t) => t + 1),
            q: handleExit,
          });
        } else {
          Object.assign(map, { s: handleSave, c: handleCancel });
        }
        const fn = map[k];
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          setKeyword('');
        } else if (mode === 'edit') {
          handleCancel();
        }
        return;
      }
      const focusTag = (document.activeElement?.tagName ?? '').toLowerCase();
      const inFormEl = focusTag === 'input' || focusTag === 'select' || focusTag === 'textarea';
      if (mode === 'browse' && tab === 'list' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (inFormEl) return;
        if (rows.length === 0) return;
        e.preventDefault();
        const idx = rows.findIndex((r) => r.id === selectedId);
        const cur = idx < 0 ? 0 : idx;
        const nextIdx =
          e.key === 'ArrowDown' ? Math.min(rows.length - 1, cur + 1) : Math.max(0, cur - 1);
        setSelectedId(rows[nextIdx].id);
      }
      if (mode === 'browse' && tab === 'list' && e.key === 'Enter') {
        if (inFormEl) return;
        if (!selected) return;
        e.preventDefault();
        attemptTabChange('detail');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mode,
    tab,
    rows,
    selectedId,
    selected,
    searchOpen,
    attemptTabChange,
    handleCreate,
    handleEdit,
    handleDelete,
    handleExit,
    handleSave,
    handleCancel,
    toggleSearch,
  ]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const columns: MasterTableColumn<UserDto>[] = useMemo(
    () => [
      {
        key: 'username',
        label: '帳號',
        minWidthClass: 'min-w-[120px]',
        render: (row) => <span className="font-mono text-xs">{row.username}</span>,
      },
      {
        key: 'displayName',
        label: '姓名',
        minWidthClass: 'min-w-[120px]',
        render: (row) => <span>{row.displayName}</span>,
      },
      {
        key: 'email',
        label: 'Email',
        minWidthClass: 'min-w-[180px]',
        render: (row) => <span className="text-xs">{row.email ?? '—'}</span>,
      },
      {
        key: 'phone',
        label: '電話',
        minWidthClass: 'min-w-[110px]',
        render: (row) => <span>{row.phone ?? '—'}</span>,
      },
      {
        key: 'isActive',
        label: '狀態',
        minWidthClass: 'min-w-[80px]',
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'size-2 rounded-full',
                row.isActive
                  ? 'bg-[#22D88F] shadow-[0_0_8px_#22D88F]'
                  : 'bg-[#E26060] shadow-[0_0_8px_#E26060]',
              )}
            />
            <span className={row.isActive ? 'text-[#22D88F]' : 'text-[#E26060]'}>
              {row.isActive ? '啟用' : '停用'}
            </span>
          </span>
        ),
      },
    ],
    [],
  );

  const countText = `${total} 筆${entityNoun}`;

  return (
    <div
      className="flex h-dvh flex-col text-[#E8E8EB]"
      style={{
        backgroundImage: 'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)',
      }}
    >
      <MasterTopBar
        category={pageCategory}
        title={pageTitle}
        count={countText}
        requestNavigate={requestNavigate}
      />
      <MasterTabs tab={tab} onChange={attemptTabChange} />
      <div className="overflow-x-auto">
        <ErpToolbar
          mode={mode}
          hasActiveRow={!!selected}
          selectedRowActive={selected?.isActive ?? true}
          selectionMode={false}
          onToggleSelection={() => {}}
          selectedCount={0}
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onSearch={toggleSearch}
          onDelete={handleDelete}
          onExport={handleExport}
          onRefresh={() => setReloadTick((t) => t + 1)}
          onExit={handleExit}
          onSave={handleSave}
          onCancel={handleCancel}
          showInactive={showInactive}
          onShowInactiveChange={mode === 'browse' && tab === 'list' ? setShowInactive : undefined}
          onBatchEnable={() => {}}
          onBatchDisable={() => {}}
        />
      </div>
      <SearchPanel
        open={searchOpen}
        value={keyword}
        onChange={setKeyword}
        onClose={() => {
          setSearchOpen(false);
          setKeyword('');
        }}
        placeholder={`搜尋${entityNoun}帳號 / 姓名 / Email...`}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<UserDto>
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              attemptTabChange('detail');
            }}
            selectionMode={false}
            checked={new Set()}
            setChecked={() => {}}
            pageSize={pageSize}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            footerHint={loading ? '載入中...' : undefined}
            totalCount={total}
          />
        ) : (
          <DetailPane
            creating={creating}
            mode={mode}
            selected={selected}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
            entityNoun={entityNoun}
            onRequestSave={handleSave}
          />
        )}
      </div>
      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      <nav ref={sidebarRef} className="sr-only" aria-hidden />
    </div>
  );
}

function DetailPane({
  creating,
  mode,
  selected,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  entityNoun,
  onRequestSave,
}: {
  creating: boolean;
  mode: ErpMode;
  selected: UserDto | null;
  draft: UserDraft;
  setDraft: (next: UserDraft) => void;
  activeZone: UserZone;
  setActiveZone: (z: UserZone) => void;
  editableZones?: Set<UserZone>;
  entityNoun: string;
  onRequestSave: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const editing = mode === 'edit';

  useEffect(() => {
    if (!editing) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, [data-kbd-select], button',
    );
    el?.focus();
  }, [editing, creating, selected?.id, activeZone]);

  const handleFormKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName.toLowerCase() === 'textarea') return;
    if (t.hasAttribute('data-kbd-select')) return;
    e.preventDefault();
    const els = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>(
        'input, select, textarea, [data-kbd-select]',
      ) ?? [],
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const idx = els.indexOf(t);
    if (idx >= 0 && idx < els.length - 1) els[idx + 1]?.focus();
    else onRequestSave();
  };

  if (mode !== 'edit' && !selected) {
    return <EmptyDetail message={`從「資料瀏覽」選一筆`} />;
  }

  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      <div className="px-4 py-4 sm:px-6">
        <SectionHeader
          title={creating ? `新增${entityNoun}` : selected?.displayName ?? entityNoun}
          subtitle={editing ? '編輯中' : '瀏覽'}
        />
        <div ref={formRef} data-master-form onKeyDown={handleFormKey} className="mt-4">
          <UserFormZoned
            mode={mode}
            creating={creating}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
          />
        </div>
        {!creating && selected ? (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#2A2A30] pt-4 sm:grid-cols-2">
            <FormField
              label="建立時間"
              value={formatDateTimeZh(selected.createdAt)}
              mono
              dim
            />
            <FormField
              label="建立人員"
              value={auditPerson(selected.createdByUsername, selected.createdByName)}
              dim
            />
            <FormField
              label="修改時間"
              value={formatDateTimeZh(selected.updatedAt)}
              mono
              dim
            />
            <FormField
              label="修改人員"
              value={auditPerson(selected.updatedByUsername, selected.updatedByName)}
              dim
            />
          </div>
        ) : null}
      </div>
    </MasterDetailScroll>
  );
}

function auditPerson(username: unknown, name: unknown): string {
  const n = (name as string) || '';
  const u = (username as string) || '';
  if (n && u) return `${n}（${u}）`;
  return n || u || '—';
}
