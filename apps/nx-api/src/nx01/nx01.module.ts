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
import { DrivetrainController } from './drivetrain/drivetrain.controller';
import { DrivetrainService } from './drivetrain/drivetrain.service';
import { EngineController } from './engine/engine.controller';
import { EngineService } from './engine/engine.service';
import { ModelController } from './model/model.controller';
import { ModelService } from './model/model.service';
import { ModelTypeController } from './model-type/model-type.controller';
import { ModelTypeService } from './model-type/model-type.service';
import { PartBrandController } from './part-brand/part-brand.controller';
import { PartBrandService } from './part-brand/part-brand.service';
import { PartGroupController } from './part-group/part-group.controller';
import { PartGroupService } from './part-group/part-group.service';
import { PartModelController } from './part-model/part-model.controller';
import { PartModelService } from './part-model/part-model.service';
import { PartRelationController } from './part-relation/part-relation.controller';
import { PartRelationService } from './part-relation/part-relation.service';
import { PartVersionController } from './part-version/part-version.controller';
import { PartVersionService } from './part-version/part-version.service';
import { PartController } from './part/part.controller';
import { PartService } from './part/part.service';
import { PartnerController } from './partner/partner.controller';
import { PartnerService } from './partner/partner.service';
import { PhoneticDictionaryController } from './phonetic-dictionary/phonetic-dictionary.controller';
import { PhoneticDictionaryService } from './phonetic-dictionary/phonetic-dictionary.service';
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';
import { TransmissionController } from './transmission/transmission.controller';
import { TransmissionService } from './transmission/transmission.service';
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
    TransmissionController,
    DrivetrainController,
    ModelTypeController,
    ModelController,
    PartGroupController,
    PartRelationController,
    PartVersionController,
    PartModelController,
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
    TransmissionService,
    DrivetrainService,
    ModelTypeService,
    ModelService,
    PartGroupService,
    PartRelationService,
    PartVersionService,
    PartModelService,
  ],
})
export class Nx01Module {}
