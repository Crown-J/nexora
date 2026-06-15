// apps/nx-ui/src/features/nx01/vehicle-classification/ui/TransmissionMasterView.tsx
// 變速箱型錄 UI（含 transmissionType enum 下拉 + gearCount + carBrandId）
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createTransmission,
  listTransmission,
  softDeleteTransmission,
  updateTransmission,
} from '../api/transmission';
import {
  TRANSMISSION_TYPE_OPTIONS,
  transmissionTypeLabel,
  type TransmissionDto,
} from '@data/types/base/vehicle-classification';

type Draft = {
  code: string;
  name: string;
  nameEn: string;
  transmissionType: number;
  gearCount: string;
  carBrandId: string;
  remark: string;
  sortNo: string;
  isActive: boolean;
};

const PAGE_SIZE = 20;

function emptyDraft(): Draft {
  return {
    code: '',
    name: '',
    nameEn: '',
    transmissionType: 2,
    gearCount: '',
    carBrandId: '',
    remark: '',
    sortNo: '0',
    isActive: true,
  };
}

function fromRow(r: TransmissionDto): Draft {
  return {
    code: r.code,
    name: r.name,
    nameEn: r.nameEn ?? '',
    transmissionType: r.transmissionType,
    gearCount: r.gearCount?.toString() ?? '',
    carBrandId: r.carBrandId ?? '',
    remark: r.remark ?? '',
    sortNo: r.sortNo.toString(),
    isActive: r.isActive,
  };
}

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

export function TransmissionMasterView() {
  const [rows, setRows] = useState<TransmissionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listTransmission({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        transmissionType: typeof typeFilter === 'number' ? typeFilter : undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const isEmpty = !loading && rows.length === 0;

  const onAdd = () => {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const onEdit = (row: TransmissionDto) => {
    setCreating(false);
    setEditingId(row.id);
    setDraft(fromRow(row));
  };

  const onCancel = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const buildBody = () => {
    const gc = draft.gearCount.trim();
    const sort = Number.parseInt(draft.sortNo, 10);
    return {
      code: draft.code.trim(),
      name: draft.name.trim(),
      nameEn: draft.nameEn.trim() || null,
      transmissionType: draft.transmissionType,
      gearCount: gc === '' ? null : Number.parseInt(gc, 10),
      carBrandId: draft.carBrandId.trim() || null,
      remark: draft.remark.trim() || null,
      sortNo: Number.isFinite(sort) ? sort : 0,
      isActive: draft.isActive,
    };
  };

  const onSave = async () => {
    if (!draft.code.trim() || !draft.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        await createTransmission(buildBody());
      } else if (editingId) {
        await updateTransmission(editingId, buildBody());
      }
      setCreating(false);
      setEditingId(null);
      setDraft(emptyDraft());
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const onSoftDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await softDeleteTransmission(id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '停用失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={onAdd} disabled={loading || saving}>
            <Plus className="size-4" aria-hidden /> 新增變速箱
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9"
            onClick={() => void reload()}
            disabled={loading}
            aria-label="重新載入"
          >
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
          </Button>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜尋變速箱代碼 / 名稱…"
            autoComplete="off"
            className="h-9 min-w-[12rem] flex-1 basis-[min(100%,16rem)]"
          />
          <select
            value={typeFilter === '' ? '' : String(typeFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setTypeFilter(v === '' ? '' : Number(v));
              setPage(1);
            }}
            className={`${selectCls} w-32`}
            aria-label="變速箱類型篩選"
          >
            <option value="">所有類型</option>
            {TRANSMISSION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            {loading ? '載入中…' : `共 ${total} 筆`}
          </span>
        </div>
      </section>

      <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-2.5">代碼</th>
              <th className="px-2 py-2.5">名稱</th>
              <th className="px-2 py-2.5">類型</th>
              <th className="px-2 py-2.5">檔位</th>
              <th className="px-2 py-2.5">關聯品牌</th>
              <th className="px-2 py-2.5">啟用</th>
              <th className="w-20 px-2 py-2.5" aria-label="動作" />
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center text-muted-foreground">
                  變速箱清單為空。請點「新增變速箱」建立、或檢查系統 seed 是否已 apply。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-2 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2 text-xs">{transmissionTypeLabel(row.transmissionType)}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground tabular-nums">
                    {row.gearCount ?? '—'}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {row.carBrandCode ? `${row.carBrandCode} ${row.carBrandName ?? ''}` : '—'}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {row.isActive ? (
                      <span className="text-primary">啟用</span>
                    ) : (
                      <span className="text-muted-foreground">停用</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => onEdit(row)}
                      aria-label="編輯"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>第 {page} / {totalPages} 頁</span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一頁
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一頁
            </Button>
          </div>
        </div>
      </section>

      {(creating || editingId) ? (
        <section className="glass-card nx-glass-raised rounded-2xl border border-primary/40 p-4">
          <h2 className="mb-3 text-sm font-semibold">{creating ? '新增變速箱' : '編輯變速箱'}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-code">代碼</Label>
              <Input
                id="tx-code"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                maxLength={30}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-name">中文名</Label>
              <Input
                id="tx-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={100}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-namen">英文名</Label>
              <Input
                id="tx-namen"
                value={draft.nameEn}
                onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))}
                maxLength={100}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-type">類型 *</Label>
              <select
                id="tx-type"
                value={String(draft.transmissionType)}
                onChange={(e) => setDraft((d) => ({ ...d, transmissionType: Number(e.target.value) }))}
                className={selectCls}
              >
                {TRANSMISSION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-gear">檔位數（CVT 可空）</Label>
              <Input
                id="tx-gear"
                value={draft.gearCount}
                onChange={(e) => setDraft((d) => ({ ...d, gearCount: e.target.value }))}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-brand">關聯品牌 ID（可空）</Label>
              <Input
                id="tx-brand"
                value={draft.carBrandId}
                onChange={(e) => setDraft((d) => ({ ...d, carBrandId: e.target.value }))}
                placeholder="NX01CABR0000001（A065 後續軌升級下拉）"
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-sort">排序</Label>
              <Input
                id="tx-sort"
                value={draft.sortNo}
                onChange={(e) => setDraft((d) => ({ ...d, sortNo: e.target.value }))}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="tx-remark">備註</Label>
              <Input
                id="tx-remark"
                value={draft.remark}
                onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                maxLength={200}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              />
              啟用
            </label>
            <div className="ms-auto flex gap-2">
              {editingId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onSoftDelete(editingId)}
                  disabled={saving}
                >
                  停用
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving}>
                {saving ? '儲存中…' : '儲存'}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
