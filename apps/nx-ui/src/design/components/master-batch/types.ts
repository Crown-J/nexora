// apps/nx-ui/src/design/components/master-batch/types.ts
// MasterBatchShell 共用型別
//
// 設計範式：對齊 demo 主檔群組批次頁（docs/專案/介面規格/ERP SYSTEM TEST/
// cmb-engine.js）；shell 雙欄殼、case 走 config-driven 提供資料 + 渲染 hook。
//
// 模式維度：
// - leftMode:  flat（平面 list）/ tree（多層樹）
// - rightMode: list（單清單）/ list-with-extra（清單 + 副區）/ grouped（分組清單）
//
// 四案例對應：
// - 組織架構圖：tree + list
// - 據點架構圖：tree + list-with-extra
// - 通用件群組：flat + list
// - 供應商供貨對應：flat + grouped

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Crumb } from '@design/components/page-header/PageHeader';

export type LeftMode = 'flat' | 'tree';
export type RightMode = 'list' | 'list-with-extra' | 'grouped';

/** Tree 節點：tree 左欄使用（payload 帶 case 自定資料） */
export type TreeNode<P = unknown> = {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  level: number;
  payload: P;
};

/** 分組成員：grouped 右欄使用（供應商供貨對應按品牌分組） */
export type MemberGroup<M> = {
  key: string;
  label: string;
  members: M[];
  /** 標頭右側顯示文字（如「已供 5 / 共 12」） */
  meta?: ReactNode;
  /** 標頭操作鈕（如「全部加入」「移除此品牌」） */
  actions?: ReactNode;
};

/** Toast variant（reuse design/components/toast/ToastStack 型別） */
export type ToastVariant = 'info' | 'success' | 'danger';

/** Shell 給 case callback 用的 context（最薄、避免反向耦合） */
export type BatchCtx = {
  showToast: (msg: string, variant?: ToastVariant) => void;
};

/**
 * MasterBatchConfig — 主檔群組模板配置。
 *
 * 泛型 S = Subject（左欄被選中的實體型別）
 * 泛型 M = Member（右欄成員型別）
 */
export type MasterBatchConfig<S, M> = {
  // ---------- 文案 ----------
  /** 頁面標題（麵包屑最後一段、頭部標題） */
  title: string;
  /** 自訂麵包屑、留空時由 category + title 自動組 */
  crumbs?: Crumb[];
  /** 麵包屑中段（如「組織架構」） */
  category?: string;
  /** 標題下方一行描述 */
  desc?: string;
  /** 左欄面板 icon */
  subjectIcon?: LucideIcon;
  /** 左欄實體名詞（如「群組」「供應商」） */
  subjectNoun: string;
  /** 右欄成員名詞（如「成員」「供貨品項」） */
  memberNoun: string;
  /** 計數單位（如「位」「項」） */
  memberUnit?: string;
  /** 左欄搜尋 placeholder */
  searchPlaceholder?: string;
  /** 右欄加入鈕文案 */
  addLabel: string;
  /** 右欄加入鈕 icon */
  addIcon?: LucideIcon;

  // ---------- 左欄 ----------
  leftMode: LeftMode;

  // flat 模式
  subjects?: () => S[];
  subjectId?: (s: S) => string;
  /** 主體顯示名（通用件群組：return 主件 label） */
  subjectTitle?: (s: S) => string;
  /** 搜尋 match（通用件群組：match 主件 OR 任一成員料號） */
  subjectSearch?: (s: S, q: string) => boolean;
  /** 成員計數（tree 模式非葉子節點可 return undefined＝不顯示計數） */
  subjectCount?: (s: S) => number | undefined;

  // tree 模式（節點型別 = S；payload 由 case 自定）
  treeRoots?: () => S[];
  treeChildren?: (n: S) => S[];
  /** 可選節點判定：true 表該節點可被選定（右欄顯示成員）；
   *  false 表純容器（只能展開折疊）。預設 = 無 children 即可選。
   *  允許「可選 + 有 children」並存（例：據點本身可選，且下有倉庫子節點）。
   */
  isSelectable?: (n: S) => boolean;
  /** tree mode 初始展開的節點 ids（其餘預設折疊） */
  defaultExpandedIds?: () => string[];

  /** 左欄是否可新建主體（僅通用件群組） */
  leftCreatable?: boolean;
  /** 新建鈕文案（預設「新增」） */
  createLabel?: string;
  /** 新建 callback（case 自管 modal state） */
  onCreate?: (ctx: BatchCtx) => void;

  // ---------- 右欄 ----------
  rightMode: RightMode;

  /** 取該主體的成員清單（list / list-with-extra） */
  members: (s: S) => M[];
  memberId: (m: M) => string;
  /** 渲染單筆成員（list 模式）
   *  - s：當前選中主體（給 case 在 row 內查 subject-derived 狀態用、例：通用件群組標主件徽章）
   */
  renderMember: (m: M, index: number, focused: boolean, s: S) => ReactNode;

  /** list-with-extra：渲染副區（據點架構：員工歸屬副區）（Step 4 補實作） */
  renderExtra?: (s: S) => ReactNode;

  /** grouped：分組（供應商供貨對應按品牌）（Step 6 補實作） */
  memberGroups?: (s: S) => MemberGroup<M>[];

  // ---------- 互動 ----------
  /** 點加入鈕（case 自管多選 modal state） */
  onAdd: (s: S, ctx: BatchCtx) => void;
  /** 加入鈕啟用判定（基於當前選中主體）；undefined = always enabled。
   *  用於 tree mode 某些節點層級不該觸發加入動作（例：據點架構圖只在 site 層才指派員工）。
   */
  isAddEnabled?: (s: S) => boolean;
  /** 移除成員（Delete 鍵 / ✕ 鈕） */
  onRemoveMember?: (s: S, memberId: string, ctx: BatchCtx) => void;

  /** 空狀態文案 */
  emptyText?: (s: S) => { title: string; desc: string };
};
