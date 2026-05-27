// apps/nx-ui/src/features/base/parts/PartMasterPage.tsx
/**
 * 零件基本資料（下半場 B/C 自訂頁，取代 EntityMasterPage 泛型）
 *
 * 分區：基本（料號/品名/編碼規則→SEG 分段輸入+即時預覽/舊料號）、商品、正廠對應料號（子表）、規格、價格（依成本重算）、系統。
 * 搜尋同時 match 主料號 / 舊料號 / 副廠 / 品名 / 正廠對應料號，列表標示主料號命中 / 替代品命中。
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterTopBar } from '@/features/master-shell/entity-master/MasterTopBar';
import { MasterTabs } from '@/features/master-shell/entity-master/MasterTabs';
import { formatDateTimeZh } from '@/features/master-shell/entity-master/format';
import { fetchRefOptions, type SelectOption } from '@/features/master-shell/entity-master/config';
import { ErpToolbar, type ErpMode } from '@/features/master-shell/ui/ErpToolbar';
import { SearchPanel } from '@/features/master-shell/ui/SearchPanel';
import { MasterTable, type MasterTableColumn } from '@/features/master-shell/ui/MasterTable';
import { ConfirmDialog, type ConfirmState } from '@/features/master-shell/ui/ConfirmDialog';
import { ToastStack, useToast } from '@/features/master-shell/ui/ToastStack';
import { MasterDetailScroll, SectionHeader, EmptyDetail } from '@/features/master-shell/ui/MasterDetail';
import { FormField, FormInput } from '@/features/master-shell/ui/FormField';
import { KeyboardSelect } from '@/features/master-shell/ui/KeyboardSelect';
import {
  listParts,
  getPart,
  createPart,
  updatePart,
  setPartActive,
  previewPartCode,
  type PartDto,
  type PartOemCode,
  type PartWriteBody,
} from '@/features/base/api/part';
import { listBrandCodeRules, ruleSegLengths, type BrandCodeRuleDto } from '@/features/base/api/brand-code-rule';

// 客戶分級毛利率（A/B/C/D）— 依成本重算
const MARGINS = { priceA: 0.12, priceB: 0.15, priceC: 0.18, priceD: 0.22 } as const;
const PART_TYPE_OPTS = [
  { value: '1', label: '專用件' },
  { value: '2', label: '通用件' },
  { value: '3', label: '組合件' },
  { value: '4', label: '拆解件' },
];

type Form = {
  codeRuleId: string;
  code: string;
  name: string;
  oldCode: string;
  partBrandId: string;
  partGroupId: string;
  countryId: string;
  isOem: boolean;
  partType: string;
  spec: string;
  uom: string;
  warrantyMonths: string;
  cost: string;
  priceA: string;
  priceB: string;
  priceC: string;
  priceD: string;
  seg1: string;
  seg2: string;
  seg3: string;
  seg4: string;
  seg5: string;
  oemCodes: PartOemCode[];
};

function emptyForm(): Form {
  return {
    codeRuleId: '', code: '', name: '', oldCode: '', partBrandId: '', partGroupId: '', countryId: '',
    isOem: true, partType: '1', spec: '', uom: 'pcs', warrantyMonths: '0',
    cost: '', priceA: '', priceB: '', priceC: '', priceD: '',
    seg1: '', seg2: '', seg3: '', seg4: '', seg5: '', oemCodes: [],
  };
}

function partToForm(p: PartDto): Form {
  return {
    codeRuleId: p.codeRuleId ?? '', code: p.code, name: p.name, oldCode: p.oldCode ?? '',
    partBrandId: p.partBrandId ?? '', partGroupId: p.partGroupId ?? '', countryId: p.countryId ?? '',
    isOem: p.isOem, partType: String(p.partType ?? 1), spec: p.spec ?? '', uom: p.uom ?? 'pcs',
    warrantyMonths: String(p.warrantyMonths ?? 0),
    cost: p.cost ?? '', priceA: p.priceA ?? '', priceB: p.priceB ?? '', priceC: p.priceC ?? '', priceD: p.priceD ?? '',
    seg1: p.seg1 ?? '', seg2: p.seg2 ?? '', seg3: p.seg3 ?? '', seg4: p.seg4 ?? '', seg5: p.seg5 ?? '',
    oemCodes: (p.oemCodes ?? []).map((o) => ({ partBrandId: o.partBrandId ?? '', oemCode: o.oemCode, remark: o.remark ?? '' })),
  };
}

function formToBody(f: Form): PartWriteBody {
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
  return {
    codeRuleId: f.codeRuleId || null,
    code: f.code.trim(),
    name: f.name.trim(),
    oldCode: f.oldCode.trim() || null,
    partBrandId: f.partBrandId || null,
    partGroupId: f.partGroupId || null,
    countryId: f.countryId || null,
    isOem: f.isOem,
    partType: Number(f.partType) || 1,
    spec: f.spec.trim() || null,
    uom: f.uom.trim() || 'pcs',
    warrantyMonths: num(f.warrantyMonths) ?? 0,
    cost: num(f.cost),
    priceA: num(f.priceA),
    priceB: num(f.priceB),
    priceC: num(f.priceC),
    priceD: num(f.priceD),
    seg1: f.seg1.trim() || null,
    seg2: f.seg2.trim() || null,
    seg3: f.seg3.trim() || null,
    seg4: f.seg4.trim() || null,
    seg5: f.seg5.trim() || null,
    oemCodes: f.oemCodes
      .filter((o) => o.oemCode.trim() !== '')
      .map((o) => ({ partBrandId: o.partBrandId || null, oemCode: o.oemCode.trim(), remark: (o.remark ?? '').trim() || null })),
  };
}

export function PartMasterPage() {
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [rows, setRows] = useState<PartDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showInactive, setShowInactive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ErpMode>('browse');
  const [tab, setTab] = useState<'list' | 'detail'>('list');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [codePreview, setCodePreview] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [rules, setRules] = useState<BrandCodeRuleDto[]>([]);
  const [refs, setRefs] = useState<{ partBrand: SelectOption[]; partGroup: SelectOption[]; country: SelectOption[] }>({
    partBrand: [], partGroup: [], country: [],
  });

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedRule = useMemo(() => rules.find((r) => r.id === form.codeRuleId) ?? null, [rules, form.codeRuleId]);
  const editing = mode === 'edit';

  // 載入下拉來源（一次）
  useEffect(() => {
    void (async () => {
      const [pb, pg, ct, ruleRes] = await Promise.all([
        fetchRefOptions('nx01/part-brands'),
        fetchRefOptions('/part-group'),
        fetchRefOptions('nx01/countries'),
        listBrandCodeRules({ isActive: true, pageSize: 100 }),
      ]);
      setRefs({ partBrand: pb, partGroup: pg, country: ct });
      setRules(ruleRes.items);
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);
  useEffect(() => setPage(1), [debouncedKw, showInactive]);

  // 載入列表
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await listParts({ q: debouncedKw || undefined, page, pageSize, isActive: showInactive ? undefined : true });
        if (!alive) return;
        setRows(res.items);
        setTotal(res.total);
      } catch (e) {
        if (alive) showToast(`零件載入失敗：${(e as Error).message}`, 'danger');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [page, pageSize, reloadTick, debouncedKw, showInactive, showToast]);

  // 進詳細：載入完整零件（含正廠對應）
  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setTab('detail');
    setMode('browse');
    try {
      const p = await getPart(id);
      setForm(partToForm(p));
    } catch (e) {
      showToast(`零件明細載入失敗：${(e as Error).message}`, 'danger');
    }
  }, [showToast]);

  // 料號即時預覽（選了編碼規則時、依 SEG + 規則分隔符 server 端組）
  useEffect(() => {
    if (!editing || !form.codeRuleId) { setCodePreview(''); return; }
    let alive = true;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const code = await previewPartCode({
            codeRuleId: form.codeRuleId,
            seg1: form.seg1, seg2: form.seg2, seg3: form.seg3, seg4: form.seg4, seg5: form.seg5,
            partBrandId: form.partBrandId || undefined,
            countryId: form.countryId || undefined,
          });
          if (alive) setCodePreview(code);
        } catch { /* 預覽失敗不擋編輯 */ }
      })();
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [editing, form.codeRuleId, form.seg1, form.seg2, form.seg3, form.seg4, form.seg5, form.partBrandId, form.countryId]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = () => {
    setForm(emptyForm());
    setCreating(true);
    setSelectedId(null);
    setMode('edit');
    setTab('detail');
  };
  const handleEdit = () => {
    if (!selected) return;
    setCreating(false);
    setMode('edit');
    setTab('detail');
    void (async () => {
      try {
        const p = await getPart(selected.id);
        setForm(partToForm(p));
      } catch (e) { showToast(`載入失敗：${(e as Error).message}`, 'danger'); }
    })();
  };
  const performCancel = () => { setMode('browse'); setCreating(false); };

  const recalcPrices = () => {
    const c = Number(form.cost);
    if (!Number.isFinite(c) || c <= 0) { showToast('請先填成本（>0）才能重算', 'danger'); return; }
    setForm((f) => ({
      ...f,
      priceA: (c * (1 + MARGINS.priceA)).toFixed(2),
      priceB: (c * (1 + MARGINS.priceB)).toFixed(2),
      priceC: (c * (1 + MARGINS.priceC)).toFixed(2),
      priceD: (c * (1 + MARGINS.priceD)).toFixed(2),
    }));
    showToast('已依成本 + 毛利率重算 A/B/C/D（可再手動微調）', 'success');
  };

  const performSave = useCallback(async () => {
    // 料號：選規則→用預覽；未選→手動 code
    const finalCode = form.codeRuleId ? (codePreview || form.code).trim() : form.code.trim();
    if (!finalCode) { showToast('料號為必填', 'danger'); return; }
    if (!form.name.trim()) { showToast('品名為必填', 'danger'); return; }
    const body = { ...formToBody(form), code: finalCode };
    try {
      if (creating) {
        const created = await createPart(body);
        showToast(`已新增零件 ${created.code}`, 'success');
        setSelectedId(created.id);
      } else if (selectedId) {
        await updatePart(selectedId, body);
        showToast('已存檔', 'success');
      }
      setMode('browse');
      setCreating(false);
      setReloadTick((t) => t + 1);
    } catch (e) {
      showToast(`存檔失敗：${(e as Error).message}`, 'danger');
    }
  }, [form, codePreview, creating, selectedId, showToast]);

  const handleSave = () => {
    setConfirm({
      title: creating ? '新增零件' : '存檔變更',
      message: creating ? '確定新增這筆零件？' : '確定儲存零件變更？',
      confirmLabel: '存檔',
      onConfirm: () => void performSave(),
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    const turningOff = selected.isActive;
    setConfirm({
      title: turningOff ? '停用零件' : '啟用零件',
      message: turningOff ? `確定停用「${selected.code}」？（系統不刪資料、可從「顯示停用」恢復）` : `確定重新啟用「${selected.code}」？`,
      confirmLabel: turningOff ? '停用' : '啟用',
      variant: turningOff ? 'danger' : 'default',
      onConfirm: () => void (async () => {
        try {
          await setPartActive(selected.id, !selected.isActive);
          showToast(turningOff ? '已停用' : '已啟用', 'success');
          setReloadTick((t) => t + 1);
        } catch (e) { showToast(`操作失敗：${(e as Error).message}`, 'danger'); }
      })(),
    });
  };

  const handleExit = () => {
    if (editing) { showToast('編輯中：請先存檔（Alt+S）或取消（Alt+C）', 'info'); return; }
    router.push('/dashboard');
  };
  const requestNavigate = useCallback((href: string) => {
    if (editing) { showToast('編輯中：請先存檔或取消', 'info'); return; }
    router.push(href);
  }, [editing, router, showToast]);

  // 自動鎖第一列
  useEffect(() => {
    if (rows.length === 0) { if (selectedId !== null) setSelectedId(null); return; }
    if (!rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // Alt 快捷鍵
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === '1') { e.preventDefault(); if (!editing) setTab('list'); }
      else if (k === '2') { e.preventDefault(); if (selected || creating) setTab('detail'); }
      else if (editing) {
        if (k === 's') { e.preventDefault(); handleSave(); }
        else if (k === 'c') { e.preventDefault(); performCancel(); }
      } else {
        if (k === 'a') { e.preventDefault(); handleCreate(); }
        else if (k === 'e' && selected) { e.preventDefault(); handleEdit(); }
        else if (k === 'f') { e.preventDefault(); setSearchOpen((s) => !s); }
        else if (k === 'd' && selected) { e.preventDefault(); handleDelete(); }
        else if (k === 'r') { e.preventDefault(); setReloadTick((t) => t + 1); }
        else if (k === 'q') { e.preventDefault(); handleExit(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, selected, creating]);

  const columns: MasterTableColumn<PartDto>[] = useMemo(() => [
    {
      key: 'code', label: '料號', minWidthClass: 'min-w-[240px]',
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-[#E8E8EB]">{r.displayCode || r.code}</span>
          {r.matchType === 'oem' ? (
            <span className="rounded border border-[#5AA0E8]/40 bg-[#5AA0E8]/10 px-1 text-[9px] text-[#5AA0E8]">替代品</span>
          ) : r.matchType === 'primary' && debouncedKw ? (
            <span className="rounded border border-[#22D88F]/40 bg-[#22D88F]/10 px-1 text-[9px] text-[#22D88F]">主料號</span>
          ) : null}
        </span>
      ),
    },
    { key: 'name', label: '品名', minWidthClass: 'min-w-[180px]', render: (r) => <span className="text-[#F0F0F3]">{r.name}</span> },
    { key: 'oldCode', label: '舊料號', minWidthClass: 'min-w-[120px]', render: (r) => <span className="font-mono text-xs text-[#888892]">{r.oldCode ?? '—'}</span> },
    { key: 'isOem', label: '原廠', minWidthClass: 'min-w-[70px]', render: (r) => <span className="text-xs">{r.isOem ? '原廠' : '副廠'}</span> },
    { key: 'priceA', label: '售價 A', minWidthClass: 'min-w-[100px]', render: (r) => <span className="font-mono text-xs tabular-nums">{r.priceA ?? '—'}</span> },
    {
      key: 'isActive', label: '狀態', minWidthClass: 'min-w-[80px]',
      render: (r) => <span className={r.isActive ? 'text-[#22D88F]' : 'text-[#E26060]'}>{r.isActive ? '啟用' : '停用'}</span>,
    },
  ], [debouncedKw]);

  return (
    <div className="flex h-dvh flex-col text-[#E8E8EB]" style={{ backgroundImage: 'radial-gradient(ellipse at top, #11111A 0%, #0A0A0C 35%, #06060A 100%)' }}>
      <MasterTopBar category="產品料號" title="零件基本資料" count={`${total} 筆零件`} requestNavigate={requestNavigate} />
      <MasterTabs tab={tab} onChange={(t) => { if (!editing) setTab(t); }} />
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
          onSearch={() => setSearchOpen((s) => !s)}
          onDelete={handleDelete}
          onExport={() => showToast('匯出尚未開放', 'info')}
          onRefresh={() => setReloadTick((t) => t + 1)}
          onExit={handleExit}
          onSave={handleSave}
          onCancel={performCancel}
          showInactive={mode === 'browse' && tab === 'list' ? showInactive : undefined}
          onShowInactiveChange={mode === 'browse' && tab === 'list' ? setShowInactive : undefined}
        />
      </div>
      <SearchPanel open={searchOpen} value={keyword} onChange={setKeyword} onClose={() => { setSearchOpen(false); setKeyword(''); }} placeholder="搜尋料號 / 舊料號 / 品名 / 正廠對應料號..." />

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'list' ? (
          <MasterTable<PartDto>
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenDetail={(id) => void openDetail(id)}
            selectionMode={false}
            checked={new Set()}
            setChecked={() => {}}
            pageSize={pageSize}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            footerHint={loading ? '載入中…' : debouncedKw ? `關鍵字「${debouncedKw}」（含替代品）` : undefined}
            totalCount={total}
          />
        ) : (mode === 'edit' || selected) ? (
          <PartDetail
            form={form}
            set={set}
            editing={editing}
            creating={creating}
            selected={selected}
            rules={rules}
            selectedRule={selectedRule}
            refs={refs}
            codePreview={codePreview}
            onRecalc={recalcPrices}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[#5A5A60]">目前沒有資料</div>
        )}
      </div>

      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 詳細 / 編輯
// ──────────────────────────────────────────────────────────────
function PartDetail({
  form, set, editing, creating, selected, rules, selectedRule, refs, codePreview, onRecalc,
}: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  editing: boolean;
  creating: boolean;
  selected: PartDto | null;
  rules: BrandCodeRuleDto[];
  selectedRule: BrandCodeRuleDto | null;
  refs: { partBrand: SelectOption[]; partGroup: SelectOption[]; country: SelectOption[] };
  codePreview: string;
  onRecalc: () => void;
}) {
  const segKeys = ['seg1', 'seg2', 'seg3', 'seg4', 'seg5'] as const;
  const segLens = selectedRule ? ruleSegLengths(selectedRule) : [];
  const ruleOpts = rules.map((r) => ({ value: r.id, label: r.name }));
  const oemAddBrand = refs.partBrand;

  const updateOem = (idx: number, patch: Partial<PartOemCode>) =>
    set('oemCodes', form.oemCodes.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  const removeOem = (idx: number) => set('oemCodes', form.oemCodes.filter((_, i) => i !== idx));
  const addOem = () => set('oemCodes', [...form.oemCodes, { partBrandId: '', oemCode: '', remark: '' }]);

  const brandLabel = (id: string | null | undefined) =>
    id ? refs.partBrand.find((o) => String(o.value) === id)?.label ?? id : '—';

  return (
    <MasterDetailScroll scrollKey={selected?.id ?? (creating ? '__new__' : null)}>
      <div className="px-6 py-4">
        {/* 基本 */}
        <section className="border-b border-[#1A1A1F] pb-5">
          <SectionHeader title="基本" subtitle="Basic" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {editing ? (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">編碼規則</span>
                <KeyboardSelect
                  value={form.codeRuleId}
                  options={[{ value: '', label: '（不套用、手動輸入料號）' }, ...ruleOpts]}
                  placeholder="（不套用、手動輸入料號）"
                  ariaLabel="編碼規則"
                  onChange={(v) => set('codeRuleId', v)}
                />
              </div>
            ) : (
              <FormField label="編碼規則" value={selectedRule?.name ?? '（手動料號）'} />
            )}

            {/* 料號：選規則→分段預覽（唯讀）；未選→手動 */}
            {editing && form.codeRuleId ? (
              <FormField label="料號（自動）" value={codePreview || '（輸入分段後預覽）'} mono />
            ) : editing ? (
              <FormInput label="料號 *" value={form.code} onChange={(v) => set('code', v)} />
            ) : (
              <FormField label="料號" value={selected?.displayCode || form.code} mono />
            )}

            {editing ? <FormInput label="品名 *" value={form.name} onChange={(v) => set('name', v)} /> : <FormField label="品名" value={form.name} />}
            {editing ? <FormInput label="舊料號" value={form.oldCode} onChange={(v) => set('oldCode', v)} placeholder="轉系統客戶用" /> : <FormField label="舊料號" value={form.oldCode || '—'} mono />}
          </div>

          {/* 分段輸入（選了規則才出現） */}
          {editing && selectedRule ? (
            <div className="mt-3 rounded-lg border border-[#2A2A30] bg-[#0E0E12] p-3">
              <div className="mb-2 text-[11px] font-semibold text-[#B8B8C0]">分段輸入（依規則「{selectedRule.name}」字數限制）</div>
              <div className="flex flex-wrap gap-3">
                {segKeys.map((sk, i) => {
                  const maxLen = segLens[i] ?? 0;
                  if (maxLen <= 0) return null;
                  return (
                    <div key={sk} className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#888892]">SEG{i + 1}（≤{maxLen}）</span>
                      <input
                        value={form[sk]}
                        maxLength={maxLen}
                        onChange={(e) => set(sk, e.target.value)}
                        className="w-24 rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2 py-1 font-mono text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 font-mono text-xs text-[#E8A020]">預覽：{codePreview || '—'}</div>
            </div>
          ) : null}
        </section>

        {/* 商品 */}
        <section className="border-b border-[#1A1A1F] py-5">
          <SectionHeader title="商品" subtitle="Product" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RefOrText editing={editing} label="零件廠牌" value={form.partBrandId} opts={refs.partBrand} onChange={(v) => set('partBrandId', v)} />
            <RefOrText editing={editing} label="零件群組" value={form.partGroupId} opts={refs.partGroup} onChange={(v) => set('partGroupId', v)} />
            <RefOrText editing={editing} label="產地" value={form.countryId} opts={refs.country} onChange={(v) => set('countryId', v)} />
            {editing ? (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">料件類型</span>
                <KeyboardSelect value={form.partType} options={PART_TYPE_OPTS} ariaLabel="料件類型" onChange={(v) => set('partType', v)} />
              </div>
            ) : (
              <FormField label="料件類型" value={PART_TYPE_OPTS.find((o) => o.value === form.partType)?.label ?? '—'} />
            )}
            {editing ? (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">是否原廠</span>
                <button type="button" onClick={() => set('isOem', !form.isOem)}
                  className={cn('inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium',
                    form.isOem ? 'border-[#22D88F]/40 bg-[#22D88F]/10 text-[#22D88F]' : 'border-[#888892]/40 bg-[#1A1A1F] text-[#888892]')}>
                  {form.isOem ? '原廠件' : '副廠件'}
                </button>
              </div>
            ) : (
              <FormField label="是否原廠" value={form.isOem ? '原廠件' : '副廠件'} tone={form.isOem ? 'green' : undefined} />
            )}
          </div>
        </section>

        {/* 正廠對應料號子表 */}
        <section className="border-b border-[#1A1A1F] py-5">
          <SectionHeader title="正廠對應料號" count={form.oemCodes.length} subtitle="OEM Cross Ref"
            action={editing ? <button type="button" onClick={addOem} className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"><Plus className="size-3" /> 新增正廠對應</button> : null} />
          <div className="mt-3">
            {form.oemCodes.length === 0 ? (
              <EmptyDetail message="尚無正廠對應料號" />
            ) : (
              <div className="flex flex-col gap-1.5">
                {form.oemCodes.map((o, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    {editing ? (
                      <>
                        <div className="w-40"><KeyboardSelect value={o.partBrandId ?? ''} options={[{ value: '', label: '（廠牌）' }, ...oemAddBrand.map((b) => ({ value: String(b.value), label: b.label }))]} placeholder="（廠牌）" ariaLabel="對應廠牌" onChange={(v) => updateOem(idx, { partBrandId: v })} /></div>
                        <input value={o.oemCode} onChange={(e) => updateOem(idx, { oemCode: e.target.value })} placeholder="正廠料號" className="w-44 rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2 py-1.5 font-mono text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60" />
                        <input value={o.remark ?? ''} onChange={(e) => updateOem(idx, { remark: e.target.value })} placeholder="備註（如 Golf 7 用）" className="min-w-[8rem] flex-1 rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-2 py-1.5 text-sm text-[#E8E8EB] outline-none focus:border-[#E8A020]/60" />
                        <button type="button" onClick={() => removeOem(idx)} className="inline-flex size-7 items-center justify-center rounded-md border border-[#5A2A2A] bg-[#1F1212] text-[#C84A4A] hover:bg-[#2A1818]"><X className="size-3.5" /></button>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="w-32 text-[#B8B8C0]">{brandLabel(o.partBrandId)}</span>
                        <span className="w-44 font-mono text-[#E8E8EB]">{o.oemCode}</span>
                        <span className="text-[#888892]">{o.remark || '—'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 規格 */}
        <section className="border-b border-[#1A1A1F] py-5">
          <SectionHeader title="規格" subtitle="Spec" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {editing ? <FormInput label="規格說明" value={form.spec} onChange={(v) => set('spec', v)} /> : <FormField label="規格說明" value={form.spec || '—'} />}
            {editing ? <FormInput label="單位" value={form.uom} onChange={(v) => set('uom', v)} /> : <FormField label="單位" value={form.uom} />}
            {editing ? <FormInput label="保固月數" value={form.warrantyMonths} onChange={(v) => set('warrantyMonths', v)} /> : <FormField label="保固月數" value={form.warrantyMonths} />}
          </div>
        </section>

        {/* 價格 */}
        <section className="border-b border-[#1A1A1F] py-5">
          <SectionHeader title="價格" subtitle="Pricing"
            action={editing ? <button type="button" onClick={onRecalc} className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/12 px-2.5 text-[11px] font-medium text-[#E8A020] hover:bg-[#E8A020]/20"><Calculator className="size-3" /> 依成本重算</button> : null} />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {editing ? <FormInput label="成本" value={form.cost} onChange={(v) => set('cost', v)} /> : <FormField label="成本" value={form.cost || '—'} mono />}
            {(['priceA', 'priceB', 'priceC', 'priceD'] as const).map((pk, i) => (
              editing
                ? <FormInput key={pk} label={`售價 ${'ABCD'[i]}`} value={form[pk]} onChange={(v) => set(pk, v)} />
                : <FormField key={pk} label={`售價 ${'ABCD'[i]}`} value={form[pk] || '—'} mono />
            ))}
          </div>
          {editing ? <div className="mt-2 text-[10px] text-[#5A5A60]">重算公式：A=成本×1.12 / B×1.15 / C×1.18 / D×1.22（可再手動微調）</div> : null}
        </section>

        {/* 系統（唯讀，無系統編號） */}
        {!creating && selected ? (
          <section className="py-5">
            <SectionHeader title="系統" subtitle="System" />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="建立時間" value={formatDateTimeZh(selected.createdAt)} mono dim />
              <FormField label="建立人員" value={selected.createdByName ?? selected.createdByUsername ?? '—'} dim />
              <FormField label="修改時間" value={formatDateTimeZh(selected.updatedAt)} mono dim />
              <FormField label="修改人員" value={selected.updatedByName ?? selected.updatedByUsername ?? '—'} dim />
            </div>
          </section>
        ) : null}
      </div>
    </MasterDetailScroll>
  );
}

function RefOrText({ editing, label, value, opts, onChange }: {
  editing: boolean; label: string; value: string; opts: SelectOption[]; onChange: (v: string) => void;
}) {
  if (!editing) {
    const lbl = value ? opts.find((o) => String(o.value) === value)?.label ?? value : '—';
    return <FormField label={label} value={lbl} />;
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">{label}</span>
      <KeyboardSelect value={value} options={[{ value: '', label: '（無）' }, ...opts.map((o) => ({ value: String(o.value), label: o.label }))]} placeholder="（無）" ariaLabel={label} onChange={onChange} />
    </div>
  );
}
