/**
 * 廠商／客戶主檔：連線 GET/POST/PUT /partner
 * （nx00_partner 無統編欄位；統編可寫入備註）
 */

'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  createPartner,
  listPartners,
  type PartnerDto,
  type PartnerType,
  updatePartner,
} from '@/features/base/api/partner';
import { MasterSaveConfirmDialog } from '@/features/base/keyboard/MasterSaveConfirmDialog';
import { getFieldIdFromEventTarget, handleMasterFieldKeyDown } from '@/features/base/keyboard/masterFieldNav';

type TabKey = 'vendor' | 'customer';

function matchesTab(row: PartnerDto, tab: TabKey): boolean {
  if (tab === 'vendor') return row.partnerType === 'SUPPLIER' || row.partnerType === 'BOTH';
  return row.partnerType === 'CUSTOMER' || row.partnerType === 'BOTH';
}

function defaultPartnerType(tab: TabKey): PartnerType {
  return tab === 'vendor' ? 'SUPPLIER' : 'CUSTOMER';
}

const PARTNER_TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'SUPPLIER', label: '供應商' },
  { value: 'CUSTOMER', label: '客戶' },
  { value: 'BOTH', label: '供應商＋客戶' },
];

type Draft = {
  code: string;
  name: string;
  partnerType: PartnerType;
  contactName: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  remark: string;
  isActive: boolean;
};

function emptyDraft(tab: TabKey): Draft {
  return {
    code: '',
    name: '',
    partnerType: defaultPartnerType(tab),
    contactName: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    remark: '',
    isActive: true,
  };
}

function fromDto(d: PartnerDto): Draft {
  return {
    code: d.code,
    name: d.name,
    partnerType: d.partnerType,
    contactName: d.contactName ?? '',
    phone: d.phone ?? '',
    mobile: d.mobile ?? '',
    email: d.email ?? '',
    address: d.address ?? '',
    remark: d.remark ?? '',
    isActive: d.isActive,
  };
}

function PartnerPanel({
  tab,
  tabLabel,
  rows,
  setRows,
  reloadAll,
  loading,
  globalError,
}: {
  tab: TabKey;
  tabLabel: string;
  rows: PartnerDto[];
  setRows: Dispatch<SetStateAction<PartnerDto[]>>;
  reloadAll: () => Promise<void>;
  loading: boolean;
  globalError: string | null;
}) {
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(tab));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const scoped = useMemo(() => rows.filter((r) => matchesTab(r, tab)), [rows, tab]);

  const partnerFieldOrder = useMemo(
    () =>
      [
        `pt-c-${tab}`,
        `pt-n-${tab}`,
        `pt-pt-${tab}`,
        `pt-cn-${tab}`,
        `pt-p-${tab}`,
        `pt-m-${tab}`,
        `pt-e-${tab}`,
        `pt-a-${tab}`,
        `pt-r-${tab}`,
        `pt-active-${tab}`,
      ] as const,
    [tab],
  );

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return scoped;
    return scoped.filter((r) =>
      `${r.code} ${r.name} ${r.phone ?? ''} ${r.remark ?? ''} ${r.contactName ?? ''}`.toLowerCase().includes(k),
    );
  }, [scoped, keyword]);

  const selectedFilteredIndex = useMemo(
    () => (selectedId ? filtered.findIndex((r) => r.id === selectedId) : -1),
    [filtered, selectedId],
  );

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId && matchesTab(r, tab)) ?? null : null),
    [rows, selectedId, tab],
  );

  const formValues = creating || editing ? draft : selected ? fromDto(selected) : emptyDraft(tab);

  const errorText = localError || globalError;

  const onRowClick = (id: string) => {
    setSelectedId(id);
    setCreating(false);
    setEditing(false);
    setLocalError(null);
  };

  const onAdd = () => {
    setSelectedId(null);
    setCreating(true);
    setEditing(true);
    setDraft(emptyDraft(tab));
    setLocalError(null);
  };

  const onEdit = () => {
    if (!selected) return;
    setEditing(true);
    setDraft(fromDto(selected));
    setLocalError(null);
  };

  const onCancel = () => {
    if (creating) {
      setCreating(false);
      setEditing(false);
      return;
    }
    setEditing(false);
  };

  const performSave = async () => {
    const code = draft.code.trim().toUpperCase();
    if (!code) return;
    setSaving(true);
    setLocalError(null);
    try {
      const bodyBase = {
        code,
        name: draft.name.trim() || code,
        partnerType: draft.partnerType,
        contactName: draft.contactName.trim() || null,
        phone: draft.phone.trim() || null,
        mobile: draft.mobile.trim() || null,
        email: draft.email.trim() || null,
        address: draft.address.trim() || null,
        remark: draft.remark.trim() || null,
        isActive: draft.isActive,
      };
      if (creating) {
        const dto = await createPartner(bodyBase);
        setRows((prev) => [...prev, dto]);
        setSelectedId(dto.id);
        setCreating(false);
        setEditing(false);
        return;
      }
      if (!selectedId) return;
      const dto = await updatePartner(selectedId, bodyBase);
      setRows((prev) => prev.map((r) => (r.id === selectedId ? dto : r)));
      setEditing(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const focusPartnerRow = (index: number) => {
    requestAnimationFrame(() => {
      (
        document.querySelector(`[data-partner-master-row="${tab}-${index}"]`) as HTMLElement | null
      )?.focus();
    });
  };

  const selectRowAtFilteredIndex = (idx: number) => {
    const r = filtered[idx];
    if (!r) return;
    setSelectedId(r.id);
    setCreating(false);
    setEditing(false);
    setLocalError(null);
  };

  const firstCodeId = `pt-c-${tab}`;
  const keywordId = `pt-k-${tab}`;

  const readonlyCls = 'bg-muted/40 text-muted-foreground cursor-default';

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,42%)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        {errorText ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorText}
          </div>
        ) : null}
        <section className="glass-card rounded-2xl border border-border/80 p-4 shadow-sm">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">FILTER · {tabLabel}</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">搜尋</h2>
          <div className="mt-4">
            <Label htmlFor={`pt-k-${tab}`}>關鍵字</Label>
            <Input
              id={`pt-k-${tab}`}
              className="mt-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (saveConfirmOpen) return;
                if (e.key === 'ArrowDown' && filtered.length > 0) {
                  e.preventDefault();
                  selectRowAtFilteredIndex(0);
                  focusPartnerRow(0);
                }
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  document.getElementById(firstCodeId)?.focus();
                }
              }}
              placeholder="代碼、名稱、電話、備註…"
              autoComplete="off"
            />
          </div>
        </section>

        <section className="glass-card flex min-h-[420px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            <Button type="button" size="sm" onClick={onAdd} disabled={loading || saving}>
              新增
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void reloadAll()} disabled={loading}>
              重新載入
            </Button>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {loading ? '載入中…' : `共 ${filtered.length} 筆`}
            </span>
          </div>
          <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
            <div className="space-y-2">
              {filtered.map((r, i) => {
                const active = r.id === selectedId && !creating;
                return (
                  <button
                    key={r.id}
                    type="button"
                    tabIndex={-1}
                    data-partner-master-row={`${tab}-${i}`}
                    onClick={() => onRowClick(r.id)}
                    onKeyDown={(e) => {
                      if (saveConfirmOpen) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (i < filtered.length - 1) {
                          selectRowAtFilteredIndex(i + 1);
                          focusPartnerRow(i + 1);
                        } else {
                          document.getElementById(firstCodeId)?.focus();
                        }
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (i > 0) {
                          selectRowAtFilteredIndex(i - 1);
                          focusPartnerRow(i - 1);
                        } else {
                          document.getElementById(keywordId)?.focus();
                        }
                      }
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        document.getElementById(firstCodeId)?.focus();
                      }
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById(keywordId)?.focus();
                      }
                    }}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'border-primary/40 border-l-4 border-l-primary bg-primary/10 pl-2.5 ring-1 ring-primary/20'
                        : 'border-border/80 bg-muted/15 hover:bg-muted/30',
                    )}
                  >
                    <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {PARTNER_TYPE_OPTIONS.find((o) => o.value === r.partnerType)?.label ?? r.partnerType}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">此分類尚無資料。</p>
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
          if (e.key === 'ArrowLeft' && id === firstCodeId) {
            e.preventDefault();
            if (selectedFilteredIndex >= 0) focusPartnerRow(selectedFilteredIndex);
            else document.getElementById(keywordId)?.focus();
            return;
          }
          handleMasterFieldKeyDown(e, partnerFieldOrder, {
            enabled: true,
            onLastField: () => setSaveConfirmOpen(true),
          });
        }}
      >
        <p className="text-xs tracking-[0.35em] text-muted-foreground">DETAIL</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">往來明細</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`pt-c-${tab}`}>代碼</Label>
            <Input
              id={`pt-c-${tab}`}
              value={formValues.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-n-${tab}`}>名稱</Label>
            <Input
              id={`pt-n-${tab}`}
              value={formValues.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-pt-${tab}`}>類型</Label>
            <select
              id={`pt-pt-${tab}`}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                !creating && !editing && readonlyCls,
              )}
              value={formValues.partnerType}
              disabled={!creating && !editing}
              onChange={(e) => setDraft((d) => ({ ...d, partnerType: e.target.value as PartnerType }))}
            >
              {PARTNER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-cn-${tab}`}>聯絡人</Label>
            <Input
              id={`pt-cn-${tab}`}
              value={formValues.contactName}
              onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-p-${tab}`}>電話</Label>
            <Input
              id={`pt-p-${tab}`}
              value={formValues.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-m-${tab}`}>手機</Label>
            <Input
              id={`pt-m-${tab}`}
              value={formValues.mobile}
              onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-e-${tab}`}>Email</Label>
            <Input
              id={`pt-e-${tab}`}
              type="email"
              value={formValues.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-a-${tab}`}>地址</Label>
            <Input
              id={`pt-a-${tab}`}
              value={formValues.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pt-r-${tab}`}>備註（可填統編等）</Label>
            <Input
              id={`pt-r-${tab}`}
              value={formValues.remark}
              onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
              readOnly={!creating && !editing}
              className={!creating && !editing ? readonlyCls : undefined}
            />
          </div>
          <label htmlFor={`pt-active-${tab}`} className="flex items-center gap-2 text-sm">
            <input
              id={`pt-active-${tab}`}
              type="checkbox"
              className="size-4 accent-primary"
              checked={formValues.isActive}
              disabled={!creating && !editing}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
            />
            啟用
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {creating || editing ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!draft.code.trim()) return;
                  setSaveConfirmOpen(true);
                }}
                disabled={saving}
              >
                {saving ? '儲存中…' : '儲存'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
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
      onConfirm={() => void performSave()}
    />
    </>
  );
}

export function BasePartnerMasterView() {
  const [rows, setRows] = useState<PartnerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const r = await listPartners({ page: 1, pageSize: 500 });
      setRows(r.items);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  return (
    <Tabs defaultValue="vendor" className="w-full gap-4">
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="vendor" className="flex-1">
          廠商
        </TabsTrigger>
        <TabsTrigger value="customer" className="flex-1">
          客戶
        </TabsTrigger>
      </TabsList>
      <TabsContent value="vendor" className="mt-0 outline-none">
        <PartnerPanel
          tab="vendor"
          tabLabel="廠商"
          rows={rows}
          setRows={setRows}
          reloadAll={reloadAll}
          loading={loading}
          globalError={globalError}
        />
      </TabsContent>
      <TabsContent value="customer" className="mt-0 outline-none">
        <PartnerPanel
          tab="customer"
          tabLabel="客戶"
          rows={rows}
          setRows={setRows}
          reloadAll={reloadAll}
          loading={loading}
          globalError={globalError}
        />
      </TabsContent>
    </Tabs>
  );
}
