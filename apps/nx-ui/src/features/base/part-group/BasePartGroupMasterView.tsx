/**
 * 零件族群主檔：nx00_part_group — 搜尋、列表、明細（mock）
 */

'use client';

import { useMemo, useState } from 'react';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { getFieldIdFromEventTarget, handleMasterFieldKeyDown } from '@/features/base/keyboard/masterFieldNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MOCK_CURRENT_OPERATOR_NAME } from '@/features/base/users/mock-data';
import {
  getMockCarBrandsForPartGroup,
  MOCK_BASE_PART_GROUPS,
  type BasePartGroupRow,
} from './mock-data';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `pg-${crypto.randomUUID()}`;
  return `pg-${Date.now()}`;
}

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

function formatSegLine(r: BasePartGroupRow): string {
  const parts = [r.seg1, r.seg2, r.seg3, r.seg4, r.seg5].map((s) => (s.trim() === '' ? '—' : s));
  return parts.join(' · ');
}

type Draft = {
  name: string;
  carBrandId: string;
  seg1: string;
  seg2: string;
  seg3: string;
  seg4: string;
  seg5: string;
  sortNo: string;
  isActive: boolean;
};

function emptyDraft(defaultCarBrandId: string): Draft {
  return {
    name: '',
    carBrandId: defaultCarBrandId,
    seg1: '',
    seg2: '',
    seg3: '',
    seg4: '',
    seg5: '',
    sortNo: '100',
    isActive: true,
  };
}

function fromRow(r: BasePartGroupRow): Draft {
  return {
    name: r.name,
    carBrandId: r.carBrandId,
    seg1: r.seg1,
    seg2: r.seg2,
    seg3: r.seg3,
    seg4: r.seg4,
    seg5: r.seg5,
    sortNo: String(r.sortNo),
    isActive: r.isActive,
  };
}

export function BasePartGroupMasterView() {
  const carBrands = useMemo(() => getMockCarBrandsForPartGroup(), []);
  const defaultBrandId = carBrands[0]?.id ?? '';

  const [rows, setRows] = useState<BasePartGroupRow[]>(() => [...MOCK_BASE_PART_GROUPS]);
  const [keyword, setKeyword] = useState('');
  const [brandPick, setBrandPick] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => MOCK_BASE_PART_GROUPS[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() =>
    MOCK_BASE_PART_GROUPS[0] ? fromRow(MOCK_BASE_PART_GROUPS[0]) : emptyDraft(defaultBrandId),
  );
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const PG_FIELD_ORDER: readonly string[] = [
    'pg-name',
    'pg-car-brand',
    'pg-seg1',
    'pg-seg2',
    'pg-seg3',
    'pg-seg4',
    'pg-seg5',
    'pg-sort',
    'pg-active',
  ];

  const brandName = (id: string) => carBrands.find((b) => b.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      if (brandPick && r.carBrandId !== brandPick) return false;
      if (!k) return true;
      const blob = [
        r.name,
        brandName(r.carBrandId),
        r.seg1,
        r.seg2,
        r.seg3,
        r.seg4,
        r.seg5,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(k);
    });
  }, [rows, keyword, brandPick, carBrands]);

  const sortedFiltered = useMemo(
    () =>
      [...filtered].sort((a, b) => a.sortNo - b.sortNo || a.name.localeCompare(b.name, 'zh-Hant')),
    [filtered],
  );

  const selectedFilteredIndex = useMemo(
    () => (selectedId ? sortedFiltered.findIndex((r) => r.id === selectedId) : -1),
    [sortedFiltered, selectedId],
  );

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId],
  );

  const formValues = creating || editing ? draft : selected ? fromRow(selected) : emptyDraft(defaultBrandId);

  const selectCls = cn(
    'nx-native-select h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs',
    'outline-none transition-[color,box-shadow]',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  );

  const readonlyCls = 'bg-muted/40 text-muted-foreground cursor-default';

  const onRowClick = (id: string) => {
    setSelectedId(id);
    setCreating(false);
    setEditing(false);
  };

  const onAdd = () => {
    setSelectedId(null);
    setCreating(true);
    setEditing(true);
    setDraft(emptyDraft(defaultBrandId));
  };

  const onEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(fromRow(selected));
  };

  const onCancel = () => {
    if (creating) {
      setCreating(false);
      setEditing(false);
      setSelectedId(rows[0]?.id ?? null);
      if (rows[0]) setDraft(fromRow(rows[0]));
      return;
    }
    setEditing(false);
    if (selected) setDraft(fromRow(selected));
  };

  const performSave = () => {
    const name = draft.name.trim();
    if (!name) return;
    if (!draft.carBrandId) return;
    const sn = Number.parseInt(draft.sortNo, 10);
    const sortNo = Number.isFinite(sn) ? sn : 0;
    const now = new Date().toISOString();
    const trimSeg = (s: string) => s.trim();

    if (creating) {
      const id = newId();
      const row: BasePartGroupRow = {
        id,
        name,
        carBrandId: draft.carBrandId,
        seg1: trimSeg(draft.seg1),
        seg2: trimSeg(draft.seg2),
        seg3: trimSeg(draft.seg3),
        seg4: trimSeg(draft.seg4),
        seg5: trimSeg(draft.seg5),
        sortNo,
        isActive: draft.isActive,
        createdAt: now,
        createdBy: MOCK_CURRENT_OPERATOR_NAME,
        updatedAt: now,
        updatedBy: MOCK_CURRENT_OPERATOR_NAME,
      };
      setRows((prev) => [...prev, row]);
      setSelectedId(id);
      setCreating(false);
      setEditing(false);
      return;
    }
    if (!selectedId) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === selectedId
          ? {
              ...r,
              name,
              carBrandId: draft.carBrandId,
              seg1: trimSeg(draft.seg1),
              seg2: trimSeg(draft.seg2),
              seg3: trimSeg(draft.seg3),
              seg4: trimSeg(draft.seg4),
              seg5: trimSeg(draft.seg5),
              sortNo,
              isActive: draft.isActive,
              updatedAt: now,
              updatedBy: MOCK_CURRENT_OPERATOR_NAME,
            }
          : r,
      ),
    );
    setEditing(false);
  };

  const focusPgRow = (index: number) => {
    requestAnimationFrame(() => {
      (document.querySelector(`[data-pg-master-row="${index}"]`) as HTMLElement | null)?.focus();
    });
  };

  const selectRowAtSortedIndex = (idx: number) => {
    const r = sortedFiltered[idx];
    if (!r) return;
    setSelectedId(r.id);
    setCreating(false);
    setEditing(false);
  };

  const auditSource = selected;

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,42%)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋與篩選</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pg-k">關鍵字</Label>
              <Input
                id="pg-k"
                className="mt-0"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (saveConfirmOpen) return;
                  if (e.key === 'ArrowDown' && sortedFiltered.length > 0) {
                    e.preventDefault();
                    selectRowAtSortedIndex(0);
                    focusPgRow(0);
                  }
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('pg-name')?.focus();
                  }
                }}
                placeholder="族群名稱、廠牌、seg1～5…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pg-brand-filter">汽車廠牌</Label>
              <select
                id="pg-brand-filter"
                className={selectCls}
                value={brandPick}
                onChange={(e) => setBrandPick(e.target.value)}
              >
                <option value="">全部</option>
                {carBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}（{b.code}）
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="glass-card flex min-h-[420px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            <Button type="button" size="sm" onClick={onAdd}>
              新增
            </Button>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">共 {sortedFiltered.length} 筆</span>
          </div>
          <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
            <div className="space-y-2">
              {sortedFiltered.map((r, i) => {
                  const active = r.id === selectedId && !creating;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      tabIndex={-1}
                      data-pg-master-row={i}
                      onClick={() => onRowClick(r.id)}
                      onKeyDown={(e) => {
                        if (saveConfirmOpen) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (i < sortedFiltered.length - 1) {
                            selectRowAtSortedIndex(i + 1);
                            focusPgRow(i + 1);
                          } else {
                            document.getElementById('pg-name')?.focus();
                          }
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (i > 0) {
                            selectRowAtSortedIndex(i - 1);
                            focusPgRow(i - 1);
                          } else {
                            document.getElementById('pg-k')?.focus();
                          }
                        }
                        if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          document.getElementById('pg-name')?.focus();
                        }
                        if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          document.getElementById('pg-k')?.focus();
                        }
                      }}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                        active
                          ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 ring-1 ring-primary/20'
                          : 'border-border/80 bg-muted/15 hover:bg-muted/30',
                      )}
                    >
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {brandName(r.carBrandId)} · 排序 {r.sortNo}
                        {!r.isActive ? ' · 停用' : null}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground/90">{formatSegLine(r)}</div>
                    </button>
                  );
                })}
              {sortedFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground">無符合資料。</p>
              ) : null}
            </div>
          </ScrollArea>
        </section>
      </div>

      <aside
        className="glass-card min-h-[min(520px,calc(100vh-14rem))] rounded-2xl border border-border/80 p-4 shadow-sm lg:sticky lg:top-24"
        onKeyDownCapture={(e) => {
          if (saveConfirmOpen) return;
          if (!creating && !editing) return;
          const id = getFieldIdFromEventTarget(e.target);
          if (e.key === 'ArrowLeft' && id === 'pg-name') {
            e.preventDefault();
            if (selectedFilteredIndex >= 0) focusPgRow(selectedFilteredIndex);
            else document.getElementById('pg-k')?.focus();
            return;
          }
          handleMasterFieldKeyDown(e, PG_FIELD_ORDER, {
            enabled: true,
            onLastField: () => setSaveConfirmOpen(true),
          });
        }}
      >
        <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">族群明細</h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          對應表 <span className="font-mono">nx00_part_group</span>；系統內碼不顯示。
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pg-name">族群名稱</Label>
            <Input
              id="pg-name"
              value={formValues.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
              placeholder="例如：煞車系統"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg-car-brand">汽車廠牌（nx00_car_brand）</Label>
            <select
              id="pg-car-brand"
              className={selectCls}
              value={formValues.carBrandId}
              disabled={!creating && !editing}
              onChange={(e) => setDraft((d) => ({ ...d, carBrandId: e.target.value }))}
            >
              {carBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}（{b.code}）
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">料號匹配條件（seg1～seg5）</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {(['seg1', 'seg2', 'seg3', 'seg4', 'seg5'] as const).map((key, i) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`pg-${key}`} className="text-xs">
                    第 {i + 1} 段
                  </Label>
                  <Input
                    id={`pg-${key}`}
                    value={formValues[key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    readOnly={!creating && !editing}
                    className={!creating && !editing ? readonlyCls : undefined}
                    placeholder="可空白"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg-sort">排序號（sort_no）</Label>
            <Input
              id="pg-sort"
              inputMode="numeric"
              value={formValues.sortNo}
              onChange={(e) => setDraft((d) => ({ ...d, sortNo: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <label htmlFor="pg-active" className="flex items-center gap-2 text-sm">
            <input
              id="pg-active"
              type="checkbox"
              className="size-4 accent-primary"
              checked={formValues.isActive}
              disabled={!creating && !editing}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
            />
            啟用（is_active）
          </label>

          <div className="border-t border-border/60 pt-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">稽核</p>
            <div className="space-y-2">
              <Label htmlFor="pg-created-by">建立人員</Label>
              <Input
                id="pg-created-by"
                readOnly
                value={auditSource?.createdBy ?? '\u2014'}
                className={readonlyCls}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-created-at">建立時間</Label>
              <Input
                id="pg-created-at"
                readOnly
                value={auditSource ? formatDt(auditSource.createdAt) : '\u2014'}
                className={readonlyCls}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-updated-at">最後修改時間</Label>
              <Input
                id="pg-updated-at"
                readOnly
                value={auditSource ? formatDt(auditSource.updatedAt) : '\u2014'}
                className={readonlyCls}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-updated-by">最後修改人員</Label>
              <Input
                id="pg-updated-by"
                readOnly
                value={auditSource?.updatedBy ?? '\u2014'}
                className={readonlyCls}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {creating || editing ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!draft.name.trim() || !draft.carBrandId) return;
                  setSaveConfirmOpen(true);
                }}
              >
                儲存
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onCancel}>
                取消
              </Button>
            </>
          ) : selected ? (
            <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
              編輯
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">點選左側一筆以檢視。</p>
          )}
        </div>
      </aside>
    </div>
    <MasterSaveConfirmDialog
      open={saveConfirmOpen}
      onOpenChange={setSaveConfirmOpen}
      onConfirm={() => performSave()}
    />
    </>
  );
}
