// apps/nx-ui/src/features/part-zoned/PartZonedPage.tsx
// v1.2 對齊軌 階段 E：part 分區編輯 list+detail 容器
//
// 對齊鋼鐵星球範式 + 階段 E v1.1 §1（PATCH 只送本頁可編欄位）+ 決策 3.2 屏障 1。
// 用於 4 個頁面：
//   · 主檔中心 part（/dashboard/base/parts、全 4 zone）— P6 closure A4 替換舊版 660 行
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
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import {
  PART_FIELDS,
  type PartZone,
} from '@/features/master-zones';
import { ConfirmDialog, type ConfirmState } from '@/features/master-shell/ui/ConfirmDialog';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import {
  ErpToolbar,
  type ErpMode,
  type ExportFormat,
} from '@/features/master-shell/ui/ErpToolbar';
import { exportTable } from '@/features/master-shell/hooks/useExportTable';
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
import { fetchRefOptions } from '@/features/master-shell/entity-master/config';
import {
  createPart,
  getPart,
  listPart,
  setPartActive,
  updatePart,
} from '@data/endpoints/shared/master/part/api/part';
import type { PartDto, PartOemCodeItem } from '@data/types/shared/master/part';
import { previewPartCode } from '@data/endpoints/base/api/part';
import {
  listBrandCodeRules,
  ruleSegLengths,
  type BrandCodeRuleDto,
} from '@data/endpoints/base/api/brand-code-rule';
import { listCustomerGrades, type CustomerGradeDto } from '@data/endpoints/base/api/customer-grade';

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
  pageCategory,
  pageTitle,
  editableZones,
  entityNoun,
}: PartZonedPageProps) {
  const router = useRouter();
  const { toasts, showToast } = useToast();

  // ── 資料 / 分頁 ──
  const [rows, setRows] = useState<PartDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(MASTER_TABLE_PAGE_SIZES[1]);
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

  // ── 外鍵下拉 ──
  const [refOptions, setRefOptions] = useState<{
    codeRuleId?: RefOption[];
    partBrandId?: RefOption[];
    partGroupId?: RefOption[];
    countryId?: RefOption[];
  }>({});

  // ── A1：編碼規則（含 SEG 字數限制邏輯） ──
  const [brandCodeRules, setBrandCodeRules] = useState<BrandCodeRuleDto[]>([]);
  const [codePreview, setCodePreview] = useState('');

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
      const [cr, pb, pg, co, ruleRes, gradeRes] = await Promise.all([
        fetchRefOptions('nx01/brand-code-rules', ['name']),
        // W6-切換軌 2026-06-06：picker 走新 brand API + isPart=true 過濾
        // value = brand.id（非 part_brand.id）；submit body 走 brandId 寫入 part.brand_id
        fetchRefOptions('nx01/brands', ['code', 'name'], { isPart: 'true' }),
        fetchRefOptions('nx01/part-groups'),
        fetchRefOptions('nx01/countries'),
        // A1：載入完整 brand-code-rule（含 SEG 字數限制欄位、後面 ruleSegLengths 用）
        listBrandCodeRules({ isActive: true, pageSize: 100 }),
        // A3：載入 customer-grades 取 marginPct（取代舊版 hard-code）
        listCustomerGrades({ isActive: true, pageSize: 100 }),
      ]);
      if (cancelled) return;
      setRefOptions({
        codeRuleId: toRefOptions(cr),
        partBrandId: toRefOptions(pb),
        partGroupId: toRefOptions(pg),
        countryId: toRefOptions(co),
      });
      setBrandCodeRules(ruleRes.items);
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
        page,
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

  // ── A1：依規則 + SEG + brand + country 即時預覽料號（debounce 250ms） ──
  useEffect(() => {
    const codeRuleId = String(draft.codeRuleId ?? '');
    if (mode !== 'edit' || !codeRuleId) {
      setCodePreview('');
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await previewPartCode({
            codeRuleId,
            seg1: String(draft.seg1 ?? ''),
            seg2: String(draft.seg2 ?? ''),
            seg3: String(draft.seg3 ?? ''),
            seg4: String(draft.seg4 ?? ''),
            seg5: String(draft.seg5 ?? ''),
            // W6-切換軌 2026-06-06：draft.partBrandId 內容已是 brand.id、走 brandId 預覽
            brandId: String(draft.partBrandId ?? '') || undefined,
            countryId: String(draft.countryId ?? '') || undefined,
          });
          if (alive) setCodePreview(typeof res === 'string' ? res : (res as { code: string }).code ?? '');
        } catch {
          /* 預覽失敗不擋編輯 */
        }
      })();
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [
    mode,
    draft.codeRuleId,
    draft.seg1,
    draft.seg2,
    draft.seg3,
    draft.seg4,
    draft.seg5,
    draft.partBrandId,
    draft.countryId,
  ]);

  /** A1：依 codeRuleId 算 SEG 字數限制 */
  const segLensFor = useCallback(
    (codeRuleId: string): number[] => {
      const rule = brandCodeRules.find((r) => r.id === codeRuleId);
      if (!rule) return [0, 0, 0, 0, 0];
      return ruleSegLengths(rule);
    },
    [brandCodeRules],
  );

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
  }, []);

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
    // A1：codeRuleId 模式下、用 server 預覽組好的料號（覆蓋手動 code 欄位）
    const codeRuleId = String(draft.codeRuleId ?? '').trim();
    const finalCode = codeRuleId
      ? (codePreview || String(draft.code ?? '')).trim()
      : String(draft.code ?? '').trim();
    if (creating && !finalCode) {
      showToast('料號為必填', 'danger');
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
          name: String(draft.name ?? '').trim(),
          codeRuleId,
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
    codePreview,
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

  // ── 全鍵盤 ──
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
          <span className={row.isOem ? 'text-[#22D88F]' : 'text-[#888892]'}>
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
            href={`/dashboard/base/parts/${row.id}/photos`}
            className="text-xs text-[#22D88F] hover:underline"
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
            refOptions={refOptions}
            entityNoun={entityNoun}
            brandCodeRules={brandCodeRules}
            codePreview={codePreview}
            segLensFor={segLensFor}
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
  brandCodeRules,
  codePreview,
  segLensFor,
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
    codeRuleId?: RefOption[];
    partBrandId?: RefOption[];
    partGroupId?: RefOption[];
    countryId?: RefOption[];
  };
  entityNoun: string;
  brandCodeRules: BrandCodeRuleDto[];
  codePreview: string;
  segLensFor: (codeRuleId: string) => number[];
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
        <SectionHeader
          title={creating ? `新增${entityNoun}` : selected?.name ?? entityNoun}
          subtitle={editing ? '編輯中' : '瀏覽'}
        />
        <div ref={formRef} data-master-form onKeyDown={handleFormKey} className="mt-4">
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
            brandCodeRules={brandCodeRules}
            codePreview={codePreview}
            segLensFor={segLensFor}
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
