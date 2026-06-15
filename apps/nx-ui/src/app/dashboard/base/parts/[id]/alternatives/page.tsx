// apps/nx-ui/src/app/dashboard/base/parts/[id]/alternatives/page.tsx
// 02 對齊第二批前端收尾軌 FE-CP6 2026-06-07：通用件查詢 fan-out（總經理核心體驗）
//
// 業務範式：查一顆零件 → 列出同群組所有可替代零件 + 庫存合計
// 用途：銷貨單開單斷貨時、業務員快速找替代品
'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

import {
  fetchPartAlternatives,
  type PartAlternativesResponse,
} from '@data/endpoints/shared/part-compat/part-alternatives-api';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PartAlternativesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetchPartAlternatives(id)
      .then(setData)
      .catch((e) => setErr((e as Error)?.message ?? 'fetch failed'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/base/parts" className="text-xs text-[#888892] hover:text-[#E8E8EC]">
          ← 回零件主檔
        </Link>
      </div>
      <h1 className="text-base font-semibold text-[#E8E8EC]">通用件 / 替代品查詢</h1>

      {loading ? (
        <div className="text-xs text-[#888892]">載入中…</div>
      ) : err ? (
        <div className="rounded-md border border-[#E26060]/40 bg-[#E26060]/10 p-3 text-xs text-[#E26060]">
          {err}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="rounded-md border border-[#2A2A30] bg-[#0A0A0C] p-4">
            <div className="text-[10px] uppercase tracking-wider text-[#888892]">查詢零件</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-sm text-[#E8E8EC]">{data.sourcePart.code}</span>
              <span className="text-sm text-[#B8B8C0]">{data.sourcePart.name}</span>
            </div>
            <div className="mt-2 text-[11px] text-[#5A5A60]">
              屬於 {data.groupCount} 個通用件群組、共 {data.alternativeCount} 個可替代零件
            </div>
          </div>

          {data.groups.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#2A2A30] p-6 text-center text-xs text-[#5A5A60]">
              此零件未加入任何通用件群組、或屬群組為單向（A→B）查 A 不帶 B
              <div className="mt-2 text-[10px]">
                到「通用件群組基本資料」建立群組 → 加入此零件 + 替代品（雙向）
              </div>
            </div>
          ) : (
            data.groups.map((g) => (
              <section key={g.groupId} className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8A020]">
                    {g.groupCode} · {g.groupName}
                  </h2>
                  <span className="text-[10px] text-[#5A5A60]">
                    （此零件在群組內角色：{g.sourceRole === 1 ? '主件' : '替代品'}）
                  </span>
                </div>
                {g.members.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#2A2A30] p-3 text-xs text-[#5A5A60]">
                    此群組僅有此零件、未設替代品
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
                          <th className="px-3 py-2 text-right">庫存合計</th>
                          <th className="px-3 py-2 text-center">雙向</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1A20]">
                        {g.members.map((m) => (
                          <tr key={m.memberId}>
                            <td className="px-3 py-2">
                              {m.role === 1 ? (
                                <span className="rounded-full border border-[#22D88F]/40 bg-[#22D88F]/10 px-2 py-0.5 text-[9px] uppercase text-[#22D88F]">
                                  主件
                                </span>
                              ) : (
                                <span className="rounded-full border border-[#E8A020]/40 bg-[#E8A020]/10 px-2 py-0.5 text-[9px] uppercase text-[#E8A020]">
                                  替代品
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-[#E8E8EC]">{m.code}</td>
                            <td className="px-3 py-2 text-[#B8B8C0]">{m.name}</td>
                            <td className="px-3 py-2 text-right font-mono">{m.customPrice ?? '—'}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              <span className={Number(m.stockOnHand) > 0 ? 'text-[#22D88F]' : 'text-[#5A5A60]'}>
                                {m.stockOnHand}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">{m.isBidirectional ? '↔' : '→'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
