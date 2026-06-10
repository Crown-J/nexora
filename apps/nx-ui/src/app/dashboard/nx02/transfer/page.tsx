// apps/nx-ui/src/app/dashboard/nx02/transfer/page.tsx
// ROUTE-REALIGN 段 4-3：nx02 → purchase/inventory 業務名化
// ⚠️ 桌面版 TransferListView 暫失 URL、redirect 到既存 inventory/transfer
//   (手機版 MobileTransferListPage)
// 後續 task 由 CTO 拍板：桌面/手機 transfer 是否整合 responsive、或各自 URL

import { redirect } from 'next/navigation';

export default function Nx02TransferRedirect(): never {
  redirect('/dashboard/inventory/transfer');
}
