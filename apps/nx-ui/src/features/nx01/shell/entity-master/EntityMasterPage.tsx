// apps/nx-ui/src/features/master-shell/entity-master/EntityMasterPage.tsx
/**
 * EntityMasterPage — 鋼鐵星球 config-driven 通用主檔頁
 *
 * 對齊 USER 主檔已驗證範式：鋼鐵星球視覺 + ERP 工具列 + 編輯模式 staged write +
 * dirty state 攔截 + 3-way confirm + 軟刪除（系統不刪資料）+ 全鍵盤 + 手機 responsive。
 *
 * 用一份 EntityMasterConfig 即可套用平面 code 主檔（幣別 / 國家 / 零件群組 / 車體類型 …）。
 *
 * 介面（單欄 + Tab list/detail，桌面手機一致、天然 responsive）：
 * - 列表 Tab（Alt+1）：MasterTable + ↑↓ 切列 + Enter 進詳細
 * - 詳細 Tab（Alt+2）：瀏覽 FormField / 編輯 FormInput
 * - 工具列：A 新增 / E 更正 / F 查詢 / D 停用-啟用 / 匯出 / R 重新整理 / 選取批次 / Q 結束
 * - 編輯模式：S 存檔 / C 取消（dirty 時跳「存檔後離開 / 丟棄 / 取消」3 選 1）
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@design/utils/cn';
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';
import { MasterPageHead } from '@/features/nx01/shell/master-nav';
import { formatDateTimeZh } from './format';
import {
  ErpToolbar,
  type ErpMode,
} from '@/features/nx01/shell/ui/ErpToolbar';
import { exportTable, type ExportFormat } from '@/features/nx01/shell/hooks/useExportTable';
import { SearchPanel } from '@/features/nx01/shell/ui/SearchPanel';
import {
  MasterTable,
  type MasterTableColumn,
} from '@/features/nx01/shell/ui/MasterTable';
import { ConfirmDialog, type ConfirmState } from '@/features/nx01/shell/ui/ConfirmDialog';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import { MasterDetailScroll, EmptyDetail } from '@/features/nx01/shell/ui/MasterDetail';
import { FormField, FormInput } from '@/features/nx01/shell/ui/FormField';
import { KeyboardSelect } from '@/features/nx01/shell/ui/KeyboardSelect';
import { useColumnsPref } from '@/features/nx01/shell/ui/columns-config/useColumnsPref';
import {
  type SortableOption,
  type SortOrder,
} from '@/features/nx01/shell/ui/sort-config/SortMenuButton';
import {
  MasterFilterPanel,
  rowMatchesFilters,
  type FilterCond,
  type FilterFieldDef,
} from '@/features/nx01/shell/ui/MasterTableTools';

import {
  type EntityMasterConfig,
  type EntityRow,
  type EntityDraft,
  type EntityFieldDef,
  type SelectOption,
  fetchEntityList,
  createEntity,
  updateEntity,
  setEntityActive,
  fetchRefOptions,
  rowToDraft,
  emptyDraft,
  draftToBody,
} from './config';

/** select / ref 欄位的顯示標籤（列表 + 瀏覽詳細共用） */
function optionLabel(
  f: EntityFieldDef,
  raw: unknown,
  refOptions: Record<string, SelectOption[]>,
): string {
  if (raw == null || raw === '') return '—';
  if (f.type === 'select' && f.options) {
    return f.options.find((x) => String(x.value) === String(raw))?.label ?? String(raw);
  }
  if (f.type === 'ref') {
    const opts = refOptions[f.key] ?? [];
    return opts.find((x) => String(x.value) === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}

/** 詳細頁跨欄 class（detailSpan；textarea/json 未指定時預設 2 格、維持既有行為）。
 *  窄螢幕（單欄）不跨、sm 起跨 2、xl 起才跨 3，避免小視窗擠壓。 */
function detailSpanClass(f: EntityFieldDef): string | undefined {
  const span = f.detailSpan ?? (f.type === 'textarea' || f.type === 'json' ? 2 : undefined);
  if (span === 'full') return '[grid-column:1/-1]';
  if (span === 3) return 'sm:[grid-column:span_2] xl:[grid-column:span_3]';
  if (span === 2) return 'sm:[grid-column:span_2]';
  return undefined;
}

type Tab = 'list' | 'detail';

function formatDt(iso: unknown): string {
  return formatDateTimeZh(iso);
}

function auditPerson(username: unknown, name: unknown): string {
  const n = (name as string) || '';
  const u = (username as string) || '';
  if (n && u) return `${n}（${u}）`;
  return n || u || '—';
}

function listFields(cfg: EntityMasterConfig): EntityFieldDef[] {
  return cfg.fields.filter((f) => f.inList !== false);
}

/**
 * 2026-06-24 執行長拍板：取消分頁、固定一次撈前 100 筆。
 * - 原 page/totalPages/setPageSize state 全廢
 * - itemIndex / 上下筆切換不再跨頁、純 displayRows 內 ±1
 * - total > 100 時 footerHint 提示「顯前 100 筆、請用搜尋過濾」
 */
const ENTITY_LIST_PAGE_SIZE = 100;

export function EntityMasterPage({ config }: { config: EntityMasterConfig }) {
  const { toasts, showToast } = useToast();

  // 資料 / 篩選（2026-06-24 取消分頁、pageSize 固定）
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = ENTITY_LIST_PAGE_SIZE;
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  // 選列 / 模式 / Tab
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<Tab>('list');
  const [creating, setCreating] = useState(false);

  // 編輯 staged draft
  const [draft, setDraft] = useState<EntityDraft>({});
  const [original, setOriginal] = useState<EntityDraft>({});

  // 批次選取
  const [selectionMode, setSelectionMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // 確認框
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // 外鍵下拉選項（ref 欄位）
  const [refOptions, setRefOptions] = useState<Record<string, SelectOption[]>>({});

  // 2026-06-18 套員工範式:篩選保留（Alt+T）、欄位改表頭拖拉（dnd-kit、Alt+L 退役）
  const [filters, setFilters] = useState<FilterCond[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // 2026-06-18 M 排序 dropdown menu（前端 sort、單欄位三態循環）
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // 2026-06-18 O 匯出受控 dropdown
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // 2026-06-18 表頭拖拉重排欄位順序 + localStorage 記憶
  const COLUMN_ALL_KEYS = useMemo(
    () => [...listFields(config).map((f) => f.key), 'isActive'],
    [config],
  );
  const {
    visibleKeys: columnsOrder,
    setVisibleKeys: setColumnsOrder,
  } = useColumnsPref(`master-entity:${config.basePath}:columns:v1`, COLUMN_ALL_KEYS, COLUMN_ALL_KEYS);

  // 2026-06-24 取消分頁後 pendingSelectRef 不再需要、僅留 focusFirstRowRef
  const focusFirstRowRef = useRef<boolean>(true);

  // M 排序欄位選項:自動從 list fields 推（不含 isActive、不含 textarea/json/computed）
  const SORT_OPTIONS: SortableOption[] = useMemo(
    () =>
      listFields(config)
        .filter((f) => f.type !== 'textarea' && f.type !== 'json' && f.type !== 'computed')
        .map((f) => ({ key: f.key, label: f.label })),
    [config],
  );

  const sidebarRef = useRef<HTMLElement>(null);

  // 欄位 / 篩選共用的「欄位清單」（列表欄位 + 狀態欄）
  const toolFields: FilterFieldDef[] = useMemo(
    () => [...listFields(config).map((f) => ({ key: f.key, label: f.label })), { key: 'isActive', label: '狀態' }],
    [config],
  );

  // 取某列某欄的「顯示文字」（select / ref 取 label、toggle 取是/否、狀態取啟用/停用）
  const getCellText = useCallback(
    (row: EntityRow, key: string): string => {
      if (key === 'isActive') return row.isActive ? '啟用' : '停用';
      const f = config.fields.find((x) => x.key === key);
      if (!f) return String(row[key] ?? '');
      if (f.type === 'toggle') return row[key] ? '是' : '否';
      if (f.type === 'select' || f.type === 'ref') return optionLabel(f, row[key], refOptions);
      return String(row[key] ?? '');
    },
    [config, refOptions],
  );

  // 前端篩選：就目前載入的資料列套用（pagination 仍為後端）
  const filteredRows = useMemo(
    () =>
      filters.length === 0
        ? rows
        : rows.filter((r) => rowMatchesFilters(filters, (k) => getCellText(r, k))),
    [rows, filters, getCellText],
  );

  // 2026-06-18 前端排序（單欄位、type-aware:number / date / string）
  const displayRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const field = config.fields.find((f) => f.key === sortKey);
    const dir = sortOrder === 'asc' ? 1 : -1;
    const sorted = [...filteredRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (field?.type === 'number' || typeof av === 'number') {
        return (Number(av) - Number(bv)) * dir;
      }
      if (field?.type === 'toggle' || typeof av === 'boolean') {
        return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
      }
      return String(av).localeCompare(String(bv), 'zh-Hant') * dir;
    });
    return sorted;
  }, [filteredRows, sortKey, sortOrder, config.fields]);

  const selected = useMemo(
    () => displayRows.find((r) => r.id === selectedId) ?? null,
    [displayRows, selectedId],
  );

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 載入外鍵下拉選項（ref 欄位）
  useEffect(() => {
    const refFields = config.fields.filter((f) => f.type === 'ref' && f.refBasePath);
    if (refFields.length === 0) return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        refFields.map(async (f) => {
          const opts = await fetchRefOptions(f.refBasePath as string, f.refLabelKeys, f.refExtraFilters);
          return [f.key, opts] as const;
        }),
      );
      if (!cancelled) setRefOptions(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [config]);

  // load（2026-06-24 取消分頁、固定撈前 100 筆）
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEntityList(config, {
        search: debouncedKw,
        page: 1,
        pageSize,
        // 垃圾桶語意：開=只看停用列（再啟用入口）、關=只看啟用列（2026-07-21 執行長回饋：啟用列不該混進垃圾桶）
        isActive: showInactive ? false : true,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast((e as Error)?.message ?? '載入失敗', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, debouncedKw, pageSize, showInactive, reloadTick]);

  useEffect(() => {
    void load();
  }, [load]);

  // 2026-06-24 套員工範式（不跨頁版）+ 全鍵盤 focus 第一筆
  useEffect(() => {
    if (displayRows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    // mount / cancel / save 後 focus 第一筆
    if (focusFirstRowRef.current) {
      const firstId = displayRows[0].id;
      setSelectedId(firstId);
      focusFirstRowRef.current = false;
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-row-id="${firstId}"]`)?.focus();
      });
      return;
    }
    // 既有選中項目不在 displayRows、預設選第一筆
    if (!displayRows.some((r) => r.id === selectedId)) setSelectedId(displayRows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayRows]);

  // 2026-06-24 item-level navigation handlers（不跨頁版本、純 displayRows 內 ±1）
  const localIdx = displayRows.findIndex((r) => r.id === selectedId);
  const itemIndex = localIdx >= 0 ? localIdx + 1 : 0;
  const itemTotal = displayRows.length;
  const handleJumpFirstItem = useCallback(() => {
    if (displayRows.length === 0) return;
    setSelectedId(displayRows[0].id);
  }, [displayRows]);
  const handleJumpLastItem = useCallback(() => {
    if (displayRows.length === 0) return;
    setSelectedId(displayRows[displayRows.length - 1].id);
  }, [displayRows]);
  const handlePrevItem = useCallback(() => {
    if (localIdx > 0) setSelectedId(displayRows[localIdx - 1].id);
  }, [localIdx, displayRows]);
  const handleNextItem = useCallback(() => {
    if (localIdx >= 0 && localIdx < displayRows.length - 1) {
      setSelectedId(displayRows[localIdx + 1].id);
    } else if (localIdx < 0 && displayRows.length > 0) {
      setSelectedId(displayRows[0].id);
    }
  }, [localIdx, displayRows]);

  // 選中列捲入視野（鍵盤 ↑↓ 切列時）
  useEffect(() => {
    if (!selectedId || tab !== 'list') return;
    document.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

  // dirty 判斷（編輯模式）
  const isDirty = useMemo(() => {
    if (mode !== 'edit') return false;
    const keys = config.fields.map((f) => f.key);
    return keys.some((k) => String(draft[k] ?? '') !== String(original[k] ?? ''));
  }, [mode, draft, original, config.fields]);

  // ── 動作 ──────────────────────────────────────────────
  const performCancel = useCallback(() => {
    setMode('browse');
    setCreating(false);
    setDraft({});
    setOriginal({});
    setTab('list');
    // 2026-06-18 套員工範式:cancel 後 focus 第一 row
    focusFirstRowRef.current = true;
    if (displayRows.length > 0) {
      const firstId = displayRows[0].id;
      setSelectedId(firstId);
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-row-id="${firstId}"]`)?.focus();
      });
      focusFirstRowRef.current = false;
    }
  }, [displayRows]);

  const handleCreate = useCallback(() => {
    if (config.readOnly || config.canCreate === false) {
      showToast(`${config.entityNoun}為系統設定、不可新增`, 'info');
      return;
    }
    const d = emptyDraft(config);
    setCreating(true);
    setSelectedId(null);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [config, showToast]);

  const handleEdit = useCallback(() => {
    if (!selected) return;
    if (config.readOnly) {
      showToast(`${config.entityNoun}為系統唯讀資料`, 'info');
      return;
    }
    const d = rowToDraft(config, selected);
    setCreating(false);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [config, selected, showToast]);

  const performSave = useCallback(async () => {
    // 必填驗證
    for (const f of config.fields) {
      if (f.required && f.type !== 'toggle') {
        const v = String(draft[f.key] ?? '').trim();
        if (!v) {
          showToast(`「${f.label}」為必填`, 'danger');
          return;
        }
      }
    }
    // 長度驗證（02 第四批 軌 4 2026-06-07）：text 欄位的 min/maxLength
    for (const f of config.fields) {
      if (f.type === 'toggle' || f.type === 'ref' || f.type === 'select') continue;
      const v = String(draft[f.key] ?? '').trim();
      if (!v) continue; // 空值由 required 已守、選填欄空值不檢長度
      if (f.minLength != null && v.length < f.minLength) {
        showToast(`「${f.label}」至少 ${f.minLength} 字`, 'danger');
        return;
      }
      if (f.maxLength != null && v.length > f.maxLength) {
        showToast(`「${f.label}」最多 ${f.maxLength} 字`, 'danger');
        return;
      }
    }
    const body = draftToBody(config, draft);
    try {
      if (creating) {
        const created = await createEntity(config, body);
        showToast(`已新增${config.entityNoun}`, 'success');
        setReloadTick((t) => t + 1);
        setSelectedId(created.id);
      } else if (selectedId) {
        await updateEntity(config, selectedId, body);
        showToast('已存檔', 'success');
        setReloadTick((t) => t + 1);
      }
      performCancel();
    } catch (e) {
      showToast((e as Error)?.message ?? '存檔失敗', 'danger');
    }
  }, [config, draft, creating, selectedId, performCancel, showToast]);

  const handleSave = useCallback(() => {
    setConfirm({
      title: creating ? `新增${config.entityNoun}` : '存檔變更',
      message: creating
        ? `確定新增這筆${config.entityNoun}？`
        : `確定儲存對「${(selected?.[config.fields[0].key] as string) ?? ''}」的變更？`,
      confirmLabel: '存檔',
      onConfirm: () => void performSave(),
    });
  }, [creating, config, selected, performSave]);

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
    if (config.readOnly) {
      showToast(`${config.entityNoun}為系統唯讀資料`, 'info');
      return;
    }
    const turningOff = selected.isActive;
    const label = (selected[config.fields[0].key] as string) ?? selected.id;
    setConfirm({
      title: turningOff ? `停用${config.entityNoun}` : `啟用${config.entityNoun}`,
      message: turningOff
        ? `確定停用「${label}」？（系統不刪資料、停用後可從「顯示停用」恢復）`
        : `確定重新啟用「${label}」？`,
      confirmLabel: turningOff ? '停用' : '啟用',
      variant: turningOff ? 'danger' : 'default',
      onConfirm: () => {
        void (async () => {
          try {
            await setEntityActive(config, selected.id, !selected.isActive);
            showToast(turningOff ? '已停用' : '已啟用', 'success');
            setReloadTick((t) => t + 1);
          } catch (e) {
            showToast((e as Error)?.message ?? '操作失敗', 'danger');
          }
        })();
      },
    });
  }, [selected, config, showToast]);

  const handleBatchSetActive = useCallback(
    (active: boolean) => {
      const ids = Array.from(checked);
      if (ids.length === 0) return;
      void (async () => {
        let ok = 0;
        for (const id of ids) {
          try {
            await setEntityActive(config, id, active);
            ok += 1;
          } catch {
            /* 個別失敗略過、最後彙總 */
          }
        }
        showToast(`已${active ? '啟用' : '停用'} ${ok}/${ids.length} 筆`, ok === ids.length ? 'success' : 'danger');
        setChecked(new Set());
        setSelectionMode(false);
        setReloadTick((t) => t + 1);
      })();
    },
    [checked, config, showToast],
  );

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

  // [1-2] 2026-06-05：handleExit / Alt+Q 已移除（離開主檔改走星球選單 Alt+X）

  // Phase 2 後續軌:全域 dirty 攔截、編輯模式跨頁跳轉前跳 3-way confirm
  useDirtyGuard(
    () => mode === 'edit' && isDirty,
    useCallback(
      (proceed) => {
        setConfirm({
          title: '尚有未儲存的變更',
          message: '離開此頁要先存檔、還是丟棄變更？',
          confirmLabel: '存檔後離開',
          onConfirm: () => {
            void performSave();
            proceed();
          },
          secondaryAction: {
            label: '丟棄變更',
            variant: 'danger',
            onClick: () => {
              performCancel();
              proceed();
            },
          },
        });
      },
      [performSave, performCancel],
    ),
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      // 2026-06-18 匯出走目前 columnsOrder（拖拉後的順序、所見即所得）
      const colMap = new Map(listFields(config).map((f) => [f.key, f]));
      const cols = columnsOrder
        .map((k) => colMap.get(k))
        .filter((f): f is EntityFieldDef => !!f)
        .map((c) => ({ label: c.label, get: (r: EntityRow) => getCellText(r, c.key) }));
      exportTable(format, {
        title: config.title ?? config.basePath.replace(/\//g, ''),
        columns: cols,
        rows: displayRows,
      });
    },
    [config, displayRows, columnsOrder, getCellText],
  );

  // 2026-06-18 兩面板互斥（搜尋 / 篩選）
  const toggleSearch = useCallback(() => {
    setSearchOpen((s) => !s);
    setFilterOpen(false);
  }, []);
  const toggleFilter = useCallback(() => {
    setFilterOpen((o) => !o);
    setSearchOpen(false);
  }, []);

  // ── 全鍵盤 ────────────────────────────────────────────
  // 2026-06-24 執行長拍板：滑鼠點旁邊 focus 跑掉、↑↓ 仍要切 row（不依賴 DOM focus）。
  // 規則：
  //   - input/textarea/select/contenteditable focus 時：單鍵 ↑↓/Enter/字母 不接、Alt 系仍接管
  //   - Radix modal/dropdown 開啟（[data-state="open"][role="dialog"|"menu"]）：全短路、交給 modal
  //   - 其他情況：↑↓/Enter 由 EntityMasterPage 接管（用 selectedId state、不依賴 DOM focus）
  //   - row 本身仍 tabIndex=0 + MasterTable.handleTableKey 並存（row focused 時優先 row，行為相同）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName ?? '';
      const inInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        (tgt?.isContentEditable ?? false);
      const radixOpen = !!document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="menu"]',
      );

      // Radix modal / dropdown 開啟時、所有熱鍵交給 modal（執行長明說範式）
      if (radixOpen) return;

      // ── Alt 系（既有範式：input 內也生效）──
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
            r: () => {
              setReloadTick((t) => t + 1);
              showToast('已重新整理', 'success');
            },
            p: () => handleExport('print'),
            o: () => setExportMenuOpen(true),
            m: () => setSortMenuOpen(true),
            t: toggleFilter,
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

      // Esc 仍處理（input 內亦可、用來收搜尋條 / 取消編輯）
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          setKeyword('');
        } else if (mode === 'edit') {
          handleCancel();
        }
        return;
      }

      // 單鍵 ↑↓/Enter：input 焦點不攔（讓 input 移 cursor / 換行）
      if (inInput) return;

      // ↑↓ 切 row（不依賴 DOM focus、靠 selectedId state）
      // row 本身 keydown 由 MasterTable.handleTableKey 處理；此處接管 focus 在 body / 別處時
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Home' || e.key === 'End') {
        if (tab !== 'list') return; // detail 模式 ↑↓ 不切 row
        if (tgt?.hasAttribute?.('data-row-id')) return; // row 焦點交給 MasterTable
        if (displayRows.length === 0) return;
        const idx = displayRows.findIndex((r) => r.id === selectedId);
        // 鍵盤情境驗收 2026-07-11 補：Home/End 首尾列（對齊 DocWorkbench 既有行為）
        const nextIdx =
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? displayRows.length - 1
              : e.key === 'ArrowDown'
                ? Math.min(displayRows.length - 1, Math.max(0, idx + 1))
                : Math.max(0, idx - 1);
        const nextRow = displayRows[nextIdx];
        if (nextRow) {
          e.preventDefault();
          setSelectedId(nextRow.id);
        }
        return;
      }

      // Enter 進詳細（同上、row 焦點交給 MasterTable）
      if (e.key === 'Enter') {
        if (tab !== 'list') return;
        if (tgt?.hasAttribute?.('data-row-id')) return;
        if (!selectedId) return;
        e.preventDefault();
        attemptTabChange('detail');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mode,
    tab,
    searchOpen,
    selectedId,
    displayRows,
    attemptTabChange,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSave,
    handleCancel,
    handleExport,
    showToast,
    toggleSearch,
    toggleFilter,
    selected,
  ]);

  // beforeunload（dirty 攔截）
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── 列表欄位 ──────────────────────────────────────────
  const columns: MasterTableColumn<EntityRow>[] = useMemo(() => {
    const cols: MasterTableColumn<EntityRow>[] = listFields(config).map((f) => ({
      key: f.key,
      label: f.label,
      minWidthClass: f.minWidthClass,
      sortable: false,
      render: (row: EntityRow) =>
        f.type === 'toggle' ? (
          (row[f.key] as boolean) ? '是' : '否'
        ) : f.type === 'select' || f.type === 'ref' ? (
          <span>{optionLabel(f, row[f.key], refOptions)}</span>
        ) : (
          <span className={f.mono ? 'font-mono text-xs' : undefined}>
            {String(row[f.key] ?? '—')}
          </span>
        ),
    }));
    cols.push({
      key: 'isActive',
      label: '狀態',
      minWidthClass: 'min-w-[80px]',
      render: (row: EntityRow) => (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'size-2 rounded-full',
              row.isActive ? 'bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]' : 'bg-[var(--color-danger)] shadow-[0_0_8px_var(--color-danger)]',
            )}
          />
          <span className={row.isActive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
            {row.isActive ? '啟用' : '停用'}
          </span>
        </span>
      ),
    });
    return cols;
  }, [config, refOptions]);

  // 套用「欄位設定」隱藏欄
  // 2026-06-18 套員工範式:依拖拉後的 columnsOrder 重排（取代隱藏邏輯）
  const visibleColumns = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, c]));
    return columnsOrder.map((k) => map.get(k)).filter((c): c is typeof columns[number] => !!c);
  }, [columns, columnsOrder]);

  // ── render ────────────────────────────────────────────
  // 2026-06-28 執行長：清除麵包屑殘留（PageHeader 不再 render、對齊使用者基本資料乾淨六層）；
  //   標題由工作區分頁（L2）顯示、總筆數由工具列項目導航（N/M）顯示
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      {/* MasterPageHead：桌面 tabs；手機自動隱 tabs、改返回列 + 新增 FAB（onCreate）*/}
      <MasterPageHead
        tab={tab}
        onTabChange={attemptTabChange}
        currentPageId={config.pageId ?? null}
        detailTitle={
          creating
            ? `新增${config.entityNoun}`
            : (selected?.[config.fields[0].key] as string | undefined) ?? undefined
        }
        detailSubtitle={mode === 'edit' ? (creating ? '新增中' : '編輯中') : '瀏覽'}
        onCreate={!config.readOnly && config.canCreate !== false ? handleCreate : undefined}
      />

      {/* 2026-06-18 套員工範式 toolbar:item-level nav + sort menu + 受控 dropdown */}
      <div className="overflow-x-auto">
        <ErpToolbar
          mode={mode}
          hasActiveRow={!!selected}
          selectedRowActive={selected?.isActive ?? true}
          selectedRowBuiltin={(selected as { isBuiltin?: boolean } | null)?.isBuiltin ?? false}
          selectionMode={selectionMode}
          onToggleSelection={() => {
            setSelectionMode((s) => !s);
            setChecked(new Set());
          }}
          selectedCount={checked.size}
          itemIndex={itemIndex}
          itemTotal={itemTotal}
          onJumpFirstItem={handleJumpFirstItem}
          onPrevItem={handlePrevItem}
          onNextItem={handleNextItem}
          onJumpLastItem={handleJumpLastItem}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onSearch={toggleSearch}
          onDelete={handleDelete}
          onExport={handleExport}
          exportMenuOpen={exportMenuOpen}
          onExportMenuOpenChange={setExportMenuOpen}
          onExportMenuCloseAutoFocus={(e) => {
            if (!selectedId) return;
            const rowEl = document.querySelector<HTMLElement>(
              `[data-row-id="${selectedId}"]`,
            );
            if (rowEl) {
              e.preventDefault();
              rowEl.focus();
            }
          }}
          onRefresh={() => {
            setReloadTick((t) => t + 1);
            showToast('已重新整理', 'success');
          }}
          sortOptions={SORT_OPTIONS}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(k, o) => {
            setSortKey(k);
            setSortOrder(o);
          }}
          onSortReset={() => {
            setSortKey(null);
            setSortOrder('asc');
          }}
          sortMenuOpen={sortMenuOpen}
          onSortMenuOpenChange={setSortMenuOpen}
          onSortMenuCloseAutoFocus={(e) => {
            if (!selectedId) return;
            const rowEl = document.querySelector<HTMLElement>(
              `[data-row-id="${selectedId}"]`,
            );
            if (rowEl) {
              e.preventDefault();
              rowEl.focus();
            }
          }}
          onSave={handleSave}
          onCancel={handleCancel}
          showInactive={showInactive}
          onShowInactiveChange={mode === 'browse' && tab === 'list' ? (v) => setShowInactive(v) : undefined}
          onBatchEnable={() => handleBatchSetActive(true)}
          onBatchDisable={() => handleBatchSetActive(false)}
          onOpenFilter={mode === 'browse' && tab === 'list' ? toggleFilter : undefined}
          filterCount={filters.length}
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
        placeholder={`搜尋${config.entityNoun}代碼 / 名稱...`}
      />

      {/* 2026-06-18 MasterColumnsPanel 退役（改表頭拖拉、I 按鈕拿掉） */}
      <MasterFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fields={toolFields}
        value={filters}
        onApply={setFilters}
      />

      {/* Content（手機卡片/返回列/FAB 由 MasterTable + MasterPageHead 共用元件提供）*/}
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<EntityRow>
            onColumnOrderChange={setColumnsOrder}
            columns={visibleColumns}
            rows={displayRows}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => {
              setSelectedId(id);
              attemptTabChange('detail');
            }}
            selectionMode={selectionMode}
            checked={checked}
            setChecked={setChecked}
            pageSize={pageSize}
            hidePageSizeArea
            footerHint={
              loading
                ? '載入中...'
                : total > pageSize
                  ? `資料較多、僅顯前 ${pageSize} 筆、請用搜尋過濾`
                  : filters.length > 0
                    ? `篩選 ${filters.length} 條件 · 符合 ${displayRows.length} 筆`
                    : undefined
            }
            totalCount={total}
          />
        ) : (
          <DetailPane
            config={config}
            mode={mode}
            creating={creating}
            selected={selected}
            draft={draft}
            setDraft={setDraft}
            refOptions={refOptions}
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
  config,
  mode,
  creating,
  selected,
  draft,
  setDraft,
  refOptions,
  onRequestSave,
}: {
  config: EntityMasterConfig;
  mode: ErpMode;
  creating: boolean;
  selected: EntityRow | null;
  draft: EntityDraft;
  setDraft: (next: EntityDraft) => void;
  refOptions: Record<string, SelectOption[]>;
  onRequestSave: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const editing = mode === 'edit';

  // 進編輯模式自動 focus 第一格（讓 Enter 跳格從第一格開始）
  useEffect(() => {
    if (!editing) return;
    const el = formRef.current?.querySelector<HTMLElement>('input, select, textarea, [data-kbd-select]');
    el?.focus();
  }, [editing, creating, selected?.id]);

  // ERP muscle memory：Enter 跳下一格；最後一格 Enter → 存檔確認。textarea 例外（換行）。
  // 下拉欄位（KeyboardSelect）自行處理 Enter（展開 / 確認+跳格、stopPropagation），不會走到這裡。
  const handleFormKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName.toLowerCase() === 'textarea') return;
    if (t.hasAttribute('data-kbd-select')) return; // 交給 KeyboardSelect 自己處理
    e.preventDefault();
    const els = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, [data-kbd-select]') ?? [],
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const idx = els.indexOf(t);
    if (idx >= 0 && idx < els.length - 1) els[idx + 1]?.focus();
    else onRequestSave();
  };

  if (mode !== 'edit' && !selected) {
    return <EmptyDetail message="從「資料瀏覽」選一筆，或按 A 新增" />;
  }

  // 單一欄位渲染（原 config.fields.map 主體、抽函式供分組 chunk 重用；跨欄由外層 wrapper 管）
  const renderDetailField = (f: EntityFieldDef) => {
    // 計算欄位（唯讀即時預覽，如料號分段預覽）：編輯時讀 draft、瀏覽時讀 row
    if (f.type === 'computed') {
      const val = f.compute?.(editing ? draft : ((selected as Record<string, unknown>) ?? {})) ?? '';
      return <FormField label={f.label} value={val || '—'} mono />;
    }
    const lockedNow = editing && !creating && f.lockedOnEdit;
    // 編輯模式：select / ref 下拉（全鍵盤 KeyboardSelect：Enter 展開→↑↓選→Enter 確認+跳格→Esc 關）
    if (editing && !lockedNow && (f.type === 'select' || f.type === 'ref')) {
      const opts = f.type === 'select' ? (f.options ?? []) : (refOptions[f.key] ?? []);
      const baseOpts = opts.map((o) => ({ value: String(o.value), label: o.label }));
      // 非必填提供「清除」選項（對齊原 native 空白 option）；options 已含空值則不重複加
      const hasEmpty = baseOpts.some((o) => o.value === '');
      const selOpts = f.required || hasEmpty
        ? baseOpts
        : [{ value: '', label: f.placeholder ?? '（無）' }, ...baseOpts];
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            {f.label + (f.required ? ' *' : '')}
          </span>
          <KeyboardSelect
            value={String(draft[f.key] ?? '')}
            options={selOpts}
            placeholder={f.placeholder ?? (f.required ? '請選擇...' : '（無）')}
            ariaLabel={f.label}
            onChange={(v) => setDraft({ ...draft, [f.key]: v })}
          />
        </div>
      );
    }
    // 編輯模式：textarea / json（長文 / JSON 巢狀；跨欄改由 detailSpanClass 管、預設仍 2 格）
    if (editing && !lockedNow && (f.type === 'textarea' || f.type === 'json')) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            {f.label + (f.required ? ' *' : '') + (f.type === 'json' ? '（JSON 陣列）' : '')}
          </span>
          <textarea
            value={String(draft[f.key] ?? '')}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            rows={f.type === 'json' ? 8 : 4}
            placeholder={f.placeholder}
            className={cn(
              'rounded-md border border-[var(--primary)]/30 bg-[var(--nx-surface-input)] px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--primary)]/60 focus:ring-1 focus:ring-[var(--primary)]/40',
              f.type === 'json' && 'font-mono text-xs',
            )}
          />
        </div>
      );
    }
    // 編輯模式：date（T3 進貨對齊批次 2026-06-07）
    if (editing && !lockedNow && f.type === 'date') {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            {f.label + (f.required ? ' *' : '')}
          </span>
          <input
            type="date"
            value={String(draft[f.key] ?? '')}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            className="rounded-md border border-[var(--primary)]/30 bg-[var(--nx-surface-input)] px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-[var(--primary)]/60 focus:ring-1 focus:ring-[var(--primary)]/40"
          />
        </div>
      );
    }
    // 編輯模式：text / number
    if (editing && !lockedNow && f.type !== 'toggle') {
      return (
        <FormInput
          label={f.label + (f.required ? ' *' : '')}
          value={String(draft[f.key] ?? '')}
          onChange={(v) => setDraft({ ...draft, [f.key]: v })}
          placeholder={f.placeholder}
          maxLength={f.maxLength}
        />
      );
    }
    // 編輯模式：toggle
    if (editing && f.type === 'toggle') {
      const on = Boolean(draft[f.key]);
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">{f.label}</span>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, [f.key]: !on })}
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
              on
                ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                : 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
            )}
          >
            {on ? '啟用' : '停用'}
          </button>
        </div>
      );
    }
    // 瀏覽 / locked 欄位
    const raw = editing ? draft[f.key] : selected?.[f.key];
    const val =
      f.type === 'toggle'
        ? (raw ? '啟用' : '停用')
        : f.type === 'select' || f.type === 'ref'
          ? optionLabel(f, raw, refOptions)
          : f.type === 'json'
            ? (raw == null || raw === '' ? '—' : typeof raw === 'string' ? raw : JSON.stringify(raw))
            : String(raw ?? '—');
    return (
      <FormField
        label={f.label}
        value={val === '' ? '—' : val}
        mono={f.mono}
        emphasis={f.emphasis}
        tone={f.type === 'toggle' ? (raw ? 'green' : 'red') : undefined}
      />
    );
  };

  // 詳細頁分組：依 detailGroup「連續段」切 chunk、不重排欄位
  // （2026-07-11 執行長拍板「統一底座 + 每檔個別調」、演進 2026-06-24「統一 5 欄 F 方案」拍板）
  const fieldChunks: { label: string | null; fields: EntityFieldDef[] }[] = [];
  for (const f of config.fields) {
    const last = fieldChunks[fieldChunks.length - 1];
    if (!last || (f.detailGroup && f.detailGroup !== last.label)) {
      fieldChunks.push({ label: f.detailGroup ?? null, fields: [f] });
    } else {
      last.fields.push(f);
    }
  }

  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      {/* 2026-06-18 SectionHeader 已搬到 MasterPageHead tabs 同排 */}
      {/* formRef 包所有 chunk：Enter 跳格鏈跨組照走 */}
      <div ref={formRef} data-master-form onKeyDown={handleFormKey} className="px-4 py-4 sm:px-6">
        {fieldChunks.map((chunk, ci) => (
          <div key={chunk.label ?? `_chunk_${ci}`} className={ci > 0 ? 'mt-5' : undefined}>
            {chunk.label ? (
              <div className="mb-2.5 flex items-center gap-2 border-b border-border/40 pb-1.5">
                <span className="size-1.5 rounded-full bg-[var(--primary)]/70" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {chunk.label}
                </span>
              </div>
            ) : null}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
              {chunk.fields.map((f) => (
                <div key={f.key} className={detailSpanClass(f)}>
                  {renderDetailField(f)}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* audit（瀏覽既有資料時） — 跟主 grid 同 5 欄 220px 範式 */}
        {!creating && selected ? (
          <div
            className="mt-5 grid gap-3 border-t border-border/60 pt-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            <FormField label="建立時間" value={formatDt(selected.createdAt)} mono dim />
            <FormField label="建立人員" value={auditPerson(selected.createdByUsername, selected.createdByName)} dim />
            <FormField label="修改時間" value={formatDt(selected.updatedAt)} mono dim />
            <FormField label="修改人員" value={auditPerson(selected.updatedByUsername, selected.updatedByName)} dim />
          </div>
        ) : null}
      </div>
    </MasterDetailScroll>
  );
}
