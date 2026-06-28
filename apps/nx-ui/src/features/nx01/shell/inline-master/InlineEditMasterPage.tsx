// apps/nx-ui/src/features/nx01/shell/inline-master/InlineEditMasterPage.tsx
/**
 * InlineEditMasterPage — L0 純查表 / 字典表 inline edit row 範本
 *
 * 設計初衷（執行長 2026-06-23 拍板「分級 #1」）：
 *   country / region / department / phonetic-dictionary 這種 3-4 欄字典表
 *   不該強迫 user 切 list/detail Tab、應該 row 雙擊或 Enter 直接 inline 編輯。
 *
 * 與 EntityMasterPage 差異：
 *   - 無 list/detail Tab 切換、永遠 list 視圖
 *   - 編輯狀態 = row in-place input、Tab/Shift+Tab 跳欄
 *   - Enter 存、Esc 取消（含 dirty guard 3-way confirm）
 *   - A 新增 = 列頂插空白 editing row（不切視圖）
 *   - 工具列簡化：A / F / D / R / O / T 垃圾桶 / 新增、無 E（雙擊即進編輯）
 *   - 無排序 dropdown / 篩選面板 / 表頭拖拉 / 批次選取（L0 用不到）
 *
 * 共用：吃既有 EntityMasterConfig 不擴展、共用 fetch/create/update/setActive helper。
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@design/utils/cn';
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';

import { MasterQuickNav } from '@/features/nx01/shell/master-nav/MasterQuickNav';
import {
  ErpToolbar,
  type ErpMode,
} from '@/features/nx01/shell/ui/ErpToolbar';
import {
  ConfirmDialog,
  type ConfirmState,
} from '@/features/nx01/shell/ui/ConfirmDialog';
import { SearchPanel } from '@/features/nx01/shell/ui/SearchPanel';
import { exportTable } from '@/features/nx01/shell/hooks/useExportTable';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';

import {
  type EntityMasterConfig,
  type EntityRow,
  type EntityDraft,
  type EntityFieldDef,
  fetchEntityList,
  createEntity,
  updateEntity,
  setEntityActive,
  emptyDraft,
  rowToDraft,
  draftToBody,
} from '../entity-master/config';

const PAGE_SIZE = 50;

function listFields(cfg: EntityMasterConfig): EntityFieldDef[] {
  return cfg.fields.filter((f) => f.inList !== false);
}

function displayCell(f: EntityFieldDef, raw: unknown): string {
  if (raw == null || raw === '') return '—';
  if (f.type === 'toggle') return raw ? '是' : '否';
  if (f.type === 'select' && f.options) {
    return f.options.find((x) => String(x.value) === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}

export function InlineEditMasterPage({ config }: { config: EntityMasterConfig }) {
  const { toasts, showToast } = useToast();

  // 資料
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  // 選列 / 編輯
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<EntityDraft>({});
  const [original, setOriginal] = useState<EntityDraft>({});

  // 確認框
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const listFs = useMemo(() => listFields(config), [config]);
  const editing = editingId !== null || creating;
  const mode: ErpMode = editing ? 'edit' : 'browse';
  const tableRef = useRef<HTMLDivElement>(null);

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // load
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEntityList(config, {
        search: debouncedKw,
        page,
        pageSize: PAGE_SIZE,
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
  }, [config, debouncedKw, page, showInactive, reloadTick]);

  useEffect(() => {
    void load();
  }, [load]);

  // dirty 判斷
  const isDirty = useMemo(() => {
    if (!editing) return false;
    const keys = new Set([...Object.keys(draft), ...Object.keys(original)]);
    for (const k of keys) {
      if (String(draft[k] ?? '') !== String(original[k] ?? '')) return true;
    }
    return false;
  }, [editing, draft, original]);

  const exitEditing = useCallback(() => {
    setEditingId(null);
    setCreating(false);
    setDraft({});
    setOriginal({});
  }, []);

  // dirty guard：離開頁面 / scatter navigate 時、若有未存改動跳 3-way confirm
  useDirtyGuard(
    () => isDirty,
    (proceed) => {
      setConfirm({
        title: '有未儲存的變更',
        message: '是否儲存後再離開、或直接丟棄？',
        variant: 'danger',
        confirmLabel: '儲存後離開',
        onConfirm: () => {
          void handleSave().then(() => proceed());
        },
        secondaryAction: {
          label: '丟棄變更',
          variant: 'danger',
          onClick: () => {
            exitEditing();
            proceed();
          },
        },
      });
    },
  );

  const startCreate = useCallback(() => {
    if (config.readOnly || config.canCreate === false) return;
    if (editing) return; // 已在編輯不重複觸發
    const d = emptyDraft(config);
    setCreating(true);
    setEditingId(null);
    setDraft(d);
    setOriginal(d);
    // 滾到頂 + focus 第一欄
    requestAnimationFrame(() => {
      tableRef.current?.scrollTo({ top: 0 });
      const first = tableRef.current?.querySelector<HTMLInputElement>('[data-draft-row] input,[data-draft-row] select');
      first?.focus();
    });
  }, [config, editing]);

  const startEditRow = useCallback(
    (row: EntityRow) => {
      if (config.readOnly) return;
      if (editing) return;
      const d = rowToDraft(config, row);
      setEditingId(row.id);
      setCreating(false);
      setDraft(d);
      setOriginal(d);
      setSelectedId(row.id);
      requestAnimationFrame(() => {
        const el = tableRef.current?.querySelector<HTMLInputElement>(
          `[data-row-id="${row.id}"] input:not([disabled]),[data-row-id="${row.id}"] select:not([disabled])`,
        );
        el?.focus();
        el?.select?.();
      });
    },
    [config, editing],
  );

  const handleSave = useCallback(async () => {
    if (!editing) return;
    // required 檢查
    for (const f of config.fields) {
      if (!f.required) continue;
      const v = String(draft[f.key] ?? '').trim();
      if (!v) {
        showToast(`「${f.label}」必填`, 'danger');
        return;
      }
    }
    try {
      const body = draftToBody(config, draft);
      if (creating) {
        await createEntity(config, body);
        showToast(`新增${config.entityNoun}成功`, 'success');
      } else if (editingId) {
        await updateEntity(config, editingId, body);
        showToast(`更新${config.entityNoun}成功`, 'success');
      }
      exitEditing();
      setReloadTick((n) => n + 1);
    } catch (e) {
      showToast((e as Error)?.message ?? '儲存失敗', 'danger');
    }
  }, [editing, creating, editingId, config, draft, showToast, exitEditing]);

  const handleCancel = useCallback(() => {
    if (!editing) return;
    if (!isDirty) {
      exitEditing();
      return;
    }
    setConfirm({
      title: creating ? '取消新增？' : '丟棄變更？',
      message: '所有未存的修改將遺失。',
      variant: 'danger',
      confirmLabel: '丟棄',
      onConfirm: exitEditing,
    });
  }, [editing, isDirty, creating, exitEditing]);

  const handleToggleActive = useCallback(
    (row: EntityRow) => {
      if (config.readOnly) return;
      const next = !row.isActive;
      const label = next ? '啟用' : '停用';
      const firstKey = listFs[0]?.key;
      const rowLabel = firstKey ? String(row[firstKey] ?? row.id) : row.id;
      setConfirm({
        title: `${label}${config.entityNoun}？`,
        message: `將「${rowLabel}」${label}。`,
        variant: next ? 'default' : 'danger',
        confirmLabel: label,
        onConfirm: async () => {
          try {
            await setEntityActive(config, row.id, next);
            showToast(`${label}成功`, 'success');
            setReloadTick((n) => n + 1);
          } catch (e) {
            showToast((e as Error)?.message ?? '操作失敗', 'danger');
          }
        },
      });
    },
    [config, listFs, showToast],
  );

  // 鍵盤：A / F / R / T / D / S / C / Esc / Enter / ↑↓
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Alt 系列
      if (e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'a') {
          e.preventDefault();
          startCreate();
          return;
        }
        if (k === 'f') {
          e.preventDefault();
          setSearchOpen((v) => !v);
          return;
        }
        if (k === 'r') {
          e.preventDefault();
          if (!editing) {
            setReloadTick((n) => n + 1);
            showToast('已重新整理', 'info');
          }
          return;
        }
        if (k === 't') {
          e.preventDefault();
          if (!editing) setShowInactive((v) => !v);
          return;
        }
        if (k === 'd' && selectedId && !editing) {
          e.preventDefault();
          const row = rows.find((r) => r.id === selectedId);
          if (row) void handleToggleActive(row);
          return;
        }
        if (k === 's' && editing) {
          e.preventDefault();
          void handleSave();
          return;
        }
        if (k === 'c' && editing) {
          e.preventDefault();
          handleCancel();
          return;
        }
      }
      // 非 Alt
      if (e.key === 'Escape' && editing) {
        e.preventDefault();
        handleCancel();
        return;
      }
      if (e.key === 'Enter' && !editing && selectedId) {
        const tgt = e.target as HTMLElement;
        // 表單元素內部 Enter 不擋
        if (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA') return;
        e.preventDefault();
        const row = rows.find((r) => r.id === selectedId);
        if (row) startEditRow(row);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, selectedId, rows, startCreate, startEditRow, handleSave, handleCancel, handleToggleActive, showToast]);

  // 編輯 row 內 Enter 存 / Tab 自動跳 / 最後一欄 Tab 視為 save
  const handleRowKey = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!editing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      }
    },
    [editing, handleSave],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf' | 'print') => {
    const cols = listFs.map((f) => ({
      label: f.label,
      get: (r: EntityRow) => displayCell(f, r[f.key]),
    }));
    exportTable<EntityRow>(format, {
      title: config.title,
      columns: cols,
      rows,
    });
  };

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4 lg:px-6">
      {/* 2026-06-28 執行長：清除麵包屑殘留、對齊使用者基本資料乾淨六層（標題由工作區分頁顯示）*/}
      {/* L0 inline edit 範本不要 list/detail tabs、只保留主檔快速入口 */}
      <div data-nx-frame className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <MasterQuickNav currentPageId={config.pageId} />
      </div>

      <ErpToolbar
        mode={mode}
        hasActiveRow={!!selectedId}
        selectedRowActive={selected?.isActive ?? true}
        selectionMode={false}
        onToggleSelection={() => {}}
        selectedCount={0}
        page={page}
        totalPages={totalPages}
        onPageChange={(n) => setPage(Math.max(1, Math.min(totalPages, n)))}
        onCreate={startCreate}
        onEdit={() => {
          if (selectedId) {
            const row = rows.find((r) => r.id === selectedId);
            if (row) startEditRow(row);
          }
        }}
        onSearch={() => setSearchOpen((v) => !v)}
        onDelete={() => {
          if (!selectedId) return;
          const row = rows.find((r) => r.id === selectedId);
          if (row) void handleToggleActive(row);
        }}
        onExport={handleExport}
        exportMenuOpen={exportMenuOpen}
        onExportMenuOpenChange={setExportMenuOpen}
        onRefresh={() => {
          setReloadTick((n) => n + 1);
          showToast('已重新整理', 'info');
        }}
        onSave={() => void handleSave()}
        onCancel={handleCancel}
        showInactive={showInactive}
        onShowInactiveChange={(v) => setShowInactive(v)}
      />

      <SearchPanel
        open={searchOpen}
        value={keyword}
        onChange={setKeyword}
        onClose={() => setSearchOpen(false)}
        placeholder={`搜尋${config.entityNoun}…`}
      />

      <div
        ref={tableRef}
        data-nx-frame
        className="rounded-lg border border-border/40 bg-card/70 overflow-auto"
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/40">
            <tr>
              {listFs.map((f) => (
                <th
                  key={f.key}
                  className={cn(
                    'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
                    f.minWidthClass,
                  )}
                >
                  {f.label}
                  {f.required ? <span className="ml-0.5 text-[var(--color-danger)]">*</span> : null}
                </th>
              ))}
              <th className="w-20 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                狀態
              </th>
            </tr>
          </thead>
          <tbody>
            {creating ? (
              <InlineEditRow
                key="__draft"
                draftRow
                config={config}
                draft={draft}
                onChange={setDraft}
                onRowKey={handleRowKey}
              />
            ) : null}

            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={listFs.length + 1}
                  className="px-3 py-12 text-center text-xs text-muted-foreground"
                >
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={listFs.length + 1}
                  className="px-3 py-12 text-center text-xs text-muted-foreground"
                >
                  {keyword ? '無符合搜尋的資料' : `尚無${config.entityNoun}資料`}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) =>
                editingId === row.id ? (
                  <InlineEditRow
                    key={row.id}
                    rowId={row.id}
                    config={config}
                    draft={draft}
                    onChange={setDraft}
                    onRowKey={handleRowKey}
                  />
                ) : (
                  <BrowseRow
                    key={row.id}
                    row={row}
                    even={idx % 2 === 0}
                    listFs={listFs}
                    selected={selectedId === row.id}
                    onSelect={() => setSelectedId(row.id)}
                    onDoubleClick={() => startEditRow(row)}
                    onToggleActive={() => void handleToggleActive(row)}
                    readOnly={!!config.readOnly}
                  />
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      {confirm ? <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} /> : null}
      <ToastStack toasts={toasts} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// BrowseRow（read-only）
// ────────────────────────────────────────────────────────────

function BrowseRow({
  row,
  even,
  listFs,
  selected,
  onSelect,
  onDoubleClick,
  onToggleActive,
  readOnly,
}: {
  row: EntityRow;
  even: boolean;
  listFs: EntityFieldDef[];
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onToggleActive: () => void;
  readOnly: boolean;
}) {
  return (
    <tr
      data-row-id={row.id}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={readOnly ? undefined : onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !readOnly) {
          e.preventDefault();
          onDoubleClick();
        }
      }}
      className={cn(
        'cursor-pointer outline-none transition-colors border-b border-border/30',
        selected
          ? 'bg-[var(--primary)]/10 border-l-2 border-l-[var(--primary)]'
          : even
            ? 'bg-foreground/[0.015]'
            : '',
        'hover:bg-[var(--primary)]/8 focus-visible:bg-[var(--primary)]/12',
        !row.isActive && 'opacity-50',
      )}
    >
      {listFs.map((f) => (
        <td
          key={f.key}
          className={cn(
            'px-3 py-2',
            f.mono && 'font-mono text-xs',
          )}
        >
          {displayCell(f, row[f.key])}
        </td>
      ))}
      <td className="px-3 py-2 text-right">
        {row.isActive ? (
          <span className="rounded-full bg-[var(--color-success)]/14 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
            啟用
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            className="rounded-full bg-[var(--muted-foreground)]/14 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)] hover:bg-[var(--color-success)]/14 hover:text-[var(--color-success)]"
            title="按一下啟用"
          >
            停用
          </button>
        )}
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────
// InlineEditRow（編輯中、row 變 inputs）
// ────────────────────────────────────────────────────────────

function InlineEditRow({
  rowId,
  draftRow,
  config,
  draft,
  onChange,
  onRowKey,
}: {
  rowId?: string;
  draftRow?: boolean;
  config: EntityMasterConfig;
  draft: EntityDraft;
  onChange: (next: EntityDraft) => void;
  onRowKey: (e: React.KeyboardEvent<HTMLElement>) => void;
}) {
  const listFs = listFields(config);
  return (
    <tr
      data-row-id={rowId}
      data-draft-row={draftRow ? 'true' : undefined}
      className="border-b border-[var(--primary)]/30 bg-[var(--primary)]/8"
    >
      {listFs.map((f) => {
        const v = draft[f.key];
        const disabled = !draftRow && f.lockedOnEdit;
        return (
          <td key={f.key} className="px-2 py-1.5">
            {f.type === 'select' && f.options ? (
              <select
                value={String(v ?? '')}
                disabled={disabled}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                onKeyDown={onRowKey}
                className={cn(
                  'w-full rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-[var(--primary)]',
                  f.mono && 'font-mono text-xs',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <option value="">—</option>
                {f.options.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'toggle' ? (
              <input
                type="checkbox"
                checked={Boolean(v)}
                disabled={disabled}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.checked })}
                onKeyDown={onRowKey}
                className="h-4 w-4 accent-[var(--primary)]"
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={String(v ?? '')}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                disabled={disabled}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                onKeyDown={onRowKey}
                className={cn(
                  'w-full rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-[var(--primary)]',
                  f.mono && 'font-mono text-xs',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              />
            )}
          </td>
        );
      })}
      <td className="px-3 py-1.5 text-right">
        <span className="rounded-full bg-[var(--primary)]/14 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
          {draftRow ? '新增中' : '編輯中'}
        </span>
      </td>
    </tr>
  );
}
