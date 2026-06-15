// apps/nx-ui/src/features/nx01/customer-grade/ui/CustomerGradeMasterView.tsx
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0 §2 / §6
// Crown 拍 Q1=A：OWNER 可改 marginPct + name + sortNo + isActive、code 鎖（read-only）
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listCustomerGrade, updateCustomerGrade } from '@data/endpoints/base/customer-grade/api/customer-grade';
import type { CustomerGradeDto } from '@data/types/base/customer-grade';

type Draft = {
  name: string;
  marginPct: string;
  sortNo: string;
  isActive: boolean;
};

function fromRow(r: CustomerGradeDto): Draft {
  return {
    name: r.name,
    marginPct: r.marginPct ?? '',
    sortNo: r.sortNo.toString(),
    isActive: r.isActive,
  };
}

export function CustomerGradeMasterView() {
  const [rows, setRows] = useState<CustomerGradeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    name: '',
    marginPct: '',
    sortNo: '0',
    isActive: true,
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCustomerGrade({ page: 1, pageSize: 100 });
      setRows(result.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onEdit = (row: CustomerGradeDto) => {
    setEditingId(row.id);
    setDraft(fromRow(row));
  };

  const onCancel = () => {
    setEditingId(null);
  };

  const onSave = async () => {
    if (!editingId) return;
    if (!draft.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const sort = Number.parseInt(draft.sortNo, 10);
      await updateCustomerGrade(editingId, {
        name: draft.name.trim(),
        marginPct: draft.marginPct.trim() || undefined,
        sortNo: Number.isFinite(sort) ? sort : 0,
        isActive: draft.isActive,
      });
      setEditingId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
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
          <span className="text-xs text-muted-foreground">
            ⓘ A/B/C/D 4 級固定、由 seed 維護；可改最低毛利率 / 名稱 / 排序 / 啟用
          </span>
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            {loading ? '載入中…' : `共 ${rows.length} 級`}
          </span>
        </div>
      </section>

      <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-2.5">代碼</th>
              <th className="px-2 py-2.5">名稱</th>
              <th className="px-2 py-2.5">最低毛利率（%）</th>
              <th className="px-2 py-2.5">排序</th>
              <th className="px-2 py-2.5">啟用</th>
              <th className="w-20 px-2 py-2.5" aria-label="動作" />
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                  尚無客戶分級資料。請執行 seed apply（applyCustomerGrade）建立 A/B/C/D 4 級。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-2 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2 tabular-nums">{row.marginPct ?? '—'}</td>
                  <td className="px-2 py-2 text-xs tabular-nums">{row.sortNo}</td>
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
      </section>

      {editingId ? (
        <section className="glass-card nx-glass-raised rounded-2xl border border-primary/40 p-4">
          <h2 className="mb-3 text-sm font-semibold">
            編輯客戶分級
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              （代碼鎖定、僅可改 marginPct / 名稱 / 排序 / 啟用）
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="cg-name">名稱</Label>
              <Input
                id="cg-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={50}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cg-margin">最低毛利率（%、例 15.0）</Label>
              <Input
                id="cg-margin"
                value={draft.marginPct}
                onChange={(e) => setDraft((d) => ({ ...d, marginPct: e.target.value }))}
                inputMode="decimal"
                placeholder="15.0"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cg-sort">排序</Label>
              <Input
                id="cg-sort"
                value={draft.sortNo}
                onChange={(e) => setDraft((d) => ({ ...d, sortNo: e.target.value }))}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                啟用
              </label>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <p className="text-[11px] text-muted-foreground">
              ⓘ 規格 §6 Q1=A：marginPct 是業務「最低毛利率」、影響 NX02 報價 / NX04 銷貨檢核
            </p>
            <div className="ms-auto flex gap-2">
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
