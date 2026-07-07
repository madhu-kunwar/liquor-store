import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "@prisma/client";

@ApiTags("Expenses")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: "expenses", version: "1" })
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: "List expenses with optional date/category filter" })
  findAll(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo")   dateTo?: string,
    @Query("category") category?: string,
    @Query("page")     page?: string,
    @Query("limit")    limit?: string,
  ) {
    return this.expensesService.findAll(dateFrom, dateTo, category, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Get("summary")
  @ApiOperation({ summary: "Expense summary by category" })
  getSummary(@Query("dateFrom") dateFrom?: string, @Query("dateTo") dateTo?: string) {
    return this.expensesService.getSummary(dateFrom, dateTo);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: "Record an expense" })
  create(@Body() dto: CreateExpenseDto, @CurrentUser("id") userId: string) {
    return this.expensesService.create(dto, userId);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete an expense" })
  remove(@Param("id") id: string) {
    return this.expensesService.remove(id);
  }
}
