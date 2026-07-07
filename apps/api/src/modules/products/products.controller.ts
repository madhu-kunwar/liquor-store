import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseFloatPipe, Optional } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@prisma/client";

@ApiTags("Products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: "products", version: "1" })
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "List all products" })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get("low-stock")
  @ApiOperation({ summary: "Get products below reorder point" })
  getLowStock() {
    return this.productsService.getLowStockVariants();
  }

  @Get("barcode/:barcode")
  @ApiOperation({ summary: "Look up variant by barcode" })
  findByBarcode(@Param("barcode") barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get product by ID" })
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Create a product" })
  create(@Body() dto: CreateProductDto, @CurrentUser("id") userId: string) {
    return this.productsService.create(dto, userId);
  }

  @Patch("variants/:variantId")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Update a product variant (prices, reorder point, barcode)" })
  updateVariant(@Param("variantId") variantId: string, @Body() data: {
    costPrice?: number; sellingPrice?: number; reorderPoint?: number;
    barcode?: string; size?: string; isActive?: boolean;
  }) {
    return this.productsService.updateVariant(variantId, data);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Update a product" })
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Soft-delete a product" })
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
