import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { Nx07AttendanceController } from './attendance/attendance.controller';
import { Nx07AttendanceService } from './attendance/attendance.service';
import { Nx07EmployeeChangeController } from './employee-change/employee-change.controller';
import { Nx07EmployeeChangeService } from './employee-change/employee-change.service';
import { Nx07LeaveController } from './leave/leave.controller';
import { Nx07LeaveService } from './leave/leave.service';
import { Nx07OvertimeController } from './overtime/overtime.controller';
import { Nx07OvertimeService } from './overtime/overtime.service';
import { Nx07PayrollController } from './payroll/payroll.controller';
import { Nx07PayrollService } from './payroll/payroll.service';
import { Nx07PerformanceController } from './performance/performance.controller';
import { Nx07PerformanceService } from './performance/performance.service';
import { Nx07TrainingController } from './training/training.controller';
import { Nx07TrainingService } from './training/training.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    Nx07AttendanceController,
    Nx07LeaveController,
    Nx07OvertimeController,
    Nx07PayrollController,
    Nx07PerformanceController,
    Nx07TrainingController,
    Nx07EmployeeChangeController,
  ],
  providers: [
    Nx07AttendanceService,
    Nx07LeaveService,
    Nx07OvertimeService,
    Nx07PayrollService,
    Nx07PerformanceService,
    Nx07TrainingService,
    Nx07EmployeeChangeService,
  ],
})
export class Nx07Module {}
