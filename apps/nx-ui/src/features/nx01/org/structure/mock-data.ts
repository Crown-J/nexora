// apps/nx-ui/src/features/nx01/org/structure/mock-data.ts
// 組織架構圖 mock 資料（Step 3 Commit B、純前端 UI 跑通用）
// 後續軌（API 串接）會用 DepartmentDto / TeamDto / RoleDto / UserDto 替換
//
// 規模：3 部門 / 6 組別 / 7 職務 / 16 員工
// 業務語意：
//   - 員工可多歸組（teamIds[]、執行長拍板）
//   - 員工可多職務（roleIds[]、執行長拍板）
//   - 部門對員工為單一隸屬（deptId）

export type DepartmentMock = { id: string; name: string };
export type TeamMock = { id: string; name: string; deptId: string };
export type RoleMock = { id: string; name: string; deptId: string };
export type EmployeeMock = {
  id: string;
  name: string;
  deptId: string;
  teamIds: string[];
  roleIds: string[];
};

export const DEPARTMENTS: DepartmentMock[] = [
  { id: 'D001', name: '銷售部' },
  { id: 'D002', name: '採購部' },
  { id: 'D003', name: '財務部' },
];

export const TEAMS: TeamMock[] = [
  { id: 'T001', name: '內銷組', deptId: 'D001' },
  { id: 'T002', name: '外銷組', deptId: 'D001' },
  { id: 'T003', name: '進口採購組', deptId: 'D002' },
  { id: 'T004', name: '國內採購組', deptId: 'D002' },
  { id: 'T005', name: '應收組', deptId: 'D003' },
  { id: 'T006', name: '應付組', deptId: 'D003' },
];

export const ROLES: RoleMock[] = [
  { id: 'R001', name: '業務經理', deptId: 'D001' },
  { id: 'R002', name: '業務員', deptId: 'D001' },
  { id: 'R003', name: '客服', deptId: 'D001' },
  { id: 'R004', name: '採購主管', deptId: 'D002' },
  { id: 'R005', name: '採購員', deptId: 'D002' },
  { id: 'R006', name: '會計', deptId: 'D003' },
  { id: 'R007', name: '出納', deptId: 'D003' },
];

export const EMPLOYEES_SEED: EmployeeMock[] = [
  { id: 'Y0001', name: '陳柏宏', deptId: 'D001', teamIds: ['T001'], roleIds: ['R001', 'R002'] },
  { id: 'Y0002', name: '林佳螢', deptId: 'D001', teamIds: ['T001'], roleIds: ['R002'] },
  { id: 'Y0003', name: '王志明', deptId: 'D001', teamIds: ['T002'], roleIds: ['R002'] },
  { id: 'Y0004', name: '周雅婷', deptId: 'D001', teamIds: ['T001'], roleIds: ['R003'] },
  { id: 'Y0005', name: '吳建宏', deptId: 'D001', teamIds: ['T002'], roleIds: ['R002', 'R003'] },
  { id: 'Y0006', name: '鄭家豪', deptId: 'D001', teamIds: ['T002'], roleIds: ['R002'] },
  { id: 'Y0007', name: '謝宜蓁', deptId: 'D001', teamIds: ['T001'], roleIds: ['R003'] },
  { id: 'Y0008', name: '黃淑芬', deptId: 'D002', teamIds: ['T003', 'T004'], roleIds: ['R005'] },
  { id: 'Y0009', name: '劉冠廷', deptId: 'D002', teamIds: ['T003'], roleIds: ['R005'] },
  { id: 'Y0010', name: '洪偉誠', deptId: 'D002', teamIds: ['T004'], roleIds: ['R005'] },
  { id: 'Y0011', name: '曾子涵', deptId: 'D002', teamIds: ['T003'], roleIds: ['R004'] },
  { id: 'Y0012', name: '李美玲', deptId: 'D003', teamIds: ['T005'], roleIds: ['R006'] },
  { id: 'Y0013', name: '許雅文', deptId: 'D003', teamIds: ['T006'], roleIds: ['R006', 'R007'] },
  { id: 'Y0014', name: '楊承恩', deptId: 'D003', teamIds: ['T005', 'T006'], roleIds: ['R007'] },
  { id: 'Y0015', name: '蔡文傑', deptId: 'D001', teamIds: [], roleIds: [] },
  { id: 'Y0016', name: '張俊傑', deptId: 'D001', teamIds: [], roleIds: [] },
];

export function departmentName(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
}
