/**
 * 公告主檔（列表）：GET /nx01/bulletins
 */
'use client';

import { useEffect, useState } from 'react';
import { fetchAllPages } from '@/shared/api/fetchAllPages';
import { BaseMasterPageHeader } from '@/features/base/shell/BaseMasterPageHeader';
import { listBulletins, type BulletinDto } from '@/features/base/api/bulletin';

function formatDt(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}

export default function BaseBulletinsPage() {
  const [rows, setRows] = useState<BulletinDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const items = await fetchAllPages((page, pageSize) => listBulletins({ page, pageSize }), {
          pageSize: 100,
          maxPages: 50,
        });
        if (!alive) return;
        setRows(items);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : '載入失敗');
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="w-full min-w-0 space-y-6">
      <BaseMasterPageHeader
        title="公告主檔"
        description="租戶內公告列表（維護 API 已於 nx01/bulletins；此頁為唯讀列表）。"
      />
      {err ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </div>
      ) : null}
      <section className="glass-card nx-glass-raised rounded-2xl border border-border/80 p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">載入中…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無公告資料。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="nx-master-table w-full border-collapse text-sm">
              <thead>
                <tr className="nx-master-thead-row text-left text-muted-foreground">
                  <th className="px-2 py-2">置頂</th>
                  <th className="px-2 py-2">類型</th>
                  <th className="px-2 py-2">標題</th>
                  <th className="px-2 py-2">到期</th>
                  <th className="px-2 py-2">啟用</th>
                  <th className="px-2 py-2">建立時間</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="nx-master-tbody-row border-t border-border/60">
                    <td className="px-2 py-2 text-xs">{b.isPinned ? '是' : '否'}</td>
                    <td className="px-2 py-2 font-mono text-xs">{b.type}</td>
                    <td className="px-2 py-2">{b.title}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{formatDt(b.expiredAt)}</td>
                    <td className="px-2 py-2 text-xs">{b.isActive ? '是' : '否'}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{formatDt(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
