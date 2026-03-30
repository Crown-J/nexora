import { Module } from '@nestjs/common';
import { CalendarEventController } from './controllers/calendar-event.controller';
import { CalendarEventService } from './services/calendar-event.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [CalendarEventController],
  providers: [CalendarEventService],
})
export class CalendarEventModule {}
