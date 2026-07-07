import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";

const PRODUCT_SORT_FIELDS = new Set(["name", "brand", "sku", "isActive", "createdAt"]);

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const {
      search, categoryId, supplierId, isActive,
      page = 1, limit = 20,
      sortBy, sortOrder = "asc",
    } = query;

    const skip = (page - 1) * limit;
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy && PRODUCT_SORT_FIELDS.has(sortBy)
        ? { [sortBy]: sortOrder as Prisma.SortOrder }
        : { createdAt: Prisma.SortOrder.desc };

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { brand: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(supplierId && { supplierId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, supplier: true, variants: true },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, supplier: true, variants: true },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto, userId: string) {
    const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException(`SKU ${dto.sku} already exists`);
    const { variants, ...productData } = dto;
    return this.prisma.product.create({
      data: { ...productData, variants: { create: variants } },
      include: { category: true, supplier: true, variants: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { variants, ...productData } = dto;
    return this.prisma.product.update({
      where: { id },
      data: productData,
      include: { category: true, supplier: true, variants: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async updateVariant(variantId: string, data: {
    costPrice?: number; sellingPrice?: number; reorderPoint?: number;
    barcode?: string; size?: string; isActive?: boolean;
    taxRate?: number; exciseDuty?: number;
  }) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new (await import("@nestjs/common")).NotFoundException("Variant not found");
    return this.prisma.productVariant.update({ where: { id: variantId }, data });
  }

  async getLowStockVariants() {
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { include: { category: true, supplier: true } } },
    });
    return variants.filter(v => v.currentStock <= v.reorderPoint);
  }

  async findByBarcode(barcode: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { barcode },
      include: { product: { include: { category: true } } },
    });
    if (!variant) throw new (await import("@nestjs/common")).NotFoundException(`No variant found with barcode ${barcode}`);
    return variant;
  }
}
