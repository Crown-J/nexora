import { Module } from '@nestjs/common';
import { BulletinController } from './controllers/bulletin.controller';
import { BulletinService } from './services/bulletin.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [BulletinController],
  providers: [BulletinService],
})
export class BulletinModule {}
