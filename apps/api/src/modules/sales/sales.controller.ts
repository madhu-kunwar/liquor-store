import { Controller, Get, Post, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@prisma/client";

@ApiTags("Sales")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: "sales", version: "1" })
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get() findAll(
    @Query("dateFrom") df?: string, @Query("dateTo") dt?: string,
    @Query("page") page?: string, @Query("limit") limit?: string,
    @Query("includeVoided") includeVoided?: string,
  ) { return this.salesService.findAll(df, dt, page ? Number(page) : 1, limit ? Number(limit) : 50, includeVoided === "true"); }
  @Get("daily-summary") getDailySummary() { return this.salesService.getDailySummary(); }
  @Post() create(@Body() dto: CreateSaleDto, @CurrentUser("id") userId: string) { return this.salesService.create(dto, userId); }
  @Post(":id/void") @Roles(Role.ADMIN, Role.MANAGER) void(@Param("id") id: string, @Body("reason") reason: string, @CurrentUser("id") userId: string) { return this.salesService.void(id, reason, userId); }
  @Post("settle-credit") settleCredit(@Body("customerId") customerId: string, @Body("amount") amount: number) { return this.salesService.settleCredit(customerId, amount); }
}
