import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Customers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: "customers", version: "1" })
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: "List all customers" })
  findAll(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.customersService.findAll(search, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer with purchase history" })
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create customer" })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update customer" })
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Deactivate customer" })
  remove(@Param("id") id: string) {
    return this.customersService.remove(id);
  }
}
