// apps/nx-ui/src/features/nx01/model/ui/ModelMasterView.tsx
// 對應規格：docs/nx01/spec/intent/nx01-13-model.md v1.0 §2
// 簡化版車型主檔 UI（5 FK 暫填 ID 字串、A065 後續軌升級下拉聯動）
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createModel,
  listModel,
  softDeleteModel,
  updateModel,
} from '@data/endpoints/base/model/api/model';
import { formatYearRange, type ModelDto } from '@data/types/base/model';

type Draft = {
  code: string;
  name: string;
  carBrandId: string;
  modelYearFrom: string;
  modelYearTo: string;
  engineId: string;
  transmissionId: string;
  drivetrainId: string;
  modelTypeId: string;
  remark: string;
  sortNo: string;
  isActive: boolean;
};

const PAGE_SIZE = 20;

function emptyDraft(): Draft {
  return {
    code: '',
    name: '',
    carBrandId: '',
    modelYearFrom: String(new Date().getFullYear()),
    modelYearTo: '',
    engineId: '',
    transmissionId: '',
    drivetrainId: '',
    modelTypeId: '',
    remark: '',
    sortNo: '0',
    isActive: true,
  };
}

function fromRow(r: ModelDto): Draft {
  return {
    code: r.code,
    name: r.name,
    carBrandId: r.carBrandId,
    modelYearFrom: r.modelYearFrom.toString(),
    modelYearTo: r.modelYearTo?.toString() ?? '',
    engineId: r.engineId ?? '',
    transmissionId: r.transmissionId ?? '',
    drivetrainId: r.drivetrainId ?? '',
    modelTypeId: r.modelTypeId ?? '',
    remark: r.remark ?? '',
    sortNo: r.sortNo.toString(),
    isActive: r.isActive,
  };
}

export function ModelMasterView() {
  const [rows, setRows] = useState<ModelDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [carBrandFilter, setCarBrandFilter] = useState('');
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
      const result = await listModel({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        carBrandId: carBrandFilter.trim() || undefined,
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
  }, [page, search, carBrandFilter]);

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

  const onEdit = (row: ModelDto) => {
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
    const yfFrom = Number.parseInt(draft.modelYearFrom.trim(), 10);
    const yfToRaw = draft.modelYearTo.trim();
    const yfTo = yfToRaw === '' ? null : Number.parseInt(yfToRaw, 10);
    const sort = Number.parseInt(draft.sortNo, 10);
    return {
      code: draft.code.trim(),
      name: draft.name.trim(),
      carBrandId: draft.carBrandId.trim(),
      modelYearFrom: yfFrom,
      modelYearTo: yfTo,
      engineId: draft.engineId.trim() || null,
      transmissionId: draft.transmissionId.trim() || null,
      drivetrainId: draft.drivetrainId.trim() || null,
      modelTypeId: draft.modelTypeId.trim() || null,
      remark: draft.remark.trim() || null,
      sortNo: Number.isFinite(sort) ? sort : 0,
      isActive: draft.isActive,
    };
  };

  const onSave = async () => {
    if (!draft.code.trim() || !draft.name.trim() || !draft.carBrandId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        await createModel(buildBody());
      } else if (editingId) {
        await updateModel(editingId, buildBody());
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
      await softDeleteModel(id);
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
            <Plus className="size-4" aria-hidden /> 新增車型
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
            placeholder="搜尋車型代碼 / 全名…"
            autoComplete="off"
            className="h-9 min-w-[12rem] flex-1 basis-[min(100%,16rem)]"
          />
          <Input
            value={carBrandFilter}
            onChange={(e) => {
              setCarBrandFilter(e.target.value);
              setPage(1);
            }}
            placeholder="品牌 ID 篩選"
            autoComplete="off"
            className="h-9 w-40"
          />
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            {loading ? '載入中…' : `共 ${total} 個車型`}
          </span>
        </div>
      </section>

      <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-2.5">代碼</th>
              <th className="px-2 py-2.5">全名</th>
              <th className="px-2 py-2.5">品牌</th>
              <th className="px-2 py-2.5">年份</th>
              <th className="px-2 py-2.5">引擎</th>
              <th className="px-2 py-2.5">變速箱</th>
              <th className="px-2 py-2.5">啟用</th>
              <th className="w-20 px-2 py-2.5" aria-label="動作" />
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">
                  車型主檔為空。請點「新增車型」開始建立。
                  <br />
                  <span className="text-[11px]">（規格 §4.3：空表進、OWNER 自加業務日常車型）</span>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-2 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {row.carBrandCode ?? '—'}
                  </td>
                  <td className="px-2 py-2 text-xs tabular-nums">
                    {formatYearRange(row.modelYearFrom, row.modelYearTo)}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {row.engineCode ?? '—'}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {row.transmissionCode ?? '—'}
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
          <h2 className="mb-3 text-sm font-semibold">{creating ? '新增車型' : '編輯車型'}</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            ⚠️ 5 個 FK 暫填 ID 字串（A065 後續軌升級下拉聯動：選 carBrand 後 engine/transmission 依品牌篩選）
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="md-code">車型代碼 *（如 G7-GTI）</Label>
              <Input
                id="md-code"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                maxLength={30}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-name">車型全名 *（如 Golf 7 GTI）</Label>
              <Input
                id="md-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={100}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-brand">車型品牌 ID *</Label>
              <Input
                id="md-brand"
                value={draft.carBrandId}
                onChange={(e) => setDraft((d) => ({ ...d, carBrandId: e.target.value }))}
                placeholder="NX01CABR0000001"
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-yfrom">起始年份 *（如 2017）</Label>
              <Input
                id="md-yfrom"
                value={draft.modelYearFrom}
                onChange={(e) => setDraft((d) => ({ ...d, modelYearFrom: e.target.value }))}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-yto">結束年份（現役留空）</Label>
              <Input
                id="md-yto"
                value={draft.modelYearTo}
                onChange={(e) => setDraft((d) => ({ ...d, modelYearTo: e.target.value }))}
                placeholder="如 2024（現役留空）"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-sort">排序</Label>
              <Input
                id="md-sort"
                value={draft.sortNo}
                onChange={(e) => setDraft((d) => ({ ...d, sortNo: e.target.value }))}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-engine">引擎 ID（可空）</Label>
              <Input
                id="md-engine"
                value={draft.engineId}
                onChange={(e) => setDraft((d) => ({ ...d, engineId: e.target.value }))}
                placeholder="NX01ENGN0000001"
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-tx">變速箱 ID（可空）</Label>
              <Input
                id="md-tx"
                value={draft.transmissionId}
                onChange={(e) => setDraft((d) => ({ ...d, transmissionId: e.target.value }))}
                placeholder="NX01TRMS0000001"
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-dt">傳動 ID（可空）</Label>
              <Input
                id="md-dt"
                value={draft.drivetrainId}
                onChange={(e) => setDraft((d) => ({ ...d, drivetrainId: e.target.value }))}
                placeholder="NX01DTRN0000001"
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-mt">車體類型 ID（可空）</Label>
              <Input
                id="md-mt"
                value={draft.modelTypeId}
                onChange={(e) => setDraft((d) => ({ ...d, modelTypeId: e.target.value }))}
                placeholder="NX01MDTP0000001"
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="md-remark">備註</Label>
              <Input
                id="md-remark"
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
