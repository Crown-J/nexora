'use client';

import { Button } from '@/components/ui/button';

type Props = {
  hasSelection: boolean;
  loading: boolean;
  saving: boolean;
  onAdd: () => void;
  onBulkEnable: () => void | Promise<void>;
  onBulkDisable: () => void | Promise<void>;
  /** 額外停用「新增」（例如 lookups 尚未載入） */
  addExtraDisabled?: boolean;
};

/**
 * 工具列：無勾選時顯示「新增」，有勾選時改為「啟用／停用」批次操作。
 */
export function MasterToolbarAddOrBulkActive({
  hasSelection,
  loading,
  saving,
  onAdd,
  onBulkEnable,
  onBulkDisable,
  addExtraDisabled = false,
}: Props) {
  if (!hasSelection) {
    return (
      <Button type="button" size="sm" variant="default" onClick={onAdd} disabled={loading || saving || addExtraDisabled}>
        新增
      </Button>
    );
  }
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => void onBulkEnable()} disabled={saving}>
        啟用
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void onBulkDisable()} disabled={saving}>
        停用
      </Button>
    </>
  );
}
