import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePOItemDto {
  @ApiProperty() @IsString() variantId: string;
  @ApiProperty() @IsNumber() @Min(1) orderedQty: number;
  @ApiProperty() @IsNumber() @Min(0) unitCost: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsString() supplierId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string;
  @ApiProperty({ type: [CreatePOItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePOItemDto)
  items: CreatePOItemDto[];
}
