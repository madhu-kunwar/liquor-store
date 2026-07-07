import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { ReceiveGoodsDto } from "./dto/receive-goods.dto";
import { POStatus, MovementType } from "@prisma/client";

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService
  ) {}

  private generatePoNumber(): string {
    return `PO-${Date.now().toString(36).toUpperCase()}`;
  }

  findAll(status?: POStatus) {
    return this.prisma.purchaseOrder.findMany({
      where: status ? { status } : {},
      include: { supplier: true, createdBy: { select: { id: true, name: true } }, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, createdBy: { select: { id: true, name: true } }, items: { include: { variant: { include: { product: true } } } } },
    });
    if (!po) throw new NotFoundException(`PO ${id} not found`);
    return po;
  }

  async create(dto: CreatePurchaseOrderDto, userId: string) {
    const totalAmount = dto.items.reduce((acc, i) => acc + i.orderedQty * i.unitCost, 0);
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber: this.generatePoNumber(),
        supplierId: dto.supplierId,
        notes: dto.notes,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        totalAmount,
        createdById: userId,
        items: { create: dto.items },
      },
      include: { supplier: true, items: true },
    });
  }

  async receiveGoods(id: string, dto: ReceiveGoodsDto, userId: string) {
    const po = await this.findOne(id);
    if (po.status === POStatus.RECEIVED || po.status === POStatus.CANCELLED) {
      throw new BadRequestException(`Cannot receive goods for PO with status ${po.status}`);
    }

    for (const item of dto.items) {
      const poItem = po.items.find((i) => i.id === item.poItemId);
      if (!poItem) throw new BadRequestException(`PO item ${item.poItemId} not found`);

      if (poItem.receivedQty + item.receivedQty > poItem.orderedQty) {
        throw new BadRequestException(`Over-receiving item ${item.poItemId}: would exceed ordered quantity`);
      }

      await this.prisma.purchaseOrderItem.update({
        where: { id: item.poItemId },
        data: { receivedQty: { increment: item.receivedQty } },
      });

      await this.inventoryService.adjust(
        { variantId: poItem.variantId, quantity: item.receivedQty, type: MovementType.PURCHASE, reason: `Received from PO ${po.poNumber}` },
        userId
      );
    }

    const updatedItems = await this.prisma.purchaseOrderItem.findMany({ where: { poId: id } });
    const allReceived = updatedItems.every((i) => i.receivedQty >= i.orderedQty);
    const anyReceived = updatedItems.some((i) => i.receivedQty > 0);

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: allReceived ? POStatus.RECEIVED : anyReceived ? POStatus.PARTIAL_RECEIVED : po.status,
        receivedDate: allReceived ? new Date() : undefined,
      },
    });
  }

  async markAsSent(id: string) {
    const po = await this.findOne(id);
    if (po.status !== POStatus.DRAFT) throw new BadRequestException("Only DRAFT orders can be marked as sent");
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: POStatus.SENT } });
  }

  async cancel(id: string, _userId: string) {
    const po = await this.findOne(id);
    if (po.status === POStatus.RECEIVED) throw new BadRequestException("Cannot cancel a received PO");
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: POStatus.CANCELLED } });
  }
}
