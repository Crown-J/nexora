// apps/nx-ui/src/app/dashboard/nx10/surprise-box/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX10-SURPRISE-BOX-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX10-SURPRISE-BOX-UI-001-F01"
      title="驚喜寶箱 ⭐（八角驅動力 #7 不可預期）"
      desc="業界 gamification 經典範式（中小汽配 ERP 罕見）。每日上限 3 個、隨機 boxType（30% 史詩 E / 30% 稀有 R / 40% 普通 N）+ 隨機 Exp（N=10~30 / R=31~80 / E=81~200）。內部自動 award Exp。API：POST /nx10/surprise-box/open + GET /nx10/surprise-box/me"
    />
  );
}
