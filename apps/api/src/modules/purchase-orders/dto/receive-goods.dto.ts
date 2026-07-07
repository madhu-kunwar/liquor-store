import { IsArray, ValidateNested, IsString, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class ReceiveItemDto {
  @ApiProperty() @IsString() poItemId: string;
  @ApiProperty() @IsNumber() @Min(1) receivedQty: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ type: [ReceiveItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];
}
