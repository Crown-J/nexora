import { Module } from '@nestjs/common';
import { CarBrandController } from './controllers/car-brand.controller';
import { CarBrandService } from './services/car-brand.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [AuditLogModule],
    controllers: [CarBrandController],
    providers: [CarBrandService],
})
export class CarBrandModule {}
