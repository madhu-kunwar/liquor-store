import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { CreateDealerOrderDto } from "./dto/create-dealer-order.dto";
import { UpdateDealerOrderDto } from "./dto/update-dealer-order.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { DealerOrderStatus, MovementType, PaymentStatus } from "@prisma/client";

@Injectable()
export class DealerOrdersService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  private generateOrderNumber(): string {
    return `DO-${Date.now().toString(36).toUpperCase()}`;
  }

  private calcPaymentStatus(paid: number, total: number): PaymentStatus {
    if (paid <= 0) return PaymentStatus.UNPAID;
    if (paid >= total) return PaymentStatus.PAID;
    return PaymentStatus.PARTIAL;
  }

  findAll(status?: DealerOrderStatus, customerId?: string) {
    return this.prisma.dealerOrder.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.dealerOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { variant: { include: { product: true } } } },
      },
    });
    if (!order) throw new NotFoundException(`Dealer order ${id} not found`);
    return order;
  }

  async create(dto: CreateDealerOrderDto, userId: string) {
    const totalAmount = dto.items.reduce((acc, i) => acc + i.orderedQty * i.unitPrice, 0);
    return this.prisma.dealerOrder.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        customerId: dto.customerId,
        paymentType: dto.paymentType ?? "CASH",
        invoiceNumber: dto.invoiceNumber,
        notes: dto.notes,
        totalAmount,
        createdById: userId,
        items: {
          create: dto.items.map(i => ({
            variantId: i.variantId,
            orderedQty: i.orderedQty,
            unitPrice: i.unitPrice,
            totalPrice: i.orderedQty * i.unitPrice,
          })),
        },
      },
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
    });
  }

  async updateDraft(id: string, dto: UpdateDealerOrderDto) {
    const order = await this.findOne(id);
    if (order.status !== DealerOrderStatus.DRAFT)
      throw new BadRequestException("Only DRAFT orders can be edited");

    const totalAmount = dto.items
      ? dto.items.reduce((acc, i) => acc + i.orderedQty * i.unitPrice, 0)
      : Number(order.totalAmount);

    return this.prisma.dealerOrder.update({
      where: { id },
      data: {
        ...(dto.paymentType && { paymentType: dto.paymentType }),
        ...(dto.invoiceNumber !== undefined && { invoiceNumber: dto.invoiceNumber }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.items && { totalAmount }),
        ...(dto.items && {
          items: {
            deleteMany: {},
            create: dto.items.map(i => ({
              variantId: i.variantId,
              orderedQty: i.orderedQty,
              unitPrice: i.unitPrice,
              totalPrice: i.orderedQty * i.unitPrice,
            })),
          },
        }),
      },
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
    });
  }

  async confirm(id: string) {
    const order = await this.findOne(id);
    if (order.status !== DealerOrderStatus.DRAFT)
      throw new BadRequestException("Only DRAFT orders can be confirmed");
    return this.prisma.dealerOrder.update({ where: { id }, data: { status: DealerOrderStatus.CONFIRMED } });
  }

  async dispatch(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.status !== DealerOrderStatus.CONFIRMED)
      throw new BadRequestException("Only CONFIRMED orders can be dispatched");

    for (const item of order.items) {
      const variant = await this.prisma.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);
      if (variant.currentStock < item.orderedQty)
        throw new BadRequestException(
          `Insufficient stock for ${item.variant.product.name}: need ${item.orderedQty}, have ${variant.currentStock}`
        );
    }

    for (const item of order.items) {
      await this.inventoryService.adjust(
        {
          variantId: item.variantId,
          quantity: -item.orderedQty,
          type: MovementType.SALE,
          reason: `Dealer order ${order.orderNumber}`,
        },
        userId,
      );
      await this.prisma.dealerOrderItem.update({
        where: { id: item.id },
        data: { dispatchedQty: item.orderedQty },
      });
    }

    const total = Number(order.totalAmount);
    const paid  = Number(order.paidAmount);

    // If credit order, add outstanding to customer balance
    if (order.paymentType === "CREDIT" && total > paid) {
      await this.prisma.customer.update({
        where: { id: order.customerId },
        data: { creditBalance: { increment: total - paid } },
      });
    }

    return this.prisma.dealerOrder.update({
      where: { id },
      data: {
        status: DealerOrderStatus.DISPATCHED,
        dispatchDate: new Date(),
        paymentStatus: this.calcPaymentStatus(paid, total),
      },
    });
  }

  async markDelivered(id: string) {
    const order = await this.findOne(id);
    if (order.status !== DealerOrderStatus.DISPATCHED)
      throw new BadRequestException("Only DISPATCHED orders can be marked as delivered");
    return this.prisma.dealerOrder.update({ where: { id }, data: { status: DealerOrderStatus.DELIVERED } });
  }

  async recordPayment(id: string, dto: RecordPaymentDto) {
    const order = await this.findOne(id);
    if (order.status === DealerOrderStatus.CANCELLED)
      throw new BadRequestException("Cannot record payment for a cancelled order");
    if (order.status === DealerOrderStatus.DRAFT || order.status === DealerOrderStatus.CONFIRMED)
      throw new BadRequestException("Dispatch the order before recording payment");

    const newPaid  = Number(order.paidAmount) + dto.amount;
    const total    = Number(order.totalAmount);
    if (newPaid > total) throw new BadRequestException(`Payment of ${dto.amount} exceeds outstanding balance`);

    // Reduce customer credit balance if credit order
    if (order.paymentType === "CREDIT") {
      await this.prisma.customer.update({
        where: { id: order.customerId },
        data: { creditBalance: { decrement: dto.amount } },
      });
    }

    return this.prisma.dealerOrder.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        paymentStatus: this.calcPaymentStatus(newPaid, total),
      },
    });
  }

  async cancel(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.status === DealerOrderStatus.DELIVERED)
      throw new BadRequestException("Cannot cancel a delivered order");
    if (order.status === DealerOrderStatus.CANCELLED)
      throw new BadRequestException("Order is already cancelled");

    // Reverse stock if it was dispatched
    if (order.status === DealerOrderStatus.DISPATCHED) {
      for (const item of order.items) {
        if (item.dispatchedQty > 0) {
          await this.inventoryService.adjust(
            {
              variantId: item.variantId,
              quantity: item.dispatchedQty,
              type: MovementType.RETURN,
              reason: `Cancellation of ${order.orderNumber}`,
            },
            userId,
          );
        }
      }
      // Reverse credit balance if applicable
      if (order.paymentType === "CREDIT") {
        const outstanding = Number(order.totalAmount) - Number(order.paidAmount);
        if (outstanding > 0) {
          await this.prisma.customer.update({
            where: { id: order.customerId },
            data: { creditBalance: { decrement: outstanding } },
          });
        }
      }
    }

    return this.prisma.dealerOrder.update({ where: { id }, data: { status: DealerOrderStatus.CANCELLED } });
  }
}
