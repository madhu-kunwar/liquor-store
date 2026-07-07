import { Module } from "@nestjs/common";
import { DealerOrdersController } from "./dealer-orders.controller";
import { DealerOrdersService } from "./dealer-orders.service";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [InventoryModule],
  controllers: [DealerOrdersController],
  providers: [DealerOrdersService],
  exports: [DealerOrdersService],
})
export class DealerOrdersModule {}
