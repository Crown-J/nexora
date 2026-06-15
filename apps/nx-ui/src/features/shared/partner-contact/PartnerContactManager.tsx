// apps/nx-ui/src/features/shared/partner-contact/PartnerContactManager.tsx
// 02 第三批 T2 2026-06-07：partner 聯絡窗口編輯介面
'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createPartnerContact,
  deletePartnerContact,
  listPartnerContacts,
  updatePartnerContact,
  type PartnerContactRow,
} from '@data/endpoints/shared/partner-contact/partner-contact-api';

const btnPrimary =
  'rounded-md border border-[#22D88F]/40 bg-[#22D88F]/10 px-3 py-1.5 text-xs font-medium text-[#22D88F] hover:bg-[#22D88F]/20 disabled:opacity-50';
const btnSecondary =
  'rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 py-1.5 text-xs font-medium text-[#888892] hover:text-[#E8E8EC]';
const btnDanger =
  'rounded-md border border-[#E26060]/40 bg-[#E26060]/10 px-2 py-1 text-[10px] font-medium text-[#E26060] hover:bg-[#E26060]/20';
const fieldCls =
  'h-9 w-full rounded-md border border-[#2A2A30] bg-[#0A0A0C] px-3 text-sm text-[#E8E8EC] focus:border-[#22D88F]/40 focus:outline-none';

type Editing = {
  id?: string;
  contactName: string;
  jobTitle: string;
  phone: string;
  phoneExt: string;
  mobile: string;
  email: string;
  note: string;
  sortNo: number;
};

const empty = (): Editing => ({
  contactName: '',
  jobTitle: '',
  phone: '',
  phoneExt: '',
  mobile: '',
  email: '',
  note: '',
  sortNo: 0,
});

export function PartnerContactManager({ partnerId }: { partnerId: string }) {
  const [rows, setRows] = useState<PartnerContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await listPartnerContacts(partnerId));
    } catch (e) {
      setErr((e as Error)?.message ?? 'load failed');
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startAdd = () => setEditing(empty());
  const startEdit = (r: PartnerContactRow) =>
    setEditing({
      id: r.id,
      contactName: r.contactName,
      jobTitle: r.jobTitle ?? '',
      phone: r.phone ?? '',
      phoneExt: r.phoneExt ?? '',
      mobile: r.mobile ?? '',
      email: r.email ?? '',
      note: r.note ?? '',
      sortNo: r.sortNo,
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.contactName.trim()) {
      setErr('窗口姓名必填');
      return;
    }
    setErr(null);
    const body = {
      contactName: editing.contactName.trim(),
      jobTitle: editing.jobTitle.trim() || null,
      phone: editing.phone.trim() || null,
      phoneExt: editing.phoneExt.trim() || null,
      mobile: editing.mobile.trim() || null,
      email: editing.email.trim() || null,
      note: editing.note.trim() || null,
      sortNo: editing.sortNo,
    };
    try {
      if (editing.id) {
        await updatePartnerContact(partnerId, editing.id, body);
      } else {
        await createPartnerContact(partnerId, body);
      }
      setEditing(null);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'save failed');
    }
  };

  const remove = async (r: PartnerContactRow) => {
    if (!confirm(`刪除窗口「${r.contactName}」？`)) return;
    setErr(null);
    try {
      await deletePartnerContact(partnerId, r.id);
      await reload();
    } catch (e) {
      setErr((e as Error)?.message ?? 'delete failed');
    }
  };

  if (loading) return <div className="p-4 text-xs text-[#888892]">載入聯絡窗口中…</div>;

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 p-3 text-xs text-[#E26060]">{err}</div>
      ) : null}

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888892]">
          聯絡窗口（{rows.length} 筆、可多筆、可排序）
        </h3>
        <button type="button" className={btnPrimary} onClick={startAdd}>
          + 新增窗口
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#2A2A30] p-4 text-xs text-[#5A5A60]">
          尚未設定窗口、點上方新增
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-[#2A2A30]">
          <table className="w-full text-xs">
            <thead className="bg-[#0E0E12] text-[10px] uppercase tracking-wider text-[#888892]">
              <tr>
                <th className="px-3 py-2 text-left">姓名</th>
                <th className="px-3 py-2 text-left">職務/部門</th>
                <th className="px-3 py-2 text-left">電話/分機</th>
                <th className="px-3 py-2 text-left">手機</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">備註</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A20]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium text-[#E8E8EC]">{r.contactName}</td>
                  <td className="px-3 py-2 text-[#B8B8C0]">{r.jobTitle ?? '—'}</td>
                  <td className="px-3 py-2 text-[#B8B8C0]">
                    {r.phone ?? '—'}
                    {r.phoneExt ? ` #${r.phoneExt}` : ''}
                  </td>
                  <td className="px-3 py-2 text-[#B8B8C0]">{r.mobile ?? '—'}</td>
                  <td className="px-3 py-2 text-[#B8B8C0]">{r.email ?? '—'}</td>
                  <td className="px-3 py-2 text-[#888892]">{r.note ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="text-xs text-[#22D88F] hover:underline" onClick={() => startEdit(r)}>
                        編輯
                      </button>
                      <button type="button" className={btnDanger} onClick={() => void remove(r)}>
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#2A2A30] bg-[#16161B] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#E8E8EC]">
              {editing.id ? '編輯' : '新增'}聯絡窗口
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">窗口姓名 *</label>
                <input
                  className={fieldCls}
                  value={editing.contactName}
                  onChange={(e) => setEditing({ ...editing, contactName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">職務 / 部門</label>
                <input
                  className={fieldCls}
                  value={editing.jobTitle}
                  onChange={(e) => setEditing({ ...editing, jobTitle: e.target.value })}
                  placeholder="例：採購副理 / 業務經理"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">電話</label>
                <input
                  className={fieldCls}
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">分機</label>
                <input
                  className={fieldCls}
                  value={editing.phoneExt}
                  onChange={(e) => setEditing({ ...editing, phoneExt: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">手機</label>
                <input
                  className={fieldCls}
                  value={editing.mobile}
                  onChange={(e) => setEditing({ ...editing, mobile: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">Email</label>
                <input
                  className={fieldCls}
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">排序</label>
                <input
                  type="number"
                  className={fieldCls}
                  value={editing.sortNo}
                  onChange={(e) => setEditing({ ...editing, sortNo: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#888892]">備註</label>
                <textarea
                  className={`${fieldCls} h-16 py-2`}
                  value={editing.note}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
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
