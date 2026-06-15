// apps/nx-ui/src/app/dashboard/knowledge/vin-lookup/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-VINLOOKUP-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-VINLOOKUP-UI-001-F01"
      title="VIN 對照 ⭐⭐⭐（業界改革、亞羅汽配特色）"
      desc="VIN 17 碼 → 車型 → 料件對照。NHTSA vPIC API（美國 NHTSA 免費、無 key、5s timeout fallback）+ 業務員手動建檔混合。API：GET /nx09/vin-lookup + /:id + /by-vin/:vin + /:id/parts ; POST /decode + POST / + PATCH/DELETE。NHTSA 亞洲車型覆蓋率低、走 source='MANUAL' fallback、業務員後補 modelId 即啟用 PartModel 鏈查詢"
    />
  );
}
