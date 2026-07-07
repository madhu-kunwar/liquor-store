import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentType } from "@prisma/client";

export class CreateDealerOrderItemDto {
  @ApiProperty() @IsString() variantId: string;
  @ApiProperty() @IsNumber() @Min(1) orderedQty: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
}

export class CreateDealerOrderDto {
  @ApiProperty() @IsString() customerId: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PaymentType) paymentType?: PaymentType;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [CreateDealerOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateDealerOrderItemDto)
  items: CreateDealerOrderItemDto[];
}
