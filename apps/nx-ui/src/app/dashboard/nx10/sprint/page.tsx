// apps/nx-ui/src/app/dashboard/nx10/sprint/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-SPRINT-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-SPRINT-UI-001-F01"
      title="衝刺挑戰 ⭐（八角驅動力 #6 稀缺）"
      desc="3 sprintType：WS 週衝刺 (×2 倍 Exp) / ME 月末衝刺 (×1.5) / QR 季度排行 (×3)。限時挑戰 + 創造緊迫感。API：GET /nx10/sprint/active + /me + /:id / HR_ADMIN：POST + PATCH"
    />
  );
}
