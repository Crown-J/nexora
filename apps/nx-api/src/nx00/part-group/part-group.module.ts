import { Module } from '@nestjs/common';
import { PartGroupController } from './controllers/part-group.controller';
import { PartGroupService } from './services/part-group.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [PartGroupController],
    providers: [PartGroupService],
})
export class PartGroupModule { }
