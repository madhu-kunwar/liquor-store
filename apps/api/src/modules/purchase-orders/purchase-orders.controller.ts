import { Controller, Get, Post, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { ReceiveGoodsDto } from "./dto/receive-goods.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { POStatus, Role } from "@prisma/client";

@ApiTags("Purchase Orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: "purchase-orders", version: "1" })
export class PurchaseOrdersController {
  constructor(private poService: PurchaseOrdersService) {}

  @Get() findAll(@Query("status") status?: POStatus) { return this.poService.findAll(status); }
  @Get(":id") findOne(@Param("id") id: string) { return this.poService.findOne(id); }
  @Post() @Roles(Role.ADMIN, Role.MANAGER) create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser("id") userId: string) { return this.poService.create(dto, userId); }
  @Post(":id/send") @Roles(Role.ADMIN, Role.MANAGER) markAsSent(@Param("id") id: string) { return this.poService.markAsSent(id); }
  @Post(":id/receive") @Roles(Role.ADMIN, Role.MANAGER) receive(@Param("id") id: string, @Body() dto: ReceiveGoodsDto, @CurrentUser("id") userId: string) { return this.poService.receiveGoods(id, dto, userId); }
  @Post(":id/cancel") @Roles(Role.ADMIN, Role.MANAGER) cancel(@Param("id") id: string, @CurrentUser("id") userId: string) { return this.poService.cancel(id, userId); }
}
