// apps/nx-ui/src/app/preview/components/page.tsx
//
// 基礎元件展示（v3.0.0 階段 4）
// 這些 primitives 幾乎每一頁都會用到，字級一改就是全站生效——所以要有地方看得到。
// ⛔ 假資料、不呼叫 API。

'use client';

import { Badge } from '@design/primitives/badge';
import { Button } from '@design/primitives/button';
import { Input } from '@design/primitives/input';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border py-4">
      <span className="w-28 shrink-0 text-[15px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function ComponentsPreviewPage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-8">
      <h1 className="text-2xl">基礎元件</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        每一頁都會用到，字級改一次全站生效。規格 §6：內文 15–16px 起跳。
      </p>

      <div className="mt-6 max-w-3xl">
        <Row label="按鈕">
          <Button>預設</Button>
          <Button variant="secondary">次要</Button>
          <Button variant="outline">外框</Button>
          <Button variant="destructive">刪除</Button>
          <Button variant="ghost">幽靈</Button>
        </Row>

        <Row label="按鈕尺寸">
          <Button size="sm">小</Button>
          <Button>預設</Button>
          <Button size="lg">大</Button>
        </Row>

        <Row label="輸入框">
          <Input placeholder="03L131512DS" className="w-64" />
          <Input placeholder="停用中" disabled className="w-40" />
        </Row>

        <Row label="標籤">
          <Badge>草稿</Badge>
          <Badge variant="secondary">已確認</Badge>
          <Badge variant="destructive">已取消</Badge>
          <Badge variant="outline">待撿貨</Badge>
        </Row>
      </div>
    </div>
  );
}
