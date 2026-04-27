// apps/nx-api/src/nx03/stock-reservation/dto/stock-reservation.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GetStockSummaryQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  warehouseId!: string;
}

export class GetReservationsQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  warehouseId!: string;
}
