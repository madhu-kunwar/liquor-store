import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStock() {
    const items = await this.getLowStockAlerts();
    if (items.length > 0) {
      this.logger.warn(`Low stock: ${items.length} variants below reorder point`);
    }
    return items;
  }

  @OnEvent("stock.low")
  async handleStockLowEvent(payload: { variantId: string; currentStock: number; reorderPoint: number }) {
    this.logger.warn(`Stock alert: variant ${payload.variantId} at ${payload.currentStock} (reorder: ${payload.reorderPoint})`);
    const type    = payload.currentStock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK";
    const title   = payload.currentStock === 0 ? "Out of Stock" : "Low Stock Alert";
    const message = payload.currentStock === 0
      ? `Variant ${payload.variantId} is out of stock`
      : `Variant ${payload.variantId} has only ${payload.currentStock} units left (reorder point: ${payload.reorderPoint})`;
    await this.notificationsService.create({ type, title, message, entityId: payload.variantId });
  }

  async getLowStockAlerts() {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        isActive: true,
        reorderPoint: { gt: 0 },
        stockMovements: { some: {} },
      },
      include: { product: { include: { category: true, supplier: true } } },
      orderBy: { currentStock: "asc" },
    });
    return variants.filter((v) => v.currentStock < v.reorderPoint);
  }
}
