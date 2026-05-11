import { BadRequestException } from '@nestjs/common';

export const LeaveOvertimeStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

const LEAVE_EDGES: Record<string, Set<string>> = {
  [LeaveOvertimeStatus.DRAFT]: new Set([LeaveOvertimeStatus.PENDING, LeaveOvertimeStatus.CANCELLED]),
  [LeaveOvertimeStatus.PENDING]: new Set([
    LeaveOvertimeStatus.APPROVED,
    LeaveOvertimeStatus.REJECTED,
    LeaveOvertimeStatus.CANCELLED,
  ]),
  [LeaveOvertimeStatus.APPROVED]: new Set(),
  [LeaveOvertimeStatus.REJECTED]: new Set(),
  [LeaveOvertimeStatus.CANCELLED]: new Set(),
};

export function assertLeaveOrOvertimeTransition(from: string, to: string): void {
  if (to === from) return;
  const e = LEAVE_EDGES[from];
  if (!e || !e.has(to)) {
    throw new BadRequestException(`Invalid status transition: ${from} -> ${to}`);
  }
}

export const PayrollStatus = {
  DRAFT: 'DRAFT',
  CALCULATING: 'CALCULATING',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  VOIDED: 'VOIDED',
} as const;

const PAYROLL_EDGES: Record<string, Set<string>> = {
  [PayrollStatus.DRAFT]: new Set([PayrollStatus.CALCULATING, PayrollStatus.VOIDED]),
  [PayrollStatus.CALCULATING]: new Set([PayrollStatus.CONFIRMED, PayrollStatus.VOIDED]),
  [PayrollStatus.CONFIRMED]: new Set([PayrollStatus.PAID, PayrollStatus.VOIDED]),
  [PayrollStatus.PAID]: new Set(),
  [PayrollStatus.VOIDED]: new Set(),
};

export function assertPayrollTransition(from: string, to: string): void {
  if (to === from) return;
  if (to === PayrollStatus.VOIDED) {
    if (from === PayrollStatus.VOIDED) throw new BadRequestException('Already VOIDED');
    if (from === PayrollStatus.PAID) throw new BadRequestException('Cannot void PAID payroll');
    return;
  }
  const e = PAYROLL_EDGES[from];
  if (!e || !e.has(to)) {
    throw new BadRequestException(`Invalid payroll status transition: ${from} -> ${to}`);
  }
}

export const PerformanceStatus = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEWING: 'REVIEWING',
  CONFIRMED: 'CONFIRMED',
  VOIDED: 'VOIDED',
} as const;

const PERF_EDGES: Record<string, Set<string>> = {
  [PerformanceStatus.DRAFT]: new Set([PerformanceStatus.IN_PROGRESS, PerformanceStatus.VOIDED]),
  [PerformanceStatus.IN_PROGRESS]: new Set([PerformanceStatus.REVIEWING, PerformanceStatus.VOIDED]),
  [PerformanceStatus.REVIEWING]: new Set([PerformanceStatus.CONFIRMED, PerformanceStatus.VOIDED]),
  [PerformanceStatus.CONFIRMED]: new Set(),
  [PerformanceStatus.VOIDED]: new Set(),
};

export function assertPerformanceTransition(from: string, to: string): void {
  if (to === from) return;
  const e = PERF_EDGES[from];
  if (!e || !e.has(to)) {
    throw new BadRequestException(`Invalid performance status transition: ${from} -> ${to}`);
  }
}

export const TrainingStatus = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  CONFIRMED: 'CONFIRMED',
  VOIDED: 'VOIDED',
} as const;

const TRAIN_EDGES: Record<string, Set<string>> = {
  [TrainingStatus.DRAFT]: new Set([TrainingStatus.IN_PROGRESS, TrainingStatus.VOIDED]),
  [TrainingStatus.IN_PROGRESS]: new Set([TrainingStatus.CONFIRMED, TrainingStatus.VOIDED]),
  [TrainingStatus.CONFIRMED]: new Set(),
  [TrainingStatus.VOIDED]: new Set(),
};

export function assertTrainingTransition(from: string, to: string): void {
  if (to === from) return;
  const e = TRAIN_EDGES[from];
  if (!e || !e.has(to)) {
    throw new BadRequestException(`Invalid training status transition: ${from} -> ${to}`);
  }
}

export const EmployeeChangeStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

const EMCH_EDGES: Record<string, Set<string>> = {
  [EmployeeChangeStatus.DRAFT]: new Set([EmployeeChangeStatus.PENDING, EmployeeChangeStatus.REJECTED]),
  [EmployeeChangeStatus.PENDING]: new Set([EmployeeChangeStatus.APPROVED, EmployeeChangeStatus.REJECTED]),
  [EmployeeChangeStatus.APPROVED]: new Set(),
  [EmployeeChangeStatus.REJECTED]: new Set(),
};

export function assertEmployeeChangeTransition(from: string, to: string): void {
  if (to === from) return;
  const e = EMCH_EDGES[from];
  if (!e || !e.has(to)) {
    throw new BadRequestException(`Invalid employee-change status transition: ${from} -> ${to}`);
  }
}

export function canViewPayrollSalaryDetail(roleCodes: string[]): boolean {
  // A042 closure：role 命名對齊 A034 後 7 role 真相
  //   原 'ADMIN' / 'HR_ADMIN' 不存在於新 schema
  //   新範式：SYSADMIN / OWNER 全通行 + HR 可看（HR_ADMIN 進階權限併入 HR）
  const upper = roleCodes.map((r) => String(r).trim().toUpperCase());
  return upper.includes('SYSADMIN') || upper.includes('OWNER') || upper.includes('HR');
}
