import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ReportDateRangeDto, DeadStockQueryDto } from "./dto/report-query.dto";

@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: "reports", version: "1" })
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get("inventory-valuation") inventoryValuation() { return this.reportsService.inventoryValuation(); }
  @Get("low-stock") lowStock() { return this.reportsService.lowStockReport(); }
  @Get("dead-stock") deadStock(@Query() query: DeadStockQueryDto) { return this.reportsService.deadStockReport(query.days); }
  @Get("sales-summary") salesSummary(@Query() query: ReportDateRangeDto) { return this.reportsService.salesSummary(query.dateFrom, query.dateTo); }
  @Get("sales-audit") salesAudit(@Query() query: ReportDateRangeDto) { return this.reportsService.salesAudit(query.dateFrom, query.dateTo); }
  @Get("stock-movements") stockMovements(@Query() query: ReportDateRangeDto) { return this.reportsService.stockMovementReport(query.dateFrom, query.dateTo); }
  @Get("top-sellers") topSellers(@Query() query: ReportDateRangeDto, @Query("limit") limit?: string) { return this.reportsService.topSellers(query.dateFrom, query.dateTo, limit ? Number(limit) : 10); }
}
