// apps/nx-ui/src/features/part-zoned/PartZonedPage.tsx
// v1.2 對齊軌 階段 E：part 分區編輯 list+detail 容器
//
// 對齊鋼鐵星球範式 + 階段 E v1.1 §1（PATCH 只送本頁可編欄位）+ 決策 3.2 屏障 1。
// 用於 4 個頁面：
//   · 主檔中心 part（/dashboard/master/parts、全 4 zone）— P6 closure A4 替換舊版 660 行
//   · 採購→產品（basic + purchase + inventory）
//   · 銷貨→產品（basic + sales、含 A3 依成本重算）
//   · 庫存→產品維護（basic + inventory）
//
// 客戶自助功能（從舊版 PartMasterPage 移植、A1~A3）：
//   A1 編碼規則預覽 + 分段 SEG 輸入（CodeRuleSection in PartFormZoned）
//   A2 正廠對應料號 inline 編輯（OemCodesInlineEditor in PartFormZoned）
//   A3 依成本重算 ABCD（讀 customer-grades.marginPct、取代舊版 hard-code）
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@design/utils/cn';
import {
  PART_FIELDS,
  type PartZone,
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
  createPart,
  getPart,
  listPart,
  setPartActive,
  updatePart,
} from '@data/endpoints/shared/master/part/api/part';
import type { PartDto, PartOemCodeItem } from '@data/types/shared/master/part';
import { listCustomerGrades, type CustomerGradeDto } from '@data/endpoints/nx01/api/customer-grade';

import { PartFormZoned, type RefOption } from './PartFormZoned';
import {
  emptyPartDraft,
  partDraftToBody,
  partRowToDraft,
  type PartDraft,
} from './helpers';

type Tab = 'list' | 'detail';

export type PartZonedPageProps = {
  pageCategory: string;
  pageTitle: string;
  /** 詳細頁可編 zones（v1.1 §1）；undefined = 全 zone（主檔中心） */
  editableZones?: Set<PartZone>;
  entityNoun: string;
};

export function PartZonedPage({
  pageTitle,
  editableZones,
  entityNoun,
}: PartZonedPageProps) {
  const { toasts, showToast } = useToast();

  // ── 資料 / 分頁 ──
  const [rows, setRows] = useState<PartDto[]>([]);
  const [total, setTotal] = useState(0);
  // 2026-06-24 執行長拍板：取消分頁、固定撈前 100 筆
  const pageSize = 100;
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── 選列 / 模式 / Tab ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<Tab>('list');
  const [creating, setCreating] = useState(false);
  const [activeZone, setActiveZone] = useState<PartZone>('basic');

  // ── 編輯 staged ──
  const [draft, setDraft] = useState<PartDraft>({});
  const [original, setOriginal] = useState<PartDraft>({});

  // ── 確認框 ──
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // 2026-06-18 套員工新範式
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const COLUMN_ALL_KEYS = useMemo(
    () => ['code', 'name', 'isOem', 'partGroupCode', 'uom', 'isActive', 'photos'],
    [],
  );
  const {
    visibleKeys: columnsOrder,
    setVisibleKeys: setColumnsOrder,
  } = useColumnsPref('master-parts:columns:v1', COLUMN_ALL_KEYS, COLUMN_ALL_KEYS);
  const SORT_OPTIONS: SortableOption[] = useMemo(
    () => [
      { key: 'code', label: '料號' },
      { key: 'name', label: '品名' },
      { key: 'isOem', label: '正/副廠' },
      { key: 'partGroupCode', label: '族群' },
      { key: 'uom', label: '單位' },
      { key: 'isActive', label: '狀態' },
    ],
    [],
  );
  // 2026-06-24 取消分頁後 pendingSelectRef 不再需要
  const focusFirstRowRef = useRef<boolean>(true);

  // ── 外鍵下拉 ──
  const [refOptions, setRefOptions] = useState<{
    partBrandId?: RefOption[];
    partGroupId?: RefOption[];
    countryId?: RefOption[];
  }>({});

  // ── A2：oemCodes 子表 staged（編輯 / 新增時 staged、存檔整批送）──
  const [oemCodesDraft, setOemCodesDraft] = useState<PartOemCodeItem[]>([]);

  // ── A3：客戶分級毛利率（從 nx01/customer-grades 載入、取代舊版 hard-code MARGINS）──
  const [customerGrades, setCustomerGrades] = useState<CustomerGradeDto[]>([]);

  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pb, pg, co, gradeRes] = await Promise.all([
        // W6-切換軌 2026-06-06：picker 走新 brand API + isPart=true 過濾
        // value = brand.id（非 part_brand.id）；submit body 走 brandId 寫入 part.brand_id
        fetchRefOptions('nx01/brands', ['code', 'name'], { isPart: 'true' }),
        fetchRefOptions('nx01/part-groups'),
        fetchRefOptions('nx01/countries'),
        // A3：載入 customer-grades 取 marginPct（取代舊版 hard-code）
        listCustomerGrades({ isActive: true, pageSize: 100 }),
      ]);
      if (cancelled) return;
      setRefOptions({
        partBrandId: toRefOptions(pb),
        partGroupId: toRefOptions(pg),
        countryId: toRefOptions(co),
      });
      setCustomerGrades(gradeRes.items);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── load ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPart({
        page: 1,
        pageSize,
        q: debouncedKw,
      });
      // listPart 目前不支援 isActive 過濾、前端篩
      const items = showInactive ? res.items : res.items.filter((r) => r.isActive);
      setRows(items);
      setTotal(showInactive ? res.total : items.length);
    } catch (e) {
      showToast((e as Error)?.message ?? '載入失敗', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKw, pageSize, showInactive, reloadTick]);

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

  const listSelected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );
  /** v1.2 階段 E P5：list 不含 oemCodes 衛星、selectedId 變動時 fetch getById 取完整 */
  const [fullSelected, setFullSelected] = useState<PartDto | null>(null);
  useEffect(() => {
    if (!selectedId) {
      setFullSelected(null);
      return;
    }
    let cancelled = false;
    void getPart(selectedId)
      .then((row) => {
        if (!cancelled) setFullSelected(row);
      })
      .catch(() => {
        if (!cancelled) setFullSelected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadTick]);
  const selected = fullSelected ?? listSelected;

  /**
   * A3：依成本重算 ABCD（取代舊版 PartMasterPage hard-code MARGINS）
   * - 從 customer-grades 找 code='A'/'B'/'C'/'D'、用其 marginPct 算售價
   * - 公式：priceX = round2(cost × (1 + marginPct/100))
   * - 缺哪個 grade 就那欄不算（顯示警示）
   */
  const recalcPrices = useCallback(() => {
    const c = Number(String(draft.cost ?? ''));
    if (!Number.isFinite(c) || c <= 0) {
      showToast('請先填成本（>0）才能重算', 'danger');
      return;
    }
    const gradeMap = new Map(
      customerGrades.map((g) => [String(g.code).toUpperCase(), Number(g.marginPct)]),
    );
    const missing: string[] = [];
    const next: Record<string, string> = {};
    (['A', 'B', 'C', 'D'] as const).forEach((code) => {
      const m = gradeMap.get(code);
      if (m == null || !Number.isFinite(m)) {
        missing.push(code);
        return;
      }
      const priceKey = `price${code}` as const;
      next[priceKey] = (c * (1 + m / 100)).toFixed(2);
    });
    if (Object.keys(next).length === 0) {
      showToast('請至《客戶分級基本資料》設定 A/B/C/D 毛利率', 'danger');
      return;
    }
    setDraft({ ...draft, ...next });
    if (missing.length > 0) {
      showToast(
        `已依客戶分級毛利率重算 ${Object.keys(next).length}/4 級；缺：${missing.join('/')}（請至《客戶分級基本資料》設定 A/B/C/D 毛利率）`,
        'info',
      );
    } else {
      showToast('已依客戶分級毛利率重算 A/B/C/D（可再手動微調）', 'success');
    }
  }, [draft, customerGrades, showToast]);

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

  // 2026-06-24 取消分頁後：itemIndex / 項目級導航不跨頁
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
    setOemCodesDraft([]); // A2：reset 子表 staged
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
    const d = emptyPartDraft();
    setCreating(true);
    setSelectedId(null);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
    setActiveZone('basic');
    setOemCodesDraft([]); // A2：新增從空陣列開始
  }, []);

  const handleEdit = useCallback(() => {
    if (!selected) return;
    const d = partRowToDraft(selected);
    setCreating(false);
    setDraft(d);
    setOriginal(d);
    setMode('edit');
    setTab('detail');
    setOemCodesDraft(selected.oemCodes ?? []); // A2：載入既有 oemCodes
  }, [selected]);

  // 2026-06-23 修瀏覽模式 detail 全 "—"：PartFormZoned 瀏覽欄位讀 draft、
  // 但編輯才 setDraft、瀏覽 selected 時 draft 是空 → 全顯示 "—"。
  // 在瀏覽模式下、selected 變動就同步 draft + oemCodes。
  useEffect(() => {
    if (mode === 'edit') return;
    if (creating) return;
    if (!selected) {
      setDraft({});
      setOemCodesDraft([]);
      return;
    }
    setDraft(partRowToDraft(selected));
    setOemCodesDraft(selected.oemCodes ?? []);
  }, [selected, mode, creating]);

  const performSave = useCallback(async () => {
    // 必填驗證（就本頁可編欄位）
    const requiredFields = PART_FIELDS.filter((f) => {
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
    const body = partDraftToBody(draft, editableZones, { isCreate: creating });
    // 2026-06-26：基準料號純手動輸入（分段編碼/預覽已廢）
    const finalCode = String(draft.code ?? '').trim();
    if (creating && !finalCode) {
      showToast('基準料號為必填', 'danger');
      return;
    }
    // A2：oemCodes 子表 staged 整批送（屬 basic zone、編輯中 zone 包含 basic 才送）
    const includeOem = !editableZones || editableZones.has('basic');
    const oemCodesBody = includeOem ? oemCodesDraft : undefined;
    try {
      if (creating) {
        const created = await createPart({
          ...body,
          code: finalCode,
          secCode: String(draft.secCode ?? '').trim(),
          name: String(draft.name ?? '').trim(),
          ...(oemCodesBody !== undefined ? { oemCodes: oemCodesBody } : {}),
        });
        showToast(`已新增${entityNoun}`, 'success');
        setReloadTick((t) => t + 1);
        setSelectedId(created.id);
      } else if (selectedId) {
        await updatePart(selectedId, {
          ...body,
          ...(oemCodesBody !== undefined ? { oemCodes: oemCodesBody } : {}),
        });
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
    oemCodesDraft,
    editableZones,
    entityNoun,
    selectedId,
    performCancel,
    showToast,
  ]);

  const handleSave = useCallback(() => {
    setConfirm({
      title: creating ? `新增${entityNoun}` : '存檔變更',
      message: creating
        ? `確定新增這筆${entityNoun}？`
        : `確定儲存對「${selected?.name ?? ''}」的變更？`,
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
            await setPartActive(selected.id, !selected.isActive);
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
          { label: '料號', get: (r) => r.code },
          { label: '品名', get: (r) => r.name },
          { label: '正/副廠', get: (r) => (r.isOem ? '正廠' : '副廠') },
          { label: '單位', get: (r) => r.uom },
          { label: '備註', get: (r) => r.spec ?? '' },
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
  const columns: MasterTableColumn<PartDto>[] = useMemo(
    () => [
      {
        key: 'code',
        label: '料號',
        minWidthClass: 'min-w-[130px]',
        render: (row) => <span className="font-mono text-xs">{row.code}</span>,
      },
      {
        key: 'name',
        label: '品名',
        minWidthClass: 'min-w-[180px]',
        render: (row) => <span>{row.name}</span>,
      },
      {
        key: 'isOem',
        label: '正/副廠',
        minWidthClass: 'min-w-[80px]',
        render: (row) => (
          <span className={row.isOem ? 'text-[#22D88F]' : 'text-muted-foreground'}>
            {row.isOem ? '正廠' : '副廠'}
          </span>
        ),
      },
      {
        key: 'partGroupCode',
        label: '族群',
        minWidthClass: 'min-w-[110px]',
        render: (row) => <span className="text-xs">{row.partGroupCode ?? '—'}</span>,
      },
      {
        key: 'uom',
        label: '單位',
        minWidthClass: 'min-w-[60px]',
        render: (row) => <span>{row.uom}</span>,
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
      // 02 第三批 T4 2026-06-07：照片管理 sub-page 入口
      {
        key: 'photos',
        label: '照片',
        minWidthClass: 'min-w-[50px]',
        render: (row) => (
          <a
            href={`/dashboard/master/parts/${row.id}/photos`}
            className="text-xs text-[#22D88F] hover:underline focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            title="照片管理"
          >
            📷
          </a>
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
        currentPageId="part"
        detailTitle={creating ? `新增${entityNoun}` : selected?.name ?? undefined}
        detailSubtitle={mode === 'edit' ? (creating ? '新增中' : '編輯中') : '瀏覽'}
      />

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
        placeholder={`搜尋${entityNoun}料號 / 品名 / 規格...`}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<PartDto>
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
            oemCodesDraft={oemCodesDraft}
            onOemCodesChange={setOemCodesDraft}
            onRecalcPrices={recalcPrices}
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
  refOptions,
  entityNoun,
  oemCodesDraft,
  onOemCodesChange,
  onRecalcPrices,
  onRequestSave,
}: {
  creating: boolean;
  mode: ErpMode;
  selected: PartDto | null;
  draft: PartDraft;
  setDraft: (next: PartDraft) => void;
  activeZone: PartZone;
  setActiveZone: (z: PartZone) => void;
  editableZones?: Set<PartZone>;
  refOptions: {
    partBrandId?: RefOption[];
    partGroupId?: RefOption[];
    countryId?: RefOption[];
  };
  entityNoun: string;
  oemCodesDraft: PartOemCodeItem[];
  onOemCodesChange: (next: PartOemCodeItem[]) => void;
  onRecalcPrices: () => void;
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
    return <EmptyDetail message={`從「資料瀏覽」選一筆，或按 A 新增${entityNoun}`} />;
  }

  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      <div className="px-4 py-4 sm:px-6">
        {/* 2026-06-18 SectionHeader 已搬到 MasterPageHead tabs 同排 */}
        <div ref={formRef} data-master-form onKeyDown={handleFormKey}>
          <PartFormZoned
            mode={mode}
            creating={creating}
            draft={draft}
            setDraft={setDraft}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            editableZones={editableZones}
            refOptions={refOptions}
            selected={selected}
            oemCodesDraft={oemCodesDraft}
            onOemCodesChange={onOemCodesChange}
            onRecalcPrices={onRecalcPrices}
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
