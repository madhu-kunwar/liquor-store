import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { MovementType } from "@prisma/client";

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService
  ) {}

  private generateSaleNumber(): string {
    return `SALE-${Date.now().toString(36).toUpperCase()}`;
  }

  async findAll(dateFrom?: string, dateTo?: string, page = 1, limit = 50, includeVoided = false) {
    const skip = (page - 1) * limit;
    const where = {
      ...(includeVoided ? {} : { isVoided: false }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { items: { include: { variant: { include: { product: true } } } }, createdBy: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async create(dto: CreateSaleDto, userId: string) {
    const variantIds = dto.items.map(i => i.variantId);

    // BUG-06: batch fetch all variants (no more N+1 serial findUnique per item)
    const variantsArr = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
    });
    const variantMap = new Map(variantsArr.map(v => [v.id, v]));

    // Validate all stock in memory before touching the DB
    for (const item of dto.items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);
      if (variant.currentStock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
      }
    }

    const subtotal     = dto.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const discount     = dto.discountAmount ?? 0;
    const totalAmount  = Math.max(0, subtotal - discount);
    const saleNumber   = this.generateSaleNumber();

    // BUG-03: single $transaction wraps sale creation + all stock deductions atomically
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          totalAmount,
          discountAmount: discount,
          discountReason: dto.discountReason,
          notes:          dto.notes,
          paymentType:    dto.paymentType,
          customerId:     dto.customerId ?? null,
          supplierId:     dto.supplierId ?? null,
          createdById:    userId,
          items: {
            create: dto.items.map(i => ({
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
              costAtSale: variantMap.get(i.variantId)!.costPrice, // BUG-17: capture cost at sale time
            })),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        const variant = variantMap.get(item.variantId)!;
        const newStock = variant.currentStock - item.quantity;
        if (newStock < 0) throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { currentStock: newStock },
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: MovementType.SALE,
            quantity: -item.quantity,
            balanceAfter: newStock,
            reason: `Sale ${saleNumber}`,
            createdById: userId,
          },
        });
      }

      // If credit sale, increase customer's outstanding balance
      if (dto.paymentType === "CREDIT" && dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data:  { creditBalance: { increment: totalAmount } },
        });
      }

      return sale;
    });
  }

  async settleCredit(customerId: string, amount: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new (await import("@nestjs/common")).NotFoundException("Customer not found");
    const newBalance = Math.max(0, Number(customer.creditBalance) - amount);
    return this.prisma.customer.update({
      where: { id: customerId },
      data:  { creditBalance: newBalance },
    });
  }

  async void(id: string, reason: string, userId: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: { items: true } });
    if (!sale) throw new NotFoundException("Sale not found");
    if (sale.isVoided) throw new BadRequestException("Sale already voided");

    for (const item of sale.items) {
      await this.inventoryService.adjust(
        { variantId: item.variantId, quantity: item.quantity, type: MovementType.RETURN, reason: `Void: ${reason}` },
        userId
      );
    }

    return this.prisma.sale.update({ where: { id }, data: { isVoided: true, voidReason: reason } });
  }

  async getDailySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sales = await this.prisma.sale.findMany({ where: { createdAt: { gte: today }, isVoided: false } });
    return {
      count: sales.length,
      totalRevenue: sales.reduce((acc, s) => acc + Number(s.totalAmount), 0),
    };
  }
}
