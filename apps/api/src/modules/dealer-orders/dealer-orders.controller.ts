import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { DealerOrdersService } from "./dealer-orders.service";
import { CreateDealerOrderDto } from "./dto/create-dealer-order.dto";
import { UpdateDealerOrderDto } from "./dto/update-dealer-order.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { DealerOrderStatus, Role } from "@prisma/client";

@ApiTags("Dealer Orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: "dealer-orders", version: "1" })
export class DealerOrdersController {
  constructor(private service: DealerOrdersService) {}

  @Get()
  findAll(@Query("status") status?: DealerOrderStatus, @Query("customerId") customerId?: string) {
    return this.service.findAll(status, customerId);
  }

  @Get(":id") findOne(@Param("id") id: string) { return this.service.findOne(id); }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateDealerOrderDto, @CurrentUser("id") userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param("id") id: string, @Body() dto: UpdateDealerOrderDto) {
    return this.service.updateDraft(id, dto);
  }

  @Post(":id/confirm")
  @Roles(Role.ADMIN, Role.MANAGER)
  confirm(@Param("id") id: string) { return this.service.confirm(id); }

  @Post(":id/dispatch")
  @Roles(Role.ADMIN, Role.MANAGER)
  dispatch(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.dispatch(id, userId);
  }

  @Post(":id/deliver")
  @Roles(Role.ADMIN, Role.MANAGER)
  deliver(@Param("id") id: string) { return this.service.markDelivered(id); }

  @Post(":id/payment")
  @Roles(Role.ADMIN, Role.MANAGER)
  payment(@Param("id") id: string, @Body() dto: RecordPaymentDto) {
    return this.service.recordPayment(id, dto);
  }

  @Post(":id/cancel")
  @Roles(Role.ADMIN, Role.MANAGER)
  cancel(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.cancel(id, userId);
  }
}
