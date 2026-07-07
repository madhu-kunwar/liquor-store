import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentType } from "@prisma/client";

export class UpdateDealerOrderItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiPropertyOptional() @IsString() variantId: string;
  @ApiPropertyOptional() @IsNumber() @Min(1) orderedQty: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) unitPrice: number;
}

export class UpdateDealerOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(PaymentType) paymentType?: PaymentType;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [UpdateDealerOrderItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateDealerOrderItemDto)
  items?: UpdateDealerOrderItemDto[];
}
