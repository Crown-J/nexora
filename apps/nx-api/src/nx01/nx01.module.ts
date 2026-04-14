import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { BulletinController } from './bulletin/bulletin.controller';
import { BulletinService } from './bulletin/bulletin.service';
import { CurrencyController } from './currency/currency.controller';
import { CurrencyService } from './currency/currency.service';
import { PartBrandController } from './part-brand/part-brand.controller';
import { PartBrandService } from './part-brand/part-brand.service';
import { PartController } from './part/part.controller';
import { PartService } from './part/part.service';
import { PartnerController } from './partner/partner.controller';
import { PartnerService } from './partner/partner.service';
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { WarehouseController } from './warehouse/warehouse.controller';
import { WarehouseService } from './warehouse/warehouse.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    CurrencyController,
    WarehouseController,
    PartBrandController,
    PartController,
    PartnerController,
    UserController,
    RoleController,
    BulletinController,
  ],
  providers: [
    CurrencyService,
    WarehouseService,
    PartBrandService,
    PartService,
    PartnerService,
    UserService,
    RoleService,
    BulletinService,
  ],
})
export class Nx01Module {}
