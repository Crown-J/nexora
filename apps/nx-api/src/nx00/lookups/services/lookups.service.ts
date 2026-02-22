/**
 * File: apps/nx-api/src/nx00/lookups/lookups.service.ts
 * Purpose: NX00-API-002 Lookups Service (brand / function_group / part_status)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class Nx00LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @CODE nxapi_nx00_lookup_brands_001
   */
  async brands(isActive?: boolean) {
    return this.prisma.nx00Brand.findMany({
      where: isActive === undefined ? {} : { isActive },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * @CODE nxapi_nx00_lookup_function_groups_001
   */
  async functionGroups(isActive?: boolean) {
    return this.prisma.nx00FunctionGroup.findMany({
      where: isActive === undefined ? {} : { isActive },
      orderBy: [{ sortNo: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * @CODE nxapi_nx00_lookup_part_statuses_001
   */
  async partStatuses(isActive?: boolean) {
    return this.prisma.nx00PartStatus.findMany({
      where: isActive === undefined ? {} : { isActive },
      orderBy: { code: 'asc' },
    });
  }
}
