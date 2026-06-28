// apps/nx-ui/src/features/nx01/shell/keyboard-card-master/KeyboardCardMasterPage.tsx
/**
 * KeyboardCardMasterPage — L0 字典表「卡片式 + 全鍵盤」範本（執行長 2026-06-23 拍板第二代）
 *
 * 設計初衷：
 *   分級表 L0（country / region / department / phonetic-dictionary）的 inline edit row 範式
 *   執行長體驗後不滿意。改走「遊戲化卡片 + 全鍵盤」路線：
 *     - 卡片 grid、有質感、不像表單
 *     - 全鍵盤可達、無 modifier 單鍵為主、像遊戲操作
 *     - GSAP 進場 + framer-motion focus ring + reduce-motion 退化
 *
 * 鍵盤映射：
 *   瀏覽：↑↓←→ 移動 │ Enter/Space 編輯 │ N 新增 │ X 停用/啟用 │
 *         / 搜尋 │ T 切顯停用 │ R 重整 │ Q/E 上下頁 │ Home/End 頭尾 │ ? 熱鍵
 *   編輯：Tab/Shift+Tab 跳欄 │ Enter 儲存 │ Esc 取消
 *   搜尋：直接打字 │ ↓ 移回 grid │ Esc 退出
 *
 * 共用：吃既有 EntityMasterConfig + REST helper（不擴 schema/API、不擴 config 型別）。
 */
'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Keyboard,
  Pencil,
  Plus,
  Power,
  Printer,
  RefreshCcw,
  Save,
  Search,
  X as XIcon,
} from 'lucide-react';

import { cn } from '@design/utils/cn';
import { useDirtyGuard } from '@design/hooks/useDirtyGuard';
import { ToastStack, useToast } from '@design/components/toast/ToastStack';
import { useReducedMotion } from '@/design/motion/gsap';

import { useRouter } from 'next/navigation';
import { tryNavigate } from '@design/hooks/useDirtyGuard';

import { MasterQuickNav } from '@/features/nx01/shell/master-nav/MasterQuickNav';
import { MASTER_PAGES } from '@/features/nx01/shell/master-nav/master-pages';
import {
  ConfirmDialog,
  type ConfirmState,
} from '@/features/nx01/shell/ui/ConfirmDialog';
import {
  exportTable,
  type ExportFormat,
} from '@/features/nx01/shell/hooks/useExportTable';
import { ToolbarButton } from '@/features/nx01/shell/ui/ErpToolbar';

import { MasterSwitcher } from './MasterSwitcher';
import { ExportMenu } from './ExportMenu';

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
import { formatDateTimeZh } from '../entity-master/format';

const PAGE_SIZE = 50;

function listFields(cfg: EntityMasterConfig): EntityFieldDef[] {
  return cfg.fields.filter((f) => f.inList !== false);
}

function editFields(cfg: EntityMasterConfig): EntityFieldDef[] {
  return cfg.fields.filter((f) => f.type !== 'computed');
}

function displayCell(f: EntityFieldDef, raw: unknown): string {
  if (raw == null || raw === '') return '—';
  if (f.type === 'toggle') return raw ? '是' : '否';
  if (f.type === 'select' && f.options) {
    return f.options.find((x) => String(x.value) === String(raw))?.label ?? String(raw);
  }
  return String(raw);
}

type Mode = 'browse' | 'detail' | 'edit' | 'create';

function auditPerson(username: unknown, name: unknown): string {
  const n = (name as string) || '';
  const u = (username as string) || '';
  if (n && u) return `${n}（${u}）`;
  return n || u || '—';
}

export function KeyboardCardMasterPage({ config }: { config: EntityMasterConfig }) {
  const { toasts, showToast } = useToast();
  const reduced = useReducedMotion();
  const router = useRouter();

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

  // 焦點 / 編輯
  const [focusIdx, setFocusIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('browse');
  const [draft, setDraft] = useState<EntityDraft>({});
  const [original, setOriginal] = useState<EntityDraft>({});

  // overlay
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // refs
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

  const listFs = useMemo(() => listFields(config), [config]);
  const editFs = useMemo(() => editFields(config), [config]);
  const editing = mode === 'edit' || mode === 'create';
  const viewing = mode === 'detail';
  const overlayed = editing || viewing;

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 250);
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
      setFocusIdx((i) => Math.min(i, Math.max(0, res.items.length - 1)));
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

  // dirty
  const isDirty = useMemo(() => {
    if (!editing) return false;
    const keys = new Set([...Object.keys(draft), ...Object.keys(original)]);
    for (const k of keys) {
      if (String(draft[k] ?? '') !== String(original[k] ?? '')) return true;
    }
    return false;
  }, [editing, draft, original]);

  const exitOverlay = useCallback(() => {
    setMode('browse');
    setDraft({});
    setOriginal({});
  }, []);

  // ── actions ──
  const startCreate = useCallback(() => {
    if (config.readOnly || config.canCreate === false) return;
    if (editing) return;
    const d = emptyDraft(config);
    setMode('create');
    setDraft(d);
    setOriginal(d);
  }, [config, editing]);

  const startDetail = useCallback(() => {
    if (editing) return;
    const row = rows[focusIdx];
    if (!row) return;
    setMode('detail');
  }, [editing, rows, focusIdx]);

  const startEdit = useCallback(() => {
    if (config.readOnly) return;
    if (editing) return;
    const row = rows[focusIdx];
    if (!row) return;
    const d = rowToDraft(config, row);
    setMode('edit');
    setDraft(d);
    setOriginal(d);
  }, [config, editing, rows, focusIdx]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const cols = listFs.map((f) => ({
        label: f.label,
        get: (r: EntityRow) => displayCell(f, r[f.key]),
      }));
      exportTable<EntityRow>(format, {
        title: config.title,
        columns: cols,
        rows,
      });
      const labelMap: Record<ExportFormat, string> = {
        csv: 'CSV 匯出已觸發',
        xlsx: 'Excel 匯出已觸發',
        pdf: 'PDF 預覽已開啟',
        print: '列印預覽已開啟',
      };
      showToast(labelMap[format], 'info');
    },
    [config, listFs, rows, showToast],
  );

  const handleSave = useCallback(async () => {
    if (!editing) return;
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
      if (mode === 'create') {
        await createEntity(config, body);
        showToast(`新增${config.entityNoun}成功`, 'success');
      } else {
        const row = rows[focusIdx];
        if (!row) return;
        await updateEntity(config, row.id, body);
        showToast(`更新${config.entityNoun}成功`, 'success');
      }
      exitOverlay();
      setReloadTick((n) => n + 1);
    } catch (e) {
      showToast((e as Error)?.message ?? '儲存失敗', 'danger');
    }
  }, [editing, mode, config, draft, rows, focusIdx, showToast, exitOverlay]);

  const handleCancel = useCallback(() => {
    if (!editing) return;
    if (!isDirty) {
      exitOverlay();
      return;
    }
    setConfirm({
      title: mode === 'create' ? '取消新增？' : '丟棄變更？',
      message: '所有未存的修改將遺失。',
      variant: 'danger',
      confirmLabel: '丟棄',
      onConfirm: exitOverlay,
    });
  }, [editing, isDirty, mode, exitOverlay]);

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

  // 詳細模式 ↑↓：切上下筆
  const moveDetailRow = useCallback(
    (dir: 'prev' | 'next') => {
      if (!viewing) return;
      const next = dir === 'next' ? focusIdx + 1 : focusIdx - 1;
      if (next < 0 || next >= rows.length) return;
      setFocusIdx(next);
    },
    [viewing, focusIdx, rows.length],
  );

  // dirty guard
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
            exitOverlay();
            proceed();
          },
        },
      });
    },
  );

  // ── 方向鍵：用 bounding rect 算上下左右 ──
  const moveFocus = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      if (cards.length === 0) return;
      const curr = cards[focusIdx]?.getBoundingClientRect();
      if (!curr) return;
      const cx = curr.left + curr.width / 2;
      const cy = curr.top + curr.height / 2;
      let bestIdx = focusIdx;
      let bestDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        if (i === focusIdx) continue;
        const r = cards[i].getBoundingClientRect();
        const rx = r.left + r.width / 2;
        const ry = r.top + r.height / 2;
        const dx = rx - cx;
        const dy = ry - cy;
        let primary = 0;
        let secondary = 0;
        if (dir === 'right') {
          if (dx <= 4) continue;
          primary = dx;
          secondary = Math.abs(dy) * 3;
        } else if (dir === 'left') {
          if (dx >= -4) continue;
          primary = -dx;
          secondary = Math.abs(dy) * 3;
        } else if (dir === 'down') {
          if (dy <= 4) continue;
          primary = dy;
          secondary = Math.abs(dx) * 3;
        } else if (dir === 'up') {
          if (dy >= -4) continue;
          primary = -dy;
          secondary = Math.abs(dx) * 3;
        }
        const dist = primary + secondary;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      if (bestIdx !== focusIdx) {
        setFocusIdx(bestIdx);
        cards[bestIdx]?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }
    },
    [focusIdx, reduced],
  );

  // ── A：[ / ] 同分區翻頁（其實是平鋪 MASTER_PAGES 中相鄰、跨分區自然進下分區） ──
  const navigateAdjacent = useCallback(
    (dir: 'prev' | 'next') => {
      if (!config.pageId) return;
      const pages = MASTER_PAGES.filter((p) => !p.disabled);
      const idx = pages.findIndex((p) => p.id === config.pageId);
      if (idx === -1) return;
      const target = dir === 'next' ? pages[idx + 1] : pages[idx - 1];
      if (!target) {
        showToast(dir === 'next' ? '已是最後一個主檔' : '已是第一個主檔', 'info');
        return;
      }
      tryNavigate(
        () => router.push(target.href),
        `card-master ${dir}: ${target.label} → ${target.href}`,
      );
    },
    [config.pageId, router, showToast],
  );

  // ── 鍵盤 handler（window listener、NEXORA 工作列範式） ──
  //
  // 三個 mode + Alt 系工作列熱鍵：
  //   - 瀏覽（browse）：↑↓←→ 移、Enter/Space 進詳細、N 新增、X 切停用
  //                    / 搜尋、? 熱鍵、M 切換主檔、[/] 上下主檔、Q/E 翻頁
  //                    Alt+A 新增、Alt+E 編輯、Alt+F 搜尋、Alt+R 重整
  //                    Alt+T 切顯停用、Alt+D 切停用、Alt+O 匯出、Alt+M 切換
  //   - 詳細（detail）：↑↓ 切上下筆、Alt+E 進編輯、Alt+D 切停用、Esc 退
  //   - 編輯/新增：Tab/Shift+Tab 跳欄（原生）、Enter/Alt+S 存、Esc/Alt+C 取消
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key;
      const isAlt = e.altKey && !e.ctrlKey && !e.metaKey;

      // ── F3 任何模式都 toggle switcher（最早處理）──
      if (k === 'F3') {
        e.preventDefault();
        setSwitcherOpen((v) => !v);
        return;
      }

      // switcher / export menu 開啟時、所有鍵交給該 modal 內部處理
      if (switcherOpen || exportMenuOpen) return;

      // cheat sheet 開啟時、只接 Esc / ? toggle
      if (cheatOpen) {
        if (k === 'Escape') {
          e.preventDefault();
          setCheatOpen(false);
        }
        // Shift+/ 也允許 toggle 關
        if (e.code === 'Slash' && e.shiftKey) {
          e.preventDefault();
          setCheatOpen(false);
        }
        return;
      }

      // ── 編輯 / 新增中 ──
      if (editing) {
        if (k === 'Escape') {
          e.preventDefault();
          handleCancel();
          return;
        }
        if (k === 'Enter') {
          const tgt = e.target as HTMLElement;
          if (tgt.tagName === 'TEXTAREA') return;
          e.preventDefault();
          void handleSave();
          return;
        }
        if (isAlt && (k === 's' || k === 'S')) {
          e.preventDefault();
          void handleSave();
          return;
        }
        if (isAlt && (k === 'c' || k === 'C')) {
          e.preventDefault();
          handleCancel();
          return;
        }
        return; // Tab / Shift+Tab / 打字交給瀏覽器
      }

      // ── 詳細中 ──
      if (viewing) {
        if (k === 'Escape') {
          e.preventDefault();
          exitOverlay();
          return;
        }
        if (k === 'ArrowUp') {
          e.preventDefault();
          moveDetailRow('prev');
          return;
        }
        if (k === 'ArrowDown') {
          e.preventDefault();
          moveDetailRow('next');
          return;
        }
        if (k === 'e' || k === 'E' || (isAlt && (k === 'e' || k === 'E'))) {
          e.preventDefault();
          startEdit();
          return;
        }
        if (k === 'd' || k === 'D' || (isAlt && (k === 'd' || k === 'D'))) {
          e.preventDefault();
          const row = rows[focusIdx];
          if (row) handleToggleActive(row);
          return;
        }
        return;
      }

      // ── 搜尋中（input focus）──
      if (searchOpen) {
        const tgt = e.target as HTMLElement;
        if (tgt === searchInputRef.current) {
          if (k === 'Escape') {
            e.preventDefault();
            setSearchOpen(false);
            setKeyword('');
            return;
          }
          if (k === 'ArrowDown') {
            e.preventDefault();
            searchInputRef.current?.blur();
            return;
          }
          return;
        }
      }

      // ── 瀏覽模式 ──

      // Alt 系（工作列）
      if (isAlt) {
        if (k === 'a' || k === 'A') {
          e.preventDefault();
          startCreate();
          return;
        }
        if (k === 'e' || k === 'E') {
          e.preventDefault();
          startEdit();
          return;
        }
        if (k === 'f' || k === 'F') {
          e.preventDefault();
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
          return;
        }
        if (k === 'r' || k === 'R') {
          e.preventDefault();
          setReloadTick((n) => n + 1);
          showToast('已重新整理', 'info');
          return;
        }
        if (k === 't' || k === 'T') {
          e.preventDefault();
          setShowInactive((v) => !v);
          return;
        }
        if (k === 'd' || k === 'D') {
          e.preventDefault();
          const row = rows[focusIdx];
          if (row) handleToggleActive(row);
          return;
        }
        if (k === 'o' || k === 'O') {
          e.preventDefault();
          setExportMenuOpen(true);
          return;
        }
        if (k === 'p' || k === 'P') {
          e.preventDefault();
          handleExport('print');
          return;
        }
        return; // Alt 系沒命中 → 不擋其它瀏覽器快捷
      }

      // 非 Alt：方向 / 單鍵
      if (e.ctrlKey || e.metaKey) return;

      if (k === 'ArrowUp') { e.preventDefault(); moveFocus('up'); return; }
      if (k === 'ArrowDown') { e.preventDefault(); moveFocus('down'); return; }
      if (k === 'ArrowLeft') { e.preventDefault(); moveFocus('left'); return; }
      if (k === 'ArrowRight') { e.preventDefault(); moveFocus('right'); return; }
      if (k === 'Home') { e.preventDefault(); setFocusIdx(0); return; }
      if (k === 'End') {
        e.preventDefault();
        setFocusIdx(Math.max(0, rows.length - 1));
        return;
      }
      // 翻頁：PageUp / PageDown
      if (k === 'PageUp') {
        e.preventDefault();
        if (page > 1) setPage(page - 1);
        return;
      }
      if (k === 'PageDown') {
        e.preventDefault();
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (page < totalPages) setPage(page + 1);
        return;
      }
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        startDetail();
        return;
      }
      // 單鍵：工作列字母（A E F R T D O）— 對應 Alt+ 系
      if (k === 'a' || k === 'A') {
        e.preventDefault();
        startCreate();
        return;
      }
      if (k === 'e' || k === 'E') {
        e.preventDefault();
        startEdit();
        return;
      }
      // F 鍵搜尋（單字、不 shift）
      if ((k === 'f' || k === 'F') && !e.shiftKey) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }
      // Slash 鍵：無 shift = / 搜尋；shift = ? 熱鍵（用 e.code 避免 layout / IME 變異）
      if (e.code === 'Slash') {
        e.preventDefault();
        if (e.shiftKey) {
          setCheatOpen((v) => !v);
        } else {
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
        return;
      }
      if (k === 'd' || k === 'D') {
        e.preventDefault();
        const row = rows[focusIdx];
        if (row) handleToggleActive(row);
        return;
      }
      if (k === 't' || k === 'T') {
        e.preventDefault();
        setShowInactive((v) => !v);
        return;
      }
      if (k === 'r' || k === 'R') {
        e.preventDefault();
        setReloadTick((n) => n + 1);
        showToast('已重新整理', 'info');
        return;
      }
      // O 鍵開匯出 menu（不直接匯出）
      if (k === 'o' || k === 'O') {
        e.preventDefault();
        setExportMenuOpen(true);
        return;
      }
      // P 鍵列印
      if (k === 'p' || k === 'P') {
        e.preventDefault();
        handleExport('print');
        return;
      }
      if (k === '[') {
        e.preventDefault();
        navigateAdjacent('prev');
        return;
      }
      if (k === ']') {
        e.preventDefault();
        navigateAdjacent('next');
        return;
      }
      // 瀏覽中 Esc：若搜尋條開、收起；否則無動作
      if (k === 'Escape') {
        if (searchOpen) {
          e.preventDefault();
          setSearchOpen(false);
          setKeyword('');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    editing,
    viewing,
    searchOpen,
    cheatOpen,
    switcherOpen,
    exportMenuOpen,
    moveFocus,
    moveDetailRow,
    handleCancel,
    handleSave,
    handleToggleActive,
    handleExport,
    startCreate,
    startDetail,
    startEdit,
    exitOverlay,
    navigateAdjacent,
    rows,
    focusIdx,
    page,
    total,
    showToast,
  ]);

  // ── 編輯浮層出現時、auto-focus 第一個非鎖定欄位 ──
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => {
      const root = editFormRef.current;
      if (!root) return;
      const first = root.querySelector<HTMLInputElement | HTMLSelectElement>(
        'input:not([disabled]),select:not([disabled])',
      );
      first?.focus();
      if (first && 'select' in first) (first as HTMLInputElement).select?.();
    }, 80);
    return () => clearTimeout(t);
  }, [editing, mode]);

  // 進場 stagger 由 framer-motion 接管（KbCard 用 initial/animate + custom idx delay）。

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const focused = rows[focusIdx];
  const headField = listFs[0];
  const subField = listFs[1];
  const tailFields = listFs.slice(2);

  const focusedLabel = focused
    ? [headField && String(focused[headField.key] ?? ''), subField && String(focused[subField.key] ?? '')]
        .filter(Boolean)
        .join(' · ')
    : '—';

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4 lg:px-6">
      {/* 2026-06-28 執行長：清除麵包屑殘留、對齊使用者基本資料乾淨六層（標題由工作區分頁顯示）*/}
      <div data-nx-frame className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <MasterQuickNav currentPageId={config.pageId} />
      </div>

      <KbToolbar
        mode={mode}
        canCreate={!config.readOnly && config.canCreate !== false}
        canEdit={!config.readOnly}
        focused={focused}
        showInactive={showInactive}
        onCreate={startCreate}
        onEdit={startEdit}
        onToggleActive={() => focused && handleToggleActive(focused)}
        onSearch={() => {
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }}
        onRefresh={() => {
          setReloadTick((n) => n + 1);
          showToast('已重新整理', 'info');
        }}
        onToggleInactive={() => setShowInactive((v) => !v)}
        onExport={() => setExportMenuOpen(true)}
        onPrint={() => handleExport('print')}
        onPrevMaster={() => navigateAdjacent('prev')}
        onNextMaster={() => navigateAdjacent('next')}
        onSwitch={() => setSwitcherOpen((v) => !v)}
        onCheatSheet={() => setCheatOpen(true)}
        onSave={() => void handleSave()}
        onCancel={handleCancel}
      />

      <StatusBar
        mode={mode}
        focusedLabel={focusedLabel}
        keyword={keyword}
        searchOpen={searchOpen}
        showInactive={showInactive}
        page={page}
        totalPages={totalPages}
      />

      <AnimatePresence initial={false}>
        {searchOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card/80 px-3 py-2"
          >
            <Search className="h-4 w-4 text-primary" />
            <input
              ref={searchInputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={`搜尋${config.entityNoun}…（Esc 退出、↓ 移到卡片）`}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            {keyword ? (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="rounded p-1 text-muted-foreground hover:bg-foreground/10"
                title="清除"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        ref={gridRef}
        data-nx-frame
        className={cn(
          'relative rounded-lg border border-border/40 bg-card/40 p-3 transition-[filter] duration-200',
          overlayed && 'pointer-events-none [filter:blur(2px)_brightness(0.85)]',
        )}
      >
        {loading && rows.length === 0 ? (
          <div className="px-3 py-16 text-center text-xs text-muted-foreground">載入中…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-16 text-center text-xs text-muted-foreground">
            {keyword ? '無符合搜尋的資料' : `尚無${config.entityNoun}資料`}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, idx) => (
              <KbCard
                key={row.id}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                row={row}
                focused={idx === focusIdx && !overlayed}
                headField={headField}
                subField={subField}
                tailFields={tailFields}
                onSelect={() => setFocusIdx(idx)}
                onActivate={() => {
                  setFocusIdx(idx);
                  startDetail();
                }}
                reduced={reduced}
              />
            ))}
          </div>
        )}
      </div>

      {/* 詳細 overlay（read-only、含 audit 欄位）*/}
      <AnimatePresence>
        {viewing && focused ? (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) exitOverlay();
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 6 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0.7, 0.2, 1] }}
              className="w-full max-w-lg rounded-xl border bg-card shadow-2xl border-border/60 shadow-black/30"
            >
              {/* header */}
              <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                    詳細
                  </span>
                  <h2 className="text-sm font-semibold tracking-wide text-foreground">
                    {focusedLabel || config.entityNoun}
                  </h2>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    focused.isActive
                      ? 'bg-[#22D88F]/14 text-[#22D88F]'
                      : 'bg-[#888892]/14 text-[#888892]',
                  )}
                >
                  {focused.isActive ? '啟用' : '停用'}
                </span>
              </div>
              {/* body */}
              <div className="px-5 py-4">
                <DetailFields editFs={editFs} row={focused} />
                <div className="mt-4 border-t border-border/30 pt-3">
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70">
                    異動紀錄
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                    <ReadOnlyRow label="建立時間" value={formatDateTimeZh(focused.createdAt)} mono />
                    <ReadOnlyRow
                      label="建立人員"
                      value={auditPerson(focused.createdByUsername, focused.createdByName)}
                    />
                    <ReadOnlyRow label="修改時間" value={formatDateTimeZh(focused.updatedAt)} mono />
                    <ReadOnlyRow
                      label="修改人員"
                      value={auditPerson(focused.updatedByUsername, focused.updatedByName)}
                    />
                  </div>
                </div>
              </div>
              {/* footer hints */}
              <div className="flex items-center justify-between border-t border-border/40 px-5 py-2.5 text-[11px] text-muted-foreground">
                <span>
                  <kbd className="kb">↑↓</kbd> 上下筆 · <kbd className="kb">Alt+E</kbd> 編輯 ·{' '}
                  <kbd className="kb">Alt+D</kbd> 切停用 · <kbd className="kb">Esc</kbd> 退
                </span>
                <span className="text-[10px] opacity-60">
                  {focusIdx + 1} / {rows.length}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 編輯 / 新增 overlay */}
      <AnimatePresence>
        {editing ? (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCancel();
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="w-full max-w-md rounded-xl border-2 border-primary bg-card p-5 shadow-2xl shadow-primary/20"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-wide text-foreground">
                  {mode === 'create' ? `新增${config.entityNoun}` : `編輯：${focusedLabel}`}
                </h2>
                <span className="rounded-full bg-primary/14 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {mode === 'create' ? '新增中' : '編輯中'}
                </span>
              </div>
              <div ref={editFormRef}>
                <EditForm
                  editFs={editFs}
                  draft={draft}
                  onChange={setDraft}
                  isCreate={mode === 'create'}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                <span>
                  <kbd className="kb">Tab</kbd> 跳欄 · <kbd className="kb">Enter</kbd> 儲存 ·{' '}
                  <kbd className="kb">Alt+S</kbd> 存 · <kbd className="kb">Esc</kbd> 取消
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cheatOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            onClick={() => setCheatOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
              className="rounded-xl border border-primary/40 bg-card p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Keyboard className="h-4 w-4" />
                <h3 className="text-sm font-semibold tracking-wider">鍵盤快捷鍵</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-8">
                {/* 瀏覽 */}
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-primary/80">
                    瀏覽
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <Hk k="↑ ↓ ← →" t="卡片移動" />
                    <Hk k="Enter / Space" t="看詳細" />
                    <Hk k="A" t="新增" />
                    <Hk k="E" t="編輯" />
                    <Hk k="F  /  /" t="搜尋" />
                    <Hk k="R" t="重新整理" />
                    <Hk k="T" t="切換顯示停用" />
                    <Hk k="D" t="停用 / 啟用" />
                    <Hk k="O" t="匯出（選格式）" />
                    <Hk k="P" t="列印" />
                    <Hk k="F3" t="切換主檔" />
                    <Hk k="[  /  ]" t="上 / 下個主檔" />
                    <Hk k="PgUp / PgDn" t="翻頁" />
                    <Hk k="Home / End" t="第一張 / 最後一張" />
                    <Hk k="?" t="本說明" />
                  </div>
                </div>
                {/* 詳細 + 編輯 */}
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-primary/80">
                    詳細
                  </div>
                  <div className="mb-3 flex flex-col gap-1 text-xs">
                    <Hk k="↑ ↓" t="上一筆 / 下一筆" />
                    <Hk k="E" t="編輯此筆" />
                    <Hk k="D" t="停用 / 啟用" />
                    <Hk k="F3" t="切換主檔" />
                    <Hk k="Esc" t="退回瀏覽" />
                  </div>
                  <div className="mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-primary/80">
                    編輯 / 新增
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <Hk k="Tab / Shift+Tab" t="跳欄" />
                    <Hk k="Enter  /  Alt+S" t="儲存" />
                    <Hk k="Esc  /  Alt+C" t="取消" />
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                按 <kbd className="kb">Esc</kbd> 或點擊背景關閉
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MasterSwitcher
        open={switcherOpen}
        currentPageId={config.pageId}
        onClose={() => setSwitcherOpen(false)}
      />

      <ExportMenu
        open={exportMenuOpen}
        onClose={() => setExportMenuOpen(false)}
        onSelect={(format) => handleExport(format)}
      />

      {confirm ? <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} /> : null}
      <ToastStack toasts={toasts} />

      {/* kbd 樣式 */}
      <style jsx global>{`
        .kb {
          display: inline-block;
          padding: 0 5px;
          border-radius: 4px;
          border: 1px solid var(--kb-accent-45);
          background: var(--kb-accent-10);
          color: var(--kb-accent);
          font-size: 10px;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          line-height: 14px;
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// StatusBar — 遊戲提示列風（模式 + 焦點 + 熱鍵 hint）
// ──────────────────────────────────────────────────────────────

function StatusBar({
  mode,
  focusedLabel,
  keyword,
  searchOpen,
  showInactive,
  page,
  totalPages,
}: {
  mode: Mode;
  focusedLabel: string;
  keyword: string;
  searchOpen: boolean;
  showInactive: boolean;
  page: number;
  totalPages: number;
}) {
  const modeLabel = searchOpen
    ? '搜尋'
    : mode === 'create'
      ? '新增'
      : mode === 'edit'
        ? '編輯'
        : mode === 'detail'
          ? '詳細'
          : '瀏覽';
  const modeColor =
    mode === 'edit' || mode === 'create'
      ? 'var(--kb-accent)'
      : mode === 'detail'
        ? 'var(--kb-mode-detail-fg)'
        : searchOpen
          ? 'var(--kb-mode-search-fg)'
          : 'var(--kb-mode-browse-fg)';
  const modeBg =
    mode === 'edit' || mode === 'create'
      ? 'var(--kb-accent-14)'
      : mode === 'detail'
        ? 'var(--kb-mode-detail-bg)'
        : searchOpen
          ? 'var(--kb-mode-search-bg)'
          : 'var(--kb-mode-browse-bg)';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground">
      <span
        className="rounded px-1.5 py-0.5 font-semibold tracking-wider"
        style={{ background: modeBg, color: modeColor }}
      >
        {modeLabel}
      </span>
      <span className="text-foreground/80">
        {mode === 'detail' ? `目前：${focusedLabel}` : null}
        {mode === 'edit' ? `編輯：${focusedLabel}` : null}
        {searchOpen ? <>關鍵字：「{keyword || '—'}」</> : null}
      </span>
      <span className="flex-1" />
      {showInactive ? (
        <span className="rounded bg-[#888892]/20 px-1.5 py-0.5 text-[10px] text-[#bdbdc6]">
          含停用
        </span>
      ) : null}
      {totalPages > 1 ? (
        <span>
          {page} / {totalPages}
        </span>
      ) : null}
      {searchOpen ? (
        <span className="hidden text-[10px] opacity-70 sm:inline">
          <kbd className="kb">↓</kbd> 移到卡片 · <kbd className="kb">Esc</kbd> 退出
        </span>
      ) : null}
    </div>
  );
}

function Hk({ k, t }: { k: string; t: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <kbd className="kb">{k}</kbd>
      <span className="text-muted-foreground">{t}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// KbCard — 單張卡片
// ──────────────────────────────────────────────────────────────

type KbCardProps = {
  row: EntityRow;
  focused: boolean;
  headField?: EntityFieldDef;
  subField?: EntityFieldDef;
  tailFields: EntityFieldDef[];
  onSelect: () => void;
  onActivate: () => void;
  reduced: boolean;
};

const KbCard = forwardRef(function KbCard(
  { row, focused, headField, subField, tailFields, onSelect, onActivate, reduced }: KbCardProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <motion.div
      ref={ref}
      data-kbcard
      data-row-id={row.id}
      onClick={onSelect}
      onDoubleClick={onActivate}
      animate={
        reduced
          ? { y: 0, scale: 1 }
          : focused
            ? { y: -3, scale: 1.006 }
            : { y: 0, scale: 1 }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 360, damping: 28, mass: 0.6 }
      }
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-xl border bg-card/70 transition-colors',
        focused ? 'z-10 border-primary bg-card' : 'border-border/40 hover:border-primary/40 hover:bg-card',
        !row.isActive && 'opacity-55',
      )}
      style={
        focused
          ? {
              boxShadow:
                '0 14px 32px -10px var(--kb-accent-55), 0 0 0 1px var(--kb-accent-50), inset 0 1px 0 var(--kb-accent-18)',
            }
          : undefined
      }
    >
      {/* focused 時左側金色 accent bar（layoutId 在卡間平滑切換） */}
      {focused ? (
        <motion.span
          layoutId="kb-row-accent"
          className="absolute inset-y-0 left-0 w-1 bg-primary"
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }
          }
        />
      ) : null}

      <div className="flex items-center gap-5 px-4 py-3 pl-5">
        {/* 左：head field（code）*/}
        {headField ? (
          <div className="flex shrink-0 flex-col">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              {headField.label}
            </span>
            <span
              className={cn(
                'text-[15px] font-bold tracking-wider text-foreground',
                headField.mono && 'font-mono text-[14px]',
              )}
            >
              {displayCell(headField, row[headField.key])}
            </span>
          </div>
        ) : null}

        {/* 分隔線 */}
        {headField && (subField || tailFields.length > 0) ? (
          <span className="h-9 w-px shrink-0 bg-border/30" />
        ) : null}

        {/* 中：sub field（name）*/}
        {subField ? (
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              {subField.label}
            </span>
            <span className="block truncate text-[14px] font-medium text-foreground">
              {displayCell(subField, row[subField.key])}
            </span>
          </div>
        ) : null}

        {/* 右側：tail fields 散列 */}
        {tailFields.map((f) => (
          <div key={f.key} className="shrink-0 text-right">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              {f.label}
            </span>
            <span
              className={cn(
                'block text-[13px] text-foreground/80',
                f.mono && 'font-mono text-[12px]',
              )}
            >
              {displayCell(f, row[f.key])}
            </span>
          </div>
        ))}

        {/* 最右：狀態 dot */}
        <span
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full',
            row.isActive
              ? 'bg-[#22D88F] [box-shadow:0_0_10px_rgba(34,216,143,0.7)]'
              : 'bg-[#888892]',
          )}
          title={row.isActive ? '啟用' : '停用'}
        />
      </div>
    </motion.div>
  );
});

// ──────────────────────────────────────────────────────────────
// KbToolbar — 工作列（letter chip + icon + label、依 mode 切按鈕集）
// ──────────────────────────────────────────────────────────────

function ToolbarSep() {
  return <span className="mx-1 h-5 w-px bg-border/40" aria-hidden />;
}

function KbToolbar({
  mode,
  canCreate,
  canEdit,
  focused,
  showInactive,
  onCreate,
  onEdit,
  onToggleActive,
  onSearch,
  onRefresh,
  onToggleInactive,
  onExport,
  onPrint,
  onPrevMaster,
  onNextMaster,
  onSwitch,
  onCheatSheet,
  onSave,
  onCancel,
}: {
  mode: Mode;
  canCreate: boolean;
  canEdit: boolean;
  focused: EntityRow | undefined;
  showInactive: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onSearch: () => void;
  onRefresh: () => void;
  onToggleInactive: () => void;
  onExport: () => void;
  onPrint: () => void;
  onPrevMaster: () => void;
  onNextMaster: () => void;
  onSwitch: () => void;
  onCheatSheet: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const editing = mode === 'edit' || mode === 'create';
  const viewing = mode === 'detail';

  return (
    <div
      data-nx-frame
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border/40 bg-card/60 px-2 py-1.5"
    >
      {editing ? (
        <>
          <ToolbarButton icon={Save} letter="S" label="儲存" enabled accent onClick={onSave} />
          <ToolbarSep />
          <ToolbarButton
            icon={XIcon}
            letter="C"
            label="取消"
            enabled
            variant="danger"
            onClick={onCancel}
          />
        </>
      ) : viewing ? (
        <>
          <ToolbarButton
            icon={Pencil}
            letter="E"
            label="編輯"
            enabled={canEdit && !!focused}
            accent
            onClick={onEdit}
          />
          <ToolbarSep />
          <ToolbarButton
            icon={Power}
            letter="D"
            label={focused?.isActive ? '停用' : '啟用'}
            enabled={canEdit && !!focused}
            variant={focused?.isActive ? 'danger' : 'default'}
            onClick={onToggleActive}
          />
          <ToolbarSep />
          <ToolbarButton
            icon={XIcon}
            letter="Esc"
            label="退出"
            enabled
            onClick={onCancel}
          />
        </>
      ) : (
        <>
          <ToolbarButton
            icon={Plus}
            letter="A"
            label="新增"
            enabled={canCreate}
            onClick={onCreate}
          />
          <ToolbarButton
            icon={Pencil}
            letter="E"
            label="編輯"
            enabled={canEdit && !!focused}
            onClick={onEdit}
          />
          <ToolbarButton
            icon={Power}
            letter="D"
            label={focused?.isActive ? '停用' : '啟用'}
            enabled={canEdit && !!focused}
            variant={focused?.isActive ? 'danger' : 'default'}
            onClick={onToggleActive}
          />
          <ToolbarSep />
          <ToolbarButton icon={Search} letter="F" label="搜尋" enabled onClick={onSearch} />
          <ToolbarButton
            icon={RefreshCcw}
            letter="R"
            label="重整"
            enabled
            onClick={onRefresh}
          />
          <ToolbarButton
            icon={showInactive ? EyeOff : Eye}
            letter="T"
            label="切顯停用"
            enabled
            pressed={showInactive}
            onClick={onToggleInactive}
          />
          <ToolbarSep />
          <ToolbarButton icon={Download} letter="O" label="匯出" enabled onClick={onExport} />
          <ToolbarButton icon={Printer} letter="P" label="列印" enabled onClick={onPrint} />
          <ToolbarSep />
          <ToolbarButton
            icon={ChevronLeft}
            letter="["
            label="上主檔"
            enabled
            onClick={onPrevMaster}
          />
          <ToolbarButton
            icon={ChevronRight}
            letter="]"
            label="下主檔"
            enabled
            onClick={onNextMaster}
          />
          <ToolbarButton
            icon={ArrowRightLeft}
            letter="F3"
            label="切換"
            enabled
            onClick={onSwitch}
          />
          <ToolbarSep />
          <ToolbarButton
            icon={Keyboard}
            letter="?"
            label="熱鍵"
            enabled
            onClick={onCheatSheet}
          />
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// DetailFields — 詳細浮層內 read-only 欄位顯示
// ──────────────────────────────────────────────────────────────

function DetailFields({ editFs, row }: { editFs: EntityFieldDef[]; row: EntityRow }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {editFs.map((f) => (
        <ReadOnlyRow
          key={f.key}
          label={f.label}
          value={displayCell(f, row[f.key])}
          mono={f.mono}
        />
      ))}
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 border-b border-border/20 pb-1.5">
      <span className="shrink-0 text-[11px] font-medium text-muted-foreground/80">{label}</span>
      <span
        className={cn(
          'flex-1 truncate text-right text-[13px] text-foreground',
          mono && 'font-mono text-[12px]',
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// EditForm — 編輯浮層內表單（純鍵盤、Tab 跳欄）
// ──────────────────────────────────────────────────────────────

function EditForm({
  editFs,
  draft,
  onChange,
  isCreate,
}: {
  editFs: EntityFieldDef[];
  draft: EntityDraft;
  onChange: (next: EntityDraft) => void;
  isCreate: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {editFs.map((f) => {
        const v = draft[f.key];
        const disabled = !isCreate && f.lockedOnEdit;
        return (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <span>{f.label}</span>
              {f.required ? <span className="text-[#E26060]">*</span> : null}
              {disabled ? <span className="text-[10px] text-muted-foreground/60">（不可修改）</span> : null}
            </label>
            {f.type === 'select' && f.options ? (
              <select
                value={String(v ?? '')}
                disabled={disabled}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                className={cn(
                  'rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-primary',
                  f.mono && 'font-mono',
                  disabled && 'cursor-not-allowed opacity-50',
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(v)}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...draft, [f.key]: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="text-sm text-foreground">{v ? '是' : '否'}</span>
              </label>
            ) : f.type === 'textarea' ? (
              <textarea
                value={String(v ?? '')}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                disabled={disabled}
                rows={3}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                className={cn(
                  'rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-primary',
                  f.mono && 'font-mono',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={String(v ?? '')}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                disabled={disabled}
                onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                className={cn(
                  'rounded border border-[var(--nx-surface-input-border)] bg-[var(--nx-surface-input)] px-2 py-1.5 text-sm text-[var(--nx-surface-input-fg)] outline-none focus:border-primary',
                  f.mono && 'font-mono',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
