import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async inventoryValuation() {
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { include: { category: true } } },
    });
    const rows = variants.map((v) => ({
      ...v,
      totalValue: Number(v.costPrice) * v.currentStock,
      potentialRevenue: Number(v.sellingPrice) * v.currentStock,
    }));
    return { rows, totalValue: rows.reduce((a, r) => a + r.totalValue, 0) };
  }

  async lowStockReport() {
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { include: { category: true, supplier: true } } },
      orderBy: { currentStock: "asc" },
    });
    return variants.filter(v => v.currentStock <= v.reorderPoint);
  }

  async deadStockReport(inactiveDays = 60) {
    const since = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
    const activeVariantIds = await this.prisma.stockMovement.findMany({
      where: { createdAt: { gte: since } },
      select: { variantId: true },
      distinct: ["variantId"],
    });
    const activeIds = activeVariantIds.map((m) => m.variantId);
    return this.prisma.productVariant.findMany({
      where: { id: { notIn: activeIds }, currentStock: { gt: 0 }, isActive: true },
      include: { product: { include: { category: true } } },
    });
  }

  // BUG-05: dateFrom/dateTo are now optional and validated by DTO
  // BUG-17: use costAtSale when available instead of current costPrice
  async salesSummary(dateFrom?: string, dateTo?: string) {
    const where: Record<string, unknown> = { isVoided: false };
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
      };
    }

    const sales = await this.prisma.sale.findMany({
      where: where as any,
      include: { items: { include: { variant: { include: { product: { include: { category: true } } } } } } },
    });

    const totalRevenue = sales.reduce((a, s) => a + Number(s.totalAmount), 0);
    const totalCOGS = sales
      .flatMap((s) => s.items)
      .reduce((a, i) => a + Number((i as any).costAtSale ?? i.variant.costPrice) * i.quantity, 0);

    return {
      totalSales: sales.length,
      totalRevenue,
      totalCOGS,
      grossProfit: totalRevenue - totalCOGS,
      grossMargin: totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0,
    };
  }

  async topSellers(dateFrom?: string, dateTo?: string, limit = 10) {
    const where: Record<string, unknown> = {
      sale: { isVoided: false },
    };
    if (dateFrom || dateTo) {
      where.sale = {
        ...(where.sale as object),
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
        },
      };
    }

    const grouped = await this.prisma.saleItem.groupBy({
      by: ["variantId"],
      where: where as any,
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    const variantIds = grouped.map(g => g.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { include: { category: true } } },
    });
    const variantMap = new Map(variants.map(v => [v.id, v]));

    return grouped.map(g => {
      const v = variantMap.get(g.variantId);
      return {
        variantId: g.variantId,
        product: v?.product.name ?? "Unknown",
        sku: v?.product.sku ?? "",
        category: v?.product.category.name ?? "",
        unit: v?.unit ?? "",
        size: v?.size,
        qtySold: g._sum.quantity ?? 0,
        revenue: Number(g._sum.totalPrice ?? 0),
      };
    });
  }

  // BUG-05: dateFrom/dateTo now optional
  async stockMovementReport(dateFrom?: string, dateTo?: string) {
    const where: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
      };
    }
    return this.prisma.stockMovement.groupBy({
      by: ["type"],
      where: where as any,
      _count: true,
      _sum: { quantity: true },
    });
  }
}
