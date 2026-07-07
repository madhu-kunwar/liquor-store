import { IsOptional, IsString, IsEnum, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { MovementType } from "@prisma/client";

export class StockMovementQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional({ enum: MovementType }) @IsOptional() @IsEnum(MovementType) type?: MovementType;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number = 50;
  @ApiPropertyOptional({ enum: ["createdAt", "type", "quantity", "balanceAfter"] })
  @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional() @IsEnum(["asc", "desc"]) sortOrder?: "asc" | "desc" = "asc";
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() quantityMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() quantityMax?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() balanceMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() balanceMax?: number;
}
