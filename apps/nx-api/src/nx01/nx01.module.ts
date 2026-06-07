import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { BrandController } from './brand/brand.controller';
import { BrandService } from './brand/brand.service';
import { RegionController } from './region/region.controller';
import { RegionService } from './region/region.service';
import { PartCompatGroupController } from './part-compat-group/part-compat-group.controller';
import { PartCompatGroupService } from './part-compat-group/part-compat-group.service';
import { AddressCatalogController } from './address-catalog/address-catalog.controller';
import { AddressCatalogService } from './address-catalog/address-catalog.service';
import { PartnerAddressController } from './partner-address/partner-address.controller';
import { PartnerAddressService } from './partner-address/partner-address.service';
import { PartnerContactController } from './partner-contact/partner-contact.controller';
import { PartnerContactService } from './partner-contact/partner-contact.service';
import { BrandCodeRuleController } from './brand-code-rule/brand-code-rule.controller';
import { BrandCodeRuleService } from './brand-code-rule/brand-code-rule.service';
import { BulletinController } from './bulletin/bulletin.controller';
import { BulletinService } from './bulletin/bulletin.service';
import { CalendarEventController } from './calendar-event/calendar-event.controller';
import { CalendarEventService } from './calendar-event/calendar-event.service';
import { UserPrefController } from './user-pref/user-pref.controller';
import { UserPrefService } from './user-pref/user-pref.service';
// W6-Phase 5 2026-06-06：CarBrand / PartBrand 模組已 DROP、合併至 BrandController
import { CountryController } from './country/country.controller';
import { CountryService } from './country/country.service';
import { SiteController } from './site/site.controller';
import { SiteService } from './site/site.service';
import { CurrencyController } from './currency/currency.controller';
import { CurrencyService } from './currency/currency.service';
import { LocationController } from './location/location.controller';
import { LocationService } from './location/location.service';
import { ViewController } from './view/view.controller';
import { ViewService } from './view/view.service';
import { RoleViewController } from './role-view/role-view.controller';
import { RoleViewService } from './role-view/role-view.service';
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
import { PermissionController } from './permission/permission.controller';
import { PermissionService } from './permission/permission.service';
import { PhoneticDictionaryController } from './phonetic-dictionary/phonetic-dictionary.controller';
import { PhoneticDictionaryService } from './phonetic-dictionary/phonetic-dictionary.service';
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';
import { SupplierGradeController } from './supplier-grade/supplier-grade.controller';
import { SupplierGradeService } from './supplier-grade/supplier-grade.service';
import { TransmissionController } from './transmission/transmission.controller';
import { TransmissionService } from './transmission/transmission.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { SeqCounterService } from '../shared/nx01/seq-counter.service';
import { UserRoleController } from './user-role/user-role.controller';
import { UserRoleService } from './user-role/user-role.service';
import { UserWarehouseController } from './user-warehouse/user-warehouse.controller';
import { UserWarehouseService } from './user-warehouse/user-warehouse.service';
import { WarehouseController } from './warehouse/warehouse.controller';
import { WarehouseService } from './warehouse/warehouse.service';
import { WarehouseTypeController } from './warehouse-type/warehouse-type.controller';
import { WarehouseTypeService } from './warehouse-type/warehouse-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SiteController,
    CountryController,
    CurrencyController,
    WarehouseController,
    WarehouseTypeController,
    PartController,
    PartnerController,
    CustomerGradeController,
    SupplierGradeController,
    UserController,
    RoleController,
    BulletinController,
    PhoneticDictionaryController,
    BrandController,
    RegionController,
    PartCompatGroupController,
    AddressCatalogController,
    PartnerAddressController,
    PartnerContactController,
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
    UserRoleController,
    UserWarehouseController,
    LocationController,
    ViewController,
    RoleViewController,
    PermissionController,
    UserPrefController,
    CalendarEventController,
  ],
  providers: [
    SiteService,
    CountryService,
    CurrencyService,
    WarehouseService,
    WarehouseTypeService,
    PartService,
    PartnerService,
    CustomerGradeService,
    SupplierGradeService,
    SeqCounterService,
    BrandService,
    RegionService,
    PartCompatGroupService,
    AddressCatalogService,
    PartnerAddressService,
    PartnerContactService,
    UserService,
    RoleService,
    BulletinService,
    PhoneticDictionaryService,
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
    UserRoleService,
    UserWarehouseService,
    LocationService,
    ViewService,
    RoleViewService,
    PermissionService,
    UserPrefService,
    CalendarEventService,
  ],
})
export class Nx01Module {}
