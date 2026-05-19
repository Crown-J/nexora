// apps/nx-ui/src/features/base/ui/UpgradePromptDialog.tsx
/**
 * 主檔卡片版本鎖 Upgrade Prompt（NEXORA 三版本可見性策略、業界改革 #22）
 *
 * 觸發：使用者點擊 minPlan > userPlan 的鎖定主檔卡時開啟
 * 範圍：純 UI、不串金流 API（後續軌 TASK-NX99-PLAN-CHECKOUT 才接）
 *
 * 對齊：docs/_team/task-master-data-center-audit.md §8.2 三版本可見性策略
 */

'use client';

import { Lock, Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VersionBadge } from './VersionBadge';
import type { MasterHubCard, MasterHubMinPlan } from '@/features/base/config/master-cards';

type UpgradePromptDialogProps = {
  /** 被點擊的鎖定卡（null = Dialog 關閉） */
  card: MasterHubCard | null;
  /** 使用者目前版本（用於對照） */
  userPlan: MasterHubMinPlan;
  /** Dialog 關閉 callback */
  onClose: () => void;
};

const PLAN_DISPLAY: Record<MasterHubMinPlan, string> = {
  LITE: 'LITE 基礎版',
  PLUS: 'PLUS 進階版',
  PRO: 'PRO 專業版',
};

export function UpgradePromptDialog({ card, userPlan, onClose }: UpgradePromptDialogProps) {
  const open = card !== null;
  const requiredPlan = card?.minPlan ?? 'LITE';
  const Icon = card?.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                'border-[#E8A020]/40 bg-[#E8A020]/10 text-[#E8A020]',
              )}
            >
              {Icon ? <Icon className="h-5 w-5" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold">{card?.title ?? '功能鎖定'}</DialogTitle>
                <VersionBadge plan={requiredPlan} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{card?.description}</p>
            </div>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              此主檔需 <span className="font-semibold text-foreground">{PLAN_DISPLAY[requiredPlan]}</span> 才可使用。
            </span>
            <br />
            <span className="text-muted-foreground">
              您目前使用 <span className="font-medium">{PLAN_DISPLAY[userPlan]}</span>，升級後即可立即啟用本主檔與其他 {requiredPlan} 限定功能。
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{PLAN_DISPLAY[requiredPlan]} 解鎖內容</p>
          <ul className="mt-1.5 space-y-0.5">
            {requiredPlan === 'PLUS' ? (
              <>
                <li>· 車型字典 5 主檔（引擎／車型／變速箱／傳動／類別）</li>
                <li>· 零件關聯與料件車型適配</li>
                <li>· 客戶等級分群與差異化定價</li>
              </>
            ) : (
              <>
                <li>· 注音字典快速搜尋（櫃台效率工具）</li>
                <li>· 含 PLUS 全功能</li>
                <li>· 進階報表與 API 整合（後續軌）</li>
              </>
            )}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose}>
            稍後再說
          </Button>
          <Button
            className="bg-[#E8A020] text-background hover:bg-[#E8A020]/90"
            onClick={() => {
              // 後續軌 TASK-NX99-PLAN-CHECKOUT 才接金流 API；本軌純 UI、關閉 Dialog
              onClose();
            }}
          >
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
            了解升級方案
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
