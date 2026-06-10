// apps/nx-ui/src/app/dashboard/delivery/sign/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX06-SIGN-UI-001-F01
// 路由：/dashboard/delivery/sign
// 性質：UI stub placeholder（TASK-NX06-IMPL-01 Phase 5、UI 獨立軌 backlog）
export default function Nx06SignWorkspacePage() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX06-SIGN-UI-001-F01"
      title="電子簽收工作台"
      desc="外務員 App 簽收（signerType=C 客戶 / W 倉管 / N 不需）+ signatureUrl 雲端存儲、API：PATCH /nx06/delivery/:id（signature 區段）、UI 獨立軌 TASK-NX06-IMPL-UI-01"
    />
  );
}
