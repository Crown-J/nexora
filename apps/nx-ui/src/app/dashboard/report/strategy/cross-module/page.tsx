// apps/nx-ui/src/app/dashboard/report/strategy/cross-module/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX08-STRATEGY-CROSSMOD-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX08-STRATEGY-CROSSMOD-UI-001-F01"
      title="跨部門綜合（Crown 戰略入口）"
      desc="採購 + 銷貨 + 應收/付 + 物流 + 自動補貨 當月 5 模組聚合快照。API：GET /nx08/dashboard/strategy/cross-module"
    />
  );
}
