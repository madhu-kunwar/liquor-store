import { IsOptional, IsDateString, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ReportDateRangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class DeadStockQueryDto {
  @ApiPropertyOptional({ default: 60, description: "Days of inactivity threshold" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  days?: number;
}
