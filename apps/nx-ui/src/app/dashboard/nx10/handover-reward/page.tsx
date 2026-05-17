// apps/nx-ui/src/app/dashboard/nx10/handover-reward/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-HANDOVER-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-HANDOVER-UI-001-F01"
      title="動態交接獎勵 ⭐⭐⭐（業界改革 #5 社交、自動 wire）"
      desc="NX06 DnHandover 進入 COMPLETED → 雙方外務員（fromDriver + toDriver）各自動獲 25 Exp。冪等：EmpExpLog reason prefix HANDOVER:<handoverId>。無 endpoint 直接觸發、純 wire 視覺化（後續軌補 GET 動態交接 Exp 歷史 endpoint）。對齊 plan v0.1.0 §L3 helper 1"
    />
  );
}
