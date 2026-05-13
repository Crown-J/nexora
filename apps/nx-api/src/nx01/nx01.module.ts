import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { BrandCodeRuleController } from './brand-code-rule/brand-code-rule.controller';
import { BrandCodeRuleService } from './brand-code-rule/brand-code-rule.service';
import { BulletinController } from './bulletin/bulletin.controller';
import { BulletinService } from './bulletin/bulletin.service';
import { CarBrandController } from './car-brand/car-brand.controller';
import { CarBrandService } from './car-brand/car-brand.service';
import { CurrencyController } from './currency/currency.controller';
import { CurrencyService } from './currency/currency.service';
import { CustomerGradeController } from './customer-grade/customer-grade.controller';
import { CustomerGradeService } from './customer-grade/customer-grade.service';
import { EngineController } from './engine/engine.controller';
import { EngineService } from './engine/engine.service';
import { PartBrandController } from './part-brand/part-brand.controller';
import { PartBrandService } from './part-brand/part-brand.service';
import { PartController } from './part/part.controller';
import { PartService } from './part/part.service';
import { PartnerController } from './partner/partner.controller';
import { PartnerService } from './partner/partner.service';
import { PhoneticDictionaryController } from './phonetic-dictionary/phonetic-dictionary.controller';
import { PhoneticDictionaryService } from './phonetic-dictionary/phonetic-dictionary.service';
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { WarehouseController } from './warehouse/warehouse.controller';
import { WarehouseService } from './warehouse/warehouse.service';
import { WarehouseTypeController } from './warehouse-type/warehouse-type.controller';
import { WarehouseTypeService } from './warehouse-type/warehouse-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    CurrencyController,
    WarehouseController,
    WarehouseTypeController,
    PartBrandController,
    PartController,
    PartnerController,
    CustomerGradeController,
    UserController,
    RoleController,
    BulletinController,
    PhoneticDictionaryController,
    CarBrandController,
    BrandCodeRuleController,
    EngineController,
  ],
  providers: [
    CurrencyService,
    WarehouseService,
    WarehouseTypeService,
    PartBrandService,
    PartService,
    PartnerService,
    CustomerGradeService,
    UserService,
    RoleService,
    BulletinService,
    PhoneticDictionaryService,
    CarBrandService,
    BrandCodeRuleService,
    EngineService,
  ],
})
export class Nx01Module {}
