// apps/nx-api/src/nx06/route-optimization/dto/route-optimization.dto.ts
// NX06 路線優化 DTO

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** 單車場景：對單一 driver 的 N 個 DN 排最短訪問順序。 */
export class OptimizeSingleVehicleDto {
  /** driver user_id（從哪個外務員出發、用該外務員最後 GPS 位置作起點）。 */
  @IsString()
  @MaxLength(15)
  driverUserId!: string;

  /** 要優化的 DN id 列表（≤ 30 筆）。 */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  dnIds!: string[];

  /** 起點 lat（可選、不填則用 driver 最後 GPS）。 */
  @IsOptional()
  @IsLatitude()
  startLat?: number;

  /** 起點 lng（可選）。 */
  @IsOptional()
  @IsLongitude()
  startLng?: number;
}

/** 多車場景：N 個 driver × M 個 DN VRP 簡化版（≤ 5 driver、≤ 100 DN、≤ 30 秒）。 */
export class OptimizeMultiVehicleDto {
  /** driver user_id 列表（≤ 5 筆、亞羅 Q1=100 簡化版上限）。 */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  driverUserIds!: string[];

  /** 要分派的 DN id 列表（≤ 100 筆）。 */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  dnIds!: string[];

  /** 每車最大任務數（預設 sqrt(M/N) 上限）。 */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTasksPerVehicle?: number;
}
