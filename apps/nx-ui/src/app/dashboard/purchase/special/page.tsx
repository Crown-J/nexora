import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX02-SP-UI-001-F01
// 路由：/dashboard/purchase/special
// 性質：UI stub placeholder（Crown Q-U1=c、本軌純 backend、UI 獨立軌 backlog）
// 對應軌：TASK-NX02-IMPL-01 Phase 6（UI stub）+ TASK-NX02-IMPL-UI-01（UI 獨立軌）
export default function Nx02SpecialWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX02-SP-UI-001-F01"
      title="特殊採購"
      desc="掃貨採購（跳 RFQ 直接 PO、緊急/小額、A 軌 backend 已 closure、API：POST /nx02/po purchaseType=B、UI 獨立軌 TASK-NX02-IMPL-UI-01）"
    />
  );
}
