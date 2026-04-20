import { redirect } from 'next/navigation';

/** /dashboard/nx03 → 庫存作業工作台 */
export default function Nx03ModuleRootPage() {
  redirect('/dashboard/nx03/workspace');
}
