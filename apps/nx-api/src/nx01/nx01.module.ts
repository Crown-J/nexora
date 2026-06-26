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
import { PartPhotoController } from './part-photo/part-photo.controller';
import { PartPhotoService } from './part-photo/part-photo.service';
import { BulletinController } from './bulletin/bulletin.controller';
import { BulletinService } from './bulletin/bulletin.service';
import { CalendarEventController } from './calendar-event/calendar-event.controller';
import { CalendarEventService } from './calendar-event/calendar-event.service';
import { UserPrefController } from './user-pref/user-pref.controller';
import { UserPrefService } from './user-pref/user-pref.service';
// W6-Phase 5 2026-06-06：CarBrand / PartBrand 模組已 DROP、合併至 BrandController
import { CountryController } from './country/country.controller';
import { CountryService } from './country/country.service';
import { DiscountCodeController } from './discount-code/discount-code.controller';
import { DiscountCodeService } from './discount-code/discount-code.service';
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
import { ModelController } from './model/model.controller';
import { ModelService } from './model/model.service';
import { PartGroupController } from './part-group/part-group.controller';
import { PartGroupService } from './part-group/part-group.service';
import { PartModelController } from './part-model/part-model.controller';
import { PartModelService } from './part-model/part-model.service';
import { PartRelationController } from './part-relation/part-relation.controller';
import { PartRelationService } from './part-relation/part-relation.service';
import { PartKitController } from './part-kit/part-kit.controller';
import { PartKitService } from './part-kit/part-kit.service';
import { PartVersionController } from './part-version/part-version.controller';
import { PartVersionService } from './part-version/part-version.service';
import { PartController } from './part/part.controller';
import { PartService } from './part/part.service';
// F2 料號即時搜尋（執行長 2026-06-17 拍板、全公司可用、read-only 七支查詢）
import { PartSearchController } from './part-search/part-search.controller';
import { PartSearchService } from './part-search/part-search.service';
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
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { SeqCounterService } from '../shared/nx01/seq-counter.service';
import { UserRoleController } from './user-role/user-role.controller';
import { UserRoleService } from './user-role/user-role.service';
import { UserWarehouseController } from './user-warehouse/user-warehouse.controller';
import { UserWarehouseService } from './user-warehouse/user-warehouse.service';
import { WarehouseController } from './warehouse/warehouse.controller';
import { WarehouseService } from './warehouse/warehouse.service';
import { WarehouseZoneController } from './warehouse-zone/warehouse-zone.controller';
import { WarehouseZoneService } from './warehouse-zone/warehouse-zone.service';
import { WarehouseTypeController } from './warehouse-type/warehouse-type.controller';
import { WarehouseTypeService } from './warehouse-type/warehouse-type.service';
// 02 第三批 T1 後續 2026-06-07：部門主檔 controller / service（schema 既有）
import { DepartmentController } from './department/department.controller';
import { DepartmentService } from './department/department.service';
// 02 第四批 軌 1 2026-06-07：使用者大頭貼（單張、scalar 欄位掛 nx01_user）
import { UserPhotoController } from './user-photo/user-photo.controller';
import { UserPhotoService } from './user-photo/user-photo.service';
// 05 批 T2 2026-06-07：組主檔（揭露既有 Nx01Team schema、含部門 FK + 自我 ref 子組）
import { TeamController } from './team/team.controller';
import { TeamService } from './team/team.service';
// 05 批 T3 2026-06-07：UserTeam 衛星（員工 ↔ 組 m-n、主組旗標、isLeader、自動帶 hrDepartmentId）
import { UserTeamController } from './user-team/user-team.controller';
import { UserTeamService } from './user-team/user-team.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SiteController,
    CountryController,
    DiscountCodeController,
    CurrencyController,
    WarehouseController,
    WarehouseZoneController,
    WarehouseTypeController,
    PartController,
    PartSearchController,
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
    PartPhotoController,
    UserPhotoController,
    DepartmentController,
    TeamController,
    UserTeamController,
    ModelController,
    PartGroupController,
    PartRelationController,
    PartKitController,
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
    DiscountCodeService,
    CurrencyService,
    WarehouseService,
    WarehouseZoneService,
    WarehouseTypeService,
    PartService,
    PartSearchService,
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
    PartPhotoService,
    UserPhotoService,
    DepartmentService,
    TeamService,
    UserTeamService,
    UserService,
    RoleService,
    BulletinService,
    PhoneticDictionaryService,
    ModelService,
    PartGroupService,
    PartRelationService,
    PartKitService,
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
