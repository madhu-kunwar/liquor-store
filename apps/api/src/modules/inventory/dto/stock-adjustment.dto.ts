import { IsString, IsNumber, IsOptional, IsEnum, NotEquals, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MovementType } from "@prisma/client";

export class StockAdjustmentDto {
  @ApiProperty()
  @IsString()
  variantId: string;

  @ApiProperty({ description: "Positive to add, negative to remove" })
  @IsNumber()
  @NotEquals(0, { message: "Quantity cannot be zero" })
  quantity: number;

  @ApiPropertyOptional({ enum: MovementType, default: MovementType.ADJUSTMENT })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: "Override the movement date (ISO date string, e.g. 2024-01-15)" })
  @IsOptional()
  @IsDateString()
  date?: string;
}
