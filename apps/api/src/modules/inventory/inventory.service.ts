import { Injectable, BadRequestException } from "@nestjs/common";
import { Prisma, MovementType } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { StockAdjustmentDto } from "./dto/stock-adjustment.dto";
import { StockMovementQueryDto } from "./dto/stock-movement-query.dto";
import { StockInDto } from "./dto/stock-in.dto";

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async getStockMovements(query: StockMovementQueryDto) {
    const {
      search, variantId, type, dateFrom, dateTo,
      page = 1, limit = 50,
      sortBy, sortOrder = "asc",
      quantityMin, quantityMax, balanceMin, balanceMax,
    } = query;
    const skip = (page - 1) * limit;

    const SORT_FIELDS = new Set(["createdAt", "type", "quantity", "balanceAfter"]);
    const orderBy: Prisma.StockMovementOrderByWithRelationInput =
      sortBy && SORT_FIELDS.has(sortBy)
        ? { [sortBy]: sortOrder as Prisma.SortOrder }
        : { createdAt: "desc" as const };

    const where: Prisma.StockMovementWhereInput = {
      ...(search && {
        variant: {
          product: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku:  { contains: search, mode: "insensitive" } },
            ],
          },
        },
      }),
      ...(variantId && { variantId }),
      ...(type && { type }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo   && { lte: new Date(dateTo + "T23:59:59.999Z") }),
        },
      }),
      ...((quantityMin !== undefined || quantityMax !== undefined) && {
        quantity: {
          ...(quantityMin !== undefined && { gte: quantityMin }),
          ...(quantityMax !== undefined && { lte: quantityMax }),
        },
      }),
      ...((balanceMin !== undefined || balanceMax !== undefined) && {
        balanceAfter: {
          ...(balanceMin !== undefined && { gte: balanceMin }),
          ...(balanceMax !== undefined && { lte: balanceMax }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          variant: { include: { product: { include: { category: true } } } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit } };
  }

  async adjust(dto: StockAdjustmentDto, userId: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: dto.variantId } });
    if (!variant) throw new BadRequestException("Variant not found");

    const newStock = variant.currentStock + dto.quantity;
    if (newStock < 0) throw new BadRequestException("Stock cannot go below 0");

    const [updatedVariant, movement] = await this.prisma.$transaction([
      this.prisma.productVariant.update({
        where: { id: dto.variantId },
        data: { currentStock: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          variantId: dto.variantId,
          type: dto.type ?? MovementType.ADJUSTMENT,
          quantity: dto.quantity,
          balanceAfter: newStock,
          reason: dto.reason,
          createdById: userId,
          ...(dto.date && { createdAt: new Date(dto.date) }),
        },
      }),
    ]);

    if (newStock <= variant.reorderPoint) {
      this.eventEmitter.emit("stock.low", { variantId: dto.variantId, currentStock: newStock, reorderPoint: variant.reorderPoint });
    }

    return { variant: updatedVariant, movement };
  }

  async stockIn(dto: StockInDto, userId: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: dto.variantId } });
    if (!variant) throw new BadRequestException("Variant not found");

    const newStock = variant.currentStock + dto.quantity;

    const [updatedVariant, movement] = await this.prisma.$transaction([
      this.prisma.productVariant.update({
        where: { id: dto.variantId },
        data: { currentStock: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          variantId: dto.variantId,
          type:          MovementType.PURCHASE,
          quantity:      dto.quantity,
          balanceAfter:  newStock,
          reason:        dto.notes ?? "Quick stock in",
          invoiceNumber: dto.invoiceNumber,
          unitCost:      dto.purchasePrice,
          supplierId:    dto.supplierId ?? null,
          createdById:   userId,
          ...(dto.date && { createdAt: new Date(dto.date) }),
        },
        include: { variant: { include: { product: { include: { category: true } } } } },
      }),
    ]);

    if (newStock <= variant.reorderPoint) {
      this.eventEmitter.emit("stock.low", { variantId: dto.variantId, currentStock: newStock, reorderPoint: variant.reorderPoint });
    }

    return { variant: updatedVariant, movement };
  }

  async getProductLedger() {
    const [variants, positiveMovs, negativeMovs] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { isActive: true },
        include: { product: { include: { category: true } } },
        orderBy: { product: { name: "asc" } },
      }),
      this.prisma.stockMovement.groupBy({
        by: ["variantId"],
        where: { quantity: { gt: 0 } },
        _sum: { quantity: true },
      }),
      this.prisma.stockMovement.groupBy({
        by: ["variantId"],
        where: { quantity: { lt: 0 } },
        _sum: { quantity: true },
      }),
    ]);

    const inMap  = new Map(positiveMovs.map(m => [m.variantId, m._sum.quantity ?? 0]));
    const outMap = new Map(negativeMovs.map(m => [m.variantId, Math.abs(m._sum.quantity ?? 0)]));

    return variants.map(v => ({
      id: v.id,
      product: v.product.name,
      brand: v.product.brand,
      sku: v.product.sku,
      category: v.product.category.name,
      unit: v.unit,
      size: v.size,
      totalIn: inMap.get(v.id) ?? 0,
      totalOut: outMap.get(v.id) ?? 0,
      currentStock: v.currentStock,
      reorderPoint: v.reorderPoint,
    }));
  }

  async getStockSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalVariants, totalProducts, variants, todayPurchasesAgg] = await Promise.all([
      this.prisma.productVariant.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productVariant.findMany({
        where: { isActive: true },
        select: { currentStock: true, reorderPoint: true, costPrice: true },
      }),
      this.prisma.stockMovement.aggregate({
        where: { type: MovementType.PURCHASE, createdAt: { gte: todayStart } },
        _count: { id: true },
        _sum: { quantity: true },
      }),
    ]);

    const lowStockCount  = variants.filter(v => v.currentStock > 0 && v.currentStock <= v.reorderPoint).length;
    const outOfStockCount = variants.filter(v => v.currentStock === 0).length;
    const totalStock     = variants.reduce((sum, v) => sum + v.currentStock, 0);
    const totalValue     = variants.reduce((sum, v) => sum + Number(v.costPrice) * v.currentStock, 0);

    return {
      totalVariants,
      totalProducts,
      totalStock,
      totalValue,
      lowStockCount,
      outOfStockCount,
      todayPurchases: todayPurchasesAgg._count.id,
      todayPurchaseQty: todayPurchasesAgg._sum.quantity ?? 0,
    };
  }
}
