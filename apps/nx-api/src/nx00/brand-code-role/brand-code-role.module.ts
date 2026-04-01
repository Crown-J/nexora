import { Module } from '@nestjs/common';
import { BrandCodeRoleController } from './controllers/brand-code-role.controller';
import { BrandCodeRoleService } from './services/brand-code-role.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [BrandCodeRoleController],
    providers: [BrandCodeRoleService],
})
export class BrandCodeRoleModule { }
