import { Module } from '@nestjs/common';
import { BrandCodeRuleController } from './controllers/brand-code-rule.controller';
import { BrandCodeRuleService } from './services/brand-code-rule.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [BrandCodeRuleController],
    providers: [BrandCodeRuleService],
})
export class BrandCodeRuleModule { }
