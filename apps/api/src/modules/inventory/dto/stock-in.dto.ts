import { IsString, IsNumber, IsOptional, Min, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class StockInDto {
  @ApiProperty()
  @IsString()
  variantId: string;

  @ApiProperty({ description: "Units to add (must be positive)" })
  @IsNumber()
  @Min(1, { message: "Quantity must be at least 1" })
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Override the movement date (ISO date string, e.g. 2024-01-15)" })
  @IsOptional()
  @IsDateString()
  date?: string;
}
