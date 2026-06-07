// apps/nx-ui/src/features/shared/part-compat/GroupMemberManager.tsx
// 02 對齊第二批前端收尾軌 FE-CP5 2026-06-07：通用件群組成員編輯介面（總經理最要）
//
// 業務範式：
//   - PRIMARY 主件（通常 1 筆、業務員指定的「原廠 / 主要件」）
//   - ALT 替代品（多筆）
//   - 各自 customPrice（null = 用 part 預設、有值 = 群組覆寫）
//   - isBidirectional：true = A↔B 互為替代品；false = 單向（A→B）
'use client';

import { useCallback, useEffect, useState } from 'react';

import { listParts } from '@/features/base/api/part';
import type { PartDto } from '@/features/base/api/part';

import {
  addGroupMember,
  listGroupMembers,
  removeGroupMember,
  updateGroupMember,
  type CompatMemberRow,
  type CompatRole,
} from './part-compat-group-api';

const btnPrimary =
  'rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-3 py-1.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50';
const btnSecondary =
  'rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 py-1.5 text-xs font-medium text-[#888892] hover:text-[#E8E8EC]';
const btnDanger =
  'rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-2 py-1 text-[10px] font-medium text-[#E26060] hover:bg-[#E26060]/20';

const fieldCls =
  'h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC] focus:border-[#22D88F]/40 focus:outline-none';

type EditingMember = {
  id?: string;
  partId: string;
  role: CompatRole;
  customPrice: string;
  isBidirectional: boolean;
  remark: string;
};

export function GroupMemberManager({ groupId }: { groupId: string }) {
  const [rows, setRows] = useState<CompatMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingMember | null>(null);
  const [partSearch, setPartSearch] = useState('');
  const [partResults, setPartResults] = useState<PartDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await listGroupMembers(groupId));
    } catch (e) {
      setErr((e as Error)?.message ?? 'load failed');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // part picker search
  useEffect(() => {
    if (!editing || editing.id) return; // 編輯時不重抓 part
    const q = partSearch.trim();
    if (!q) {
      setPartResults([]);
      return;
    }
    const t = setTimeout(() => {
      void listParts({ q, pageSize: 10, isActive: true })
        .then((p) => setPartResults(p.items))
        .catch(() => setPartResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [partSearch, editing]);

  const startAdd = () => {
    setEditing({ partId: '', role: 2, customPrice: '', isBidirectional: true, remark: '' });
    setPartSearch('');
    setPartResults([]);
  };

  const startEdit = (r: CompatMemberRow) => {
    setEditing({
      id: r.id,
      partId: r.partId,
      role: r.role,
      customPrice: r.customPrice ?? '',
      isBidirectional: r.isBidirectional,
      remark: r.remark ?? '',
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.partId.trim()) {
      setErr('請選擇零件');
      return;
    }
    setErr(null);
    const priceNum = editing.customPrice.trim() ? Number(editing.customPrice) : null;
    if (priceNum !== null && !Number.isFinite(priceNum)) {
      setErr('專屬售價必須是數字');
      return;
    }
    try {
      if (editing.id) {
        await updateGroupMember(groupId, editing.id, {
          role: editing.role,
          customPrice: priceNum,
          isBidirectional: editing.isBidirectional,
          remark: editing.remark || null,
        });
      } else {
        await addGroupMember(groupId, {
          partId: editing.partId,
          role: editing.role,
          customPrice: priceNum ?? undefined,
          isBidirectional: editing.isBidirectional,
          remark: editing.remark || null,
        });
      }
      setEditing(null);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'save failed');
    }
  };

  const remove = async (r: CompatMemberRow) => {
    if (!confirm(`從群組移除「${r.part?.name ?? r.partId}」？`)) return;
    setErr(null);
    try {
      await removeGroupMember(groupId, r.id);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'delete failed');
    }
  };

  if (loading) return <div className="p-4 text-xs text-[#888892]">載入成員中…</div>;

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 p-3 text-xs text-[#E26060]">{err}</div>
      ) : null}

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
          群組成員（{rows.length} 筆、主件 / 替代品互為通用）
        </h3>
        <button type="button" className={btnPrimary} onClick={startAdd}>
          + 加入零件
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#2A2A30] p-4 text-xs text-[#5A5A60]">
          尚未加入成員、點上方按鈕新增
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-[#2A2A30]">
          <table className="w-full text-xs">
            <thead className="bg-[#0E0E12] text-[10px] uppercase tracking-wider text-[#888892]">
              <tr>
                <th className="px-3 py-2 text-left">角色</th>
                <th className="px-3 py-2 text-left">料號</th>
                <th className="px-3 py-2 text-left">品名</th>
                <th className="px-3 py-2 text-right">專屬售價</th>
                <th className="px-3 py-2 text-center">雙向</th>
                <th className="px-3 py-2 text-left">備註</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A20]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    {r.role === 1 ? (
                      <span className="rounded-full border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 py-0.5 text-[9px] uppercase text-[#22D88F]">
                        主件
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#E8A020]/40 bg-[#E8A020]/10 px-2 py-0.5 text-[9px] uppercase text-[#E8A020]">
                        替代品
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.part?.code ?? r.partId}</td>
                  <td className="px-3 py-2">{r.part?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.customPrice ?? '—'}</td>
                  <td className="px-3 py-2 text-center">{r.isBidirectional ? '↔' : '→'}</td>
                  <td className="px-3 py-2 text-[#888892]">{r.remark ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="text-xs text-[#22D88F] hover:underline" onClick={() => startEdit(r)}>
                        編輯
                      </button>
                      <button type="button" className={btnDanger} onClick={() => void remove(r)}>
                        移除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 編輯 / 新增 dialog */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#2A2A30] bg-[#16161B] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#E8E8EC]">
              {editing.id ? '編輯成員' : '加入零件'}
            </h2>
            <div className="space-y-3">
              {!editing.id ? (
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">
                    零件搜尋（料號 / 品名）
                  </label>
                  <input
                    type="text"
                    className={fieldCls}
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    placeholder="輸入料號或品名關鍵字…"
                  />
                  {partResults.length > 0 ? (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-[#2A2A30] bg-[#0A0A0C]">
                      {partResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`block w-full text-left px-3 py-2 text-xs hover:bg-[#22D88F]/10 ${
                            editing.partId === p.id ? 'bg-[#22D88F]/20 text-[#22D88F]' : 'text-[#E8E8EC]'
                          }`}
                          onClick={() => setEditing({ ...editing, partId: p.id })}
                        >
                          <span className="font-mono">{p.code}</span> · {p.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {editing.partId ? (
                    <div className="mt-2 text-[11px] text-[#22D88F]">已選擇 partId: {editing.partId}</div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">角色</label>
                  <select
                    className={fieldCls}
                    value={editing.role}
                    onChange={(e) => setEditing({ ...editing, role: Number(e.target.value) as CompatRole })}
                  >
                    <option value={1}>主件 PRIMARY</option>
                    <option value={2}>替代品 ALT</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">
                    專屬售價（留空=用 part 預設）
                  </label>
                  <input
                    type="text"
                    className={fieldCls}
                    value={editing.customPrice}
                    onChange={(e) => setEditing({ ...editing, customPrice: e.target.value })}
                    placeholder="例：120"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-[#E8E8EC]">
                  <input
                    type="checkbox"
                    checked={editing.isBidirectional}
                    onChange={(e) => setEditing({ ...editing, isBidirectional: e.target.checked })}
                  />
                  雙向替代（↔；不勾=單向 A→B）
                </label>
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">備註</label>
                <input
                  type="text"
                  className={fieldCls}
                  value={editing.remark}
                  onChange={(e) => setEditing({ ...editing, remark: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>
                取消
              </button>
              <button type="button" className={btnPrimary} onClick={() => void save()}>
                儲存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
