import { Module } from '@nestjs/common';
import { PartRelationController } from './controllers/part-relation.controller';
import { PartRelationService } from './services/part-relation.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [PartRelationController],
    providers: [PartRelationService],
})
export class PartRelationModule { }
