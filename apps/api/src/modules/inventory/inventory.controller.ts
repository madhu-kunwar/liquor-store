import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";
import { StockAdjustmentDto } from "./dto/stock-adjustment.dto";
import { StockInDto } from "./dto/stock-in.dto";
import { StockMovementQueryDto } from "./dto/stock-movement-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Inventory")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: "inventory", version: "1" })
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get("movements")
  @ApiOperation({ summary: "List stock movements" })
  getMovements(@Query() query: StockMovementQueryDto) {
    return this.inventoryService.getStockMovements(query);
  }

  @Get("summary")
  @ApiOperation({ summary: "Get current stock summary + total value" })
  getSummary() {
    return this.inventoryService.getStockSummary();
  }

  @Get("ledger")
  @ApiOperation({ summary: "Product-level ledger: total in, total out, current stock" })
  getLedger() {
    return this.inventoryService.getProductLedger();
  }

  @Post("adjust")
  @ApiOperation({ summary: "Manual stock adjustment" })
  adjust(@Body() dto: StockAdjustmentDto, @CurrentUser("id") userId: string) {
    return this.inventoryService.adjust(dto, userId);
  }

  @Post("stock-in")
  @ApiOperation({ summary: "Quick stock-in (direct purchase without PO)" })
  stockIn(@Body() dto: StockInDto, @CurrentUser("id") userId: string) {
    return this.inventoryService.stockIn(dto, userId);
  }
}
