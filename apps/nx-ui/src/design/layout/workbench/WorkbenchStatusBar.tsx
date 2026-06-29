// apps/nx-ui/src/design/layout/workbench/WorkbenchStatusBar.tsx
// 傳統 ERP 底部狀態列：公司 · 使用者 · 日期時間 · 版本。

'use client';

import { useEffect, useState } from 'react';
import { Building2, User } from 'lucide-react';

type Props = {
  tenantName: string;
  displayName: string;
  employeeNo: string;
};

export function WorkbenchStatusBar({ tenantName, displayName, employeeNo }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only 時鐘初始化
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stamp = now
    ? `${now.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })} ${now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`
    : '—';

  return (
    <div className="hidden items-center gap-4 border-t border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground md:flex">
      <span className="flex items-center gap-1.5">
        <Building2 className="h-3 w-3" />
        {tenantName}
      </span>
      <span className="flex items-center gap-1.5">
        <User className="h-3 w-3" />
        {displayName}
        {employeeNo ? <span className="text-muted-foreground/70">（{employeeNo}）</span> : null}
      </span>
      <div className="flex-1" />
      <span className="font-mono tabular-nums">{stamp}</span>
      <span className="text-muted-foreground/60">NEXORA GRID v1.5.1</span>
    </div>
  );
}
