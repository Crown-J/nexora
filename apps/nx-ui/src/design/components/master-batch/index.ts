// apps/nx-ui/src/design/components/master-batch/index.ts
// 主檔群組模板（MasterBatchShell）統一 export 入口
//
// 使用範式：
//   const config = useMemo<MasterBatchConfig<S, M>>(() => ({...}), [deps]);
//   return <MasterBatchShell config={config} />;
//
// 完整對外型別 + shell 元件、case 不需要分別 import 子元件。

export { MasterBatchShell } from './MasterBatchShell';
export type { MasterBatchShellProps } from './MasterBatchShell';

export type {
  BatchCtx,
  LeftMode,
  MasterBatchConfig,
  MemberGroup,
  RightMode,
  ToastVariant,
  TreeNode,
} from './types';
