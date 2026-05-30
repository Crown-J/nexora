// apps/nx-api/src/nx01/permission/dto/permission.dto.ts
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  permissionCodes!: string[];
}
