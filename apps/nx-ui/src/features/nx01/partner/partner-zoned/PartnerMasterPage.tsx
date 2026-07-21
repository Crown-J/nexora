// apps/nx-ui/src/features/partner-zoned/PartnerMasterPage.tsx
// v1.2 對齊軌 階段 E P2：partner 分區編輯 list+detail 容器
//
// 對齊鋼鐵星球範式（同 EntityMasterPage）：
// - ERP 工具列 A 新增 / E 更正 / F 查詢 / D 停用啟用 / 匯出 / R 重新整理 / Q 結束
// - 編輯 staged write + dirty 攔截 + 3-way confirm
// - 軟刪除（系統不刪資料）+ 全鍵盤 + 手機 responsive
//
// 對齊 v1.1 §1：模組頁面用 editableZones 限制可編 zones、PATCH 只送該區欄位、不覆寫其他區
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@design/utils/cn';
import {
  PARTNER_FIELDS,
  PARTNER_ZONES,
  type PartnerZone,
} from '@/features/nx01/shell/zones';
import { ConfirmDialog, type ConfirmState } from '@/features/nx01/shell/ui/ConfirmDialog';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import {
  ErpToolbar,
  type ErpMode,
  type ExportFormat,
} from '@/features/nx01/shell/ui/ErpToolbar';
import { exportTable } from '@/features/nx01/shell/hooks/useExportTable';
import { SearchPanel } from '@/features/nx01/shell/ui/SearchPanel';
import {
  MasterTable,
  type MasterTableColumn,
} from '@/features/nx01/shell/ui/MasterTable';
import { MasterDetailScroll, EmptyDetail } from '@/features/nx01/shell/ui/MasterDetail';
import { FormField } from '@/features/nx01/shell/ui/FormField';
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';
import { MasterPageHead } from '@/features/nx01/shell/master-nav';
import { useColumnsPref } from '@/features/nx01/shell/ui/columns-config/useColumnsPref';
import {
  type SortableOption,
  type SortOrder,
} from '@/features/nx01/shell/ui/sort-config/SortMenuButton';
import { formatDateTimeZh } from '@/features/nx01/shell/entity-master/format';
import { fetchRefOptions } from '@/features/nx01/shell/entity-master/config';
import {
  createPartner,
  listPartner,
  setPartnerActive,
  updatePartner,
} from '@data/endpoints/shared/master/partner/api/partner';
import type { PartnerDto, PartnerType } from '@data/types/shared/master/partner';

import { PartnerFormZoned, type RefOption } from './PartnerFormZoned';
import {
  PARTNER_TYPE_LABEL,
  emptyPartnerDraft,
  partnerDraftToBody,
  partnerRowToDraft,
  type PartnerDraft,
} from './helpers';

type Tab = 'list' | 'detail';

export type PartnerMasterPageProps = {
  pageCategory: string;
  pageTitle: string;
  /** 列表只顯示這些 partnerType；undefined = 全部（主檔中心） */
  filterPartnerTypes?: PartnerType[];
  /** 詳細頁可編 zones（v1.1 §1）；undefined = 全 zone（主檔中心、依 partnerType 動態） */
  editableZones?: Set<PartnerZone>;
  /** 新增時的預設 partnerType（模組頁固定、例：銷貨頁=C、採購頁=S） */
  createDefaultPartnerType?: PartnerType;
  /** 列表 + 編輯實體名詞 e.g. '客戶' / '供應商' / '帳戶' / '往來對象' */
  entityNoun: string;
};

export function PartnerMasterPage({
  pageTitle,
  filterPartnerTypes,
  editableZones,
  createDefaultPartnerType = 'C',
  entityNoun,
}: PartnerMasterPageProps) {
  const { toasts, showToast } = useToast();

  // ── 資料 / 篩選（2026-06-24 執行長拍板：取消分頁、固定撈前 100 筆） ──
  const [rows, setRows] = useState<PartnerDto[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 100;
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);
  /** 模組頁選 partnerType（只在 filterPartnerTypes.length>1 時有意義） */
  const [pickedType, setPickedType] = useState<PartnerType | ''>('');

  // ── 選列 / 模式 / Tab ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<Tab>('list');
  const [creating, setCreating] = useState(false);
  const [activeZone, setActiveZone] = useState<PartnerZone>('basic');

  // ── 編輯 staged ──
  const [draft, setDraft] = useState<PartnerDraft>({});
  const [original, setOriginal] = useState<PartnerDraft>({});

  // 2026-06-18 套員工新範式
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const COLUMN_ALL_KEYS = useMemo(
    () => ['code', 'name', 'partnerType', 'contactName', 'phone', 'isActive'],
    [],
  );
  const {
    visibleKeys: columnsOrder,
    setVisibleKeys: setColumnsOrder,
  } = useColumnsPref('master-partners:columns:v1', COLUMN_ALL_KEYS, COLUMN_ALL_KEYS);
  const SORT_OPTIONS: SortableOption[] = useMemo(
    () => [
      { key: 'code', label: '代碼' },
      { key: 'name', label: '名稱' },
      { key: 'partnerType', label: '類型' },
      { key: 'contactName', label: '聯絡人' },
      { key: 'phone', label: '電話' },
      { key: 'isActive', label: '狀態' },
    ],
    [],
  );
  // 2026-06-24 取消分頁後 pendingSelectRef 不再需要
  const focusFirstRowRef = useRef<boolean>(true);

  // ── 確認框 ──
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // ── 外鍵下拉 ──
  const [refOptions, setRefOptions] = useState<{
    customerGradeId?: RefOption[];
    supplierGradeId?: RefOption[];
    defaultWarehouseId?: RefOption[];
    salesUserId?: RefOption[];
    defaultCurrencyId?: RefOption[];
  }>({});

  const sidebarRef = useRef<HTMLElement>(null);

  // 搜尋 debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // 載 ref options 一次
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [cg, sg, wh, cur] = await Promise.all([
        fetchRefOptions('nx01/customer-grades'),
        fetchRefOptions('nx01/supplier-grades'),
        fetchRefOptions('nx01/warehouses'),
        fetchRefOptions('nx01/currencies'),
      ]);
      // user list 沒走 entity-master 通用 endpoint 範式、用 nx01/users 並組 label
      const userRes = await fetch('/api/nx01/users?pageSize=100&isActive=true', {
        credentials: 'include',
      }).catch(() => null);
      let users: RefOption[] = [];
      if (userRes && userRes.ok) {
        const data = await userRes.json().catch(() => ({}));
        const items = (data.items ?? data.rows ?? []) as Array<{
          id: string;
          userAccount?: string;
          userName?: string;
        }>;
        users = items.map((u) => ({
          value: u.id,
          label: [u.userName, u.userAccount].filter(Boolean).join(' · ') || u.id,
        }));
      }
      if (cancelled) return;
      setRefOptions({
        customerGradeId: toRefOptions(cg),
        supplierGradeId: toRefOptions(sg),
        defaultWarehouseId: toRefOptions(wh),
        defaultCurrencyId: toRefOptions(cur),
        salesUserId: users,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── load ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 模組頁多 partnerType：用 pickedType 過濾、若未選用後端側支援多筆需逐個合併
      // LITE 階段 1 簡化：一次只查一個 partnerType（pickedType 或第一個 allowed）
      const onlyType = filterPartnerTypes
        ? (pickedType || filterPartnerTypes[0])
        : undefined;
      const res = await listPartner({
        page: 1,
        pageSize,
        q: debouncedKw,
        partnerType: onlyType,
        // 垃圾桶語意：開=只看停用列（再啟用入口）、關=只看啟用列（2026-07-21 執行長回饋：啟用列不該混進垃圾桶）
        isActive: showInactive ? false : true,
      });
      // 若 filterPartnerTypes 有多個、後端僅查一種、前端額外提示
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast((e as Error)?.message ?? '載入失敗', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKw, pageSize, showInactive, reloadTick, pickedType]);

  useEffect(() => {
    void load();
  }, [load]);

  // 自動鎖第一列
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

  // 2026-06-18 前端排序
  const displayRows = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'boolean') return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
      return String(av).localeCompare(String(bv), 'zh-Hant') * dir;
    });
  }, [rows, sortKey, sortOrder]);

  // 2026-06-24 取消分頁後：itemIndex / 項目級導航不再跨頁
  const localIdx = displayRows.findIndex((r) => r.id === selectedId);
  const itemIndex = localIdx >= 0 ? localIdx + 1 : 0;
  const itemTotal = displayRows.length;

  useEffect(() => {
    if (displayRows.length === 0) return;
    if (focusFirstRowRef.current) {
      const firstId = displayRows[0].id;
      setSelectedId(firstId);
      focusFirstRowRef.current = false;
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-row-id="${firstId}"]`)?.focus();
      });
    }
  }, [displayRows]);

  // 2026-06-24 選中列捲入視野（鍵盤 ↑↓ 切列時、跟 EntityMasterPage 同範式）
  useEffect(() => {
    if (!selectedId || tab !== 'list') return;
    document
      .querySelector(`[data-row-id="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, tab]);

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

  // dirty
  const isDirty = useMemo(() => {
    if (mode !== 'edit') return false;
    return Object.keys({ ...draft, ...original }).some(
      (k) => String(draft[k] ?? '') !== String(original[k] ?? ''),
    );
  }, [mode, draft, original]);

  // ── 動作 ──
  const performCancel = useCallback(() => {
    setMode('browse');
    setCreating(false);
    setDraft({});
    setOriginal({});
    setActiveZone('basic');
    setTab('list');
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
    const seedType = filterPartnerTypes?.[0] ?? createDefaultPartnerType;
    const d = emptyPartnerDraft(seedType);
    setCreating(true);
    setSelectedId(null);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
    setActiveZone('basic');
  }, [filterPartnerTypes, createDefaultPartnerType]);

  const handleEdit = useCallback(() => {
    if (!selected) return;
    const d = partnerRowToDraft(selected);
    setCreating(false);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
  }, [selected]);

  // 2026-06-23 修瀏覽模式 detail 全 "—"：PartnerFormZoned 瀏覽欄位讀 draft、
  // 但編輯才 setDraft、瀏覽 selected 時 draft 是空 → 全顯示 "—"。
  // 在瀏覽模式下、selected 變動就同步把 selected → draft，讓欄位顯示真實值。
  useEffect(() => {
    if (mode === 'edit') return;
    if (creating) return;
    if (!selected) {
      setDraft({});
      return;
    }
    setDraft(partnerRowToDraft(selected));
  }, [selected, mode, creating]);

  const performSave = useCallback(async () => {
    // 必填驗證（只就「目前要送的欄位」做、避免擋下其他區的空值）
    const requiredFields = PARTNER_FIELDS.filter((f) => {
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
    const body = partnerDraftToBody(draft, editableZones, { isCreate: creating });
    try {
      if (creating) {
        const created = await createPartner({
          ...body,
          code: String(draft.code ?? '').trim(),
          name: String(draft.name ?? '').trim(),
          partnerType: String(draft.partnerType ?? createDefaultPartnerType) as PartnerType,
        });
        showToast(`已新增${entityNoun}`, 'success');
        setReloadTick((t) => t + 1);
        setSelectedId(created.id);
      } else if (selectedId) {
        await updatePartner(selectedId, body);
        showToast('已存檔', 'success');
        setReloadTick((t) => t + 1);
      }
      performCancel();
    } catch (e) {
      showToast((e as Error)?.message ?? '存檔失敗', 'danger');
    }
  }, [
    creating,
    draft,
    editableZones,
    entityNoun,
    createDefaultPartnerType,
    selectedId,
    performCancel,
    showToast,
  ]);

  const handleSave = useCallback(() => {
    setConfirm({
      title: creating ? `新增${entityNoun}` : '存檔變更',
      message: creating
        ? `確定新增這筆${entityNoun}？`
        : `確定儲存對「${(selected?.name as string) ?? ''}」的變更？`,
      confirmLabel: '存檔',
      onConfirm: () => void performSave(),
    });
  }, [creating, entityNoun, selected, performSave]);

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
    const label = selected.name;
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
            await setPartnerActive(selected.id, !selected.isActive);
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
      // [2-1] 三模式匯出（CSV / PDF / 列印）「所見即所得」
      exportTable(format, {
        title: pageTitle,
        columns: [
          { label: '代碼', get: (r) => r.code },
          { label: '名稱', get: (r) => r.name },
          {
            label: '類型',
            get: (r) =>
              PARTNER_TYPE_LABEL[String(r.partnerType).toUpperCase() as PartnerType] ?? '',
          },
          { label: '聯絡人', get: (r) => r.contactName ?? '' },
          { label: '電話', get: (r) => r.phone ?? '' },
        ],
        rows,
      });
    },
    [rows, pageTitle],
  );

  const toggleSearch = useCallback(() => setSearchOpen((s) => !s), []);

  // ── 全鍵盤（2026-06-24 加 window listener focus 全域、滑鼠點旁邊 ↑↓ 仍切 row）──
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

      if (radixOpen) return;

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

      if (inInput) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (tab !== 'list') return;
        if (tgt?.hasAttribute?.('data-row-id')) return;
        if (displayRows.length === 0) return;
        const idx = displayRows.findIndex((r) => r.id === selectedId);
        const nextIdx =
          e.key === 'ArrowDown'
            ? Math.min(displayRows.length - 1, Math.max(0, idx + 1))
            : Math.max(0, idx - 1);
        const nextRow = displayRows[nextIdx];
        if (nextRow) {
          e.preventDefault();
          setSelectedId(nextRow.id);
        }
        return;
      }

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
    selected,
  ]);

  // beforeunload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── 列表欄位 ──
  const columns: MasterTableColumn<PartnerDto>[] = useMemo(
    () => [
      {
        key: 'code',
        label: '代碼',
        minWidthClass: 'min-w-[110px]',
        render: (row) => <span className="font-mono text-xs">{row.code}</span>,
      },
      {
        key: 'name',
        label: '名稱',
        minWidthClass: 'min-w-[160px]',
        render: (row) => <span>{row.name}</span>,
      },
      {
        key: 'partnerType',
        label: '類型',
        minWidthClass: 'min-w-[100px]',
        render: (row) => (
          <span className="text-xs">
            {PARTNER_TYPE_LABEL[row.partnerType as PartnerType] ?? row.partnerType}
          </span>
        ),
      },
      {
        key: 'contactName',
        label: '聯絡人',
        minWidthClass: 'min-w-[100px]',
        render: (row) => <span>{row.contactName ?? '—'}</span>,
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

  const visibleColumns = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, c]));
    return columnsOrder.map((k) => map.get(k)).filter((c): c is typeof columns[number] => !!c);
  }, [columns, columnsOrder]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      {/* 2026-06-28 執行長：清除麵包屑殘留、對齊使用者基本資料乾淨六層 */}

      <MasterPageHead
        tab={tab}
        onTabChange={attemptTabChange}
        currentPageId="partner"
        detailTitle={creating ? `新增${entityNoun}` : selected?.name ?? undefined}
        detailSubtitle={mode === 'edit' ? (creating ? '新增中' : '編輯中') : '瀏覽'}
        onCreate={handleCreate}
      />

      {/* partnerType 子篩選列（多 partner type 模組頁用） */}
      {filterPartnerTypes && filterPartnerTypes.length > 1 ? (
        <div className="border-b border-border/60 bg-card px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>顯示：</span>
            {filterPartnerTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPickedType(pickedType === t ? '' : t)}
                className={cn(
                  'rounded-md border px-2 py-1 transition-colors',
                  (pickedType === t || (pickedType === '' && filterPartnerTypes[0] === t))
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border/60 text-muted-foreground hover:border-border',
                )}
              >
                {PARTNER_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <ErpToolbar
          mode={mode}
          hasActiveRow={!!selected}
          selectedRowActive={selected?.isActive ?? true}
          selectedRowBuiltin={(selected as { isBuiltin?: boolean } | null)?.isBuiltin ?? false}
          selectionMode={false}
          onToggleSelection={() => {}}
          selectedCount={0}
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
            const rowEl = document.querySelector<HTMLElement>(`[data-row-id="${selectedId}"]`);
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
            const rowEl = document.querySelector<HTMLElement>(`[data-row-id="${selectedId}"]`);
            if (rowEl) {
              e.preventDefault();
              rowEl.focus();
            }
          }}
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
        placeholder={`搜尋${entityNoun}代碼 / 名稱 / 聯絡人...`}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<PartnerDto>
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
            selectionMode={false}
            checked={new Set()}
            setChecked={() => {}}
            pageSize={pageSize}
            hidePageSizeArea
            footerHint={
              loading
                ? '載入中...'
                : total > pageSize
                  ? `資料較多、僅顯前 ${pageSize} 筆、請用搜尋過濾`
                  : undefined
            }
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
            refOptions={refOptions}
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

// ──────────────────────────────────────────────────────────────
// DetailPane
// ──────────────────────────────────────────────────────────────

function DetailPane({
  creating,
  mode,
  selected,
  draft,
  setDraft,
  activeZone,
  setActiveZone,
  editableZones,
  refOptions,
  entityNoun,
  onRequestSave,
}: {
  creating: boolean;
  mode: ErpMode;
  selected: PartnerDto | null;
  draft: PartnerDraft;
  setDraft: (next: PartnerDraft) => void;
  activeZone: PartnerZone;
  setActiveZone: (z: PartnerZone) => void;
  editableZones?: Set<PartnerZone>;
  refOptions: {
    customerGradeId?: RefOption[];
    supplierGradeId?: RefOption[];
    defaultWarehouseId?: RefOption[];
    salesUserId?: RefOption[];
    defaultCurrencyId?: RefOption[];
  };
  entityNoun: string;
  onRequestSave: () => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const editing = mode === 'edit';

  // 進編輯自動 focus 第一格
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
    return <EmptyDetail message={`從「資料瀏覽」選一筆，或按 A 新增${entityNoun}`} />;
  }

  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      <div className="px-4 py-4 sm:px-6">
        {/* 2026-06-18 SectionHeader 已搬到 MasterPageHead tabs 同排 */}
        <div ref={formRef} data-master-form onKeyDown={handleFormKey}>
          <PartnerFormZoned
            mode={mode}
            creating={creating}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
            refOptions={refOptions}
            selectedPartnerId={selected?.id ?? null}
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

function toRefOptions(
  raw: Array<{ value: string | number; label: string }>,
): RefOption[] {
  return raw.map((o) => ({ value: String(o.value), label: o.label }));
}

// 未使用警示抑制（保留 PARTNER_ZONES export 用作型別參照）
void PARTNER_ZONES;
