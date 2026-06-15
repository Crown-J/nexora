// apps/nx-ui/src/app/dashboard/knowledge/repair-sop/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-REPAIRSOP-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-REPAIRSOP-UI-001-F01"
      title="維修 SOP ⭐⭐⭐（業界改革、亞羅汽配特色）"
      desc="結構化維修 SOP：steps（步驟順序 + 工具 + 警示 + 圖示）+ tools/warnings/photos JSON 陣列 + carModelFilter（適用車型過濾）+ difficulty(1-5)。8 category：ENGINE/BRAKE/ELECTRIC/MAINTAIN/SUSPENSION/AC/TRANS/OTHER。API：GET /nx09/repair-sop + /:id + /by-model/:modelId ; POST/PATCH/DELETE。⭐⭐⭐ 內部 wire：GET /:id/parts + GET /by-part-model/:partModelId 雙向查詢（業務員查料件→看 SOP 業界第一）+ POST/DELETE /:id/parts/:pmId"
    />
  );
}
